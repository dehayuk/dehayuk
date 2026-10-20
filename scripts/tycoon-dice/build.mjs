import fs from 'node:fs';import {build} from 'esbuild';
const dir=new URL('.',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,dir),'utf8');
const notices='Dadu Nusantara Tycoon - third party notices\n\n'+
 'Three.js 0.160.1 - https://github.com/mrdoob/three.js\n'+read('node_modules/three/LICENSE')+'\n\n'+
 'cannon-es 0.20.0 - https://github.com/pmndrs/cannon-es\n'+read('node_modules/cannon-es/LICENSE')+'\n\n'+
 'Geometry adapted from Codrops / Ksenia Kondrashova\nhttps://github.com/uuuulala/Threejs-rolling-dice-tutorial\n'+read('upstream.txt')+'\n'+read('LICENSE-Codrops.txt');
fs.writeFileSync(new URL('../../nusa-properti/THIRD-PARTY-LICENSES.txt',dir),notices);
await build({entryPoints:[new URL('scene.mjs',dir).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,format:'iife',globalName:'TycoonDadu',target:'es2020',minify:true,legalComments:'inline',outfile:new URL('../../nusa-properti/tycoon-dice.js',dir).pathname.replace(/^\/([A-Za-z]:)/,'$1'),banner:{js:'/*!\n'+notices.replaceAll('*/','* /')+'\n*/'}});
const outputFile=new URL('../../nusa-properti/tycoon-dice.js',dir);fs.writeFileSync(outputFile,fs.readFileSync(outputFile,'utf8').replace(/[ \t]+$/gm,''));
console.log('Dice bundle rebuilt');

const game=new URL('../../nusa-properti/',import.meta.url);
let html=fs.readFileSync(new URL('index.html',game),'utf8').replace(/<link[^>]+>/g,'').replace('<script src="/kit/v1/kit.js"></script>','').replace('href="/"','href="#"');
html=html.replace('</head>','<style>'+fs.readFileSync(new URL('../../kit/v1/menu-game.css',import.meta.url),'utf8')+'\n'+['tycoon.css','table.css'].map(f=>fs.readFileSync(new URL(f,game),'utf8')).join('\n')+'</style></head>');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>'<script>'+fs.readFileSync(new URL(file.split('?')[0],game),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
fs.writeFileSync(new URL('nusantara-tycoon.html',game),html);
