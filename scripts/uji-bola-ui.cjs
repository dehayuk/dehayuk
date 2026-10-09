'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.BOLA_PLAYWRIGHT||path.join(process.env.TEMP,'dehayuk-ux-tools/node_modules/playwright'));
const root=path.resolve(__dirname,'..'),errors=[],failures=[];let checks=0,browser,base;
function check(v,label){checks++;if(!v){failures.push(label);console.error('FAIL '+label);}}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://local').pathname);}catch(e){res.writeHead(400);return res.end();}let file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}if(name.endsWith('/'))file=path.join(file,'index.html');fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});});
async function scenario(label,run){if(process.env.BOLA_FILTER&&!process.env.BOLA_FILTER.split("|").some(v=>label.includes(v)))return;try{await run();console.log('PASS '+label);}catch(e){failures.push(label+': '+e.message);console.error(e.stack);}}
async function pageAt(viewport={width:390,height:844},options={}){
 const context=await browser.newContext({viewport,reducedMotion:options.motion||'reduce',serviceWorkers:'block'});
 await context.route('**/*',r=>r.request().url().startsWith(base+'/')||/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(r.request().url())?r.continue():r.abort());
 if(options.legacy)await context.addInitScript(()=>{localStorage.setItem('dehayuk.bola-pantul.best','83');localStorage.setItem('dehayuk.bola-pantul.gemTotal','61');localStorage.setItem('dehayuk.bola-pantul.skin','2');localStorage.setItem('dehayuk.bola-pantul.badges','["l10","k8"]');});
 if(options.deny)await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError');}}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.goto(base+'/bola-pantul/'+(options.suffix||''),{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof core!=='undefined'&&typeof KIT!=='undefined');await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>{window.__records=0;const original=KIT.progress.record;KIT.progress.record=function(v){window.__records++;return original.call(this,{...v,papan:''});};});
 return page;
}
async function start(page){await page.locator('#bMain').click({force:true});await page.waitForFunction(()=>mode==='play');await page.waitForTimeout(450);}
async function layout(page,label){const result=await page.evaluate(()=>{
 const list=[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width&&getComputedStyle(b).visibility!=='hidden');const small=[],outside=[];
 for(const b of list){const r=b.getBoundingClientRect();if(r.width<43.9||r.height<43.9)small.push(b.id);if(r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5)outside.push(b.id);}
 const m=document.getElementById('hMission'),mr=m.getBoundingClientRect(),over=[];
 if(!m.hidden)for(const b of list){const r=b.getBoundingClientRect();if(r.right>mr.left+1&&r.left<mr.right-1&&r.bottom>mr.top+1&&r.top<mr.bottom-1)over.push(b.id);}
 return{small,outside,over,overflow:document.documentElement.scrollWidth>innerWidth,missionFits:m.hidden||mr.left>=0&&mr.top>=0&&mr.right<=innerWidth+.5&&mr.bottom<=innerHeight+.5};
 });check(!result.small.length,label+' controls >=44px '+result.small);check(!result.outside.length,label+' controls fit '+result.outside);check(!result.over.length,label+' mission clear of controls '+result.over);check(!result.overflow&&result.missionFits,label+' no overflow');
 if(process.env.BOLA_SCREENSHOTS){fs.mkdirSync(process.env.BOLA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.BOLA_SCREENSHOTS,label+'.png')});}
}
async function pointer(page,type,{id=1,primary=true,mouse=false,button=0}={}){await page.evaluate(v=>{const x=FX+FW*K*.5,y=FY+300*K;cv.dispatchEvent(new PointerEvent(v.type,{pointerId:v.id,isPrimary:v.primary,pointerType:v.mouse?'mouse':'touch',button:v.button,clientX:x,clientY:y,bubbles:true,cancelable:true}));},{type,id,primary,mouse,button});}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({executablePath:process.env.BOLA_EDGE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 for(const [width,height]of [[360,640],[390,844],[900,480],[1280,720]])await scenario('layout '+width+'x'+height,async()=>{const p=await pageAt({width,height});try{
  check(await p.locator('#sTitle .icons button:visible').count()===5,'Five menus retained');await layout(p,width+'-title');await start(p);await layout(p,width+'-play');check(await p.locator('#hMission').isVisible(),'Mission visible');check(await p.locator('#hSide').isVisible(),'Ball and gem counters visible');
  const colors=await p.evaluate(()=>[...new Set(core.G.filter(b=>b&&b.k<2).map(blockColor))].length);check(colors>1,'Opening blocks distinguishable by color');
  await p.evaluate(()=>{core.hooks=null;core.fire(Math.PI*.09);volT=4;document.getElementById('bRecall').hidden=false;document.getElementById('bSpeed').hidden=false;});await p.waitForTimeout(100);await layout(p,width+'-flying');
  await p.locator('#bPause').click({force:true});await layout(p,width+'-pause');check(await p.evaluate(()=>mode==='pause'),'Pause works');
 }finally{await p.context().close();}});
 await scenario('input and lifecycle',async()=>{const p=await pageAt();try{await start(p);
  await p.locator('#bPause').focus();await p.keyboard.press('Space');check(await p.evaluate(()=>mode==='pause'&&core.turns===0),'Space activates focused Pause, no shot');
  await p.locator('#pGo').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>mode==='play');check(await p.evaluate(()=>core.turns===0),'Enter resumes without firing');
  await pointer(p,'pointerdown',{primary:false,id:2});check(await p.evaluate(()=>aimId===null),'Secondary finger ignored');
  await pointer(p,'pointerdown',{mouse:true,button:2});check(await p.evaluate(()=>aimId===null),'Right mouse ignored');
  await pointer(p,'pointerdown');check(await p.evaluate(()=>aimId===1),'Primary finger owns aim');await pointer(p,'pointerdown',{id:2});check(await p.evaluate(()=>aimId===1),'Second finger cannot steal aim');await pointer(p,'pointercancel');await pointer(p,'pointerup');check(await p.evaluate(()=>core.turns===0&&aimId===null),'Cancellation does not fire');
  await pointer(p,'pointerdown');await p.waitForTimeout(150);await pointer(p,'pointerup');check(await p.evaluate(()=>core.turns===1&&core.fly),'Deliberate touch fires');
  await p.locator('#bPause').click({force:true});const tick=await p.evaluate(()=>core.t);await p.waitForTimeout(200);check(await p.evaluate(()=>core.t)===tick,'Physics pauses');
  await p.locator('#pRe').click({force:true});check(await p.evaluate(()=>mode==='play'&&core.turns===0&&missionStage===0),'Restart resets run and mission');
  await p.evaluate(()=>document.getElementById('rAgain').click());check(await p.evaluate(()=>mode==='play'&&core.turns===0),'Hidden Android replay cannot reset run');
  await p.evaluate(()=>document.getElementById('bMain').click());check(await p.evaluate(()=>mode==='play'&&core.turns===0),'Hidden MAIN cannot reset run');
  await p.evaluate(()=>{core.breaks=3;syncMission();});check(await p.locator('#missionLabel').innerText()==='BERHASIL','Mission confirms success');await p.evaluate(()=>{missionUntil=0;syncMission();});check((await p.locator('#missionText').innerText()).includes('5 bola'),'Next mission follows');
  await p.evaluate(()=>{core.balls=5;missionUntil=0;syncMission();missionUntil=0;syncMission();});check((await p.locator('#missionText').innerText()).includes('level 10'),'Level target follows');
  await p.evaluate(()=>{core.lvl=126;syncMission();});check((await p.locator('#missionText').innerText()).includes('150'),'Mission remains meaningful beyond level100');
  await p.locator('#bPause').click({force:true});await p.locator('#pRe').click({force:true});check(await p.evaluate(()=>core.balls===1&&core.breaks===0),'Missions do not award balls or points');
  await p.evaluate(()=>{core.over=true;afterTurn();});await p.waitForFunction(()=>mode==='over');check(await p.evaluate(()=>window.__records===1),'Result awarded once');await p.evaluate(()=>endGame());check(await p.evaluate(()=>window.__records===1),'Duplicate completion ignored');await layout(p,'result');
  await p.locator('#rAgain').click({force:true});check(await p.evaluate(()=>mode==='play'&&missionStage===0),'Replay works and resets target');
 }finally{await p.context().close();}});
 await scenario('aim visuals and physics unchanged',async()=>{const p=await pageAt(undefined,{motion:'no-preference'});try{await start(p);const r=await p.evaluate(()=>{const c=new Core();c.reset(12345);const initial={balls:c.balls,hp:c.G.filter(b=>b&&b.k<2).map(b=>b.hp)};c.fire(botAim(c,null,1));let n=0;while(c.fly&&n++<HZ*60)c.tick();aimOn=true;aimOk=true;aimA=botAim(core,null,1);const pts=[];core.trace(aimA,1300,pts,2,3);return{initial,level:c.lvl,balls:c.balls,breaks:c.breaks,hits:c.hits,pts,ballSprite:BALL.s};});check(r.initial.balls===1&&r.initial.hp.every(n=>n===1),'Opening rules unchanged');check(r.level===2&&r.balls===4&&r.breaks===4,'Seed12345 first volley unchanged');check(r.pts.length>=4&&r.ballSprite>=16,'Aim trace and readable ball sprite');await p.waitForTimeout(80);await layout(p,'aim');
 }finally{await p.context().close();}});
 await scenario('saved data and daily/challenge',async()=>{const p=await pageAt(undefined,{legacy:true});try{check(await p.evaluate(()=>best()===83&&gemTotal()===61&&skinSel===2&&badgesGot().length===2),'Old records and collection retained');await start(p);await p.reload();await p.waitForFunction(()=>typeof core!=='undefined');check(await p.evaluate(()=>best()===83&&gemTotal()===61&&skinSel===2),'Reload retains records');await p.locator('#bHarian').click({force:true});await p.locator('#dPlay').click({force:true});await p.waitForFunction(()=>mode==='play');check(await p.evaluate(()=>kind==='daily'&&seedNow===KIT.dailySeed(SLUG)),'Official daily uses same shared seed');
 }finally{await p.context().close();}const c=await pageAt(undefined,{suffix:'#t='+12345..toString(36)+'-20'});try{await start(c);check(await c.evaluate(()=>kind==='chal'&&seedNow===12345),'Shared challenge seed preserved');}finally{await c.context().close();}});
 await scenario('motion preference',async()=>{const p=await pageAt(undefined,{motion:'no-preference',suffix:'?noanim=1'});try{check(await p.evaluate(()=>calmMotion()),'Existing noanim switch respected');await start(p);check(await p.evaluate(()=>mode==='play'&&core.balls===1),'Reduced effects preserve gameplay');}finally{await p.context().close();}});
 await scenario('storage unavailable',async()=>{const p=await pageAt(undefined,{deny:true});try{await start(p);check(await p.evaluate(()=>mode==='play'&&core.balls===1),'Playable when storage blocked');}finally{await p.context().close();}});
 check(!errors.length,'No JavaScript page errors: '+errors.join('; '));console.log(JSON.stringify({checks,failures,pageErrors:errors},null,2));if(failures.length)process.exitCode=1;
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e.stack);process.exitCode=1;server.close();});
