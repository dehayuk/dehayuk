'use strict';
// Integration test for Lapis: two isolated browsers, real HTTP/SSE transport,
// actual Lapis physics and duel engine. Backend is local and uses the mini rule evaluator.
// This does not validate deployed Firebase rules or Android hardware.
// Run: node scripts/uji-lapis-network.cjs (same Playwright/Edge setup as uji-lapis-ui.cjs).
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const {chromium}=require(process.env.LAPIS_PLAYWRIGHT||path.join(process.env.TEMP,'dehayuk-ux-tools/node_modules/playwright'));
const {buatDB}=require(root+'/scripts/gelanggang/aturan-mini.js');
const rules=require(root+'/scripts/gelanggang/database.rules.json');
const settings=require(root+'/scripts/gelanggang/setelan.json');
const db=buatDB(rules,{jam:()=>Date.now()}),streams=new Set(),blocked=new Set(),errors=[],denials=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let reads=0,writes=0,checks=0,replayCollisions=0,readyFailures=1,readyWrites=0,url;
const uidA='LapisNetworkA0000000000000000',uidB='LapisNetworkB0000000000000000';
db.setelTanpaAturan('v1/setelan/tumpuk-lapis',settings['tumpuk-lapis']);
function check(ok,label){assert.ok(ok,label);checks++;console.log('PASS '+label);}
async function until(fn,timeout,label){const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await sleep(100);}throw new Error('Timeout: '+label);}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/gelanggang.json')return json(res,200,{aktif:true,web:true,db:url+'/testdb',kunci:'local-test',protoMin:1});
 if(u.pathname.startsWith('/testdb/')){
  const uid=u.searchParams.get('auth'),p=decodeURIComponent(u.pathname.slice(8).replace(/\.json$/,''));
  if(![uidA,uidB].includes(uid))return json(res,401,{error:'unknown test account'});
  if(blocked.has(uid))return json(res,503,{error:'test disconnection'});
  await sleep(uid===uidA?35:180);
  if(req.method==='GET'&&req.headers.accept?.includes('text/event-stream')){
   const value=db.baca(p,{uid});res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write('retry: 500\n\n');
   const send=v=>{if(!res.destroyed)res.write('event: put\ndata: '+JSON.stringify({path:'/',data:v})+'\n\n');};send(value);
   const release=db.pantau(p,send),stream={uid,res};streams.add(stream);res.on('close',()=>{release();streams.delete(stream);});return;
  }
  if(req.method==='GET'){reads++;const snapshot=db.baca(p,{uid});if(/^v1\/cek\/tumpuk-lapis\/rebutan\/[^/]+$/.test(p)&&snapshot===null)await sleep(500);return json(res,200,snapshot);}
  const chunks=[];for await(const c of req)chunks.push(c);const body=JSON.parse(Buffer.concat(chunks).toString());
  if(uid===uidA&&Object.entries(body).some(([p,v])=>p.includes('/live/')&&v?.siap===true)){
   readyWrites++;
   if(readyFailures>0){readyFailures--;await sleep(650);return json(res,403,{error:'simulated readiness write failure'});}
  }
  const updates=req.method==='PUT'?{[p]:body}:body;db.tulis(updates,{uid});writes++;
  return json(res,200,req.method==='PUT'?db.nilai(p):true);
 }
 let file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(path.resolve(root)+path.sep))return json(res,403,{error:'outside root'});
 if(u.pathname.endsWith('/'))file=path.join(file,'index.html');
 const data=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'});res.end(data);
 }catch(e){if(e.kode==='tolak'){if(/v1\/cek\/.*\/s1/.test(e.message))replayCollisions++;denials.push(e.message);return json(res,403,{error:e.message});}if(e.code==='ENOENT')return json(res,404,{error:'not found'});errors.push(e.stack);json(res,500,{error:e.message});}
});
function tree(){return db.nilai('v1/tayang/tumpuk-lapis/rebutan')||{};}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.LAPIS_EDGE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
try{
 const clients=[];
 for(const [uid,name,width] of [[uidA,'Penguji Satu',390],[uidB,'Penguji Dua',900]]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:600},serviceWorkers:'block'});
  await context.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
  await context.addInitScript(({uid,name})=>{localStorage.setItem('dehayuk.papan.akun',JSON.stringify({uid,id:uid,refresh:'',exp:Date.now()+3600000}));localStorage.setItem('dehayuk.papan.nama',JSON.stringify(name));},{uid,name});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));page.setDefaultTimeout(10000);
  await page.goto(url+'/tumpuk-lapis/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>GL.buka('rebutan'));
  await page.locator('#glRebut').waitFor();clients.push({uid,context,page});
 }
 const [a,b]=clients;
 check(await a.page.evaluate(()=>!new URLSearchParams(location.search).has('gl')),'production UI and transport, no demo fixture');
 await Promise.all(clients.map(c=>c.page.locator('#glRebut').click()));
 await until(()=>{const t=tree();return t.m?.[uidA]?.w===t.f?.w&&t.m?.[uidB]?.w===t.f?.w},4000,'both tickets');
 check(true,'simultaneous join from separate browser accounts');
 await until(()=>tree().f?.st==='siap',12000,'seats');
 const seated=tree().f;check(new Set([seated.a.u,seated.b.u]).size===2&&[seated.a.u,seated.b.u].every(x=>[uidA,uidB].includes(x)),'two distinct seats after concurrent writes');
 await a.page.locator('#glSiap').click();
 check(await a.page.locator('#glSiap').isDisabled(),'ready button blocks repeated input while sending');
 check((await a.page.locator('#glSiap').innerText()).includes('Mengirim kesiapan'),'sending is not presented as confirmed readiness');
 await a.page.evaluate(()=>{for(let i=0;i<3;i++)document.querySelector('#glSiap').click();});
 await until(async()=>await a.page.locator('#glSiap').innerText()==='Coba lagi',2500,'ready retry after rejected write');
 check(readyWrites===1,'repeated input creates only one readiness request');
 check(!Object.values(tree().live||{}).some(x=>x.u===uidA&&x.siap),'failed readiness is not stored on the server');
 check(!await a.page.locator('#glSiap').isDisabled(),'failed write restores a usable retry button');
 const readyRect=await a.page.locator('#glSiap').boundingBox();check(readyRect&&readyRect.y+readyRect.height<=844,'ready retry action fits the phone screen');
 await sleep(200); // Respect the existing engine retry interval.
 await a.page.locator('#glSiap').click();
 await until(async()=>(await a.page.locator('#glSiap').innerText()).includes('Menunggu lawan'),2000,'server-confirmed readiness');
 check(Object.values(tree().live||{}).some(x=>x.u===uidA&&x.siap),'waiting for opponent follows server confirmation');
 check(await a.page.locator('#glSiap').isDisabled(),'confirmed readiness prevents another submission');
 await b.page.locator('#glSiap').click();
 await until(async()=>tree().f?.st==='main'&&(await a.page.evaluate(()=>mode==='play'))&&(await b.page.evaluate(()=>mode==='play')),10000,'both playing');
 check((await a.page.evaluate(()=>seedNow))===(await b.page.evaluate(()=>seedNow)),'both players use the same deterministic seed');
 for(const c of clients)await c.page.evaluate(()=>{window.__networkPilot=setInterval(()=>{if(mode!=='play'||!core.cur||core.cur.t<0.4||!navigator.onLine||document.documentElement.classList.contains('lp-offline'))return;const i=core.cur.i;if(window.__networkTap===i)return;if(Math.abs(core.offset())<3){window.__networkTap=i;cv.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:1,pointerType:'mouse'}));}},8);});
 await until(()=>{const t=tree();return t.live?.a?.s>=2&&t.live?.b?.s>=2},15000,'both scores');
 check(true,'real Lapis inputs produce scores on both clients through HTTP');
 await until(async()=>{const t=tree();return (await a.page.locator('.gl-cheads').innerText()).includes(String(t.live.b.s))&&(await b.page.locator('.gl-cheads').innerText()).includes(String(t.live.a.s));},4000,'opponent scores');
 check(true,'opponent scores arrive over Server-Sent Events');
 blocked.add(uidA);await a.context.setOffline(true);for(const s of [...streams])if(s.uid===uidA)s.res.destroy();
 await until(()=>a.page.locator('.lp-connection').isVisible(),4000,'offline banner');
 check(true,'actual network disconnection shows a connection notice');
 const before=await a.page.evaluate(()=>({n:core.n,t:runT}));await a.page.keyboard.press('Space');await a.page.locator('#cv').dispatchEvent('pointerdown');await sleep(500);
 const after=await a.page.evaluate(()=>({n:core.n,t:runT}));check(before.n===after.n,'unconfirmed input blocked while offline');check(after.t>before.t,'duel clock continues while disconnected');
 blocked.delete(uidA);await a.context.setOffline(false);
 await until(async()=>!await a.page.locator('.lp-connection').isVisible(),5000,'reconnection');check(true,'SSE reconnects and clears the notice');
 await until(()=>{const t=tree();return t.live?.a?.s>=4&&t.live?.b?.s>=4},12000,'continued progress');check(true,'scores continue syncing after reconnection');
 await a.page.evaluate(()=>{clearInterval(window.__networkPilot);window.__fallPilot=setInterval(()=>{if(mode==='play'&&core.cur&&core.cur.t>.4&&Math.abs(core.offset())>core.cur.W+8){clearInterval(window.__fallPilot);cv.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:1}));}},8);});
 await until(()=>tree().f?.st==='usai',18000,'result');const result=tree().f;check(result.h&&['a','b','seri'].includes(result.h.p),'one canonical result recorded');
 await until(async()=>await a.page.locator('[data-screen="D2"]').isVisible()&&await b.page.locator('[data-screen="D2"]').isVisible(),3000,'both result screens');check(true,'both browsers show the result screen');
 const dir=path.join(process.env.TEMP,'lapis-dua-browser');fs.mkdirSync(dir,{recursive:true});await a.page.screenshot({path:path.join(dir,'hasil-ponsel.png')});await b.page.screenshot({path:path.join(dir,'hasil-desktop.png')});
 await until(()=>{const v=Object.values(db.nilai('v1/cek/tumpuk-lapis/rebutan/'+result.rid)||{});return v.some(x=>x.a===1)&&v.some(x=>x.b===1)},6000,'both cross-client replay checks');const verification=db.nilai('v1/cek/tumpuk-lapis/rebutan/'+result.rid);console.log('Replay verification: '+JSON.stringify(verification));check(Object.values(verification).every(v=>v.a!==0&&v.b!==0),'both clients validate their opponent replay');check(replayCollisions>0,'concurrent replay slot collision recovered through s2');
 check(!!db.nilai('v1/hasil/tumpuk-lapis/rebutan/'+result.rid),'result archive exists');check(!errors.length,errors.length?errors.join('\n'):'no browser or server exceptions');

 // Start a fresh local arena for a prolonged disconnection. Profiles/settings remain unchanged.
 await a.context.close();await b.context.close();db.setelTanpaAturan('v1/tayang/tumpuk-lapis/rebutan',null);
 const second=[];
 for(const [uid,name,width] of [[uidA,'Penguji Satu',390],[uidB,'Penguji Dua',900]]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:600},serviceWorkers:'block'});
  await context.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
  await context.addInitScript(({uid,name})=>{localStorage.setItem('dehayuk.papan.akun',JSON.stringify({uid,id:uid,refresh:'',exp:Date.now()+3600000}));localStorage.setItem('dehayuk.papan.nama',JSON.stringify(name));},{uid,name});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));page.setDefaultTimeout(10000);
  await page.goto(url+'/tumpuk-lapis/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>GL.buka('rebutan'));await page.locator('#glRebut').waitFor();second.push({uid,context,page});
 }
 const [c,d]=second;await Promise.all(second.map(x=>x.page.locator('#glRebut').click()));await until(()=>tree().f?.st==='siap',12000,'second seats');await Promise.all(second.map(x=>x.page.locator('#glSiap').click()));
 await until(async()=>await c.page.evaluate(()=>mode==='play')&&await d.page.evaluate(()=>mode==='play'),10000,'second match');
 for(const x of second)await x.page.evaluate(({slow})=>{window.__networkPilot=setInterval(()=>{if(mode!=='play'||!core.cur||core.cur.t<.4||!navigator.onLine||document.documentElement.classList.contains('lp-offline')||Date.now()<(window.__nextTap||0))return;const i=core.cur.i;if(window.__networkTap===i)return;if(Math.abs(core.offset())<3){window.__networkTap=i;window.__nextTap=Date.now()+(slow?4800:0);cv.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:1}));}},8);},{slow:x.uid===uidB});
 await until(async()=>await c.page.evaluate(()=>core.n>=8)&&await d.page.evaluate(()=>core.n>=2),18000,'lead before prolonged disconnect');
 const beforeDisconnect=tree();const lostSeat=beforeDisconnect.f.a.u===uidA?'a':'b',winSeat=lostSeat==='a'?'b':'a';
 blocked.add(uidA);await c.context.setOffline(true);for(const stream of [...streams])if(stream.uid===uidA)stream.res.destroy();
 await until(()=>tree().f?.st==='usai',15000,'disconnection timeout result');const timeoutResult=tree().f;
 check(timeoutResult.h.p===winSeat&&timeoutResult.h.al==='putus','prolonged disconnect awards the connected player');
 check(timeoutResult.h[lostSeat==='a'?'sa':'sb']>timeoutResult.h[winSeat==='a'?'sa':'sb'],'connection loss can override a score lead');
 blocked.delete(uidA);await c.context.setOffline(false);await until(()=>c.page.locator('[data-screen="D2"]').isVisible(),4000,'reconnected loser result');
 await c.page.screenshot({path:path.join(dir,'putus-kalah.png')});await d.page.screenshot({path:path.join(dir,'putus-menang.png')});
 const loserFeedback=await c.page.locator('.gl-istirahat').innerText(),winnerSummary=await d.page.locator('.gl-winskor .mid').innerText();
 console.log('Disconnect feedback: '+JSON.stringify({loserFeedback,winnerSummary}));
 check(!/Hampir|Kurang/.test(loserFeedback),'connection defeat does not falsely describe a score deficit');
 check(!/menang\s*\+/.test(winnerSummary),'connection win does not falsely describe a score lead');
 check(!errors.length,errors.length?errors.join('\n'):'no browser or server exceptions after both matches');
 await Promise.all(second.map(x=>x.page.evaluate(()=>GL.tutup())));
 await until(()=>streams.size===0,3000,'all streams released after leaving');
 await c.context.setOffline(true);await c.context.setOffline(false);await sleep(500);
 check(streams.size===0,'leaving arena removes reconnect listeners and keeps streams closed');
 check(await c.page.evaluate(()=>!GL.aktif()&&mode==='title'),'online event cannot reopen a closed arena');
 console.log(JSON.stringify({checks,reads,writes,expectedRuleRaces:denials.length,replayCollisions,result:result.h,screenshots:dir}));
}finally{await browser.close();for(const s of streams)s.res.destroy();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack);console.error('STATE '+JSON.stringify(tree()));console.error('Recent rule denials '+JSON.stringify(denials.slice(-5)));process.exitCode=1;});
