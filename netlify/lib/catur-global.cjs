'use strict';
// One canonical record. Public realtime data is a read-only projection, never an authority.
const {createHash}=require('node:crypto'),CT=require('../../catur/mesin.js'),{canMate}=require('./catur-room.cjs');
const KEY='global',GRACE=120000,WAIT=300000,MS=900000,INC=10000;
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
function identity(token){if(typeof token!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(token))fail(401,'Sesi tidak valid. Muat ulang halaman.');return createHash('sha256').update(token).digest('hex');}
const nameOf=v=>String(v||'Pemain').normalize('NFKC').replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,20)||'Pemain';
const member=(r,key)=>r.players.find(p=>p?.key===key);
const result=c=>c==='w'?'1-0':'0-1';
function clocks(r,t){const rem={...r.remaining};if(r.status==='playing')rem[CT.info(r.k).giliran]=Math.max(0,rem[CT.info(r.k).giliran]-Math.max(0,t-r.clockAt));return rem;}
function finish(r,res,reason,t){r.remaining=clocks(r,t);r.clockAt=t;r.status='ended';r.result=res;r.reason=reason;r.offer=null;r.seq++;r.finishedAt=t;}
function fresh(){return {protocol:2,game:0,version:0,seq:0,status:'lobby',players:[null,null],k:{...CT.baru(),aturan:'online'},remaining:{w:MS,b:MS},clockAt:0,result:'',reason:'',offer:null,offerPly:{},requests:[]};}
function sweep(r,t){
 let dirty=false;
 if(r.status==='lobby')for(let i=0;i<2;i++){const p=r.players[i];if(p&&(t-p.seen>=GRACE||t-p.joined>=WAIT)){r.players[i]=null;dirty=true;}}
 if(r.status==='playing'){
  const side=CT.info(r.k).giliran,clockEnd=r.clockAt+r.remaining[side],absent=r.players.filter(p=>t-p.seen>=GRACE).sort((a,b)=>a.seen-b.seen),gone=absent[0],disconnectEnd=gone?gone.seen+GRACE:Infinity;
  if(Math.min(clockEnd,disconnectEnd)<=t){const loser=clockEnd<=disconnectEnd?side:gone.color,win=loser==='w'?'b':'w';finish(r,canMate(CT.info(r.k).papan,win)?result(win):'1/2',clockEnd<=disconnectEnd?'waktu':'terputus',Math.min(clockEnd,disconnectEnd));dirty=true;}
 }
 return dirty;
}
function publicView(r,t){return {protocol:2,game:r.game,version:r.version,seq:r.seq,status:r.status,players:r.players.map(p=>p?{id:p.id,name:p.name,color:p.color,seen:p.seen,joined:p.joined}:null),k:r.k,remaining:r.remaining,clockAt:r.clockAt,serverTime:t,result:r.result,reason:r.reason,offer:r.offer||null,grace:GRACE,wait:WAIT,finishedAt:r.finishedAt||null};}
function createService({store,now=Date.now,publish=async()=>{}}){
 async function request(action,b={}){
  if(!['get','heartbeat','join','leave','move','resign','offer','accept','decline','claim'].includes(action))fail(400,'Aksi tidak dikenal.');
  const key=identity(b.token),mutating=!['get','heartbeat'].includes(action);
  if(mutating&&(typeof b.requestId!=='string'||!/^[-\w]{8,80}$/.test(b.requestId)))fail(400,'Aksi tidak valid. Muat ulang halaman.');
  for(let attempt=0;attempt<20;attempt++){
   const old=await store.getWithMetadata(KEY,{type:'json'}),r=old?.data||fresh(),t=now();
   let dirty=sweep(r,t),me=member(r,key),duplicate=r.requests.some(q=>q.id===b.requestId&&q.key===key);
   // A move arriving after the deadline receives the final authoritative result.
   if(dirty&&r.status==='ended'&&me&&b.game===r.game&&mutating&&action!=='join')duplicate=true;
   // Liveness must not resurrect a seat whose grace period has already elapsed.
   if((action==='heartbeat'||action==='get')&&me&&b.game===r.game&&r.status!=='ended'&&t-me.seen>=25000){me.seen=t;dirty=true;}
   if(!duplicate&&action==='join'){
    if(r.status==='ended'){const next=fresh();Object.assign(r,next,{game:r.game,version:r.version,seq:r.seq,requests:r.requests});me=null;}
    if(!me){if(r.status!=='lobby')fail(409,'Dua pemain sedang bermain. Kamu dapat menonton.');const i=r.players.findIndex(p=>!p);if(i<0)fail(409,'Dua kursi sudah terisi.');if(!r.players.some(Boolean))r.game++;
     me={id:i,color:i===0?'w':'b',key,name:nameOf(b.name),joined:t,seen:t};r.players[i]=me;dirty=true;
     if(r.players.every(Boolean)){r.status='playing';r.clockAt=t;r.remaining={w:MS,b:MS};r.seq++;}
    }
   }else if(!duplicate&&mutating){
    if(!me||b.game!==r.game)fail(403,'Kamu sedang menonton. Hanya pemain yang dapat melakukan ini.');
    if(action==='leave'&&r.status==='lobby'){r.players[me.id]=null;me=null;dirty=true;}
    else {
     if(r.status!=='playing')fail(409,'Pertandingan sudah selesai atau belum dimulai.');
     if(b.seq!==r.seq)fail(409,'Papan sudah berubah. Tunggu pembaruan sebelum mencoba lagi.');
     me.seen=t;
     const info=CT.info(r.k),other=me.color==='w'?'b':'w';
     if(action==='move'){
      if(info.giliran!==me.color)fail(403,'Tunggu giliranmu.');if(typeof b.move!=='string'||!info.legal.includes(b.move))fail(409,'Langkah tidak sah. Pilih kotak yang ditandai.');
      r.remaining=clocks(r,t);r.remaining[me.color]+=INC;r.clockAt=t;r.k=CT.terapkanLangkah(r.k,b.move);r.seq++;if(r.offer?.by!==me.id)r.offer=null;
      const status=CT.status(r.k);if(status.selesai)finish(r,status.hasil,status.alasan,t);
     }else if(action==='resign'||action==='leave')finish(r,canMate(info.papan,other)?result(other):'1/2','menyerah',t);
     else if(action==='offer'){if(r.offer||r.offerPly?.[me.id]===r.k.langkah.length)fail(409,'Lanjutkan permainan sebelum menawarkan remis lagi.');r.offer={by:me.id,at:t};r.offerPly={...r.offerPly,[me.id]:r.k.langkah.length};}
     else if(action==='accept'||action==='decline'){if(!r.offer||r.offer.by===me.id)fail(409,'Tawaran remis sudah tidak berlaku.');if(action==='accept')finish(r,'1/2','sepakat',t);else r.offer=null;}
     else if(action==='claim'){if(info.giliran!==me.color)fail(403,'Klaim remis hanya pada giliranmu.');const k=b.move?CT.terapkanLangkah(r.k,b.move):r.k;if(!k)fail(409,'Langkah tidak sah.');const c=CT.info(k).remisKlaim;if(!c.ulangan&&!c.limapuluh)fail(409,'Syarat remis belum terpenuhi.');finish(r,'1/2',c.ulangan?'klaim-ulangan':'klaim-50',t);}
     dirty=true;
    }
   }
   if(!duplicate&&mutating){r.requests=[...r.requests,{id:b.requestId,key}].slice(-80);dirty=true;}
   if(dirty||!old){r.version++;const written=await store.setJSON(KEY,r,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(!written.modified)continue;if(!written.etag)throw Error('Write not confirmed');}
   const pub=publicView(r,t);await publish(pub);me=member(r,key);return {...pub,you:me?.id??null,color:me?.color??null};
  }
  fail(409,'Meja sedang diperbarui. Coba lagi sebentar.');
 }
 return {request};
}
module.exports={createService,publicView,GRACE,WAIT,KEY};
