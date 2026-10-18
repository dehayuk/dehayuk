(function(root){'use strict';
const GROUPS=[['cokelat','#8b5a2b'],['biru muda','#56ccf2'],['pink','#e05fa0'],['oranye','#f2994a'],['merah','#c0392b'],['kuning','#f2c94c'],['hijau','#219653'],['navy','#1c3f94']];
const rows=[
 ['Berangkat','go'],['Aceh','p',60,0],['Kabar Kota','card',0,'kabar'],['Medan','p',60,0],['Pajak Pendapatan','tax',200],['Pelabuhan Utara','rail',200],['Padang','p',100,1],['Kesempatan','card',0,'kes'],['Pekanbaru','p',100,1],['Palembang','p',120,1],
 ['Kunjungan Penjara','free'],['Bandung','p',140,2],['Listrik PLN','util',150],['Yogyakarta','p',140,2],['Solo','p',160,2],['Stasiun Pusat','rail',200],['Semarang','p',180,3],['Kabar Kota','card',0,'kabar'],['Surabaya','p',180,3],['Malang','p',200,3],
 ['Bebas Parkir','free'],['Denpasar','p',220,4],['Kesempatan','card',0,'kes'],['Makassar','p',220,4],['Manado','p',240,4],['Bandara','rail',200],['Balikpapan','p',260,5],['Banjarmasin','p',260,5],['Air PDAM','util',150],['Jayapura','p',280,5],
 ['Masuk Penjara','goj'],['Ambon','p',300,6],['Ternate','p',300,6],['Kabar Kota','card',0,'kabar'],['Lombok','p',320,6],['Terminal','rail',200],['Kesempatan','card',0,'kes'],['Labuan Bajo','p',350,7],['Pajak Kekayaan','tax',100],['Raja Ampat','p',400,7]
];
const tiles=rows.map(([name,type,price=0,group=null],i)=>({i,name,type,price,group,color:type==='p'?GROUPS[group][1]:type==='rail'?'#4a5967':type==='util'?'#f5b041':type==='card'?(group==='kes'?'#e58547':'#4e9c9f'):'#c9b68a',build:Math.round(price/2)}));
const CARDS={kes:[['Bonus panen','Produk kebunmu laris. Terima 150 koin.','gain',150],['Denda kendaraan','Bayar denda kendaraan 80 koin.','pay',80],['Pulang ke titik awal','Maju ke Berangkat dan terima 200 koin.','to',0],['Jalan memutar','Mundur tiga petak. Jalankan efek petak tujuan.','back',3],['Perjalanan tertahan','Langsung masuk penjara. Tidak mendapat bonus Berangkat.','jail'],['Surat bebas','Simpan surat ini untuk keluar penjara tanpa biaya.','free'],['Ekspedisi timur','Maju ke Raja Ampat. Bayar sewa atau beli jika tersedia.','to',39],['Perawatan lingkungan','Bayar biaya perbaikan 50 koin.','pay',50]],kabar:[['Warisan keluarga','Terima warisan 100 koin.','gain',100],['Biaya rumah sakit','Bayar perawatan 100 koin.','pay',100],['Koreksi bank','Bank mengembalikan 200 koin kepadamu.','gain',200],['Biaya sekolah','Bayar biaya sekolah 50 koin.','pay',50],['Surat bebas','Simpan surat ini untuk keluar penjara tanpa biaya.','free'],['Panggilan petugas','Langsung masuk penjara. Tidak mendapat bonus Berangkat.','jail'],['Juara lomba','Kamu menang lomba kampung. Terima 100 koin.','gain',100],['Dividen koperasi','Terima dividen koperasi 50 koin.','gain',50]]};
const clone=s=>JSON.parse(JSON.stringify(s)),ownable=t=>['p','rail','util'].includes(t.type);
function random(s,key='rng'){let x=s[key]>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;s[key]=x>>>0||1;return s[key]/4294967296;}
function shuffle(s,arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(random(s,'cardRng')*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function create(options={}){
 const count=options.count||2,seed=(options.seed>>>0)||1;
 if(![2,3,4].includes(count))throw Error('Jumlah pemain tidak valid');
 const s={v:2,seed,rng:seed,cardRng:(seed^0x9e3779b9)>>>0||1,mode:options.mode==='local'?'local':'bot',limit:options.limit===20?20:0,players:Array.from({length:count},(_,id)=>({id,name:String(options.names?.[id]||(['Kamu','Ayu','Bima','Citra'][id])).trim().slice(0,16)||'Pemain '+(id+1),bot:options.mode!=='local'&&id>0,cash:1500,pos:0,jail:false,failures:0,free:[],alive:true})),owners:Array(40).fill(-1),houses:Array(40).fill(0),turn:0,round:1,phase:'roll',offer:null,dice:[1,1],rolls:0,extra:false,winner:null,ranking:[],decks:{kes:[],kabar:[]},events:[],log:[]};
 for(const k of ['kes','kabar'])s.decks[k]=shuffle(s,CARDS[k].map((_,i)=>i));
 say(s,'Perjalanan dimulai. Setiap pemain membawa 1.500 koin.');return s;
}
function say(s,text){s.log.unshift(text);s.log=s.log.slice(0,30);s.message=text;}
function event(s,kind,data={}){s.events.push({kind,player:s.turn,...data});}
function group(i){return tiles[i]?.type==='p'?tiles.filter(t=>t.type==='p'&&t.group===tiles[i].group).map(t=>t.i):[];}
function complete(s,i,p=s.owners[i]){return p>=0&&tiles[i]?.type==='p'&&group(i).every(j=>s.owners[j]===p);}
function rent(s,i){const t=tiles[i],p=s.owners[i];if(p<0||!ownable(t))return 0;
 if(t.type==='p')return Math.round(t.price*.1*(s.houses[i]?[1,5,12,25,40][s.houses[i]]:complete(s,i)?2:1));
 const n=tiles.filter(v=>v.type===t.type&&s.owners[v.i]===p).length;
 return t.type==='rail'?25*2**(n-1):(n===2?10:4)*(s.dice[0]+s.dice[1]);
}
const worth=(s,p)=>s.players[p].cash+tiles.reduce((v,t)=>v+(s.owners[t.i]===p?t.price+t.build*s.houses[t.i]:0),0);
const ranking=s=>s.players.map(p=>({id:p.id,alive:p.alive,value:worth(s,p.id)})).sort((a,b)=>Number(b.alive)-Number(a.alive)||b.value-a.value||a.id-b.id);
function finish(s){s.ranking=ranking(s);s.winner=s.ranking[0].value===s.ranking[1]?.value&&s.ranking[0].alive===s.ranking[1].alive?-1:s.ranking[0].id;s.phase='ended';s.extra=false;s.offer=null;event(s,'end');say(s,s.winner<0?'Aset berimbang. Pertandingan seri.':s.players[s.winner].name+' memenangkan perjalanan!');}
function next(s){s.offer=null;s.extra=false;if(s.players.filter(p=>p.alive).length===1){finish(s);return;}let i=s.turn;do{i=(i+1)%s.players.length;if(i===0)s.round++;}while(!s.players[i].alive);if(s.limit&&s.round>s.limit){finish(s);return;}s.turn=i;s.phase='roll';say(s,'Giliran '+s.players[i].name+'.');}
function charge(s,amount,creditor=-1,label='Pembayaran'){
 const p=s.players[s.turn],paid=Math.min(p.cash,amount);p.cash-=amount;if(creditor>=0)s.players[creditor].cash+=paid;
 event(s,'money',{amount:-amount,creditor});say(s,p.name+' · '+label+' '+amount+' koin.');
 if(p.cash<0){p.cash=0;p.alive=false;p.jail=false;p.failures=0;for(const type of p.free){const id=CARDS[type].findIndex(c=>c[2]==='free');s.decks[type].push(id);}p.free=[];tiles.forEach(t=>{if(s.owners[t.i]===s.turn){s.owners[t.i]=-1;s.houses[t.i]=0;}});s.extra=false;s.offer=null;event(s,'bankrupt');say(s,p.name+' bangkrut. Asetnya kembali tersedia di bank.');}
}
function move(s,steps){const p=s.players[s.turn],from=p.pos,path=[];for(let n=0;n<Math.abs(steps);n++){p.pos=(p.pos+(steps<0?-1:1)+40)%40;path.push(p.pos);if(steps>0&&p.pos===0){p.cash+=200;say(s,p.name+' melewati Berangkat: +200 koin.');}}event(s,'move',{from,path,to:p.pos});}
function jail(s){const p=s.players[s.turn];event(s,'teleport',{from:p.pos,to:10});p.pos=10;p.jail=true;p.failures=0;s.extra=false;s.phase='manage';say(s,p.name+' masuk penjara. Bayar 50, pakai surat bebas, atau coba dadu kembar.');}
function land(s,depth=0){
 if(depth>8)throw Error('Rantai kartu terlalu panjang');
 const p=s.players[s.turn],t=tiles[p.pos];s.phase='manage';s.offer=null;
 if(ownable(t)){const owner=s.owners[t.i];if(owner===-1){s.phase='buy';s.offer=t.i;say(s,t.name+' tersedia dengan harga '+t.price+' koin.');}else if(owner!==s.turn)charge(s,rent(s,t.i),owner,'sewa '+t.name+' kepada '+s.players[owner].name);else say(s,'Selamat datang di '+t.name+' milikmu.');}
 else if(t.type==='tax')charge(s,t.price,-1,t.name);
 else if(t.type==='goj')jail(s);
 else if(t.type==='card'){
  const type=t.group,id=s.decks[type].shift(),card=CARDS[type][id];if(card[2]!=='free')s.decks[type].push(id);event(s,'card',{type,id,title:card[0],text:card[1]});say(s,p.name+' · '+card[0]+'. '+card[1]);
  if(card[2]==='gain'){p.cash+=card[3];event(s,'money',{amount:card[3]});}
  else if(card[2]==='pay')charge(s,card[3],-1,card[0]);
  else if(card[2]==='jail')jail(s);
  else if(card[2]==='free')p.free.push(type);
  else {const steps=card[2]==='back'?-card[3]:(card[3]-p.pos+40)%40;move(s,steps);land(s,depth+1);}
 }else say(s,t.i===0?'Berangkat. Perjalanan berlanjut.':t.i===10?'Hanya berkunjung. Kamu bebas melanjutkan.':'Bebas parkir. Nikmati jeda tanpa biaya.');
}
function roll(state,forced){
 if(!valid(state)||state.phase!=='roll')return null;const s=clone(state),p=s.players[s.turn];s.events=[];
 const dice=forced||[1+Math.floor(random(s)*6),1+Math.floor(random(s)*6)];if(!Array.isArray(dice)||dice.length!==2||dice.some(x=>!Number.isInteger(x)||x<1||x>6))return null;
 s.dice=dice.slice();s.rolls++;s.extra=false;const double=dice[0]===dice[1];event(s,'dice',{values:dice.slice()});
 if(p.jail){if(double){p.jail=false;p.failures=0;say(s,'Dadu kembar. '+p.name+' bebas tanpa biaya.');}else{p.failures++;if(p.failures<3){s.phase='manage';say(s,'Belum kembar. Percobaan '+p.failures+' dari 3.');return s;}charge(s,50,-1,'biaya keluar penjara setelah tiga percobaan');p.jail=false;p.failures=0;if(!p.alive){next(s);return s;}}}
 else s.extra=double;
 move(s,dice[0]+dice[1]);land(s);if(!p.alive)next(s);return s;
}
function canBuild(s,i){const t=tiles[i];return ['roll','manage'].includes(s.phase)&&t?.type==='p'&&s.owners[i]===s.turn&&complete(s,i)&&s.houses[i]<4&&s.houses[i]===Math.min(...group(i).map(j=>s.houses[j]))&&s.players[s.turn].cash>=t.build;}
function act(state,action,i){
 if(!valid(state)||state.phase==='ended')return null;const s=clone(state),p=s.players[s.turn],t=tiles[i];s.events=[];
 if(action==='buy'){if(s.phase!=='buy'||i!==s.offer||p.cash<t.price)return null;p.cash-=t.price;s.owners[i]=s.turn;s.offer=null;s.phase='manage';event(s,'buy',{i});say(s,p.name+' membeli '+t.name+' · '+t.price+' koin.');}
 else if(action==='skip'){if(s.phase!=='buy')return null;s.offer=null;s.phase='manage';say(s,'Pembelian dilewati. Petak tetap tersedia.');}
 else if(action==='build'){if(!canBuild(s,i))return null;p.cash-=t.build;s.houses[i]++;event(s,'build',{i});say(s,p.name+' membangun rumah ke-'+s.houses[i]+' di '+t.name+'.');}
 else if(action==='bail'){if(s.phase!=='roll'||!p.jail||p.cash<50)return null;p.cash-=50;p.jail=false;p.failures=0;say(s,'Biaya 50 koin dibayar. Lempar dadu untuk melanjutkan.');}
 else if(action==='free'){if(s.phase!=='roll'||!p.jail||!p.free.length)return null;const type=p.free.shift();s.decks[type].push(CARDS[type].findIndex(c=>c[2]==='free'));p.jail=false;p.failures=0;say(s,'Surat bebas dipakai. Lempar dadu untuk melanjutkan.');}
 else if(action==='end'){if(s.phase!=='manage')return null;if(s.extra){s.extra=false;s.phase='roll';say(s,'Dadu kembar memberi '+p.name+' satu lemparan lagi.');}else next(s);}
 else return null;return s;
}
function ai(s){const p=s.players[s.turn];if(s.phase==='roll')return {action:p.jail&&p.free.length?'free':p.jail&&p.cash>350?'bail':'roll'};
 if(s.phase==='buy'){const t=tiles[s.offer],same=t.type==='p'?group(t.i).filter(i=>s.owners[i]===s.turn).length:tiles.filter(v=>v.type===t.type&&s.owners[v.i]===s.turn).length;return {action:p.cash>=t.price+(same?30:100)?'buy':'skip',i:t.i};}
 if(s.phase==='manage'){const t=tiles.filter(v=>canBuild(s,v.i)&&p.cash-v.build>=140).sort((a,b)=>(b.price/b.build)-(a.price/a.build)||s.houses[a.i]-s.houses[b.i]||b.price-a.price)[0];return t?{action:'build',i:t.i}:{action:'end'};}return null;
}
function coord(i){if(i<=10)return [10,10-i];if(i<=20)return [20-i,0];if(i<=30)return [0,i-20];return [i-30,10];}
function valid(s){
 if(!s||s.v!==2||![2,3,4].includes(s.players?.length)||!['bot','local'].includes(s.mode)||![0,20].includes(s.limit)||!Number.isInteger(s.turn)||s.turn<0||s.turn>=s.players.length||!Number.isInteger(s.round)||s.round<1||s.round>100000||!['roll','buy','manage','ended'].includes(s.phase)||![s.seed,s.rng,s.cardRng].every(n=>Number.isInteger(n)&&n>0&&n<=4294967295)||!Number.isInteger(s.rolls)||s.rolls<0||typeof s.extra!=='boolean'||!Array.isArray(s.events)||s.events.length>60||!Array.isArray(s.log)||s.log.length>30||s.log.some(v=>typeof v!=='string'||v.length>500))return false;
 if(!Array.isArray(s.dice)||s.dice.length!==2||s.dice.some(x=>!Number.isInteger(x)||x<1||x>6))return false;
 if(s.players.some((p,i)=>p.id!==i||typeof p.name!=='string'||!p.name.length||p.name.length>16||typeof p.bot!=='boolean'||!Number.isSafeInteger(p.cash)||p.cash<0||!Number.isInteger(p.pos)||p.pos<0||p.pos>39||typeof p.jail!=='boolean'||p.jail&&p.pos!==10||!Number.isInteger(p.failures)||p.failures<0||p.failures>2||!p.jail&&p.failures!==0||typeof p.alive!=='boolean'||!p.alive&&p.cash!==0||!Array.isArray(p.free)||p.free.length>2||p.free.some(k=>!CARDS[k])))return false;
 if(![s.owners,s.houses].every(a=>Array.isArray(a)&&a.length===40))return false;
 for(let i=0;i<40;i++){const owner=s.owners[i],houses=s.houses[i];if(!Number.isInteger(owner)||owner<-1||owner>=s.players.length||owner>=0&&!s.players[owner].alive||!Number.isInteger(houses)||houses<0||houses>4||!ownable(tiles[i])&&owner!==-1||houses&&(!complete(s,i)||Math.max(...group(i).map(j=>s.houses[j]))-Math.min(...group(i).map(j=>s.houses[j]))>1))return false;}
 for(const k of ['kes','kabar']){const deck=s.decks?.[k];if(!Array.isArray(deck))return false;const all=[...deck,...s.players.flatMap(p=>p.free.filter(x=>x===k).map(()=>CARDS[k].findIndex(c=>c[2]==='free')))];if(all.length!==8||new Set(all).size!==8||all.some(i=>!Number.isInteger(i)||i<0||i>7))return false;}
 if(s.phase==='buy'&&(s.offer!==s.players[s.turn].pos||!ownable(tiles[s.offer])||s.owners[s.offer]!==-1)||s.phase!=='buy'&&s.offer!==null)return false;
 if(s.phase==='ended'){const r=ranking(s),w=r[0].value===r[1].value&&r[0].alive===r[1].alive?-1:r[0].id;return (s.players.filter(p=>p.alive).length===1||s.limit&&s.round>s.limit)&&s.winner===w&&JSON.stringify(s.ranking)===JSON.stringify(r);}
 return s.winner===null&&s.players[s.turn].alive&&s.players.filter(p=>p.alive).length>=2&&(!s.limit||s.round<=s.limit);
}
function test(){let n=0;const ok=(v,m)=>{if(!v)throw Error(m);n++;};let s=create();ok(valid(s),'Initial state');ok(tiles.length===40&&new Set(tiles.map(t=>coord(t.i).join(','))).size===40,'Forty distinct ring cells');
 s=roll(s,[1,2]);ok(s.offer===3,'Purchase after landing');s=act(s,'buy',3);ok(s.players[0].cash===1440&&s.owners[3]===0,'Purchase pays bank');ok(!act(s,'buy',3),'Duplicate purchase blocked');s=act(s,'end');ok(s.turn===1,'Turn advances');
 s=create();s.players[0].pos=39;s=roll(s,[1,1]);ok(s.players[0].cash===1700&&s.offer===1&&s.extra,'Cross start once + double');s=act(s,'skip');s=act(s,'end');ok(s.turn===0&&s.phase==='roll','Double extra turn');
 s=create();s.owners[1]=s.owners[3]=0;ok(rent(s,1)===12,'Complete group double rent');ok(canBuild(s,1),'Full group can build');s=act(s,'build',1);ok(rent(s,1)===30&&!canBuild(s,1)&&canBuild(s,3),'House rent and even building');for(let h=1;h<=4;h++){while(s.houses[3]<h)s=act(s,'build',3);while(s.houses[1]<h)s=act(s,'build',1);}ok(!canBuild(s,1)&&rent(s,1)===240,'Four house cap');
 s=create();for(const i of [5,15,25,35]){s.owners[i]=0;ok(rent(s,5)===25*2**([5,15,25,35].indexOf(i)),'Station scaling');}s.owners[12]=0;s.dice=[3,4];ok(rent(s,12)===28,'One utility');s.owners[28]=0;ok(rent(s,28)===70,'Two utilities');
 s=create();s.players[0].pos=24;s=roll(s,[3,3]);ok(s.players[0].jail&&s.players[0].pos===10&&!s.extra,'Go to jail no bonus');s=act(s,'end');s=roll(s,[1,2]);s=act(s,'skip');s=act(s,'end');s=roll(s,[2,3]);ok(s.players[0].failures===1&&s.players[0].pos===10,'Failed jail throw');
 s=create();s.players[0].pos=10;s.players[0].jail=true;s.players[0].failures=2;s=roll(s,[1,2]);ok(!s.players[0].jail&&s.players[0].pos===13&&s.players[0].cash===1450,'Third failure pays and moves');
 s=create();s.players[0].pos=10;s.players[0].jail=true;s=roll(s,[2,2]);ok(!s.players[0].jail&&!s.extra&&s.players[0].pos===14,'Jail doubles do not earn extra');
 s=create();s.players[0].pos=4;s.decks.kes=[3,0,1,2,4,5,6,7];s=roll(s,[1,2]);ok(s.players[0].pos===4&&s.players[0].cash===1300,'Back card resolves destination tax');
 s=create();s.players[0].pos=19;s.decks.kes=[2,0,1,3,4,5,6,7];s=roll(s,[1,2]);ok(s.players[0].pos===0&&s.players[0].cash===1700,'Advance card pays start exactly once');
 s=create();s.players[0].pos=4;s.decks.kes=[6,0,1,2,3,4,5,7];s=roll(s,[1,2]);ok(s.offer===39,'Card destination purchase');
 s=create();s.players[0].pos=4;s.decks.kes=[5,0,1,2,3,4,6,7];s=roll(s,[1,2]);ok(s.players[0].free.length===1&&s.decks.kes.length===7&&valid(s),'Free card is held out of deck');s.players[0].pos=10;s.players[0].jail=true;s.phase='roll';s=act(s,'free');ok(s.decks.kes.length===8&&s.players[0].free.length===0&&valid(s),'Free card returns after use');
 s=create();s.players[0].cash=30;s.players[0].pos=2;s.owners[1]=0;s=roll(s,[1,1]);ok(s.phase==='ended'&&s.winner===1&&s.owners[1]===-1&&s.houses.every(h=>h===0)&&valid(s),'Bankruptcy releases assets and ends game');
 s=create({count:3});s.owners[6]=1;s.players[0].cash=5;s.players[0].pos=4;const cash=s.players[1].cash;s=roll(s,[1,1]);ok(!s.players[0].alive&&s.turn===1&&s.players[1].cash===cash+5&&valid(s),'Short rent pays available money and skips bankrupt player');
 for(let seed=1;seed<=24;seed++){s=create({seed,count:2+seed%3,limit:20});for(let step=0;step<3500&&s.phase!=='ended';step++){ok(valid(s),'Simulation state '+seed+'/'+step);const a=ai(s);const before=JSON.stringify(s);const out=a.action==='roll'?roll(s):act(s,a.action,a.i);ok(!!out&&JSON.stringify(s)===before,'Valid immutable transition');s=out;}ok(s.phase==='ended'&&valid(s),'Bounded match finishes');}
 return n;
}
const api={tiles,CARDS,GROUPS,create,roll,act,canBuild,complete,group,rent,worth,ranking,coord,valid,ai,test};if(typeof module==='object')module.exports=api;else root.NusantaraTycoon=api;
})(typeof window==='object'?window:globalThis);
