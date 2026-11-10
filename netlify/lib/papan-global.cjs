'use strict';
const {createHash,randomInt}=require('node:crypto');
require('../../ular-tangga/mesin.js');const Ular=globalThis.UlarMesin;
const Congklak=require('./congklak-engine.cjs');
const GAMES=new Set(['ular-tangga','congklak']);
const GRACE=120000,WAIT=300000,TURN=45000;
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const hash=value=>createHash('sha256').update(value).digest('hex');
const clone=value=>JSON.parse(JSON.stringify(value));
function keyOf(token){if(typeof token!=='string'||!/^[-_\w]{43}$/.test(token))fail(401,'Sesi tidak valid. Muat ulang halaman.');return hash(token);}
function nameOf(value){return String(value||'Pemain').normalize('NFKC').replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,18)||'Pemain';}
function adapter(game){
 if(game==='ular-tangga')return {
  fresh:()=>Ular.create(2,randomInt(1,0x7fffffff)),
  valid:state=>Ular.valid(state)&&state.count===2,
  act:(state)=>Ular.roll(state,randomInt(1,7)),
  automatic:(state)=>Ular.roll(state,randomInt(1,7)),
  winner:state=>state.winner,
  event:(before,after)=>({type:'roll',player:before.turn,die:after.die})
 };
 return {
  fresh:gameNo=>Congklak.newGame(null,gameNo&1),
  valid:state=>Congklak.valid(state),
  act:(state,body)=>{const next=clone(state),result=Congklak.play(next,body.pit,false);return result?next:null;},
  automatic:(state)=>{const legal=Congklak.legal(state);if(!legal.length)return state;const next=clone(state);Congklak.play(next,legal[randomInt(0,legal.length)],false);return next;},
  winner:state=>state.over?state.winner:null,
  event:(before,after,body)=>({type:'move',player:before.turn,pit:body.pit})
 };
}
function fresh(gameNo=0){return {protocol:1,game:gameNo,version:0,seq:0,status:'lobby',players:[null,null],state:null,deadline:0,winner:null,reason:'',events:[],requests:[]};}
const alive=room=>room.players.filter(player=>player&&!player.left);
const member=(room,key)=>room.players.find(player=>player?.key===key&&!player.left);
function event(room,type,fields={}){room.seq++;room.events.push({seq:room.seq,type,...fields});room.events=room.events.slice(-12);}
function end(room,winner,reason,time){room.status='ended';room.winner=winner;room.reason=reason;room.deadline=0;room.finishedAt=time;event(room,'ended',{winner,reason});}
function start(room,time,game){room.state=adapter(game).fresh(room.game);room.status='playing';room.deadline=time+TURN;for(const player of alive(room))player.human=time;event(room,'start');}
function retire(room,seat,reason,time){const player=room.players[seat];if(!player||player.left)return;player.left=true;event(room,'retire',{player:seat,reason});const rest=alive(room);end(room,rest[0]?.seat??null,rest.length?'lawan-keluar':'ditinggalkan',time);}
function applyAction(room,game,body,time,automatic=false){const rules=adapter(game),before=clone(room.state),next=automatic?rules.automatic(room.state):rules.act(room.state,body);if(!next)fail(409,game==='congklak'?'Pilih lubang milikmu yang masih berisi.':'Giliran tidak dapat dijalankan.');room.state=next;event(room,(game==='congklak'?'move':'roll'),{...rules.event(before,next,body),automatic});const winner=rules.winner(next);if(winner!==null&&winner!==undefined)end(room,winner,'selesai',time);else room.deadline=time+TURN;}
function sweep(room,game,time){let dirty=false;if(room.status==='lobby'){for(let seat=0;seat<2;seat++){const p=room.players[seat];if(p&&(time-p.seen>=GRACE||time-p.joined>=WAIT)){room.players[seat]=null;dirty=true;}}}
 if(room.status==='playing'){
  const present=alive(room);if(present.length&&present.every(player=>time-player.seen>=GRACE)){for(const player of present)player.left=true;end(room,null,'ditinggalkan',time);dirty=true;}
  else {for(const player of [...present])if(time-player.seen>=GRACE&&room.status==='playing'){retire(room,player.seat,'terputus',time);dirty=true;}}
  if(room.status==='playing'&&time>=room.deadline){applyAction(room,game,{},time,true);dirty=true;}
 }
 return dirty;
}
function publicView(room,time){return {protocol:1,game:room.game,version:room.version,seq:room.seq,status:room.status,players:room.players.map(p=>p?{seat:p.seat,name:p.name,joined:p.joined,seen:p.seen,left:p.left}:null),state:room.state,events:room.events,deadline:room.deadline,winner:room.winner,reason:room.reason,serverTime:time,turnMs:TURN,grace:GRACE};}
function createService({store,now=Date.now,publish=async()=>{}}){
 async function request(action,body={}){
  const game=body.gameId;if(!GAMES.has(game))fail(400,'Game online tidak dikenal.');if(!['get','heartbeat','join','leave','act','move','resign'].includes(action))fail(400,'Aksi tidak dikenal.');
  const key=keyOf(body.token),mutating=!['get','heartbeat'].includes(action),rules=adapter(game);
  if(mutating&&(typeof body.requestId!=='string'||!/^[-\w]{8,80}$/.test(body.requestId)))fail(400,'Aksi tidak valid. Muat ulang halaman.');
  const blobKey='global-'+game;
  for(let attempt=0;attempt<24;attempt++){
   const old=await store.getWithMetadata(blobKey,{type:'json'}),room=old?.data||fresh(),time=now();let dirty=sweep(room,game,time),me=member(room,key),duplicate=room.requests.some(item=>item.id===body.requestId&&item.key===key),conflict=false;
   if(!mutating&&me&&body.game===room.game&&room.status!=='ended'&&time-me.seen>=12000){me.seen=time;dirty=true;}
   if(!duplicate&&action==='join'){
    if(room.status==='ended'){const nextGame=room.game+1,version=room.version;Object.assign(room,fresh(nextGame));room.version=version;me=null;}
    if(!me){if(room.status!=='lobby')fail(409,'Pertandingan sedang berlangsung. Kamu bisa menonton.');const seat=room.players.findIndex(player=>!player);if(seat<0)fail(409,'Dua kursi sudah terisi. Kamu tetap bisa menonton.');me={seat,key,name:nameOf(body.name),joined:time,seen:time,human:time,left:false};room.players[seat]=me;dirty=true;event(room,'join',{player:seat});if(alive(room).length===2)start(room,time,game);}
   }else if(!duplicate&&mutating){
    if(!me||body.game!==room.game)fail(403,'Kamu sedang menonton. Hanya pemain yang bisa melakukan ini.');
    if(action==='leave'&&room.status==='lobby'){room.players[me.seat]=null;me=null;dirty=true;}
    else if((action==='leave'||action==='resign')&&room.status==='playing'){retire(room,me.seat,'menyerah',time);dirty=true;}
    else if(dirty&&(body.seq!==room.seq||room.status==='ended'))conflict=true;
    else {
     if(room.status!=='playing')fail(409,'Pertandingan belum dimulai atau sudah selesai.');if(body.seq!==room.seq)fail(409,'Papan sudah berubah. Tunggu pembaruan.');if(room.state.turn!==me.seat)fail(403,'Tunggu giliranmu.');
     if(game==='ular-tangga'&&action!=='act')fail(400,'Aksi Ular Tangga tidak dikenal.');if(game==='congklak'&&action!=='move')fail(400,'Aksi Congklak tidak dikenal.');
     applyAction(room,game,body,time);me.human=time;me.seen=time;dirty=true;
    }
   }
   if(!duplicate&&mutating){room.requests=[...room.requests,{id:body.requestId,key}].slice(-60);dirty=true;}
   if(room.state&&!rules.valid(room.state))throw Error('Invalid authoritative '+game+' state');
   if(dirty||!old){room.version++;const written=await store.setJSON(blobKey,room,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(!written.modified)continue;if(!written.etag)throw Error('Write not confirmed');}
   const view=publicView(room,time);await publish(game,view);me=member(room,key);return {...view,you:me?.seat??null,conflict};
  }
  fail(409,'Meja sedang diperbarui. Coba lagi sebentar.');
 }
 return {request};
}
module.exports={createService,publicView,fresh,TURN,GRACE,GAMES};
