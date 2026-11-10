'use strict';
const {createHash,randomInt}=require('node:crypto'),CT=require('../../catur/mesin.js');
const TTL=8*3600000,ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',PRESETS={santai:{ms:900000,inc:10000,label:'Santai · 15 menit + 10 detik'},biasa:{ms:600000,inc:5000,label:'Biasa · 10 menit + 5 detik'},cepat:{ms:300000,inc:3000,label:'Cepat · 5 menit + 3 detik'}};
const hash=t=>createHash('sha256').update(t).digest('hex'),fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
function tokenKey(t){if(typeof t!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(t))fail(401,'Sesi tidak valid. Masuk lagi menggunakan undangan.');return hash(t);}
function codeOf(t){return Array.from(createHash('sha256').update('catur:'+t).digest().subarray(0,8),n=>ALPHABET[n%32]).join('');}
const displayName=v=>String(v||'').normalize('NFKC').replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,20)||'Pemain';
function canMate(board,color){const pieces=board.map((p,i)=>({p:p.toLowerCase(),i,c:p===p.toUpperCase()?'w':'b'})).filter(v=>v.p!=='.'&&v.p!=='k'),own=pieces.filter(v=>v.c===color);if(!own.length)return false;if(own.some(v=>'pqr'.includes(v.p)))return true;if(pieces.every(v=>v.p==='b')&&new Set(pieces.map(v=>((v.i>>3)+(v.i&7))%2)).size===1)return false;if(own.length===1&&pieces.length===1)return false;return true;}
const winnerResult=c=>c==='w'?'1-0':'0-1';
function end(r,result,reason,stamp){if(r.status==="playing"&&stamp!==undefined){r.remaining=times(r,stamp);r.clockAt=stamp;}r.status='ended';r.result=result;r.reason=reason;r.offer=null;r.seq++;r.version++;r.rematch=[];}
function times(r,stamp){const t={...r.remaining};if(r.status==='playing'){const side=CT.info(r.k).giliran;t[side]=Math.max(0,t[side]-(stamp-r.clockAt));}return t;}
function flag(r,stamp){if(r.status!=='playing')return false;const info=CT.info(r.k),side=info.giliran;if(r.remaining[side]-(stamp-r.clockAt)>0)return false;r.remaining[side]=0;const winner=side==='w'?'b':'w';end(r,canMate(info.papan,winner)?winnerResult(winner):'1/2','waktu',stamp);return true;}
function seat(r,key){return r.players.find(p=>p&&p.key===key&&!p.left);}
function view(r,key,stamp){const p=seat(r,key);return {protocol:1,code:r.code,status:r.status,version:r.version,seq:r.seq,game:r.game,host:r.host,you:p?.id??null,color:p?.color??null,preset:r.preset,preference:r.preference,players:r.players.map(p=>p?{id:p.id,name:p.name,color:p.color,left:p.left,connected:!p.left&&stamp-p.seen<35000}:null),k:r.k,remaining:r.remaining?times(r,stamp):null,serverTime:stamp,result:r.result||'',reason:r.reason||'',offer:r.offer??null,rematch:r.rematch||[],expiresAt:r.expiresAt};}
function createService({store,now=Date.now,coin=()=>randomInt(2)}){
 async function write(key,r,condition){const result=await store.setJSON(key,r,{...condition,metadata:{expiresAt:r.expiresAt}});if(result.modified&&!result.etag)throw Error('Write was not confirmed');return result.modified;}
 async function limit(ip){const key='limits/'+hash(ip||'unknown').slice(0,24)+'-'+Math.floor(now()/3600000);for(let a=0;a<6;a++){const old=await store.getWithMetadata(key,{type:'json'}),r=old?.data||{count:0,expiresAt:now()+2*3600000};if(r.count>=8)fail(429,'Sudah banyak undangan dibuat. Gunakan ruang yang ada atau coba lagi nanti.');r.count++;if(await write(key,r,old?{onlyIfMatch:old.etag}:{onlyIfNew:true}))return;}fail(409,'Ruang sedang diperbarui. Coba lagi.');}
 function start(r,stamp,rematch=false){if(r.players.some(p=>!p||p.left||stamp-p.seen>=35000))fail(409,'Tunggu teman terhubung terlebih dahulu.');const host=r.players.find(p=>p.id===r.host),other=r.players.find(p=>p.id!==r.host);host.color=rematch?(host.color==='w'?'b':'w'):r.preference==='acak'?(coin()?'b':'w'):r.preference;other.color=host.color==='w'?'b':'w';r.k={...CT.baru(),aturan:'online'};r.status='playing';r.game++;r.remaining={w:PRESETS[r.preset].ms,b:PRESETS[r.preset].ms};r.clockAt=stamp;r.result='';r.reason='';r.offer=null;r.offerPly={};r.rematch=[];r.seq++;r.version++;}
 async function request(action,b={},ip='local'){
  const keyHash=tokenKey(b.token),stamp=now();let code=String(b.code||'').toUpperCase().replace(/[\s-]/g,'');
  if(action==='create'){
   code=codeOf(b.token);const key='rooms/'+code,old=await store.getWithMetadata(key,{type:'json'});if(old){if(!seat(old.data,keyHash)||old.data.expiresAt<stamp)fail(409,'Buat undangan baru.');return view(old.data,keyHash,stamp);}
   if(!Object.hasOwn(PRESETS,b.preset)||!['w','b','acak'].includes(b.preference))fail(400,'Pilihan permainan tidak valid.');await limit(ip);
   const r={protocol:1,code,status:'lobby',host:0,version:1,seq:0,game:0,preset:b.preset,preference:b.preference,players:[{id:0,name:displayName(b.name),key:keyHash,color:null,seen:stamp,left:false},null],k:null,created:stamp,expiresAt:stamp+TTL};if(!await write(key,r,{onlyIfNew:true}))return request(action,b,ip);return view(r,keyHash,stamp);
  }
  if(!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code))fail(400,'Masukkan kode undangan 8 karakter.');
  for(let attempt=0;attempt<8;attempt++){
   const key='rooms/'+code,old=await store.getWithMetadata(key,{type:'json'});if(!old||old.data.expiresAt<stamp||old.data.status==='closed')fail(404,'Ruang sudah ditutup atau kedaluwarsa. Minta undangan baru.');
   const r=old.data;let me=seat(r,keyHash),dirty=false;
   if(action==='join'&&!me){if(r.status!=='lobby')fail(409,'Pertandingan sudah dimulai. Minta teman membuat undangan baru.');const i=r.players.findIndex(p=>!p||p.left);if(i<0)fail(409,'Ruang sudah diisi dua pemain.');me={id:i,key:keyHash,name:displayName(b.name),color:null,seen:stamp,left:false};r.players[i]=me;r.version++;dirty=true;}
   if(!me)fail(403,'Sesi pemain tidak cocok. Masuk lagi menggunakan undangan.');
   if(stamp-me.seen>=12000){me.seen=stamp;dirty=true;}
   if(r.status==='lobby'){const host=r.players.find(p=>p?.id===r.host&&!p.left);if(!host||stamp-host.seen>90000){r.host=me.id;r.version++;dirty=true;}}
   if(flag(r,stamp))dirty=true;
   const duplicate=typeof b.requestId==='string'&&r.requests?.some(q=>q.id===b.requestId&&q.key===keyHash);
   if(!duplicate&&!['get','join'].includes(action)){
    if(typeof b.requestId!=='string'||!/^[-\w]{8,80}$/.test(b.requestId))fail(400,'Aksi tidak valid. Muat ulang halaman.');
    if(action==='start'){if(r.status!=='lobby'||me.id!==r.host)fail(403,'Pembuat ruang yang memulai pertandingan.');start(r,stamp);}
    else if(action==='leave'){
     me.left=true;
     if(r.status==='playing'){const other=me.color==='w'?'b':'w';end(r,canMate(CT.info(r.k).papan,other)?winnerResult(other):'1/2','menyerah',stamp);}
     if(!r.players.some(p=>p&&!p.left)){r.status='closed';r.expiresAt=stamp+60000;}
     else if(r.status==='lobby'&&me.id===r.host)r.host=r.players.find(p=>p&&!p.left).id;r.version++;
    }
    else if(action==='rematch'){if(r.status!=='ended')fail(409,'Pertandingan belum selesai.');if(!r.rematch.includes(me.id))r.rematch.push(me.id);r.version++;if(r.rematch.length===2)start(r,stamp,true);}
    else if(r.status!=='playing'){if(dirty){if(!await write(key,r,{onlyIfMatch:old.etag}))continue;}return {...view(r,keyHash,stamp),conflict:true};}
    else if(b.seq!==r.seq){if(dirty){if(!await write(key,r,{onlyIfMatch:old.etag}))continue;}return {...view(r,keyHash,stamp),conflict:true};}
    else if(action==='move'){
     const info=CT.info(r.k);if(info.giliran!==me.color)fail(403,'Tunggu giliranmu.');if(typeof b.move!=='string'||!info.legal.includes(b.move))fail(409,'Langkah itu tidak sah. Pilih kotak yang ditandai.');
     r.remaining[me.color]-=Math.max(0,stamp-r.clockAt);r.remaining[me.color]+=PRESETS[r.preset].inc;r.clockAt=stamp;r.k=CT.terapkanLangkah(r.k,b.move);r.seq++;r.version++;if(r.offer&&r.offer.by!==me.id)r.offer=null;const status=CT.status(r.k);if(status.selesai)end(r,status.hasil,status.alasan,stamp);
    }
    else if(action==='resign'){const other=me.color==='w'?'b':'w';end(r,canMate(CT.info(r.k).papan,other)?winnerResult(other):'1/2','menyerah');}
    else if(action==='offer'){
     if(r.offer)fail(409,'Tawaran remis masih menunggu jawaban.');if(r.offerPly?.[me.id]===r.k.langkah.length)fail(409,'Tawaran sebelumnya sudah dijawab. Lanjutkan permainan dahulu.');r.offer={by:me.id,at:stamp};r.offerPly={...r.offerPly,[me.id]:r.k.langkah.length};r.version++;
    }
    else if(action==='accept'||action==='decline'){if(!r.offer||r.offer.by===me.id)fail(409,'Tawaran remis sudah tidak berlaku.');if(action==='accept')end(r,'1/2','sepakat',stamp);else{r.offer=null;r.version++;}}
    else if(action==='claim'){
     if(CT.info(r.k).giliran!==me.color)fail(403,'Remis hanya dapat diklaim pada giliranmu.');let k=r.k;if(b.move){k=CT.terapkanLangkah(k,b.move);if(!k)fail(409,'Langkah untuk klaim remis tidak sah.');}const c=CT.info(k).remisKlaim;if(!c.ulangan&&!c.limapuluh)fail(409,'Posisi ini belum memenuhi syarat klaim remis.');end(r,'1/2',c.ulangan?'klaim-ulangan':'klaim-50',stamp);
    }else fail(400,'Aksi tidak dikenal.');
    r.requests=[...(r.requests||[]),{id:b.requestId,key:keyHash}].slice(-40);dirty=true;
   }
   if(!dirty)return view(r,keyHash,stamp);if(await write(key,r,{onlyIfMatch:old.etag}))return view(r,keyHash,stamp);
  }fail(409,'Ruang sedang diselaraskan. Coba lagi.');
 }
 return {request};
}
module.exports={createService,PRESETS,canMate,codeOf};
