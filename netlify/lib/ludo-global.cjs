'use strict';
const {createHash,randomInt}=require('node:crypto'),E=require('../../ludo/mesin.js');
const KEY='global',GRACE=120000,WAIT=300000,COUNTDOWN=20000,TURN=30000;
const fail=(status,message)=>{throw Object.assign(Error(message),{status});},hash=t=>createHash('sha256').update(t).digest('hex');
function keyOf(t){if(typeof t!=='string'||!/^[-_\w]{43}$/.test(t))fail(401,'Sesi tidak valid. Muat ulang halaman.');return hash(t);}
const nameOf=n=>String(n||'Pemain').normalize('NFKC').replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,20)||'Pemain';
const alive=r=>r.players.filter(p=>p&&!p.left),member=(r,k)=>r.players.find(p=>p?.key===k&&!p.left);
function fresh(){return {protocol:2,game:0,version:0,seq:0,status:'lobby',players:[null,null,null,null],state:null,countdownAt:null,deadline:0,winner:null,reason:'',events:[],requests:[],misses:{}};}
function event(r,type,fields={}){r.seq++;r.events.push({seq:r.seq,type,...fields});r.events=r.events.slice(-12);}
function end(r,winner,reason,t){r.status='ended';r.winner=winner;r.reason=reason;r.deadline=0;r.finishedAt=t;event(r,'ended',{winner,reason});}
function nextAlive(r){const s=r.state;if(!s||r.status!=='playing')return;let count=0;while(r.players[s.turn]?.left&&count++<4){s.turn=s.players[(s.players.indexOf(s.turn)+1)%s.players.length];s.phase='roll';s.sixes=0;} }
function retire(r,color,reason,t){const p=r.players[color];if(!p||p.left)return;p.left=true;event(r,'retire',{player:color,reason});r.state.pawns[color].fill(-1);const rest=alive(r);if(rest.length<=1){r.state.phase='roll';r.state.sixes=0;if(rest.length)r.state.turn=rest[0].color;end(r,rest[0]?.color??null,rest.length?'lawan-keluar':'ditinggalkan',t);return;}if(r.state.turn===color){nextAlive(r);r.deadline=t+TURN;}}
function start(r,t){const colors=alive(r).map(p=>p.color);if(colors.length<2)return;r.state=E.createOnline(colors,true,1);r.status='playing';r.countdownAt=null;r.deadline=t+TURN;for(const p of alive(r))p.human=t;event(r,'start');}
function settle(r,t){if(r.state.winner!==null){end(r,r.state.winner,'pulang',t);return;}nextAlive(r);r.deadline=t+TURN;}
function roll(r,die,t,automatic=false){const p=r.state.turn;r.state=E.roll(r.state,die);event(r,'roll',{player:p,die,automatic});if(r.state.phase==='choose'&&E.legal(r.state).length===1){const id=E.legal(r.state)[0];r.state=E.move(r.state,id);event(r,'move',{player:p,id,automatic:true,reason:'satu-langkah'});}settle(r,t);}
function move(r,id,t,automatic=false){const p=r.state.turn;r.state=E.move(r.state,id);event(r,'move',{player:p,id,automatic});settle(r,t);}
function sweep(r,t,die){let dirty=false;
 if(r.status==='lobby'){
  for(let i=0;i<4;i++){const p=r.players[i];if(p&&(t-p.seen>=GRACE||t-p.joined>=WAIT)){r.players[i]=null;dirty=true;}}
  if(alive(r).length<2&&r.countdownAt!==null){r.countdownAt=null;dirty=true;}
  if(alive(r).length>=2&&r.countdownAt!==null&&t>=r.countdownAt){start(r,t);dirty=true;}
 }
 if(r.status==='playing'){
  const present=alive(r);if(present.length&&present.every(p=>t-p.seen>=GRACE)){for(const p of present){p.left=true;r.state.pawns[p.color].fill(-1);}r.state.phase='roll';r.state.sixes=0;end(r,null,'ditinggalkan',t);dirty=true;}
  for(const p of [...alive(r)])if(t-p.seen>=GRACE&&r.status==='playing'){retire(r,p.color,'terputus',t);dirty=true;}
  // One deadline action per request. Never replay a large backlog of stale turns.
  if(r.status==='playing'&&t>=r.deadline){const color=r.state.turn,p=r.players[color];r.misses[color]=(r.misses[color]||0)+1;if(r.misses[color]>=3&&t-p.human>=GRACE)retire(r,color,'tidak-aktif',t);else if(r.state.phase==='roll')roll(r,die(),t,true);else move(r,E.ai(r.state),t,true);dirty=true;}
 }
 return dirty;
}
function publicView(r,t){return {protocol:2,game:r.game,version:r.version,seq:r.seq,status:r.status,players:r.players.map(p=>p?{id:p.color,color:p.color,name:p.name,seen:p.seen,joined:p.joined,left:p.left}:null),state:r.state,events:r.events,countdownAt:r.countdownAt,deadline:r.deadline,winner:r.winner,reason:r.reason,serverTime:t,grace:GRACE,wait:WAIT,turnMs:TURN,misses:r.misses};}
function createService({store,now=Date.now,die=()=>randomInt(1,7),publish=async()=>{}}){
 async function request(action,b={}){
  if(!['get','heartbeat','join','leave','roll','move','resign'].includes(action))fail(400,'Aksi tidak dikenal.');const key=keyOf(b.token),mutating=!['get','heartbeat'].includes(action);
  if(mutating&&(typeof b.requestId!=='string'||!/^[-\w]{8,80}$/.test(b.requestId)))fail(400,'Aksi tidak valid. Muat ulang halaman.');
  for(let attempt=0;attempt<24;attempt++){
   const old=await store.getWithMetadata(KEY,{type:'json'}),r=old?.data||fresh(),t=now();let dirty=sweep(r,t,die),me=member(r,key),duplicate=r.requests.some(q=>q.id===b.requestId&&q.key===key),conflict=false;
   if(!mutating&&me&&b.game===r.game&&r.status!=='ended'&&t-me.seen>=25000){me.seen=t;dirty=true;}
   if(!duplicate&&action==='join'){
    if(r.status==='ended'){const keep={game:r.game,version:r.version,seq:r.seq,requests:r.requests};Object.assign(r,fresh(),keep);me=null;}
    if(!me){if(r.status!=='lobby')fail(409,'Pertandingan sedang berlangsung. Kamu bisa menonton.');const free=[0,2,1,3].filter(i=>!r.players[i]);if(!free.length)fail(409,'Empat kursi sudah terisi.');const color=b.color===undefined?free[0]:b.color;if(!Number.isInteger(color)||!free.includes(color))fail(409,'Warna itu sudah diambil. Pilih warna yang tersedia.');if(!alive(r).length)r.game++;me={color,key,name:nameOf(b.name),joined:t,seen:t,human:t,left:false};r.players[color]=me;dirty=true;if(alive(r).length>=2&&r.countdownAt===null)r.countdownAt=t+COUNTDOWN;if(alive(r).length===4)start(r,t);}
   }else if(!duplicate&&mutating){
    if(!me||b.game!==r.game)fail(403,'Kamu sedang menonton. Hanya pemain yang bisa melakukan ini.');
    if(action==='leave'&&r.status==='lobby'){r.players[me.color]=null;me=null;if(alive(r).length<2)r.countdownAt=null;dirty=true;}
    else if((action==='leave'||action==='resign')&&r.status==='playing'){retire(r,me.color,'menyerah',t);dirty=true;}
    else if(dirty&&(b.seq!==r.seq||r.status==='ended'))conflict=true;
    else {
     if(r.status!=='playing')fail(409,'Pertandingan belum dimulai atau sudah selesai.');if(b.seq!==r.seq)fail(409,'Papan sudah berubah. Tunggu pembaruan.');
     if(action==='leave'||action==='resign')retire(r,me.color,'menyerah',t);
     else {if(r.state.turn!==me.color)fail(403,'Tunggu giliranmu.');if(action==='roll'){if(r.state.phase!=='roll')fail(409,'Pilih bidak dahulu.');roll(r,die(),t);}else if(action==='move'){if(!Number.isInteger(b.pawn)||r.state.phase!=='choose'||!E.legal(r.state).includes(b.pawn))fail(409,'Langkah itu tidak sah. Pilih bidak yang bersinar.');move(r,b.pawn,t);}else fail(400,'Aksi tidak dikenal.');me.human=t;me.seen=t;r.misses[me.color]=0;}
     dirty=true;
    }
   }
   if(!duplicate&&mutating){r.requests=[...r.requests,{id:b.requestId,key}].slice(-80);dirty=true;}
   if(r.state&&!E.valid(r.state))throw Error('Invalid authoritative Ludo state');
   if(dirty||!old){r.version++;const w=await store.setJSON(KEY,r,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(!w.modified)continue;if(!w.etag)throw Error('Write not confirmed');}
   const view=publicView(r,t);await publish(view);me=member(r,key);return {...view,you:me?.color??null,color:me?.color??null,conflict};
  }
  fail(409,'Meja sedang diperbarui. Coba lagi sebentar.');
 }
 return {request};
}
module.exports={createService,publicView,KEY,GRACE,WAIT,COUNTDOWN,TURN};
