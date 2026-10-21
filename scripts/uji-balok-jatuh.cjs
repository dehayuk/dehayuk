/* Jalankan: node scripts/uji-balok-jatuh.cjs (Node + Edge/Playwright lokal). */
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),B=require('../balok-jatuh/mesin.js');
let checks=B.selfTest().length;
// Permainan panjang: tidak menembus papan, tidak menghapus sel tanpa satu baris penuh.
for(let seed=1;seed<=80;seed++){
 const g=new B.Game(seed),random=(()=>{let x=seed;return()=>((x=Math.imul(x,1664525)+1013904223>>>0)/4294967296)})();
 for(let n=0;n<200&&!g.over;n++){
  for(let k=0;k<Math.floor(random()*4);k++)g.turn();
  for(let k=0,dx=random()<.5?-1:1;k<Math.floor(random()*10);k++)g.move(dx);
  const before=g.board.flat().filter(Boolean).length,out=g.drop();
  assert(g.board.length===20&&g.board.every(r=>r.length===10));
  assert.equal(g.board.flat().filter(Boolean).length,before+(out.over&&out.landed.some(([,y])=>y<0)?0:4)-out.rows.length*10);
  if(!g.over)assert(g.fits(g.active));checks+=3;
 }
}
console.log('ENGINE PASS '+checks+' assertions');
const {chromium}=require(process.env.TEMP+'/dehayuk-ux-tools/node_modules/playwright');
const server=http.createServer((q,r)=>{let f=path.join(root,new URL(q.url,'http://local').pathname);if(f.endsWith(path.sep))f+='index.html';fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end()}r.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'})[path.extname(f)]||'application/octet-stream');r.end(b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-gpu']});
 const errors=[];let ui=0;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  let visit=0;
  async function load(suffix=''){await p.goto(base+'/balok-jatuh/?uji-ui=1&visit='+(++visit)+suffix);await p.waitForFunction(()=>window.BalokUji);}
  async function begin(){await load();await p.locator('#start').click();await p.waitForFunction(()=>BalokUji.state==='playing');}
  await load();
  for(const [w,h]of [[320,568],[360,640],[390,844],[768,1024],[600,360],[1200,640]]){
   await p.setViewportSize({width:w,height:h});await p.waitForTimeout(150);
   const homeIssues=await p.evaluate(()=>[document.querySelector('[data-dh-main]'),...document.querySelectorAll('[data-dh-action]')].flatMap(e=>{const r=e.getBoundingClientRect();return r.left<0||r.top<0||r.right>innerWidth+.5||r.bottom>innerHeight+.5||r.width<44||r.height<44?[e.id+JSON.stringify(r)]:[];}));assert.deepEqual(homeIssues,[],'home '+w+'x'+h);
   await p.screenshot({path:process.env.TEMP+'/balok-home-'+w+'.png'});
   await p.locator('#start').click();await p.waitForTimeout(150);
   const issues=await p.evaluate(()=>{const els=[document.querySelector('#board'),document.querySelector('#pause'),...document.querySelectorAll('[data-control]')],out=[];for(const e of els){const r=e.getBoundingClientRect();if(r.left<0||r.top<0||r.right>innerWidth+.5||r.bottom>innerHeight+.5)out.push(e.id||e.dataset.control);if(e.tagName==='BUTTON'&&(r.width<44||r.height<44))out.push('small '+e.dataset.control);}const r=els[0].getBoundingClientRect();if(Math.abs(r.height/r.width-2)>.01)out.push('distorted board');if(document.body.scrollHeight>innerHeight+1)out.push('scroll');return out;});assert.deepEqual(issues,[],'game '+w+'x'+h);ui++;
   await p.screenshot({path:process.env.TEMP+'/balok-play-'+w+'.png'});await load();
  }
  await p.setViewportSize({width:390,height:844});await begin();
  const x=await p.evaluate(()=>BalokUji.game.active.x);await p.keyboard.press('ArrowLeft');assert.equal(await p.evaluate(()=>BalokUji.game.active.x),x-1);ui++;
  await p.keyboard.down('ArrowRight');await p.waitForTimeout(330);await p.keyboard.up('ArrowRight');assert((await p.evaluate(()=>BalokUji.game.active.x))>x);ui++;
  await p.locator('#pause').click();const paused=await p.evaluate(()=>JSON.stringify(BalokUji.game));await p.waitForTimeout(1000);assert.equal(await p.evaluate(()=>JSON.stringify(BalokUji.game)),paused,'pause freezes board');ui++;
  await p.locator('#pauseSettings').click();await p.locator('.dk-overlay:not([hidden])').waitFor();await p.locator('.dk-overlay [data-x]').click();await p.locator('#resume').click();await p.waitForTimeout(40);assert.equal(await p.evaluate(()=>BalokUji.state),'playing');ui++;
  await p.keyboard.press('Space');const locked=await p.evaluate(()=>BalokUji.game.board.flat().filter(Boolean).length);assert.equal(locked,4);ui++;
  // Empat baris dihapus melalui tombol permainan yang dipakai pemain.
  await p.evaluate(()=>{const g=BalokUji.game;g.board=Array.from({length:20},()=>Array(10).fill(null));g.active={type:'I',m:Balok.rotate(Balok.matrix('I'),1),x:2,y:0};for(let y=16;y<20;y++)g.board[y]=Array.from({length:10},(_,x)=>x===4?null:'O');g.score=0;g.lines=0;});
  await p.keyboard.press('Space');assert.equal(await p.locator('#lines').innerText(),'4');assert.match(await p.locator('#toast').innerText(),/EMPAT BARIS/);ui++;
  await p.waitForTimeout(330);
  // Sentuhan nyata: tahan, batal, dan dua jari tidak menyisakan kontrol aktif.
  const cdp=await context.newCDPSession(p),left=await p.locator('[data-control=left]').boundingBox(),right=await p.locator('[data-control=right]').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:left.x+left.width/2,y:left.y+left.height/2,id:1},{x:right.x+right.width/2,y:right.y+right.height/2,id:2}]});await p.waitForTimeout(240);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await p.evaluate(()=>BalokUji.held),0);ui++;
  await p.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await p.evaluate(()=>BalokUji.state),'paused');ui++;
  await p.locator('#finish').click();assert.equal(await p.evaluate(()=>BalokUji.state),'result');await p.locator('#rAgain').click();const replay=await p.evaluate(()=>BalokUji.seed);await p.evaluate(()=>document.querySelector('#rAgain').click());assert.equal(await p.evaluate(()=>BalokUji.seed),replay,'stale replay ignored');ui++;
  // Top-out ends the match through the same drop button used by the player.
  await p.evaluate(()=>{const g=BalokUji.game;g.active={type:'O',m:Balok.matrix('O'),x:4,y:-1};g.board[1][4]='I';});await p.keyboard.press('Space');await p.locator('#result').waitFor();assert.equal(await p.evaluate(()=>BalokUji.state),'result');ui++;
  await p.locator('#toHome').click();await p.locator('#daily').click();await p.locator('#startDaily').click();const dailySeed=await p.evaluate(()=>BalokUji.seed);await p.locator('#pause').click();await p.locator('#finish').click();await p.locator('#toHome').click();await p.locator('#daily').click();assert(await p.locator('#startDaily').isHidden());assert.match(await p.locator('#dailyText').innerText(),/sudah dimulai/);assert(dailySeed);ui++;
  await load('#t=abc-500');await p.locator('#start').click();assert.equal(await p.evaluate(()=>BalokUji.seed),parseInt('abc',36));assert.match(await p.locator('#modeLabel').innerText(),/500/);ui++;
  // Penyimpanan diblokir: memulai dan menyelesaikan permainan tetap berfungsi.
  await p.addInitScript(()=>{Storage.prototype.setItem=function(){throw Error('quota')};Storage.prototype.getItem=function(){throw Error('blocked')};});await begin();await p.locator('#pause').click();await p.locator('#finish').click();await p.locator('#result').waitFor();ui++;
  assert.deepEqual(errors,[]);console.log('UI PASS '+ui+' scenarios, 6 viewports, keyboard + touch + pause + daily + challenge + storage');await context.close();
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
