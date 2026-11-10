(function(root){'use strict';
const KEY='dehayuk.catur.global.v2',NAME='dehayuk.catur.nama',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function nonce(){const a=new Uint8Array(32);crypto.getRandomValues(a);return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function create({onRoom,onConnection,onExit,onSettings,onExport,getClaim}){
 let saved;try{saved=JSON.parse(localStorage.getItem(KEY));}catch(_){}const token=/^[-_\w]{43}$/.test(saved?.token||'')?saved.token:nonce();
 let room=null,active=false,connected=false,pending=false,stream=null,projection=null,seat=null,heartbeat=0,deadline=0,generation=0,received=0,baseTime=0,lastPulse=0,view='',name='',busy=false,lastOffer='';
 try{name=localStorage.getItem(NAME)||'';}catch(_){}
 const dialog=document.createElement('dialog');dialog.id='chessOnline';dialog.setAttribute('aria-labelledby','chessOnlineTitle');document.body.appendChild(dialog);
 function persist(){try{localStorage.setItem(KEY,JSON.stringify({token,active}));localStorage.setItem(NAME,name);}catch(_){}}
 function connection(ok){if(connected!==ok){connected=ok;onConnection?.(ok);}}
 function shell(kind,title,body){view=kind;dialog.innerHTML='<header class="co-head"><span>CATUR · SATU MEJA PUBLIK</span><button id="coClose" aria-label="Tutup">×</button></header><h2 id="chessOnlineTitle">'+title+'</h2>'+body+'<p id="coMessage" role="status" aria-live="polite"></p>';dialog.querySelector('#coClose').onclick=()=>dialog.close();}
 const show=()=>{if(!dialog.open)dialog.showModal();},message=s=>{const el=dialog.querySelector('#coMessage');if(el)el.textContent=s;};
 async function task(fn){if(busy)return;busy=true;const buttons=[...dialog.querySelectorAll('button')].map(b=>[b,b.disabled]);buttons.forEach(([b])=>b.disabled=true);try{await fn();}catch(e){message(e.message);}finally{busy=false;buttons.forEach(([b,disabled])=>{if(b.isConnected)b.disabled=disabled;});}}
 async function http(body){const start=performance.now(),res=await fetch('/.netlify/functions/catur-online',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,...body}),signal:AbortSignal.timeout(15000),cache:'no-store'});let data;try{data=await res.json();}catch(_){throw Error('Sambungan meja belum tersedia. Coba lagi sebentar.');}if(!res.ok)throw Object.assign(Error(data.error||'Sambungan terganggu.'),{status:res.status});return {data,elapsed:performance.now()-start};}
 function normalise(r){r.players=Array.from({length:2},(_,i)=>r.players?.[i]||null);r.k={...r.k,langkah:r.k?.langkah||[]};r.offer=r.offer||null;return r;}
 function accept(data,elapsed=0,fromServer=false){
  normalise(data);const previousGame=room?.game;if(fromServer)seat=data.you===null?null:{game:data.game,id:data.you,color:data.color};
  if(room&&(data.version<room.version||data.version===room.version&&data.serverTime<room.serverTime)){if(!fromServer)return;data={...room};}
  room={...data,you:seat?.game===data.game?seat.id:null,color:seat?.game===data.game?seat.color:null};
  if(room.you!==null&&!room.players[room.you]){room.you=null;room.color=null;seat=null;}
  if(fromServer){received=performance.now();baseTime=data.serverTime+elapsed/2;lastPulse=received;}connection(true);onRoom?.(room);schedule();
  const offer=room.you!==null&&room.offer&&room.offer.by!==room.you?room.game+':'+room.offer.at:'';
  if(offer&&offer!==lastOffer){lastOffer=offer;offerDialog();}else if(!offer&&view==='offer')dialog.close();
  if(room.status==='playing'&&['join','waiting'].includes(view)||view==='result'&&room.game!==previousGame){dialog.close();view='';}
 }
 function apply(path,value){const keys=path.split('/').filter(Boolean);if(!keys.length){projection=value;return;}let obj=projection||(projection={});for(const k of keys.slice(0,-1))obj=obj[k]||(obj[k]={});if(value===null)delete obj[keys.at(-1)];else obj[keys.at(-1)]=value;}
 function subscribe(url,gen){
  if(!url?.startsWith('https://dehayuk78-default-rtdb.asia-southeast1.firebasedatabase.app/caturPublik/v1.json'))throw Error('Kanal meja tidak valid.');
  stream?.close();stream=new EventSource(url);
  const event=e=>{if(gen!==generation)return;try{const d=JSON.parse(e.data);if(e.type==='patch')for(const [k,v]of Object.entries(d.data||{}))apply(d.path.replace(/\/$/,'')+'/'+k,v);else apply(d.path,d.data);if(projection?.protocol===2)accept(structuredClone(projection));}catch(_){connection(false);}};
  stream.addEventListener('put',event);stream.addEventListener('patch',event);stream.onerror=()=>{if(gen===generation)connection(false);};stream.addEventListener('cancel',()=>connection(false));stream.addEventListener('auth_revoked',()=>connection(false));
 }
 async function sync(){if(!active||pending)return;const gen=generation;try{const r=await http({action:'get',game:room?.game});if(gen===generation)accept(r.data,r.elapsed,true);}catch(_){if(gen===generation){connection(false);clearTimeout(deadline);deadline=setTimeout(sync,15000);}}}
 function schedule(){
  clearTimeout(heartbeat);clearTimeout(deadline);if(!active||!room)return;
  if(room.you!==null&&room.status!=='ended')heartbeat=setTimeout(async()=>{if(!active)return;const gen=generation;try{const r=await http({action:'heartbeat',game:room.game});if(gen===generation)accept(r.data,r.elapsed,true);}catch(_){if(gen===generation){connection(false);heartbeat=setTimeout(sync,15000);}}},Math.max(1000,30000-(performance.now()-lastPulse)));
  let end=Infinity;if(room.status==='playing'){const col=room.k.langkah.length%2?'b':'w';end=Math.min(room.clockAt+room.remaining[col],...room.players.filter(Boolean).map(p=>p.seen+room.grace));}
  if(room.status==='lobby')for(const p of room.players.filter(Boolean))end=Math.min(end,p.seen+room.grace,p.joined+room.wait);
  if(Number.isFinite(end))deadline=setTimeout(sync,Math.min(2147483647,Math.max(500,end-serverNow())+500+Math.random()*2000));
 }
 function serverNow(){return baseTime+performance.now()-received;}
 async function send(action,extra={}){
  if(!active||pending)throw Error('Tunggu sambungan meja.');const gen=generation,body={action,game:room?.game,seq:room?.seq,requestId:nonce(),...extra};pending=true;onConnection?.(connected);
  try{let r;try{r=await http(body);}catch(e){if(e.status)throw e;r=await http(body);}if(gen===generation)accept(r.data,r.elapsed,true);return r.data;}
  catch(e){if(!e.status)connection(false);throw e;}
  finally{pending=false;onConnection?.(connected);if(gen===generation){schedule();if(!connected)sync();}}
 }
 function exit(){generation++;active=false;stream?.close();stream=null;projection=null;clearTimeout(heartbeat);clearTimeout(deadline);room=null;seat=null;dialog.close();persist();connection(false);onExit?.();}
 async function open(){
  if(active&&room){menu();return;}shell('loading','Meja catur dunia','<p class="co-lead">Menyambungkan ke satu papan yang sama…</p>');show();const gen=++generation;
  try{const r=await http({action:'get'});if(gen!==generation)return;active=true;persist();accept(r.data,r.elapsed,true);subscribe(r.data.streamUrl,gen);dialog.close();}
  catch(e){if(gen!==generation)return;shell('error','Belum tersambung','<p class="co-lead">'+esc(e.message)+'</p><button id="coRetry" class="co-primary co-full">Coba lagi</button><button id="coOffline" class="co-secondary co-full">Kembali · main offline</button>');dialog.querySelector('#coRetry').onclick=open;dialog.querySelector('#coOffline').onclick=exit;show();}
 }
 function join(){
  shell('join','Ikut bermain','<p class="co-lead">'+(room.status==='ended'?'Partai sebelumnya sudah selesai. Kursi tersedia untuk partai baru.':'Dua pemain bermain; pengunjung lain menonton. Partai dimulai saat lawan bergabung.')+'</p><label class="co-label">Nama kamu<input id="coName" maxlength="20" autocomplete="nickname" value="'+esc(name)+'" placeholder="Contoh: Budi"></label><p class="co-hint">15 menit + 10 detik per langkah · tanpa uang asli</p><button id="coJoin" class="co-primary co-full">Ambil kursi yang tersedia</button><button id="coWatch" class="co-secondary co-full">Tetap menonton</button>');
  dialog.querySelector('#coJoin').onclick=()=>task(async()=>{name=dialog.querySelector('#coName').value.trim();if(!name){dialog.querySelector('#coName').focus();throw Error('Isi nama kamu dulu, ya.');}await send('join',{name});persist();dialog.close();});dialog.querySelector('#coWatch').onclick=()=>dialog.close();show();
 }
 function menu(){
  if(!room)return open();const player=room.you!==null,playing=room.status==='playing';
  shell('menu',player?(playing?'Menu pertandingan':'Kursimu sudah terisi'):'Kamu sedang menonton','<p class="co-lead">'+(playing?(player?'Jam tetap berjalan saat menu dibuka.':'Putih dan Hitam sedang bermain di papan yang sama. Kamu bisa mengikuti setiap langkahnya.'):(room.status==='ended'?'Pertandingan selesai. Dua kursi terbuka untuk partai berikutnya.':player?'Menunggu seorang lawan bergabung. Pertandingan akan dimulai otomatis.':'Pilih Ikut bermain untuk mengisi kursi kosong.'))+'</p><button id="coBack" class="co-primary co-full">Kembali ke papan</button>'+(!player&&room.status!=='playing'||room.status==='ended'?'<button id="coSeat" class="co-secondary co-full">'+(room.status==='ended'?'Main partai baru':'Ikut bermain')+'</button>':'')+(player&&playing?'<button id="coDraw" class="co-secondary co-full">Tawarkan / klaim remis</button><button id="coResign" class="co-secondary co-danger co-full">Menyerah</button>':'')+'<button id="coSound" class="co-secondary co-full">Atur suara</button><button id="coOffline" class="co-link co-full">Kembali ke pilihan game</button>');
  dialog.querySelector('#coBack').onclick=()=>dialog.close();if(dialog.querySelector('#coSeat'))dialog.querySelector('#coSeat').onclick=join;if(dialog.querySelector('#coDraw'))dialog.querySelector('#coDraw').onclick=draw;if(dialog.querySelector('#coResign'))dialog.querySelector('#coResign').onclick=resign;
  dialog.querySelector('#coSound').onclick=()=>{dialog.close();onSettings?.();};dialog.querySelector('#coOffline').onclick=()=>player&&playing?resign(true):task(async()=>{if(player&&room.status==='lobby')await send('leave');exit();});show();
 }
 function resign(leaving=false){if(room?.you===null)return;shell('resign','Yakin ingin menyerah?','<p class="co-lead">Partai akan berakhir. Jika sambungan terputus sebentar, kamu punya dua menit untuk kembali tanpa menyerah.</p><button id="coKeep" class="co-primary co-full">Tetap bermain</button><button id="coConfirmResign" class="co-secondary co-danger co-full">Ya, menyerah'+(leaving?' dan keluar':'')+'</button>');dialog.querySelector('#coKeep').onclick=()=>dialog.close();dialog.querySelector('#coConfirmResign').onclick=()=>task(async()=>{await send('resign');if(leaving)exit();});show();}
 function draw(){if(room?.you===null||room?.status!=='playing')return;if(room.offer&&room.offer.by!==room.you)return offerDialog();const claim=getClaim?.();shell('draw',claim?'Klaim hasil remis':'Tawarkan remis','<p class="co-lead">'+(claim?'Posisi memenuhi syarat klaim remis.':'Lawan boleh menerima tawaran ini atau melanjutkan bermain. Jam tetap berjalan.')+'</p><button id="coOffer" class="co-primary co-full" '+(room.offer?'disabled':'')+'>'+(claim?'Klaim remis':room.offer?'Menunggu jawaban lawan…':'Kirim tawaran')+'</button>');dialog.querySelector('#coOffer').onclick=()=>task(async()=>{await send(claim?'claim':'offer');if(view==='draw')dialog.close();});show();}
 function offerDialog(){shell('offer','Lawan menawarkan remis','<p class="co-lead">Remis berarti partai berakhir seri. Kamu boleh tetap bermain.</p><button id="coAccept" class="co-primary co-full">Terima remis</button><button id="coDecline" class="co-secondary co-full">Lanjutkan bermain</button>');dialog.querySelector('#coAccept').onclick=()=>task(()=>send('accept'));dialog.querySelector('#coDecline').onclick=()=>task(async()=>{await send('decline');dialog.close();});show();}
 function result(){if(room?.status!=='ended')return;const text=room.result==='1/2'?'Partai berakhir remis':(room.result==='1-0'?'Putih':'Hitam')+' menang',reason={skakmat:'Skakmat',pat:'Pat',bahan:'Bidak tidak cukup untuk skakmat',waktu:'Waktu bermain habis',terputus:'Sambungan pemain tidak kembali dalam dua menit',menyerah:'Pemain menyerah',sepakat:'Kedua pemain sepakat remis',ulangan:'Pengulangan posisi','50langkah':'Aturan 75 langkah','klaim-ulangan':'Klaim pengulangan posisi','klaim-50':'Klaim aturan 50 langkah'}[room.reason]||'Pertandingan selesai';shell('result',text,'<div class="co-result-icon" aria-hidden="true">'+(room.result==='1/2'?'½':'♚')+'</div><p class="co-lead">'+esc(reason)+'. Kursi tersedia untuk partai berikutnya.</p><button id="coNew" class="co-primary co-full">Ikut partai berikutnya</button><button id="coResultBack" class="co-secondary co-full">Lihat papan terakhir</button><button id="coExport" class="co-link co-full">Simpan notasi partai (PGN)</button>');dialog.querySelector('#coNew').onclick=join;dialog.querySelector('#coResultBack').onclick=()=>dialog.close();dialog.querySelector('#coExport').onclick=()=>onExport?.();show();}
 dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();});window.addEventListener('online',()=>{if(active)sync();});document.addEventListener('visibilitychange',()=>{if(active&&!document.hidden)sync();});
 if(saved?.active)setTimeout(open,250);else persist();
 return {open,menu,join,draw,resign,result,send,leave:exit,close:()=>dialog.close(),get active(){return active;},get room(){return room;},get connected(){return connected;},get pending(){return pending;},get visible(){return dialog.open;},remaining(color){return !room?0:Math.max(0,room.remaining[color]-(room.status==='playing'&&(room.k.langkah.length%2?'b':'w')===color?Math.max(0,serverNow()-room.clockAt):0));},escape:esc};
}
root.CaturOnline={create};
})(window);
