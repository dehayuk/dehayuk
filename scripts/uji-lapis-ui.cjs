'use strict';
// Lapis-only regression checks. Uses local demo fixtures; external requests are blocked.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.LAPIS_PLAYWRIGHT||path.join(process.env.TEMP,'dehayuk-ux-tools/node_modules/playwright'));
const model=require('../tumpuk-lapis/gelanggang-state.js'),root=path.join(__dirname,'..');
let checks=0;function check(value,message){assert.ok(value,message);checks++;}
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)){res.statusCode=403;return res.end()}if(f.endsWith(path.sep))f+='index.html';fs.readFile(f,(e,d)=>{if(e){res.statusCode=404;return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(d)});});
async function fixture(page,delay=false){await page.addInitScript(({delay})=>{window.__auditDelay=delay;Object.defineProperty(window,'DehayukGelanggangTiruan',{get(){return this.__auditFixture},set(value){const make=value.buat;value.buat=function(o){const s=make(o),old=s.alir,read=s.baca;s.alir=function(path,data,status){window.__auditStatus=status;return old.call(s,path,data,status)};s.baca=function(p){if(window.__auditDelay&&p.startsWith('v1/profil/'))return new Promise(r=>setTimeout(r,1400)).then(()=>read.call(s,p));return read.call(s,p)};return s};this.__auditFixture=value;}});},{delay});}
(async()=>{
 const f={st:'main',a:{u:'me'},b:{u:'them'},rek:false,w:7},settings={lantikMs:3000};
 const base={tree:{f},uid:'me',settings,now:10000,startAt:9000,drawEnd:12000,hasMain:true};
 check(model.derive(base).screen==='C','player match');check(model.derive({...base,uid:'spectator'}).screen==='B','spectator match');check(model.derive({...base,startAt:11000}).screen==='D1','countdown');check(model.derive({...base,tree:{f:{...f,st:'siap'}}}).screen==='D1','ready');check(model.derive({...base,tree:{f:{...f,st:'usai'}}}).screen==='D2','result');check(model.derive({...base,tree:{f:{st:'kosong'}}}).screen==='F','empty');check(model.derive({...base,connection:'offline'}).connection==='offline','connection projection');check(model.derive({...base,tree:{f:{...f,rek:true}},uid:'them'}).role==='penonton','replay is not a human seat');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.LAPIS_EDGE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  for(const [width,height] of [[360,640],[390,844],[900,480],[1280,720]]){
   const p=await browser.newPage({viewport:{width,height}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
   for(const state of ['A','B','C','C3','D1','D2','F']){
    await p.goto(url+'/tumpuk-lapis/?gl=demo&layar='+state);await p.waitForTimeout(950);
    check(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),`overflow ${width} ${state}`);
    check(await p.locator('#gl button button').count()===0,`nested buttons ${state}`);
    if(state==='F'){for(const name of ['Tunggu lagi','⏺ Tantang Rekor']){const rect=await p.getByRole('button',{name,exact:true}).boundingBox();check(rect&&rect.y+rect.height<=height,`waiting action ${width} ${name}`);}}
    if(state==='D2'){const rect=await p.locator('#glRebut').boundingBox();check(rect&&rect.y+rect.height<=height,`result action ${width}`);}
    if(['C','C3'].includes(state)){check(!await p.locator('.gl-cemo').isVisible(),'player reactions hidden');const box=await p.locator('.gl-cheads').boundingBox();check(box&&box.x>=0&&box.x+box.width<=width,'scoreboard fits');}
    if(process.env.LAPIS_SCREENSHOTS&&['A','C3','D2','F'].includes(state)){fs.mkdirSync(process.env.LAPIS_SCREENSHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.LAPIS_SCREENSHOTS,`${width}-${state}.png`)});}
   }
   check(!errors.length,errors.join('\n'));console.log(`PASS layout ${width}x${height}`);await p.close();
  }
  const p=await browser.newPage({viewport:{width:390,height:844}});await p.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());await fixture(p);
  await p.goto(url+'/tumpuk-lapis/?gl=demo&layar=C3');await p.waitForTimeout(1600);await p.getByRole('button',{name:'Keluar',exact:true}).click();await p.waitForTimeout(80);
  check(await p.evaluate(()=>document.activeElement?.textContent==='Lanjut bertanding'),'safe dialog default focus');
  const before=await p.evaluate(()=>({n:core.n,over:core.over}));await p.evaluate(()=>cv.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true})));check(JSON.stringify(await p.evaluate(()=>({n:core.n,over:core.over})))===JSON.stringify(before),'dialog blocks pointer');
  await p.keyboard.press('Space');check(JSON.stringify(await p.evaluate(()=>({n:core.n,over:core.over})))===JSON.stringify(before),'dialog blocks keyboard');check(await p.locator('.gl-modal').count()===0,'Space activates continue normally');
  await p.evaluate(()=>window.__auditStatus('offline'));await p.waitForTimeout(100);check(await p.locator('.lp-connection').isVisible(),'offline status visible');check((await p.locator('.lp-connection').innerText()).includes('waktu duel tetap berjalan'),'offline timing explained');
  const offline=await p.evaluate(()=>({n:core.n,over:core.over}));await p.keyboard.press('Space');check(JSON.stringify(await p.evaluate(()=>({n:core.n,over:core.over})))===JSON.stringify(offline),'offline prevents unconfirmed input');await p.evaluate(()=>window.__auditStatus('ok'));await p.waitForTimeout(100);check(!await p.locator('.lp-connection').isVisible(),'reconnect clears notice');
  await p.goto(url+'/tumpuk-lapis/?gl=demo&layar=A');await p.waitForTimeout(1000);for(let i=0;i<14;i++){await p.keyboard.press('Tab');check(await p.evaluate(()=>document.activeElement.closest('.gl-laci')!==null),'focus remains in arena picker');}await p.keyboard.press('Escape');check(await p.locator('.gl-laci-h').getAttribute('aria-expanded')==='false','Escape closes picker');
  await p.locator('#bSetelan').click();check(!await p.locator('.gl-laci').isVisible(),'settings not obscured');await p.keyboard.press('Escape');await p.locator('#bPeringkat').click();check(!await p.locator('.gl-laci').isVisible(),'ranking not obscured');await p.close();
  const q=await browser.newPage({viewport:{width:390,height:844}});await q.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());await fixture(q,true);await q.goto(url+'/tumpuk-lapis/?gl=demo&layar=C3');await q.getByRole('button',{name:'Kembali',exact:true}).click();await q.waitForTimeout(2000);check(await q.evaluate(()=>document.querySelector('.gl-panggung').hidden&&!document.documentElement.classList.contains('gl-main')),'cancel pending arena');check(await q.evaluate(()=>mode==='title'),'canceled arena does not start game');await q.close();
  console.log(`PASS ${checks} Lapis UI/state checks`);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
