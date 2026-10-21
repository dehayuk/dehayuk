// Real pointer input on each colour, plus screenshots of the actual interactive board.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),E=require(root+'/ludo/mesin.js'),{chromium}=require(process.env.TEMP+'/dehayuk-ux-tools/node_modules/playwright');
const out=process.env.LUDO_REVIEW_DIR||path.join(process.env.TEMP,'ludo-visual');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((q,r)=>{let f=path.join(root,new URL(q.url,'http://local').pathname);if(f.endsWith(path.sep))f+='index.html';fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end()}r.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');r.end(b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-gpu']});let checks=0;const ok=(v,m)=>{assert(v,m);checks++};try{
for(const [width,height]of[[360,640],[390,844],[600,900],[1200,640]]){
 const c=await browser.newContext({viewport:{width,height},hasTouch:width<700,isMobile:width<700}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:'+server.address().port+'/ludo/?uji=ui');await p.evaluate(()=>document.getElementById('uji').remove());await p.evaluate(()=>document.fonts.ready);
 await p.screenshot({path:out+'/home-'+width+'.png'});
 for(const actor of [0,1,2,3]){
  const state=E.create(4,false,17);state.turn=actor;const before=E.roll(state,6),expected=E.move(before,0);
  await p.evaluate(s=>LudoUji.setState(s),before);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const pawn=p.locator('.pawn.selectable[data-p="'+actor+'"][data-id="0"]');
  if(width<700)await pawn.tap();else await pawn.click();
  await p.waitForFunction(()=>!LudoUji.getBusy());ok(await p.evaluate(()=>JSON.stringify(LudoUji.getState()))===JSON.stringify(expected),'Direct board input enters the correct pawn, colour '+actor+', width '+width);
 }
 let state=E.create(4,false,19);state.pawns[0]=[11,-1,49,55];state.pawns[1][0]=4;state.pawns[2][0]=8;state.pawns[3][0]=36;
 await p.evaluate(s=>LudoUji.setState(s),E.roll(state,6));await p.locator('.choice[data-id="0"]').focus();await p.screenshot({path:out+'/play-'+width+'.png'});
 ok(await p.locator('#players,.board-frame,.controls').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})),'Board and controls fit '+width);
 await p.locator('#pause').click();await p.screenshot({path:out+'/pause-'+width+'.png'});await p.locator('#resume').click();
 state=E.create(2,true,23);await p.evaluate(s=>LudoUji.setState(s),state);await p.locator('#roll').click();
 if(width===1200){let at=0;for(const t of [160,450,850,1300]){await p.waitForTimeout(t-at);at=t;await p.screenshot({path:out+'/throw-'+t+'.png'});}}
 await p.waitForFunction(()=>!LudoUji.getBusy());ok(await p.evaluate(()=>LudoUji.getState().die)===E.roll(state).die,'Displayed roll preserves seeded result '+width);
 state=E.create(2,true,29);state.pawns[0]=[56,55];await p.evaluate(s=>LudoUji.setState(s),E.roll(state,1));await p.locator('.choice[data-id="1"]').click();await p.waitForFunction(()=>!LudoUji.getBusy());await p.screenshot({path:out+'/result-'+width+'.png'});ok(await p.locator('#rAgain').isVisible(),'Replay remains reachable '+width);ok(!errors.length,'No browser errors '+errors.join(','));
 await c.close();console.log('VISUAL INPUT PASS '+width+'x'+height);
}
console.log('VISUAL INPUT PASS '+checks);
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e.stack);server.close();process.exitCode=1});
