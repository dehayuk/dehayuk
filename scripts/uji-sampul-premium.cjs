// Cek integrasi artwork kurasi: grid, pencarian, favorit, cache lama, dan alamat game.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require(process.env.TEMP+'/dehayuk-ux-tools/node_modules/playwright');
const root=path.resolve(__dirname,'..'),{mediaPaths}=require('./buat-situs.js');global.window={};require(root+'/katalog.js');const games=window.DEHAYUK.game;
const wanted=games.filter(g=>g.media),server=http.createServer((req,res)=>{let f=path.join(root,new URL(req.url,'http://local').pathname);if(f.endsWith(path.sep))f+='index.html';fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.json':'application/json'})[path.extname(f)]||'text/html; charset=utf-8'});res.end(e?'':b)});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.MEDIA_TEST_URL||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-gpu']});
try{const context=await browser.newContext(),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
for(const size of [{width:360,height:640},{width:390,height:844},{width:768,height:1024},{width:1366,height:900}]){
 await p.setViewportSize(size);await p.goto(base+'/?sampul-test='+size.width+'#semua');await p.waitForTimeout(200);
 for(const g of wanted){const image=p.locator('a[data-slug="'+g.slug+'"] .thumb.wide img:visible').first();await image.scrollIntoViewIfNeeded();await image.evaluate(i=>i.decode());assert((await image.getAttribute('src')).includes('-neon-20261022.webp'));const d=await image.evaluate(i=>({w:i.naturalWidth,h:i.naturalHeight,fit:getComputedStyle(i).objectFit}));assert(Math.abs(d.w/d.h-1.6)<.02,'srcset intrinsic dimensions rounded by browser');assert.equal(d.fit,'contain');}
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:process.env.TEMP+'/dehayuk-neon-'+size.width+'.jpg',fullPage:true,type:'jpeg',quality:88});
}
await p.goto(base+'/#cari');const search=p.locator('#topQ:visible,#q:visible').first();await search.fill('Sortir Cairan');await p.locator('#results a[data-slug="sortir-cairan"]').waitFor();assert.equal(await p.locator('#results a[data-slug]').count(),1);
await search.fill('Bola Pantul');await p.locator('#results a[data-slug="bola-pantul"]').waitFor();assert.equal(await p.locator('#results a[data-slug]').count(),1);
await p.evaluate(()=>{localStorage.setItem('dehayuk.recent',JSON.stringify(['bola-pantul','sortir-cairan']));localStorage.setItem('dehayuk.simpan',JSON.stringify(['bola-pantul','sortir-cairan']));});await p.goto(base+'/');
const square=await p.locator('.thumb.sq img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src')));assert.equal(square.length,2);assert(square.every(src=>src.includes('/ikon-neon-20261022.png')));
await p.goto(base+'/#permainanku');assert.equal(await p.locator('#mine a[data-slug]').count(),2);
for(const g of wanted){const m=mediaPaths(g);for(const u of Object.values(m)){const r=await fetch(base+u);assert(r.ok,u);}await p.setViewportSize({width:1280,height:800});await p.goto(base+'/#main/'+g.slug);const f=p.frameLocator('iframe');await f.locator('[data-dh-main]').waitFor();await f.locator('[data-dh-main]').click();}
// Aset lama sengaja tersimpan; portal tetap meminta nama baru, tanpa menghapus simpanan pemain.
await p.goto(base+'/');await p.evaluate(async()=>{const c=await caches.open('dehayuk-v2');await c.put('/kartu/bola-pantul.webp',new Response('old cover'));});await p.reload();await p.goto(base+'/#semua');assert((await p.locator('a[data-slug="bola-pantul"] .thumb.wide img').first().getAttribute('src')).includes('-neon-20261022.webp'));
await p.goto(base+'/#offline');assert.equal(await p.evaluate(()=>typeof window.dehayukGameMedia),'function');
assert.deepEqual(errors,[]);console.log('PASS: 2 sampul/ikon, 4 ukuran layar, pencarian, daftar permainan, game terbuka, dan cache lama.');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
