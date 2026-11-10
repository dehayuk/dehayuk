
// Mesin catur Dehayuk (tanpa DOM, dipakai halaman dan Web Worker). Papan 0x88: kotak = baris*16 + lajur, baris 0 = baris 1 putih.
// Bidak: jenis 1..6 (pion, kuda, gajah, benteng, ratu, raja) + 8 untuk hitam. Langkah = asal | tujuan<<7 | promosi<<14 | tanda<<17
// (tanda: 1 makan, 2 en passant, 4 rokade, 8 pion maju dua). Semua keacakan berbenih, jadi hasil bisa diulang persis.
const CT=(()=>{
const START="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const ND=[33,31,18,14,-33,-31,-18,-14],BD=[17,15,-17,-15],RD=[16,1,-16,-1],KD=[17,15,-17,-15,16,1,-16,-1];
const bd=new Int8Array(128),kings=[4,116];
let onlineRules=false;
let side=0,cast=0,ep = -1,half=0,full=1,hLo=0,hHi=0,hp=0;
// kunci Zobrist dari pengacak tetap
let zs=0x2545f491;
const zr=()=>{zs^=zs<<13;zs^=zs>>>17;zs^=zs<<5;return zs|0;};
const ZP=new Int32Array(16*128*2),ZC=new Int32Array(32),ZE=new Int32Array(16),ZS=[zr(),zr()];
for(let i=0;i<ZP.length;i++) ZP[i]=zr();
for(let i=0;i<32;i++) ZC[i]=zr();
for(let i=0;i<16;i++) ZE[i]=zr();
const CM=new Int8Array(128).fill(15);CM[4]=12;CM[7]=14;CM[0]=13;CM[116]=3;CM[119]=11;CM[112]=7;
const MX=20000;// tumpukan riwayat (permainan + pencarian)
const U_M=new Int32Array(MX),U_X=new Int8Array(MX),U_C=new Int8Array(MX),U_E=new Int16Array(MX),U_H=new Int16Array(MX),U_LO=new Int32Array(MX),U_HI=new Int32Array(MX),KLO=new Int32Array(MX+1),KHI=new Int32Array(MX+1);
const MV=new Int32Array(64*256),SC=new Int32Array(64*256);
function xp(pc,sq){const i=(pc*128+sq)*2;hLo^=ZP[i];hHi^=ZP[i+1];}
const sqName=(s)=>"abcdefgh"[s&7]+((s>>4)+1);
const nameSq=(n)=>(n.charCodeAt(0)-97)+(n.charCodeAt(1)-49)*16;

function load(fen){
const f=String(fen||START).trim().split(/\s+/);
bd.fill(0);let r=7,c=0;
for(const ch of f[0]){
if(ch==="/"){r--;c=0;continue;}
if(ch>="1"&&ch<="8"){c += +ch;continue;}
const t="pnbrqk".indexOf(ch.toLowerCase());if(t<0||r<0||c>7) throw new Error("FEN");
const pc=(t+1)|(ch===ch.toLowerCase()?8:0),sq=r*16+c;bd[sq]=pc;if(t===5) kings[pc>>3]=sq;c++;
}
side=f[1]==="b"?8:0;cast=0;
for(const ch of f[2]||"-") cast|=ch==="K"?1:ch==="Q"?2:ch==="k"?4:ch==="q"?8:0;
// hak rokade hanya bila raja dan benteng memang di tempatnya
if(bd[4]!==6) cast&=12;if(bd[7]!==4) cast&=14;if(bd[0]!==4) cast&=13;
if(bd[116]!==14) cast&=3;if(bd[119]!==12) cast&=11;if(bd[112]!==12) cast&=7;
ep = -1;
if(f[3]&&f[3]!=="-"){const e=nameSq(f[3]),p=e+(side?16 : -16);if(epOk(p)) ep=e;}
half=parseInt(f[4],10)||0;full=parseInt(f[5],10)||1;hp=0;
rehash();KLO[0]=hLo;KHI[0]=hHi;
}
// kotak en passant hanya dicatat bila ada pion lawan yang benar-benar bisa memakan (agar ulangan posisi dihitung benar)
function epOk(pawnSq){const them=side===0?1:9,a=pawnSq-1,b=pawnSq+1;return (!(a&0x88)&&bd[a]===them)||(!(b&0x88)&&bd[b]===them);}
function rehash(){
hLo=0;hHi=0;
for(let s=0;s<120;s++){if(s&0x88){s+=7;continue;} if(bd[s]) xp(bd[s],s);}
if(side){hLo^=ZS[0];hHi^=ZS[1];}
hLo^=ZC[cast*2];hHi^=ZC[cast*2+1];
if(ep>=0){hLo^=ZE[(ep&7)*2];hHi^=ZE[(ep&7)*2+1];}
}
function fen(){
let s="";
for(let r=7;r>=0;r--){
let e=0;
for(let c=0;c<8;c++){const p=bd[r*16+c];if(!p){e++;continue;} if(e){s+=e;e=0;} const ch=" pnbrqk"[p&7];s+=p&8?ch:ch.toUpperCase();}
if(e) s+=e;if(r) s+="/";
}
let c=(cast&1?"K":"")+(cast&2?"Q":"")+(cast&4?"k":"")+(cast&8?"q":"");
return s+" " + (side?"b":"w")+" " + (c||"-")+" " + (ep>=0?sqName(ep):"-")+" " + half+" " + full;
}

function attacked(sq,by){
let s;
if(by===0){s=sq-15;if(!(s&0x88)&&bd[s]===1) return true;s=sq-17;if(!(s&0x88)&&bd[s]===1) return true;}
else{s=sq+15;if(!(s&0x88)&&bd[s]===9) return true;s=sq+17;if(!(s&0x88)&&bd[s]===9) return true;}
const n=2|by,k=6|by,b=3|by,r=4|by,q=5|by;
for(let i=0;i<8;i++){s=sq+ND[i];if(!(s&0x88)&&bd[s]===n) return true;s=sq+KD[i];if(!(s&0x88)&&bd[s]===k) return true;}
for(let i=0;i<4;i++){
let d=BD[i];s=sq+d;
while(!(s&0x88)){const p=bd[s];if(p){if(p===b||p===q) return true;break;} s+=d;}
d=RD[i];s=sq+d;
while(!(s&0x88)){const p=bd[s];if(p){if(p===r||p===q) return true;break;} s+=d;}
}
return false;
}
const inCheck=()=>attacked(kings[side>>3],side^8);

// langkah semu (belum diperiksa raja terancam); caps = hanya makan dan promosi
function gen(o,caps){
const us=side,them=us^8;
for(let sq=0;sq<120;sq++){
if(sq&0x88){sq+=7;continue;}
const pc=bd[sq];if(!pc||(pc&8)!==us) continue;
const t=pc&7;
if(t===1){
const dir=us ? -16:16,r=sq>>4,pro=r===(us?1:6),to=sq+dir;
if(!bd[to]&&(!caps||pro)){
if(pro){for(let p=5;p>=2;p--) MV[o++]=sq|to<<7|p<<14;}
else{MV[o++]=sq|to<<7;if(!caps&&r===(us?6:1)&&!bd[to+dir]) MV[o++]=sq|(to+dir)<<7|8<<17;}
}
for(let k = -1;k<=1;k+=2){
const c=to+k;if(c&0x88) continue;
const x=bd[c];
if(x&&(x&8)===them){if(pro){for(let p=5;p>=2;p--) MV[o++]=sq|c<<7|p<<14|1<<17;}else MV[o++]=sq|c<<7|1<<17;}
else if(c===ep) MV[o++]=sq|c<<7|3<<17;
}
}else if(t===2||t===6){
const D=t===2?ND:KD;
for(let i=0;i<8;i++){
const to=sq+D[i];if(to&0x88) continue;
const x=bd[to];
if(!x){if(!caps) MV[o++]=sq|to<<7;}
else if((x&8)===them) MV[o++]=sq|to<<7|1<<17;
}
}else{
const D=t===3?BD:t===4?RD:KD,nd=t===5?8:4;
for(let i=0;i<nd;i++){
const d=D[i];let to=sq+d;
while(!(to&0x88)){
const x=bd[to];
if(!x){if(!caps) MV[o++]=sq|to<<7;}
else{if((x&8)===them) MV[o++]=sq|to<<7|1<<17;break;}
to+=d;
}
}
}
}
if(!caps&&cast){
if(us===0){
if(cast&1&&!bd[5]&&!bd[6]&&!attacked(4,8)&&!attacked(5,8)&&!attacked(6,8)) MV[o++]=4|6<<7|4<<17;
if(cast&2&&!bd[3]&&!bd[2]&&!bd[1]&&!attacked(4,8)&&!attacked(3,8)&&!attacked(2,8)) MV[o++]=4|2<<7|4<<17;
}else{
if(cast&4&&!bd[117]&&!bd[118]&&!attacked(116,0)&&!attacked(117,0)&&!attacked(118,0)) MV[o++]=116|118<<7|4<<17;
if(cast&8&&!bd[115]&&!bd[114]&&!bd[113]&&!attacked(116,0)&&!attacked(115,0)&&!attacked(114,0)) MV[o++]=116|114<<7|4<<17;
}
}
return o;
}

function make(m){
const fr=m&127,to=(m>>7)&127,pr=(m>>14)&7,fl=m>>>17,pc=bd[fr];
U_M[hp]=m;U_C[hp]=cast;U_E[hp]=ep;U_H[hp]=half;U_LO[hp]=hLo;U_HI[hp]=hHi;
let cap;
if(fl&2){const cs=to+(side?16 : -16);cap=bd[cs];bd[cs]=0;xp(cap,cs);}
else{cap=bd[to];if(cap) xp(cap,to);}
U_X[hp]=cap;
const np=pr?pr|side:pc;
bd[fr]=0;bd[to]=np;xp(pc,fr);xp(np,to);
if((pc&7)===6){
kings[side>>3]=to;
if(fl&4){const rf=to>fr?fr+3:fr-4,rt=to>fr?fr+1:fr-1,rk=bd[rf];bd[rf]=0;bd[rt]=rk;xp(rk,rf);xp(rk,rt);}
}
const nc=cast&CM[fr]&CM[to];
if(nc!==cast){hLo^=ZC[cast*2]^ZC[nc*2];hHi^=ZC[cast*2+1]^ZC[nc*2+1];cast=nc;}
if(ep>=0){hLo^=ZE[(ep&7)*2];hHi^=ZE[(ep&7)*2+1];ep = -1;}
side^=8;hLo^=ZS[0];hHi^=ZS[1];
if(fl&8&&epOk(to)){ep=(fr+to)>>1;hLo^=ZE[(ep&7)*2];hHi^=ZE[(ep&7)*2+1];}
half=(pc&7)===1||cap?0:half+1;
if(!side) full++;
hp++;KLO[hp]=hLo;KHI[hp]=hHi;
}
function unmake(){
hp--;side^=8;if(!side) full--;
const m=U_M[hp],fr=m&127,to=(m>>7)&127,pr=(m>>14)&7,fl=m>>>17;
const pc=pr?1|side:bd[to];
bd[fr]=pc;
if(fl&2){bd[to]=0;bd[to+(side?16 : -16)]=U_X[hp];}else bd[to]=U_X[hp];
if((pc&7)===6){
kings[side>>3]=fr;
if(fl&4){const rf=to>fr?fr+3:fr-4,rt=to>fr?fr+1:fr-1;bd[rf]=bd[rt];bd[rt]=0;}
}
cast=U_C[hp];ep=U_E[hp];half=U_H[hp];hLo=U_LO[hp];hHi=U_HI[hp];
}
function makeNull(){
U_M[hp]=0;U_C[hp]=cast;U_E[hp]=ep;U_H[hp]=half;U_LO[hp]=hLo;U_HI[hp]=hHi;U_X[hp]=0;
if(ep>=0){hLo^=ZE[(ep&7)*2];hHi^=ZE[(ep&7)*2+1];ep = -1;}
side^=8;hLo^=ZS[0];hHi^=ZS[1];half=0;hp++;KLO[hp]=hLo;KHI[hp]=hHi;
}
function unmakeNull(){hp--;side^=8;ep=U_E[hp];half=U_H[hp];hLo=U_LO[hp];hHi=U_HI[hp];cast=U_C[hp];}
// langkah sah di posisi sekarang (array baru)
function legal(){
const o=gen(63*256,false),out=[];
for(let i=63*256;i<o;i++){const m=MV[i];make(m);if(!attacked(kings[(side^8)>>3],side)) out.push(m);unmake();}
return out;
}
function hasLegal(){
const b=62*256,o=gen(b,false);
for(let i=b;i<o;i++){make(MV[i]);const ok=!attacked(kings[(side^8)>>3],side);unmake();if(ok) return true;}
return false;
}
function perft(d){
if(!d) return 1;
const b=d*256,o=gen(b,false);let n=0;
for(let i=b;i<o;i++){make(MV[i]);if(!attacked(kings[(side^8)>>3],side)) n+=d===1?1:perft(d-1);unmake();}
return n;
}
const uci=(m)=>sqName(m&127)+sqName((m>>7)&127)+(((m>>14)&7)?" nbrq"[((m>>14)&7)-1]:"");
function fromUci(s){
if(typeof s!=="string"||!/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(s)) return 0;
for(const m of legal()) if(uci(m)===s) return m;
return 0;
}
// bahan tidak cukup untuk skakmat: raja lawan raja, ditambah satu kuda/gajah, atau gajah-gajah di warna kotak yang sama
function insufficient(){
let minor=0,bc = -1,mixed=false;
for(let s=0;s<120;s++){
if(s&0x88){s+=7;continue;}
const t=bd[s]&7;if(!t||t===6) continue;
if(t===1||t===4||t===5) return false;
minor++;if(t===3){const c=((s>>4)+(s&7))&1;if(bc<0) bc=c;else if(bc!==c) mixed=true;}else mixed=true;
}
return minor<=1||!mixed;
}
function san(m){
const fr=m&127,to=(m>>7)&127,pr=(m>>14)&7,fl=m>>>17,t=bd[fr]&7;
let s;
if(fl&4) s=to>fr?"O-O":"O-O-O";
else{
const cap=fl&1;
if(t===1) s=(cap?"abcdefgh"[fr&7]+"x":"")+sqName(to)+(pr?"=" + " NBRQ"[pr-1]:"");
else{
let amb=false,file=false,rank=false;
for(const o of legal()){if(o===m||((o>>7)&127)!==to||(bd[o&127]&7)!==t) continue;amb=true;if(((o&127)&7)===(fr&7)) file=true;if(((o&127)>>4)===(fr>>4)) rank=true;}
s=" PNBRQK"[t]+(amb?(!file?"abcdefgh"[fr&7]:!rank?(fr>>4)+1:sqName(fr)):"")+(cap?"x":"")+sqName(to);
}
}
make(m);const chk=inCheck();if(chk) s+=hasLegal()?"+":"#";unmake();
return s;
}

/* ---------- penilaian: bahan + tabel letak buatan sendiri (rumus), struktur pion, benteng di lajur terbuka ---------- */
const VMG=[0,100,320,335,480,960,0],VEG=[0,120,300,320,540,1000,0],PH=[0,0,1,1,2,4,0];
const PMG=new Int16Array(16*128),PEG=new Int16Array(16*128);
(function (){
for(let t=1;t<=6;t++) for(let r=0;r<8;r++) for(let f=0;f<8;f++){
const cf=Math.abs(f-3.5),cr=Math.abs(r-3.5),cd=cf+cr,ch=Math.max(cf,cr);
let mg=0,eg=0;
if(t===1){mg=[0,0,4,10,22,36,60,0][r]+((f===3||f===4)?[0,-6,4,16,22,12,0,0][r]:0)-(cf>2.5?4:0);eg=[0,0,6,16,32,56,95,0][r];}
else if(t===2){mg=26-cd*8-(r===0?8:0);eg=20-cd*7;}
else if(t===3){mg=14-ch*6-(r===0?10:0)+(cf===cr||Math.abs(cf-cr)<1.1?4:0);eg=12-ch*5;}
else if(t===4){mg=(r===6?18:0)+(f===3||f===4?6:0)-(cf>3&&r>0&&r<6?4:0);eg=r===6?10:0;}
else if(t===5){mg=6-ch*3-(r===0?4:0);eg=18-cd*5;}
else{mg=r===0?[18,26,12,-6,-6,8,30,20][f]:r===1?[4,6,-8,-20,-20,-8,6,4][f] : -24-r*8;eg=32-cd*9;}
for(const col of [0,8]){
const sq=(col?7-r:r)*16+f,i=(t|col)*128+sq;
PMG[i]=VMG[t]+Math.round(mg);PEG[i]=VEG[t]+Math.round(eg);
}
}
})();
const PASS=[0,8,12,22,40,70,110,0];
const wMin=new Int8Array(10),bMax=new Int8Array(10),wCnt=new Int8Array(10),bCnt=new Int8Array(10),PW=new Int16Array(16),PB=new Int16Array(16),RK=new Int16Array(24);
function evaluate(){
let mg=0,eg=0,ph=0,nw=0,nb=0,nr=0,wb=0,bb=0,wn=0,bn=0;
wMin.fill(8);bMax.fill(-1);wCnt.fill(0);bCnt.fill(0);
for(let s=0;s<120;s++){
if(s&0x88){s+=7;continue;}
const p=bd[s];if(!p) continue;
const i=p*128+s,t=p&7;
if(p&8){mg-=PMG[i];eg-=PEG[i];}else{mg+=PMG[i];eg+=PEG[i];}
ph+=PH[t];
if(t===1){
const f=(s&7)+1,r=s>>4;
if(p&8){bCnt[f]++;if(r>bMax[f]) bMax[f]=r;PB[nb++]=s;}else{wCnt[f]++;if(r<wMin[f]) wMin[f]=r;PW[nw++]=s;}
}else if(t===4) RK[nr++]=s;
else if(t===3){if(p&8) bb++;else wb++;}
if(t>1&&t<6){if(p&8) bn+=VMG[t];else wn+=VMG[t];}
}
if(wb>=2){mg+=30;eg+=45;} if(bb>=2){mg-=30;eg-=45;}
// pion: bebas, ganda, terpencil
for(let k=0;k<nw;k++){
const s=PW[k],f=(s&7)+1,r=s>>4;
if(bMax[f-1]<=r&&bMax[f]<=r&&bMax[f+1]<=r){mg+=PASS[r]>>1;eg+=PASS[r]+(bn===0?PASS[r]:0);}
if(!wCnt[f-1]&&!wCnt[f+1]){mg-=10;eg-=12;}
}
for(let k=0;k<nb;k++){
const s=PB[k],f=(s&7)+1,r=7-(s>>4);
const lr=s>>4;
if(wMin[f-1]>=lr&&wMin[f]>=lr&&wMin[f+1]>=lr){mg-=PASS[r]>>1;eg-=PASS[r]+(wn===0?PASS[r]:0);}
if(!bCnt[f-1]&&!bCnt[f+1]){mg+=10;eg+=12;}
}
for(let f=1;f<=8;f++){if(wCnt[f]>1){mg-=10*(wCnt[f]-1);eg-=16*(wCnt[f]-1);} if(bCnt[f]>1){mg+=10*(bCnt[f]-1);eg+=16*(bCnt[f]-1);}}
for(let k=0;k<nr;k++){
const s=RK[k],f=(s&7)+1,black=bd[s]&8,own=black?bCnt[f]:wCnt[f],opp=black?wCnt[f]:bCnt[f];
const v=!own?(!opp?22:10):0;if(black){mg-=v;eg-=v>>1;}else{mg+=v;eg+=v>>1;}
}
// pelindung raja di tengah permainan
for(let c=0;c<2;c++){
const k=kings[c],dir=c ? -16:16;let sh=0;
for(let d = -1;d<=1;d++){const a=k+dir+d,b2=a+dir;if(!(a&0x88)&&bd[a]===(1|c*8)) sh+=10;else if(!(b2&0x88)&&bd[b2]===(1|c*8)) sh+=5;}
if(c) mg-=sh;else mg+=sh;
}
if(ph>24) ph=24;
let sc=(mg*ph+eg*(24-ph))/24;
// sisa sedikit: dorong raja lawan ke pinggir agar skakmat bisa diselesaikan
const diff=wn-bn;
if(ph<=8&&Math.abs(diff)>=400){
const win=diff>0?0:1,lk=kings[1-win],wk=kings[win];
const edge=Math.abs((lk&7)-3.5)+Math.abs((lk>>4)-3.5),dist=Math.abs((lk&7)-(wk&7))+Math.abs((lk>>4)-(wk>>4));
const m=edge*12+(14-dist)*5;sc+=win ? -m:m;
}
// tanpa pion dan unggul kurang dari satu benteng: cenderung remis
if(sc>0&&!nw&&diff<400) sc/=4;else if(sc<0&&!nb && -diff<400) sc/=4;
return (side ? -sc:sc)+10|0;
}

/* ---------- pencarian: alpha-beta (PVS) + tabel posisi + urutan langkah + null move + LMR + quiescence ---------- */
const MATE=30000,INF=32000,ABORT={};
const TS=1<<17,TM=TS-1,T_LO=new Int32Array(TS),T_HI=new Int32Array(TS),T_MV=new Int32Array(TS),T_SC=new Int16Array(TS),T_D=new Int8Array(TS),T_F=new Int8Array(TS);
const KIL=new Int32Array(128),HIS=new Int32Array(16*128);
let nodes=0,deadline=0,nodeCap=0,stopOn=false,rootBest=0;
const now=()=>(typeof performance!=="undefined"?performance.now():Date.now());
function repeated(){for(let i=hp-2,lim=hp-half;i>=lim&&i>=0;i-=2) if(KLO[i]===hLo&&KHI[i]===hHi) return true;return false;}
function nonPawn(c){for(let s=0;s<120;s++){if(s&0x88){s+=7;continue;} const p=bd[s];if(p&&(p&8)===c&&(p&7)>1&&(p&7)<6) return true;} return false;}
function scoreMoves(b,o,ttm,ply){
const k1=KIL[ply*2],k2=KIL[ply*2+1];
for(let i=b;i<o;i++){
const m=MV[i],to=(m>>7)&127,fl=m>>>17,pr=(m>>14)&7;
let s;
if(m===ttm) s=1<<30;
else if(fl&1) s=(1<<24)+((fl&2?1:bd[to]&7)<<4)-(bd[m&127]&7)+(pr===5?1<<20:0);
else if(pr) s=pr===5?(1<<23) : -1000;
else if(m===k1) s=1<<22;else if(m===k2) s=(1<<22)-1;
else s=HIS[bd[m&127]*128+to];
SC[i]=s;
}
}
function pick(i,o){
let bi=i,bs=SC[i];
for(let j=i+1;j<o;j++) if(SC[j]>bs){bs=SC[j];bi=j;}
if(bi!==i){const t=MV[i];MV[i]=MV[bi];MV[bi]=t;const u=SC[i];SC[i]=SC[bi];SC[bi]=u;}
return MV[i];
}
function qs(a,b,ply){
nodes++;
if((nodes&1023)===0&&stopOn&&(now()>deadline||(nodeCap&&nodes>nodeCap))) throw ABORT;
const st=evaluate();
if(ply>=60) return st;
if(st>=b) return st;
if(st>a) a=st;
const base=ply*256,o=gen(base,true);
scoreMoves(base,o,0,ply);
for(let i=base;i<o;i++){
const m=pick(i,o),fl=m>>>17;
if(fl&1&&!(fl&2)&&!((m>>14)&7)&&st+VEG[bd[(m>>7)&127]&7]+200<a) continue;// delta
make(m);
if(attacked(kings[(side^8)>>3],side)){unmake();continue;}
const s = -qs(-b,-a,ply+1);unmake();
if(s>=b) return s;
if(s>a) a=s;
}
return a;
}
function search(d,a,b,ply,nul){
const pv=b-a>1;
if(ply&&(half>=100||repeated())) return 0;
const chk=attacked(kings[side>>3],side^8);
if(chk) d++;
if(d<=0) return qs(a,b,ply);
nodes++;
if((nodes&1023)===0&&stopOn&&(now()>deadline||(nodeCap&&nodes>nodeCap))) throw ABORT;
if(ply>=60) return evaluate();
// jarak ke skakmat
if(ply){const ma = -MATE+ply,mb=MATE-ply-1;if(ma>a) a=ma;if(mb<b) b=mb;if(a>=b) return a;}
const ti=hLo&TM;let ttm=0;
if(T_LO[ti]===hLo&&T_HI[ti]===hHi){
ttm=T_MV[ti];
if(ply&&T_D[ti]>=d&&!pv){
let s=T_SC[ti];if(s>MATE-200) s-=ply;else if(s < -MATE+200) s+=ply;
const f=T_F[ti];if(f===0||(f===1&&s>=b)||(f===2&&s<=a)) return s;
}
}
let st=0;
if(!chk&&!pv){
st=evaluate();
if(d<=3&&st-110*d>=b&&Math.abs(b)<MATE-200) return st;
if(nul&&d>=3&&st>=b&&nonPawn(side)){
makeNull();const s = -search(d-3-(d>6?1:0),-b,-b+1,ply+1,false);unmakeNull();
if(s>=b) return s>MATE-200?b:s;
}
}
const base=ply*256,o=gen(base,false);
scoreMoves(base,o,ttm,ply);
let best = -INF,bm=0,n=0;const a0=a;
for(let i=base;i<o;i++){
const m=pick(i,o);
make(m);
if(attacked(kings[(side^8)>>3],side)){unmake();continue;}
n++;
const quiet=!(m>>>17&1)&&!((m>>14)&7);
let s;
if(n===1) s = -search(d-1,-b,-a,ply+1,true);
else{
let r=0;
if(d>=3&&n>3&&quiet&&!chk&&SC[i]<(1<<22)-1){r=n>8?2:1;if(inCheck()) r=0;}
s = -search(d-1-r,-a-1,-a,ply+1,true);
if(s>a&&(r||s<b)) s = -search(d-1,-b,-a,ply+1,true);
}
unmake();
if(s>best){best=s;bm=m;if(!ply) rootBest=m;}
if(s>a){
a=s;
if(a>=b){
if(quiet){if(KIL[ply*2]!==m){KIL[ply*2+1]=KIL[ply*2];KIL[ply*2]=m;} const hi=bd[m&127]*128+((m>>7)&127);HIS[hi]+=d*d;if(HIS[hi]>1e6) for(let q=0;q<HIS.length;q++) HIS[q] >>= 1;}
break;
}
}
}
if(!n) return chk ? -MATE+ply:0;
let ss=best;if(ss>MATE-200) ss+=ply;else if(ss < -MATE+200) ss-=ply;
T_LO[ti]=hLo;T_HI[ti]=hHi;T_MV[ti]=bm;T_SC[ti]=ss;T_D[ti]=d;T_F[ti]=best>=b?1:best<=a0?2:0;
return best;
}

// Tingkat lawan: kedalaman, batas waktu (ms), derau penilaian, peluang langkah ceroboh, dan rating tetap (untuk rating pemain).
const LV=[
{nama: "Pemula",depth: 1,ms: 150,noise: 150,ceroboh: 0.22,r: 600},
{nama: "Santai",depth: 2,ms: 350,noise: 60,ceroboh: 0.07,r: 850},
{nama: "Lumayan",depth: 3,ms: 500,noise: 32,ceroboh: 0.02,r: 1100},
{nama: "Jago",depth: 4,ms: 700,noise: 14,ceroboh: 0,r: 1350},
{nama: "Tangguh",depth: 5,ms: 900,noise: 0,ceroboh: 0,r: 1650},
{nama: "Master",depth: 40,ms: 1800,noise: 0,ceroboh: 0,r: 2000}
];
// Buku pembuka kecil (jalur umum teori catur, disusun sendiri) agar Jago ke atas bervariasi tanpa melemah
const B64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",b64=(c)=>{const i=B64.indexOf(c);return sqName((i&7)+(i>>3)*16);};
const BUKU="Mc0kGV5qFhwohY+tEG90,Mc0kGV5qFa9iKS+tLTzr,Mc0kGV5qFa+tLT90EG8+,Mc0kGV5qLbkbVb+tbqxq,Mc0kGV+tVkzrkVtcLbrj,Mc0kBS+tGV5qFh9Z,McyiGVzrLbibVb+tBSwo,McyiGV5qLbibVb+tBS0k,McyiGV0sLbibVbwoFT+t,McyiBS5qOW2uFO92LTzr,McyiKS+tcktjLbibGV5q,Mc0sLbzjBS+tCm90cktz,Mc0sLbzjckyiKS5qGV7p,McyqLbzjBSjcSc6lcWlu,McyqLbzjck6lGV0sFMqi,Mczjcj7jBSjgLb+tGV6l,MczrLb+tBS2uGV92FM8+,LbzjKa0sBS+tCm90MU8+,LbzjKayqGV+tBSjaIY6l,LbzjKajaGV+tMU0sFayi,Lb+tKa2uBS92MczrGV8+,Lb+tKa0sBS9ZMU8+FTzj,Lb+tKa0sGVxpOW6xFO90,Lb+tKa2uBSzjajtjMcjS,LbzjGV+tCd0sMUyiKS5q,Lb1lOW+tFO0sGV90EG8+,Ka0kBS+tGV5qOWzjajtj,Ka+tBS0sMczjckjb,GVzjOW+tFOyqEG6eLT5z,GV+tKayiBS5qOW2uFO92".split(",").map((s)=>s.match(/../g).map((p)=>b64(p[0])+b64(p[1])));
function buku(o){
if((o.fen||START)!==START) return "";
const h=o.riwayat||[],n=h.length,c=[];
for(const L of BUKU){if(L.length<=n) continue;let ok=true;for(let i=0;i<n;i++) if(L[i]!==h[i]){ok=false;break;} if(ok&&c.indexOf(L[n])<0) c.push(L[n]);}
return c.length?c[(rngOf(((o.seed>>>0)^0x5bd1e995)>>>0||1)()*c.length)|0]:"";
}
function rngOf(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function gauss(r){return Math.sqrt(-2*Math.log(1-r()*0.999999))*Math.cos(6.283185307*r());}
// semua langkah akar dinilai pada kedalaman d (untuk lawan lemah dan variasi pembukaan)
function rootScores(d){
const ms=legal(),out=[];
for(const m of ms){make(m);const s = -search(d-1,-INF,INF,1,true);unmake();out.push([m,s]);}
return out;
}
// pikir({fen, riwayat:[uci], lv, seed, ms, nodes}) -> {move:"e2e4", score, depth, nodes}; riwayat dipakai untuk mengenali ulangan
function think(o){
setup(o.fen,o.riwayat);
const lv=o.lv==null?5:o.lv,L=LV[lv],r=rngOf((o.seed>>>0)||1),ms=legal();
if(!ms.length) return {move: "",score: 0,depth: 0,nodes: 0};
nodes=0;KIL.fill(0);
for(let q=0;q<HIS.length;q++) HIS[q] >>= 2;
if(ms.length===1) return {move: uci(ms[0]),score: 0,depth: 0,nodes: 0};
if(lv>=3&&!o.tanpaVariasi){const b=buku(o);if(b&&ms.some((m)=>uci(m)===b)) return {move: b,score: 0,depth: 0,nodes: 0};}
if(L.noise&&!o.tanpaVariasi){
stopOn=false;
const dd=Math.floor(L.depth)+(r()<L.depth%1?1:0),sc=rootScores(dd).sort((a,b)=>b[1]-a[1]);// kedalaman pecahan: campuran dua kedalaman
// kesalahan manusiawi: langkah yang masuk akal (peringkat 2-5), bukan langkah acak
if(L.ceroboh&&sc.length>2&&r()<L.ceroboh){const m=sc[1+((r()*Math.min(4,sc.length-1))|0)][0];return {move: uci(m),score: 0,depth: 1,nodes};}
let bs = -INF*2,bm=sc[0][0];
for(const [m,s] of sc){const v=s+(Math.abs(s)>MATE-200?0:gauss(r)*L.noise);if(v>bs){bs=v;bm=m;}}
return {move: uci(bm),score: bs|0,depth: dd,nodes};
}
// batas simpul selain batas waktu: pencarian pasti berhenti walau jam tidak berjalan (mode uji, perangkat lambat)
stopOn=true;deadline=now()+(o.ms||L.ms);nodeCap=o.nodes||Math.round((o.ms||L.ms)*600);
let best=ms[0],bsc=0,dd=0;
for(let d=1;d<=(o.depth||L.depth);d++){
try {const s=search(d,-INF,INF,0,true);best=rootBest||best;bsc=s;dd=d;}
catch(e){if(e!==ABORT) throw e;unwind();if(rootBest&&d>1) best=rootBest;break;}
if(Math.abs(bsc)>MATE-200&&d>2) break;
if(now()>deadline-(o.ms||L.ms)*0.45&&!o.nodes) break;// kedalaman berikutnya hampir pasti tak selesai
}
stopOn=false;
return {move: uci(best),score: bsc,depth: dd,nodes};
}
let baseHp=0;
// pencarian dihentikan di tengah jalan: kembalikan papan ke posisi akar
function unwind(){while(hp>baseHp){if(U_M[hp-1]===0) unmakeNull();else unmake();}}
function setup(f,riw){
load(f||START);
if(riw) for(const u of riw){const m=fromUci(u);if(!m) break;make(m);if(hp>900) load(fen());}
// riwayat tetap di tumpukan untuk mengenali ulangan; pencarian mulai dari sini
baseHp=hp;rootBest=0;
}

/* ---------- pemecah skakmat (untuk teka-teki): pihak jalan menang dalam n langkah? ---------- */
function attWin(n,ply){
const b=ply*256,o=gen(b,false),them=side^8,list=[];
for(let i=b;i<o;i++){
const m=MV[i];make(m);
if(!attacked(kings[(them^8)>>3],them)){const c=attacked(kings[them>>3],side^8);if(c||n>1) list.push(m|0,c?2:m>>>17&1);}
unmake();
}
// periksa skak dulu, lalu makan, lalu sisanya
for(let pass=2;pass>=0;pass--) for(let i=0;i<list.length;i+=2){
if(list[i+1]!==pass) continue;
make(list[i]);const w=defLose(n,ply+1);unmake();
if(w) return list[i];
}
return 0;
}
function defLose(n,ply){
const chk=attacked(kings[side>>3],side^8);
if(n===1) return chk&&!hasLegal();
if(half>=100||repeated()) return false;
const b=ply*256,o=gen(b,false);let any=false;
for(let i=b;i<o;i++){
make(MV[i]);
if(attacked(kings[(side^8)>>3],side)){unmake();continue;}
any=true;const w=attWin(n-1,ply+1);unmake();
if(!w) return false;
}
return any?true:chk;
}

/* ---------- lapisan permainan: keadaan yang bisa diserialkan, langkah berupa data kecil, fungsi murni ---------- */
// keadaan = {awal: FEN, langkah: ["e2e4", ...]}. Tidak pernah diubah; terapkanLangkah mengembalikan keadaan baru.
function baru(awal){return {awal: awal||START,langkah: []};}
// muat keadaan ke papan mesin; mengembalikan jumlah kemunculan posisi sekarang (untuk ulangan tiga kali)
function muat(k){
onlineRules=k.aturan==="online";
load(k.awal);const seen=new Map(),key=()=>hLo+":" + hHi;
seen.set(key(),1);
for(const u of k.langkah){const m=fromUci(u);if(!m) throw new Error("langkah tidak sah: " + u);make(m);const kk=key();seen.set(kk,(seen.get(kk)||0)+1);}
return seen.get(key());
}
function terapkanLangkah(k,u){
if(!k||!Array.isArray(k.langkah)) return null;
if(status0(muat(k)).selesai) return null;
if(!fromUci(u)) return null;
return Object.assign({awal:k.awal,langkah:k.langkah.concat([u])},k.aturan?{aturan:k.aturan}:{});
}
function status0(rep){
const chk=inCheck(),any=hasLegal();
if(!any) return chk?{selesai: true,hasil: side?"1-0":"0-1",alasan: "skakmat",skak: true}:{selesai: true,hasil: "1/2",alasan: "pat",skak: false};
if(rep>=(onlineRules?5:3)) return {selesai: true,hasil: "1/2",alasan: "ulangan",skak: chk};
if(half>=(onlineRules?150:100)) return {selesai: true,hasil: "1/2",alasan: "50langkah",skak: chk};
if(insufficient()) return {selesai: true,hasil: "1/2",alasan: "bahan",skak: chk};
return {selesai: false,hasil: "",alasan: "",skak: chk};
}
function status(k){const rep=muat(k);return status0(rep);}
// ringkasan posisi untuk tampilan: papan 64 huruf (a1..h8), giliran, langkah sah, skak, hasil
function info(k){
const rep=muat(k),st=status0(rep),sq=[];
for(let r=0;r<8;r++) for(let c=0;c<8;c++){const p=bd[r*16+c];sq.push(p?(p&8?" pnbrqk":" PNBRQK")[p&7]:".");}
const lg=st.selesai?[]:legal().map(uci);
return {papan: sq,giliran: side?"b":"w",legal: lg,skak: st.skak,raja: sqName(kings[side>>3]),status: st,fen: fen(),setengah: half,remisKlaim:{ulangan:rep>=3,limapuluh:half>=100}};
}
// SAN untuk langkah ke-i (0 = pertama) dari keadaan
function sanList(k){
load(k.awal);const out=[];
for(const u of k.langkah){const m=fromUci(u);if(!m) break;out.push(san(m));make(m);}
return out;
}
// keterangan satu langkah sebelum dijalankan: makan apa, rokade, en passant, promosi, skak
function jelaskan(k,u){
muat(k);const m=fromUci(u);if(!m) return null;
const fl=m>>>17,to=(m>>7)&127,pc=bd[m&127];
const cap=fl&2?1:bd[to]&7;
make(m);const chk=inCheck(),mate=chk&&!hasLegal();
// garpu: bidak yang baru jalan menyerang dua sasaran bernilai (raja/ratu/benteng, atau bidak yang tak terlindungi)
let targets=0;const me=side^8,t=bd[to]&7;
if(t===1){for(const d of me?[-15,-17]:[15,17]){const s=to+d;if(!(s&0x88)&&bd[s]&&(bd[s]&8)!==me&&(bd[s]&7)>=2) targets++;}}
else if(t===2||t===3) for(const d of t===2?ND:BD){
let s=to+d;
while(!(s&0x88)){const x=bd[s];if(x){if((x&8)!==me&&(x&7)>=4) targets++;break;} if(t===2) break;s+=d;}
}
unmake();
return {makan: cap?" pnbrqk"[cap]:"",rokade: !!(fl&4),enPassant: !!(fl&2),promosi: (m>>14)&7?" nbrq"[((m>>14)&7)-1]:"",skak: chk,skakmat: mate,garpu: targets>=2,bidak: " pnbrqk"[pc&7]};
}
// pikir di atas keadaan permainan (dipakai halaman dan Worker)
function pikir(k,lv,seed,extra){
const o=Object.assign({fen: k.awal,riwayat: k.langkah,lv,seed},extra||{});
return think(o);
}
// teka-teki: apakah langkah u (oleh pemecah) masih memaksa mat dalam sisa n langkah?
function tekaCek(k,u,n){muat(k);const m=fromUci(u);if(!m) return false;make(m);const ok=defLose(n,2);unmake();return ok;}
// balasan bertahan terbaik: yang membuat mat paling lama; seri diputus oleh urutan tetap
function tekaBalas(k,n){
muat(k);const ms=legal();let best=ms[0],bk = -1;
for(const m of ms){
make(m);let kk=n;for(let q=1;q<n;q++) if(attWin(q,2)){kk=q;break;} unmake();
const cap=(m>>>17)&1;
if(kk>bk||(kk===bk&&cap&&!((best>>>17)&1))){bk=kk;best=m;}
}
return best?uci(best):"";
}
function tekaSolusi(k,n){muat(k);const m=attWin(n,1);return m?uci(m):"";}
// Ulasan kilat: nilai tiap posisi dengan pencarian terbatas (sudut pandang pemain me), lalu cari blunder terbesar dan langkah terbaiknya
function ulas(k,me,nd){
load(k.awal);const L=k.langkah,us=me==="b"?8:0,v=[],bm=[],cp=[];
for(let i=0;i<=L.length;i++){
baseHp=hp;rootBest=0;nodes=0;stopOn=true;deadline=now()+6e4;nodeCap=nd||9000;
let s=0,b=0;
if(!hasLegal()) s=inCheck() ? -MATE:0;
else for(let d=1;d<=9;d++){try {s=search(d,-INF,INF,0,true);b=rootBest;} catch(e){if(e!==ABORT) throw e;unwind();if(rootBest) b=rootBest;break;}}
stopOn=false;s=Math.max(-2000,Math.min(2000,s));
v.push(side===us?s : -s);bm.push(b?uci(b):"");cp.push(b&&(b>>>17)&1?((b>>>17)&2?"p":" pnbrqk"[bd[(b>>7)&127]&7]):"");
if(i<L.length){const m=fromUci(L[i]);if(!m) break;make(m);}
}
let bi = -1,bx=119,gi = -1,gx=149;const sb=String(k.awal).split(" ")[1]==="b";
for(let i=0;i<L.length&&i+1<v.length;i++){
if((sb!==!!(i&1)?"b":"w")!==me) continue;
const drop=v[i]-v[i+1];
if(L[i]!==bm[i]&&drop>bx){bx=drop;bi=i;}
if(i&&drop<40&&v[i+1]-v[i-1]>gx){gx=v[i+1]-v[i-1];gi=i;}
}
return {v,buruk: bi<0?null:{i: bi,main: L[bi],baik: bm[bi],turun: bx,balas: bm[bi+1]||"",makan: cp[bi+1]||""},bagus: gi<0?null:{i: gi,main: L[gi],naik: gx}};
}

return {
START,LV,load,perft,pikir,fromUci,san,sanList,baru,terapkanLangkah,status,info,jelaskan,tekaCek,tekaBalas,tekaSolusi,muat,ulas
};
})();
if(typeof module!=="undefined") module.exports=CT;
