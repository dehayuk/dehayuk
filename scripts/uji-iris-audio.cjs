const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require(process.env.TEMP+'/dehayuk-ux-tools/node_modules/playwright');
const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{let f=path.join(root,new URL(req.url,'http://local').pathname);if(f.endsWith(path.sep))f+='index.html';fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.IRIS_TEST_URL||'http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-gpu']});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  // Exercise the feature-detected Safari branch without claiming to emulate an iPhone's audio hardware.
  await ctx.addInitScript(()=>Object.defineProperty(navigator,'audioSession',{value:{type:'auto'},configurable:true}));
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/iris-buah/?uji=ui');await p.evaluate(()=>document.getElementById('uji').remove());await p.tap('#bMain');
  await p.waitForFunction(()=>DehayukKit.audio.ctx?.state==='running');assert.equal(await p.evaluate(()=>navigator.audioSession.type),'playback');
  await p.evaluate(async()=>{IrisUji.pause();await DehayukKit.audio.ctx.suspend();});assert.equal(await p.evaluate(()=>DehayukKit.audio.ctx.state),'suspended');await p.tap('#resume');await p.waitForFunction(()=>DehayukKit.audio.ctx.state==='running');
  await p.evaluate(()=>{const g=IrisUji.getGame();g.next=999;g.score=40;g.objects=[{id:99,type:6,x:.5,y:.5,r:.055,angle:0,spin:0,vx:0,vy:0,cut:false}];});
  const session=await ctx.newCDPSession(p);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:70,y:422}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:320,y:422}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await p.evaluate(()=>IrisUji.getGame().bombs),1);assert.equal(await p.evaluate(()=>IrisUji.getGame().score),20);assert.equal(await p.evaluate(()=>IrisUji.getExplosions().length),1);assert.equal(await p.evaluate(()=>IrisUji.getPieces().length),0);
  await p.waitForTimeout(90);await p.screenshot({path:process.env.TEMP+'/iris-bomb-updated.png'});await p.waitForTimeout(900);assert.equal(await p.evaluate(()=>IrisUji.getExplosions().length),0);
  await p.evaluate(()=>DehayukKit.settings.set({suara:false}));assert.equal(await p.evaluate(()=>IrisUji.getSound().bomb()),false);await p.evaluate(()=>DehayukKit.settings.set({suara:true}));
  const audio=await p.evaluate(async()=>{
   const result=[];for(const rate of [44100,48000])for(const kind of ['swipe','cut','bomb']){
    const c=new OfflineAudioContext(1,Math.ceil(rate*1.3),rate),s=IrisSuara.create({audio:{ctx:c},settings:{get:()=>({suara:true}),onChange:()=>()=>{}}});const played=s[kind](2),repeat=s[kind](2),a=(await c.startRendering()).getChannelData(0);let peak=0,sum=0,tail=0;for(let i=0;i<a.length;i++){if(!Number.isFinite(a[i]))throw Error('Invalid audio sample');peak=Math.max(peak,Math.abs(a[i]));sum+=a[i]*a[i];if(i>rate*1.1)tail=Math.max(tail,Math.abs(a[i]));}result.push({rate,kind,played,repeat,peak,rms:Math.sqrt(sum/a.length),tail});s.dispose();
   }return result;
  });
  for(const a of audio){assert(a.played&&!a.repeat,a.kind+' must play once and throttle duplicates');assert(a.peak>.015&&a.peak<.98,a.kind+' audible without clipping');assert(a.tail<.0001,a.kind+' decays to silence');}
  console.log(JSON.stringify(audio));assert.deepEqual(errors,[]);console.log('PASS: touch swipe bomb explosion + penalty; media session; gesture resume; mute; original blade/cut/bomb at 44.1/48 kHz; no page errors');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
