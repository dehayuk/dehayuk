'use strict';
const {createHash,randomInt}=require('node:crypto'),{Core}=require('./lapis-physics.cjs');
const KEY='global',GRACE=30000,WAIT=300000,COUNTDOWN=5000,DURATION=120000,MAX_TAPS=256;
function fail(status,message){throw Object.assign(Error(message),{status});}
function identity(t){if(typeof t!=='string'||!/^[-_\w]{43}$/.test(t))fail(401,'Sesi tidak valid. Muat ulang halaman.');return createHash('sha256').update(t).digest('hex');}
const nameOf=n=>String(n||'Pemain').normalize('NFKC').replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,20)||'Pemain';
function fresh(){return {protocol:2,game:0,version:0,status:'lobby',players:[null,null],seed:0,startAt:0,endAt:0,winner:null,reason:'',requests:[]};}
function replay(seed,taps){const g=new Core();g.reset(seed);g.angin=90;for(const ms of taps){if(g.over)fail(409,'Rekaman sudah selesai.');g.tapArena(ms);}return g;}
function result(r,reason='skor'){const [a,b]=r.players;r.status='ended';r.reason=reason;r.finishedAt=r.endAt;r.winner=a.forfeit===b.forfeit?(a.score===b.score?(a.perfects===b.perfects?null:a.perfects>b.perfects?0:1):a.score>b.score?0:1):a.forfeit?1:0;if(a.forfeit&&b.forfeit){r.winner=null;r.reason='ditinggalkan';}}
function sweep(r,t){let changed=false;if(r.status==='lobby'){for(let i=0;i<2;i++){const p=r.players[i];if(p&&(t-p.seen>=GRACE||t-p.joined>=WAIT)){r.players[i]=null;changed=true;}}if(r.players.every(Boolean)){r.status='playing';r.startAt=t+COUNTDOWN;r.endAt=r.startAt+DURATION;changed=true;}}
 if(r.status==='playing'){for(const p of r.players){if(!p.done&&t-p.seen>=GRACE){p.done=true;p.forfeit=true;changed=true;}}if(r.players.some(p=>p.forfeit)||r.players.every(p=>p.done)||t>=r.endAt+1500){for(const p of r.players)p.done=true;result(r,r.players.some(p=>p.forfeit)?'lawan-keluar':t>=r.endAt?'waktu':'skor');changed=true;}}
 return changed;}
function publicView(r,t){return {protocol:2,game:r.game,version:r.version,seq:r.version,status:r.status,seed:r.seed,startAt:r.startAt,endAt:r.endAt,winner:r.winner,reason:r.reason,players:r.players.map(p=>p?{name:p.name,joined:p.joined,seen:p.seen,taps:p.taps,score:p.score,perfects:p.perfects,done:p.done,forfeit:p.forfeit}:null),serverTime:t,grace:GRACE,wait:WAIT,duration:DURATION};}
function createService({store,now=Date.now,seed=()=>randomInt(1,0xffffffff),publish=async()=>{}}){return {async request(action,b={}){
 if(!['get','heartbeat','join','leave','resign','progress'].includes(action))fail(400,'Aksi tidak dikenal.');const key=identity(b.token),mutating=!['get','heartbeat'].includes(action);if(mutating&&(typeof b.requestId!=='string'||!/^[-\w]{8,80}$/.test(b.requestId)))fail(400,'Aksi tidak valid.');
 for(let retry=0;retry<24;retry++){const old=await store.getWithMetadata(KEY,{type:'json'}),r=old?.data||fresh(),t=now();let dirty=sweep(r,t),me=r.players.findIndex(p=>p?.key===key),duplicate=r.requests.some(q=>q.id===b.requestId&&q.key===key);
 if(!duplicate&&action==='join'){if(r.status==='ended'){const keep={game:r.game,version:r.version};Object.assign(r,fresh(),keep);me=-1;}if(me<0){if(r.status!=='lobby')fail(409,'Duel sedang berlangsung. Kamu bisa menonton.');me=r.players.findIndex(p=>!p);if(me<0)fail(409,'Dua kursi sudah terisi.');if(!r.players.some(Boolean)){r.game++;r.seed=seed();}r.players[me]={key,name:nameOf(b.name),joined:t,seen:t,taps:[],score:0,perfects:0,done:false,forfeit:false};dirty=true;dirty=sweep(r,t)||dirty;}}
 else if(!duplicate&&mutating){if(me<0||b.game!==r.game)fail(403,'Kamu sedang menonton.');const p=r.players[me];
  if(action==='leave'&&r.status==='lobby'){r.players[me]=null;me=-1;dirty=true;}
  else if((action==='leave'||action==='resign')&&r.status==='playing'){p.done=true;p.forfeit=true;result(r,'lawan-keluar');dirty=true;}
  else if(action==='progress'&&r.status==='playing'){if(t<r.startAt)fail(409,'Tunggu hitung mundur selesai.');if(p.done)fail(409,'Menaramu sudah selesai.');const taps=b.taps;if(!Array.isArray(taps)||taps.length<p.taps.length||taps.length>MAX_TAPS||taps.some(x=>!Number.isInteger(x)||x<0||x>60000))fail(400,'Rekaman tidak valid.');if(p.taps.some((x,i)=>taps[i]!==x))fail(409,'Rekaman sebelumnya tidak dapat diubah.');const g=replay(r.seed,taps);if(g.aT*1000>Math.min(DURATION,t-r.startAt)+1500)fail(409,'Rekaman mendahului waktu pertandingan.');p.taps=[...taps];p.score=g.n;p.perfects=g.perfects;p.done=g.over||taps.length===MAX_TAPS;p.seen=t;dirty=true;if(r.players.every(p=>p.done))result(r);}
  else if(r.status!=='ended')fail(409,'Pertandingan belum siap.');
 }
 if(!mutating&&me>=0&&b.game===r.game&&r.status!=='ended'&&t-r.players[me].seen>=10000){r.players[me].seen=t;dirty=true;}
 if(mutating&&!duplicate){r.requests=[...r.requests,{id:b.requestId,key}].slice(-40);dirty=true;}
 if(dirty||!old){r.version++;const w=await store.setJSON(KEY,r,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(!w.modified)continue;if(!w.etag)throw Error('Write not confirmed');}const view=publicView(r,t);await publish(view);me=r.players.findIndex(p=>p?.key===key);return {...view,you:me<0?null:me};
 }fail(409,'Duel sedang diperbarui. Coba lagi sebentar.');
 }};}
module.exports={createService,publicView,replay,KEY,GRACE,WAIT,COUNTDOWN,DURATION,MAX_TAPS};
