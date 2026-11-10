(function(root){'use strict';
const KEY='dehayuk.ludo.global.v2',NAME='dehayuk.ludo.nama',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function nonce(){const a=new Uint8Array(32);crypto.getRandomValues(a);return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function create({onRoom,onConnection,onExit,onSettings,autoResume=true}){
 let saved;try{saved=JSON.parse(localStorage.getItem(KEY));}catch(_){}const token=/^[-_\w]{43}$/.test(saved?.token||'')?saved.token:nonce();
 let room=null,active=false,connected=false,pending=false,stream=null,projection=null,seat=null,heartbeat=0,deadline=0,generation=0,received=0,baseTime=0,lastPulse=0,view='',name='',busy=false,settingsOverlay=null;
 try{name=localStorage.getItem(NAME)||'';}catch(_){}
 const dialog=document.createElement('dialog');dialog.id='ludoOnline';dialog.setAttribute('aria-labelledby','ludoOnlineTitle');document.body.appendChild(dialog);
 function persist(){try{localStorage.setItem(KEY,JSON.stringify({token,active}));localStorage.setItem(NAME,name);}catch(_){}}
 function connection(ok){if(connected!==ok){connected=ok;onConnection?.(ok);}}
 function shell(kind,title,body){view=kind;dialog.innerHTML='<header class="lo-head"><span>LUDO · SATU MEJA PUBLIK</span><button id="loClose" aria-label="Tutup">×</button></header><h2 id="ludoOnlineTitle">'+title+'</h2>'+body+'<p id="loMessage" role="status" aria-live="polite"></p>';dialog.querySelector('#loClose').onclick=()=>dialog.close();}
 const show=()=>{if(!dialog.open)dialog.showModal();},message=s=>{const el=dialog.querySelector('#loMessage');if(el)el.textContent=s;};
 async function task(fn){if(busy)return;busy=true;const buttons=[...dialog.querySelectorAll('button')].map(b=>[b,b.disabled]);buttons.forEach(([b])=>b.disabled=true);try{await fn();}catch(e){message(e.message);}finally{busy=false;buttons.forEach(([b,disabled])=>{if(b.isConnected)b.disabled=disabled;});}}
 async function http(body){const start=performance.now(),res=await fetch('/.netlify/functions/ludo-online',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,...body}),signal:AbortSignal.timeout(15000),cache:'no-store'});let data;try{data=await res.json();}catch(_){throw Error('Sambungan meja belum tersedia. Coba lagi sebentar.');}if(!res.ok)throw Object.assign(Error(data.error||'Sambungan terganggu.'),{status:res.status});return {data,elapsed:performance.now()-start};}
 function normalise(r){r.players=Array.from({length:4},(_,i)=>r.players?.[i]||null);r.events=r.events||[];r.misses=r.misses||{};r.winner??=null;r.countdownAt??=null;if(r.state){r.state.winner??=null;r.state.last??=null;if(r.state.last?.type==='move')r.state.last.captured??=[];}return r;}
 function accept(data,elapsed=0,fromServer=false){
  normalise(data);const previousGame=room?.game;if(fromServer)seat=data.you===null?null:{game:data.game,id:data.you,color:data.color};
  if(room&&(data.version<room.version||data.version===room.version&&data.serverTime<room.serverTime)){if(!fromServer)return;data={...room};}
  room={...data,you:seat?.game===data.game?seat.id:null,color:seat?.game===data.game?seat.color:null};
  if(room.you!==null&&(!room.players[room.you]||room.players[room.you].left)){room.you=null;room.color=null;seat=null;}
  if(fromServer){received=performance.now();baseTime=data.serverTime+elapsed/2;lastPulse=received;}connection(true);onRoom?.(room);schedule();
  if(room.you!==null&&view==='join'){dialog.close();view='';}if(view==='result'&&room.game!==previousGame){dialog.close();view='';}
 }
 function apply(path,value){const keys=path.split('/').filter(Boolean);if(!keys.length){projection=value;return;}let obj=projection||(projection={});for(const k of keys.slice(0,-1))obj=obj[k]||(obj[k]={});if(value===null)delete obj[keys.at(-1)];else obj[keys.at(-1)]=value;}
 function subscribe(url,gen){
  if(!url?.startsWith('https://dehayuk78-default-rtdb.asia-southeast1.firebasedatabase.app/ludoPublik/v1.json'))throw Error('Kanal meja tidak valid.');
  stream?.close();stream=new EventSource(url);
  const event=e=>{if(gen!==generation)return;try{const d=JSON.parse(e.data);if(e.type==='patch')for(const [k,v]of Object.entries(d.data||{}))apply(d.path.replace(/\/$/,'')+'/'+k,v);else apply(d.path,d.data);if(projection?.protocol===2)accept(structuredClone(projection));}catch(_){connection(false);}};
  stream.addEventListener('put',event);stream.addEventListener('patch',event);stream.onerror=()=>{if(gen===generation)connection(false);};stream.addEventListener('cancel',()=>connection(false));stream.addEventListener('auth_revoked',()=>connection(false));
 }
 async function sync(){if(!active||pending)return;const gen=generation;try{const r=await http({action:'get',game:room?.game});if(gen===generation)accept(r.data,r.elapsed,true);}catch(_){if(gen===generation){connection(false);clearTimeout(deadline);deadline=setTimeout(sync,15000);}}}
 function schedule(){
  clearTimeout(heartbeat);clearTimeout(deadline);if(!active||!room)return;
  if(room.you!==null&&room.status!=='ended')heartbeat=setTimeout(async()=>{if(!active)return;const gen=generation;try{const r=await http({action:'heartbeat',game:room.game});if(gen===generation)accept(r.data,r.elapsed,true);}catch(_){if(gen===generation){connection(false);heartbeat=setTimeout(sync,15000);}}},Math.max(1000,30000-(performance.now()-lastPulse)));
  let end=Infinity;if(room.status==='playing')end=Math.min(room.deadline,...room.players.filter(p=>p&&!p.left).map(p=>p.seen+room.grace));
  if(room.status==='lobby'){if(room.countdownAt)end=Math.min(end,room.countdownAt);for(const p of room.players.filter(Boolean))end=Math.min(end,p.seen+room.grace,p.joined+room.wait);}
  const jitter=room.you!==null?200+Math.random()*500:3000+Math.random()*9000;
  if(Number.isFinite(end))deadline=setTimeout(sync,Math.min(2147483647,Math.max(250,end-serverNow())+jitter));
 }
 function serverNow(){return baseTime+performance.now()-received;}
 async function send(action,extra={}){
  if(!active||pending)throw Error('Tunggu sambungan meja.');const gen=generation,body={action,game:room?.game,seq:room?.seq,requestId:nonce(),...extra};pending=true;onConnection?.(connected);
  try{let r;try{r=await http(body);}catch(e){if(e.status)throw e;r=await http(body);}if(gen===generation)accept(r.data,r.elapsed,true);return r.data;}
  catch(e){if(!e.status)connection(false);else setTimeout(sync,0);throw e;}
  finally{pending=false;onConnection?.(connected);if(gen===generation){schedule();if(!connected)sync();}}
 }
 function exit(){generation++;active=false;stream?.close();stream=null;projection=null;clearTimeout(heartbeat);clearTimeout(deadline);room=null;seat=null;dialog.close();persist();connection(false);onExit?.();}
 async function open(){
  if(active&&room){menu();return;}shell('loading','Meja Ludo bersama','<p class="lo-lead">Menyambungkan ke satu papan yang sama…</p>');show();const gen=++generation;
  try{const r=await http({action:'get'});if(gen!==generation)return;active=true;persist();accept(r.data,r.elapsed,true);subscribe(r.data.streamUrl,gen);dialog.close();}
  catch(e){if(gen!==generation)return;shell('error','Belum tersambung','<p class="lo-lead">'+esc(e.message)+'</p><button id="loRetry" class="lo-primary lo-full">Coba lagi</button><button id="loOffline" class="lo-secondary lo-full">Kembali · main offline</button>');dialog.querySelector('#loRetry').onclick=open;dialog.querySelector('#loOffline').onclick=exit;show();}
 }
 const colors=['Merah','Hijau','Biru','Kuning'];
 function join(){
  if(room?.status==='playing')return menu();
  let selected=[0,2,1,3].find(i=>room.status==='ended'||!room.players[i]);
  shell('join','Ikut bermain','<p class="lo-lead">Pilih warna dan isi nama. Saat dua pemain siap, hitung mundur 20 detik memberi kesempatan pemain lain bergabung.</p><label class="lo-label">Nama kamu<input id="loName" maxlength="20" autocomplete="nickname" value="'+esc(name)+'" placeholder="Contoh: Budi"></label><fieldset class="lo-colors"><legend>Warna kamu</legend>'+colors.map((n,i)=>'<button type="button" data-color="'+i+'" aria-pressed="'+(selected===i)+'" '+(room.status!=='ended'&&room.players[i]?'disabled':'')+'>'+n+(room.status!=='ended'&&room.players[i]?' · terisi':'')+'</button>').join('')+'</fieldset><p class="lo-hint">Cepat · 2 bidak · 2–4 pemain · tanpa uang asli</p><button id="loJoin" class="lo-primary lo-full">Ikut bermain</button><button id="loWatch" class="lo-secondary lo-full">Tetap menonton</button>');
  dialog.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.color);dialog.querySelectorAll('[data-color]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));});
  dialog.querySelector('#loJoin').onclick=()=>task(async()=>{name=dialog.querySelector('#loName').value.trim();if(!name){dialog.querySelector('#loName').focus();throw Error('Isi nama kamu dulu, ya.');}await send('join',{name,color:selected});persist();dialog.close();});dialog.querySelector('#loWatch').onclick=()=>dialog.close();show();
 }
 function menu(){
  if(!room)return open();const player=room.you!==null,playing=room.status==='playing';
  shell('menu',player?'Menu pertandingan':'Kamu sedang menonton','<p class="lo-lead">'+(playing?(player?'Giliran tetap berjalan ketika menu dibuka.':'Semua pengunjung mengikuti papan yang sama. Tunggu partai selesai untuk ikut bermain.'):(room.status==='ended'?'Partai selesai. Kursi tersedia untuk pertandingan berikutnya.':player?'Kursimu tersimpan. Permainan dimulai otomatis setelah ada lawan.':'Ambil warna yang tersedia untuk ikut bermain.'))+'</p><button id="loBack" class="lo-primary lo-full">Kembali ke papan</button>'+(!playing?'<button id="loSeat" class="lo-secondary lo-full">'+(room.status==='ended'?'Ikut partai berikutnya':player?'Kamu bermain '+colors[room.color]:'Ikut bermain')+'</button>':'')+'<button id="loRules" class="lo-secondary lo-full">Aturan meja online</button><button id="loSound" class="lo-secondary lo-full">Setelan suara dan animasi</button>'+(player&&playing?'<button id="loResign" class="lo-link lo-full">Menyerah</button>':'')+'<button id="loOffline" class="lo-link lo-full">Kembali · main offline</button>');
  dialog.querySelector('#loBack').onclick=()=>dialog.close();if(dialog.querySelector('#loSeat')){dialog.querySelector('#loSeat').disabled=player&&room.status==='lobby';dialog.querySelector('#loSeat').onclick=join;}dialog.querySelector('#loRules').onclick=rules;dialog.querySelector('#loSound').onclick=settings;if(dialog.querySelector('#loResign'))dialog.querySelector('#loResign').onclick=()=>resign(false);
  dialog.querySelector('#loOffline').onclick=()=>player&&playing?resign(true):task(async()=>{if(player&&room.status==='lobby')await send('leave');exit();});show();
 }
 function resign(leaving=false){if(room?.you===null)return;shell('resign','Yakin ingin menyerah?','<p class="lo-lead">Kursimu ditutup untuk partai ini dan pemain lain melanjutkan. Jika koneksi terputus sebentar, kamu punya dua menit untuk kembali.</p><button id="loKeep" class="lo-primary lo-full">Tetap bermain</button><button id="loConfirm" class="lo-secondary lo-full">Ya, menyerah'+(leaving?' dan keluar':'')+'</button>');dialog.querySelector('#loKeep').onclick=()=>dialog.close();dialog.querySelector('#loConfirm').onclick=()=>task(async()=>{await send('resign');if(leaving)exit();else dialog.close();});show();}
 function settings(){dialog.close();settingsOverlay=onSettings?.()||null;}
 function rules(){shell('rules','Aturan meja online','<div class="lo-lead"><p>Permainan Cepat: dua bidak, satu sudah di jalur. Pulangkan keduanya dengan angka tepat.</p><p>Angka 6, tangkapan, dan bidak pulang memberi lemparan tambahan. Tiga angka 6 beruntun mengakhiri giliran. Kotak bintang dan panah awal aman.</p><p>Satu pilihan legal berjalan otomatis. Jika ada beberapa pilihan, pilih bidak yang bersinar.</p><p>Setiap aksi diberi 30 detik. Saat habis, server menjalankan satu aksi otomatis dengan pemberitahuan. Pemain yang terus tidak bertindak atau terputus bisa dikeluarkan setelah tenggang dua menit. Tidak ada pemain pengganti tersembunyi.</p><p>Refresh mempertahankan kursimu. Menu dan setelan tidak menghentikan waktu permainan.</p></div><button id="loRuleBack" class="lo-primary lo-full">Kembali ke papan</button>');dialog.querySelector('#loRuleBack').onclick=()=>dialog.close();show();}
 function result(){if(room?.status!=='ended')return;const winner=room.winner,p=winner===null?null:room.players[winner],title=winner===null?'Partai berakhir':(p?.name||colors[winner])+' jadi juara!',reason=room.reason==='pulang'?'Semua bidak juara sudah terparkir di finish.':room.reason==='lawan-keluar'?'Pemain lain telah meninggalkan pertandingan.':'Semua pemain telah meninggalkan pertandingan.';shell('result',esc(title),'<div class="lo-trophy" aria-hidden="true">♛</div><p class="lo-lead">'+reason+'</p><button id="loNew" class="lo-primary lo-full">Ikut partai berikutnya</button><button id="loResultBack" class="lo-secondary lo-full">Lihat papan terakhir</button><button id="loHome" class="lo-link lo-full">Kembali · main offline</button>');dialog.querySelector('#loNew').onclick=join;dialog.querySelector('#loResultBack').onclick=()=>dialog.close();dialog.querySelector('#loHome').onclick=exit;show();}
 dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();});window.addEventListener('online',()=>{if(active)sync();});document.addEventListener('visibilitychange',()=>{if(active&&!document.hidden)sync();});
 if(saved?.active&&autoResume)setTimeout(open,250);else persist();
 return {open,menu,join,resign,result,rules,settings,send,leave:exit,close:()=>dialog.close(),get active(){return active;},get room(){return room;},get connected(){return connected;},get pending(){return pending;},get visible(){return dialog.open||!!(settingsOverlay&&!settingsOverlay.hidden);},canAct(){return active&&connected&&!pending&&!this.visible&&room?.status==='playing'&&room.you!==null&&room.you===room.state?.turn;},now:serverNow,escape:esc};
}
root.LudoOnline={create};
})(window);
