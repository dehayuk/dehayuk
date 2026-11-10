(function(){'use strict';
const script=document.currentScript,world=script.dataset.world,game=script.dataset.game;
document.documentElement.dataset.visualWorld=world;document.documentElement.dataset.visualGame=game;
const root='/studio/v2/assets/',image=new Image(),backgrounds=new Map(),tiles=new Map(),stats={game,world,sceneFrames:0,materialFrames:0,ready:false};
let settle;const ready=new Promise(r=>settle=r);image.onload=()=>{stats.ready=true;settle(true);window.dispatchEvent(new Event('dehayuk:visual-ready'));};image.onerror=()=>settle(false);if(world==='native'){stats.ready=true;settle(true);}else image.src=root+world+'.webp';
function rgba(c){if(Array.isArray(c))return c.slice(0,3);if(/^#[0-9a-f]{6}$/i.test(c))return c.slice(1).match(/../g).map(v=>parseInt(v,16));if(/^#[0-9a-f]{3}$/i.test(c))return c.slice(1).split('').map(v=>parseInt(v+v,16));const m=String(c).match(/[\d.]+/g);return m?.length>=3?m.slice(0,3).map(Number):[42,180,235];}
function tint(c,n){return 'rgb('+rgba(c).map(v=>Math.round(n>=0?v+(255-v)*n:v*(1+n))).join(',')+')';}
function round(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();}
function scene(g,w,h,options={}){
 if(world==='native'||!stats.ready||w<1||h<1)return false;
 const key=Math.round(w)+','+Math.round(h);let canvas=backgrounds.get(key);
 if(!canvas){const scale=Math.min(1,2048/Math.max(w,h));canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));const q=canvas.getContext('2d'),s=Math.max(canvas.width/image.width,canvas.height/image.height),sw=canvas.width/s,sh=canvas.height/s;q.imageSmoothingQuality='high';q.drawImage(image,(image.width-sw)/2,(image.height-sh)/2,sw,sh,0,0,canvas.width,canvas.height);backgrounds.set(key,canvas);if(backgrounds.size>2)backgrounds.delete(backgrounds.keys().next().value);}
 g.save();g.drawImage(canvas,0,0,w,h);if(options.shade){g.fillStyle='rgba(2,10,30,'+Math.max(0,Math.min(.85,options.shade))+')';g.fillRect(0,0,w,h);}g.restore();stats.sceneFrames++;return true;
}
function jewel(g,x,y,size,color,alpha=1){
 const key=String(color)+'|'+Math.round(size*10);let c=tiles.get(key);
 if(!c){c=document.createElement('canvas');c.width=c.height=Math.max(12,Math.ceil(size*2));const q=c.getContext('2d'),k=c.width/size;q.scale(k,k);const p=size*.045,s=size-2*p,r=size*.15;
  q.fillStyle=tint(color,-.65);round(q,p,p+size*.045,s,s-size*.045,r);q.fill();
  const gr=q.createLinearGradient(p,p,size-p,size-p);gr.addColorStop(0,tint(color,.72));gr.addColorStop(.17,tint(color,.12));gr.addColorStop(.52,tint(color,-.06));gr.addColorStop(1,tint(color,-.4));q.fillStyle=gr;round(q,p,p,s,s-size*.07,r);q.fill();
  q.strokeStyle=tint(color,.45);q.lineWidth=Math.max(.6,size*.024);round(q,p+1,p+1,s-2,s-size*.07-2,r*.9);q.stroke();
  const face=q.createLinearGradient(0,size*.15,0,size*.85);face.addColorStop(0,tint(color,.3));face.addColorStop(.52,tint(color,.02));face.addColorStop(1,tint(color,-.23));q.fillStyle=face;round(q,size*.15,size*.16,size*.7,size*.64,size*.105);q.fill();
  const gl=q.createLinearGradient(0,size*.13,0,size*.55);gl.addColorStop(0,'#ffffff9c');gl.addColorStop(1,'#ffffff00');q.fillStyle=gl;round(q,size*.15,size*.13,size*.7,size*.35,size*.1);q.fill();
  q.fillStyle='#fff9';round(q,size*.17,size*.12,size*.23,size*.045,size*.02);q.fill();q.fillStyle='#ffffff40';q.beginPath();q.moveTo(size*.17,size*.2);q.lineTo(size*.76,size*.2);q.lineTo(size*.17,size*.7);q.closePath();q.fill();
  tiles.set(key,c);if(tiles.size>128)tiles.delete(tiles.keys().next().value);
 }
 g.save();g.globalAlpha*=alpha;g.drawImage(c,x,y,size,size);g.restore();stats.materialFrames++;
}
function orb(g,x,y,r,color){g.save();const gr=g.createRadialGradient(x-r*.4,y-r*.45,r*.03,x+r*.15,y+r*.1,r*1.1);gr.addColorStop(0,tint(color,.85));gr.addColorStop(.23,tint(color,.27));gr.addColorStop(.6,tint(color,-.04));gr.addColorStop(1,tint(color,-.5));g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();g.strokeStyle=tint(color,.36);g.lineWidth=Math.max(.6,r*.055);g.stroke();g.fillStyle='#ffffffbb';g.beginPath();g.ellipse(x-r*.34,y-r*.4,r*.27,r*.13,-.5,0,Math.PI*2);g.fill();g.restore();stats.materialFrames++;}
function polish(g,x,y,rx,ry){g.save();g.fillStyle='#fff4';g.beginPath();g.ellipse(x-rx*.32,y-ry*.4,rx*.3,ry*.13,-.4,0,Math.PI*2);g.fill();g.restore();stats.materialFrames++;}
const svgCache=new Map();let svgId=0;
function materialize(svg){if(svgCache.has(svg))return svgCache.get(svg);const key=svg,id='dv'+(++svgId)+'-',colors=[...new Set([...svg.matchAll(/fill="(#[a-f0-9]{6})"/gi)].map(m=>m[1]))];let defs='';for(let k=0;k<colors.length;k++){const color=colors[k];defs+='<linearGradient id="'+id+k+'" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="'+tint(color,.27)+'"/><stop offset=".38" stop-color="'+color+'"/><stop offset="1" stop-color="'+tint(color,-.22)+'"/></linearGradient>';svg=svg.split('fill="'+color+'"').join('fill="url(#'+id+k+')"');}svg=svg.replace(/(<svg[^>]*>)/,'$1<defs>'+defs+'</defs>');svgCache.set(key,svg);if(svgCache.size>128)svgCache.delete(svgCache.keys().next().value);stats.materialFrames++;return svg;}
window.DehayukVisual={scene,jewel,orb,polish,tint,round,materialize,ready,stats,image};
})();
