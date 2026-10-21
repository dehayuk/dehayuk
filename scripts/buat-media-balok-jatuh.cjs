/* Sampul dan ikon dibuat dari adegan asli game. Tidak mengubah aset game lain. */
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require(process.env.TEMP+'/dehayuk-ux-tools/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'balok-jatuh');
const server=http.createServer((q,r)=>{let f=path.join(root,new URL(q.url,'http://local').pathname);if(f.endsWith(path.sep))f+='index.html';fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png'})[path.extname(f)]||'text/html; charset=utf-8'});r.end(e?'':b)});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-gpu']});
 try{const p=await browser.newPage({viewport:{width:1200,height:630},reducedMotion:'reduce'});await p.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 for(const [w,h,name]of [[1200,630,'bagikan-20261022.jpg'],[1024,640,'sampul.jpg']]){await p.setViewportSize({width:w,height:h});await p.goto(base+'/balok-jatuh/?cover=1');await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(dest,name),type:'jpeg',quality:88});}
 await p.goto(base+'/balok-jatuh/?icon=1');const url=await p.locator('#iconArt').evaluate(c=>c.toDataURL('image/png'));fs.writeFileSync(path.join(dest,'ikon-20261022.png'),Buffer.from(url.split(',')[1],'base64'));
 console.log('Sampul 1024×640, bagikan 1200×630, ikon 512×512 selesai.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
