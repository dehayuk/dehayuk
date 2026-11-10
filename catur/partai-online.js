'use strict';
let coGame=-1,coResult=-1,coSeq=-1,coText='',coLastTime=0;
const coPauseMarkup=$('bPause').innerHTML;
function onlineName(color){const p=onlineRoom?.players.find(p=>p?.color===color);return (p?.name||(color==='w'?'Putih':'Hitam'))+(color===G.me?' (kamu)':'');}
function onlineReset(r){
 wId++;wCb=null;closePromo();drag=null;BAN=null;TXT=[];G=newG('online');G.k=r.k;G.info=CT.info(r.k);G.me=r.color;G.flip=r.color==='b';coGame=r.game;coResult=-1;
 const u=r.k.langkah.at(-1);G.last=u?[sqi(u.slice(0,2)),sqi(u.slice(2,4))]:null;showPlayUI();renderAll(G.info.papan,true);drawSquares();drawHL();updateBars();updateStrip();$('hTag').textContent=r.color?'Online':'Menonton';$('hBestP').hidden=true;$('bPause').setAttribute('aria-label','Menu pertandingan');$('bPause').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h14" stroke="#fff6d8" stroke-width="3" stroke-linecap="round"/></svg>';hintText(r.color?'Ketuk bidakmu, lalu ketuk kotak tujuan.':'Satu papan publik · dua pemain');phase='input';
}
function receiveOnline(r){
 onlineRoom=r;$('bOnline').querySelector('span:nth-child(2)').firstChild.textContent='Catur online';
 if(!['lobby','playing','ended'].includes(r.status))return;
 if(!isOnline()||coGame!==r.game||G.me!==r.color)onlineReset(r);
 else if(coSeq!==r.seq){
  const prior=G.k.langkah,next=r.k.langkah,one=next.length===prior.length+1&&prior.every((m,i)=>m===next[i]);
  closePromo();if(drag){const el=EL[drag.i];if(el){el.classList.remove('drag');placeEl(el,drag.i);}drag=null;}
  if(one&&!document.hidden){const before=G.info.giliran;phase='anim';commitMove(next.at(-1),before===G.me,false);}
  else if(JSON.stringify(G.k)!==JSON.stringify(r.k)){G.k=r.k;G.info=CT.info(r.k);const u=next.at(-1);G.last=u?[sqi(u.slice(0,2)),sqi(u.slice(2,4))]:null;G.sel=-1;G.hint=null;renderAll(G.info.papan,false);drawHL();updateBars();updateStrip();phase='input';}
 }
 coSeq=r.seq;if(r.status==='ended'&&coResult!==r.game){if(phase==='anim')later(320,onlineFinish);else onlineFinish();}else if(phase!=='anim'&&phase!=='promo')onlineNextTurn();tickOnline();
}
function onlineNextTurn(){if(!isOnline()||!onlineRoom)return;if(onlineRoom.status==='ended'){onlineFinish();return;}if(onlineRoom.status!=='playing'){phase='';setTurnChip(onlineRoom.you!==null?'Menunggu lawan':'Kursi tersedia');return;}phase=chessOnline.pending?'sending':'input';const mine=G.info.giliran===G.me,txt=!chessOnline.connected?'Menyambung…':chessOnline.pending?'Mengirim langkah…':onlineRoom.you===null?(G.info.skak?'Skak!':(G.info.giliran==='w'?'Giliran Putih':'Giliran Hitam')):mine?(G.info.skak?'Giliranmu · Skak!':'Giliranmu'):(G.info.skak?'Lawan sedang skak':'Giliran teman');if($('hTurnT').textContent!==txt)setTurnChip(txt,G.info.giliran==='b'?'b':'');updateBars();}
async function sendOnlineMove(u,dropped){if(!isOnline()||!humanTurn()||phase!=='input'&&phase!=='promo')return;if(dropped){const fr=sqi(u.slice(0,2));if(EL[fr])placeEl(EL[fr],fr,true);}closePromo();phase='sending';G.sel=-1;drawHL();try{await chessOnline.send('move',{move:u});}catch(e){KIT.ui.toast(e.message);}if(isOnline()&&phase==='sending')onlineNextTurn();}
function onlineFinish(){if(!isOnline()||!onlineRoom||onlineRoom.status!=='ended'||coResult===onlineRoom.game)return;coResult=onlineRoom.game;mode='over';phase='';closePromo();drag=null;G.sel=-1;drawHL();hintText('');if(onlineRoom.you!==null)chessOnline.result();else setTurnChip(onlineRoom.result==='1/2'?'Remis':onlineRoom.result==='1-0'?'Putih menang':'Hitam menang');const draw=onlineRoom.result==='1/2',win=onlineRoom.result===(G.me==='w'?'1-0':'0-1');if(onlineRoom.you!==null)(draw?SFX.draw:win?SFX.win:SFX.lose)();tickOnline();}
function tickOnline(){
 const active=isOnline();for(const id of ['coClockTop','coClockBot','coLive'])$(id).hidden=!active;if(!active)return;
 const top=G.flip?'w':'b',bottom=G.flip?'b':'w';for(const [id,col]of [['coClockTop',top],['coClockBot',bottom]]){const ms=chessOnline.remaining(col),s=Math.ceil(ms/1000),el=$(id),text=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');if(el.textContent!==text)el.textContent=text;el.dataset.running=String(onlineRoom.status==='playing'&&G.info.giliran===col);el.dataset.low=String(ms<30000);}
 const t=onlineRoom.status,player=onlineRoom.you!==null,text=!chessOnline.connected?'Sambungan terputus · menyambung kembali…':t==='ended'?'Partai selesai · kursi terbuka untuk partai berikutnya':t==='lobby'?(player?'Menunggu lawan · partai dimulai otomatis':'Kursi tersedia · pilih Ikut bermain'):player?(G.me==='w'?'Kamu Putih · giliran ditandai di papan':'Kamu Hitam · papan menghadapmu'):'Menonton langsung · '+onlineName('w')+' melawan '+onlineName('b');if(coText!==text){coText=text;$('coLive').textContent=text;}
 $('bw').dataset.onlineTurn=String(humanTurn());$('aOnlineDraw').hidden=!player||t!=='playing';$('aOnlineDraw').disabled=t!=='playing'||!chessOnline.connected||chessOnline.pending;
 $('aOnlineMenu').textContent=t==='ended'?'Partai berikutnya':!player&&t==='lobby'?'Ikut bermain':'Menu';

}
function exportOnline(){if(!G||!onlineRoom)return;const safe=s=>String(s||'').replace(/["\\\r\n]/g,''),white=onlineRoom.players.find(p=>p?.color==='w')?.name,black=onlineRoom.players.find(p=>p?.color==='b')?.name,result=onlineRoom.result==='1/2'?'1/2-1/2':onlineRoom.result||'*',moves=CT.sanList(G.k),date=new Date().toLocaleDateString('sv-SE').replace(/-/g,'.');let body='';moves.forEach((m,i)=>{body+=(i%2===0?(i/2+1)+'. ':'')+m+' ';});const pgn='[Event "Catur Dehayuk — Meja Publik"]\n[Site "https://dehayuk.online"]\n[Date "'+date+'"]\n[White "'+safe(white)+'"]\n[Black "'+safe(black)+'"]\n[Result "'+result+'"]\n\n'+body+result+'\n',url=URL.createObjectURL(new Blob([pgn],{type:'application/x-chess-pgn'})),a=document.createElement('a');a.href=url;a.download='catur-dehayuk-'+onlineRoom.game+'.pgn';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
chessOnline=CaturOnline.create({onRoom:receiveOnline,onConnection(){if(isOnline()&&phase!=='anim'&&phase!=='promo')onlineNextTurn();tickOnline();},onExit(){onlineRoom=null;coGame=-1;coSeq=-1;coResult=-1;toTitle();tickOnline();$('bPause').innerHTML=coPauseMarkup;$('bPause').setAttribute('aria-label','Jeda');$('bOnline').querySelector('span:nth-child(2)').firstChild.textContent='Main online';},onSettings:()=>KIT.ui.openSettings(),onExport:exportOnline,getClaim:()=>{if(!isOnline()||G.info.giliran!==G.me)return false;const c=G.info.remisKlaim;return c.ulangan||c.limapuluh;}});
$('bOnline').disabled=false;$('bOnline').onclick=()=>chessOnline.open();$('aOnlineDraw').onclick=()=>chessOnline.draw();$('aOnlineMenu').onclick=()=>onlineRoom?.status==='ended'||onlineRoom?.status==='lobby'&&onlineRoom.you===null?chessOnline.join():chessOnline.menu();setInterval(tickOnline,200);
