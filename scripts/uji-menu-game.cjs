const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=process.env.DEHAYUK_TEST_ROOT||path.resolve(__dirname,'..');
const {chromium}=require(process.env.TEMP+'/dehayuk-ux-tools/node_modules/playwright');
const catalog={window:{}};require('vm').runInNewContext(fs.readFileSync(path.join(root,'katalog.js'),'utf8'),catalog);
const slugs=catalog.window.DEHAYUK.game.map(g=>g.slug);
const wanted=process.argv.slice(2).filter(a=>!a.startsWith('--'));if(wanted.some(s=>!slugs.includes(s)))throw Error('Game tidak terdaftar: '+wanted.filter(s=>!slugs.includes(s)).join(', '));
const games=wanted.length?wanted:slugs,live=process.argv.includes('--live');
const sizes=process.argv.includes('--quick')?[[390,844],[1200,640]]:[[320,568],[360,640],[390,844],[600,360],[1200,640]];
const server=http.createServer((q,r)=>{let f=path.join(root,new URL(q.url,'http://local').pathname);if(f.endsWith(path.sep))f+='index.html';fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end()}r.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream');r.end(b)})});
(async()=>{let base='https://dehayuk.online';if(!live){await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-gpu']});let failures=[],actions=0,layouts=0;
try{for(const slug of games){const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(12000);
// Prevent tests from sending scores, reports, or other network writes.
await p.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
async function home(){await p.goto(base+'/'+slug+'/',{waitUntil:'domcontentloaded'});await p.locator('[data-dh-menu]').waitFor();await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(450);}
try{await home();for(const [width,height] of sizes){await p.setViewportSize({width,height});await p.waitForTimeout(160);
const result=await p.evaluate(()=>{const els=[document.querySelector('[data-dh-main]'),...document.querySelectorAll('[data-dh-menu] > button')],issues=[];for(const e of els){const r=e.getBoundingClientRect(),label=e.getAttribute('aria-label')||e.id;if(e.disabled)issues.push(label+' disabled');if(r.x<-.5||r.y<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5)issues.push(label+' clipped '+JSON.stringify(r));if(r.width<44||r.height<44)issues.push(label+' small');if(!e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)))issues.push(label+' covered');}for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i].getBoundingClientRect(),b=els[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)issues.push(els[i].id+' overlaps '+els[j].id);}return issues;});layouts++;
if(result.length){failures.push(slug+' '+width+'x'+height+': '+result.join('; '));await p.screenshot({path:process.env.TEMP+'/menu-fail-'+slug+'-'+width+'.png',animations:'disabled'});}else if([390,1200].includes(width))await p.screenshot({path:process.env.TEMP+'/menu-'+slug+'-'+width+'.png',animations:'disabled'});
}
if(!process.argv.includes('--layout')){await p.setViewportSize({width:390,height:844});await home();const keys=await p.locator('[data-dh-action]').evaluateAll(es=>es.map(e=>e.dataset.dhAction));for(const key of keys){await home();const before=await p.locator('body').innerText();await p.locator('[data-dh-action="'+key+'"]').click();await p.waitForTimeout(300);const after=await p.locator('body').innerText();assert.notEqual(after,before,slug+' '+key+' opens its actual feature');actions++;}
await home();await p.locator('[data-dh-main]').click();await p.waitForTimeout(450);assert(await p.locator('[data-dh-menu]').isHidden()||await p.locator('dialog[open],.dk-overlay:not([hidden]),.ov:not([hidden]),.sheet:not([hidden])').count(),slug+' MAIN starts game or opens setup');actions++;}
assert.equal(errors.length,0,errors.join('; '));console.log('MENU PASS '+slug);
}catch(e){failures.push(slug+': '+e.message)}finally{await context.close();}}
}finally{await browser.close();server.close()}
const result={layouts,actions,failures};fs.writeFileSync(process.env.TEMP+'/dehayuk-menu-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
