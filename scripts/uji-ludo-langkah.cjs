const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),{chromium}=require(process.env.TEMP+'/dehayuk-ux-tools/node_modules/playwright');
let checks=0;const ok=(v,m)=>{assert(v,m);checks++};
const server=http.createServer((q,r)=>{let f=path.join(root,new URL(q.url,'http://local').pathname);if(f.endsWith(path.sep))f+='index.html';fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end()}r.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');r.end(b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
for(const reducedMotion of ['no-preference','reduce']){
 const c=await b.newContext({viewport:{width:825,height:568},reducedMotion}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await c.addInitScript(()=>{const create=AudioContext.prototype.createDynamicsCompressor;AudioContext.prototype.createDynamicsCompressor=function(){const out=create.call(this),meter=this.createAnalyser();meter.fftSize=256;out.connect(meter);window.stepMeter=meter;return out;}});
 await p.goto(base+'/ludo/?uji=ui');await p.evaluate(()=>document.getElementById('uji').remove());await p.locator('#localMode').click();
 await p.evaluate(()=>{DehayukKit.settings.set({suara:true,musik:false});window.stepLog=[];window.stepNodes=0;window.stepPeak=0;const a=DehayukKit.audio,original=a.tone,create=a.ctx.createOscillator.bind(a.ctx);a.ctx.createOscillator=()=>{stepNodes++;return create()};a.tone=o=>{const el=document.querySelector('.pawn.moving');if(el){const parent=el.offsetParent,box={width:parent.clientWidth,height:parent.clientHeight},style=getComputedStyle(el);stepLog.push({t:performance.now(),x:parseFloat(style.left)/box.width,y:parseFloat(style.top)/box.height})}original(o)};const sample=()=>{const values=new Float32Array(stepMeter.fftSize);stepMeter.getFloatTimeDomainData(values);for(const v of values)stepPeak=Math.max(stepPeak,Math.abs(v));window.meterFrame=requestAnimationFrame(sample)};sample();});
 async function fixture(die=6,mode='local',turn=0){await p.evaluate(({die,mode,turn})=>{let s=LudoMesin.create(2,true,9);s.turn=turn;s=LudoMesin.roll(s,die);LudoUji.setState(s,{mode,kind:'normal',date:DehayukKit.dateKey(),target:null,awarded:false});stepLog=[];stepNodes=0;stepPeak=0;}, {die,mode,turn})}
 await fixture();await p.evaluate(()=>{document.querySelector('.choice[data-id="0"]').click();document.querySelector('.choice[data-id="0"]')?.click()});await p.waitForFunction(()=>!LudoUji.getBusy());
 const result=await p.evaluate(()=>({steps:stepLog,nodes:stepNodes,peak:stepPeak,state:LudoUji.getState(),route:LudoMesin.path(0,0,6,0)}));
 ok(result.steps.length===6&&result.nodes===6,'One audible tap per square; duplicate click ignored '+reducedMotion);
 ok(result.peak>.015,'Real audio graph has audible signal '+result.peak);
 ok(result.steps.slice(1).every((e,i)=>e.t-result.steps[i].t>=90),'Separate rhythmic taps, no burst');
 ok(result.steps.every((e,i)=>Math.abs(e.x-(result.route[i][1]+.5)/15)<.018&&Math.abs(e.y-(result.route[i][0]+.5)/15)<.018),'Taps coincide with tile landings');
 ok(result.state.pawns[0][0]===6&&result.state.rolls===1,'Movement and dice result unchanged');
 await fixture();await p.evaluate(()=>DehayukKit.settings.set({suara:false}));await p.locator('.choice[data-id="0"]').click();await p.waitForFunction(()=>!LudoUji.getBusy());ok(await p.evaluate(()=>stepNodes)===0,'Mute creates no sound sources');await p.evaluate(()=>DehayukKit.settings.set({suara:true}));
 await fixture();await p.locator('.choice[data-id="0"]').click();await p.waitForFunction(()=>stepLog.length>=2);await p.locator('#pause').click();const stopped=await p.evaluate(()=>stepNodes);await p.locator('#resume').click();await p.waitForFunction(()=>!LudoUji.getBusy());ok(await p.evaluate(()=>stepNodes)===stopped,'Quick pause/resume cannot replay stale movement taps');
 await fixture();await p.locator('.choice[data-id="0"]').click();await p.waitForFunction(()=>stepLog.length>=1);await p.locator('#pause').click();await p.locator('#menu').click();const left=await p.evaluate(()=>stepNodes);await p.waitForTimeout(800);ok(await p.evaluate(()=>stepNodes)===left,'No pending taps after returning to menu');
 await fixture(6,'local');await p.locator('.choice[data-id="1"]').click();await p.waitForFunction(()=>!LudoUji.getBusy());ok(await p.evaluate(()=>stepLog.length===1&&LudoUji.getState().pawns[0][1]===0),'Exiting house produces one landing tap');
 await fixture(3,'bot',2);await p.waitForFunction(()=>!LudoUji.getBusy()&&LudoUji.getState().turn===0);ok(await p.evaluate(()=>stepNodes===3&&LudoUji.getState().pawns[2][0]===3),'Computer steps use same sounds');
 ok(!errors.length,'No browser errors '+errors.join(','));console.log('STEPS '+reducedMotion+' PASS, peak '+result.peak.toFixed(3));await c.close();
}
console.log('STEP AUDIO PASS '+checks);
}finally{await b.close();server.close()}})().catch(e=>{console.error(e.stack);server.close();process.exitCode=1});
