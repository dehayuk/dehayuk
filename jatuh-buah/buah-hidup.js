/* Original fruit artwork, animated by local texture deformation only.
   No replacement eyes, iris, mouth, eyebrows or expression drawings. */
(function(){
'use strict';
const BASE='/jatuh-buah/',KEY='jatuhbuah.visual.v4',UNIT=2;
let style='nusantara',loaded=false,frames,variantAnchors,sourceMode='original-atlas';
try{const saved=localStorage.getItem(KEY);if(saved==='segar'||saved==='nusantara')style=saved;}catch(_){}
const atlas=new Image();atlas.src=BASE+'wajah-asli.png';
const variants=[11,12].map(i=>{const im=new Image();im.src=BASE+'art-v4/fruit-'+i+'.webp';return im;});
const originals=[],surfaces=[],bodies=new Map(),patches=new Map(),eyes=new Map(),brows=new Map();
const make=(w,h=w)=>{const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;};
// Coordinates on the ORIGINAL 256px sprite, including each fruit's own tilted face.
const rigs=[
 [[114,169,23,23],[195,176,21,24],[151,197,20,19]],
 [[103,144,23,24],[174,135,21,25],[142,168,23,21]],
 [[103,140,25,27],[190,125,23,27],[155,165,24,25]],
 [[107,138,24,25],[188,126,23,26],[153,165,24,25]],
 [[100,140,24,25],[184,128,23,26],[145,166,24,24]],
 [[113,138,23,24],[188,118,21,25],[158,154,22,21]],
 [[110,148,23,24],[187,136,21,25],[153,171,23,22]],
 [[102,143,24,25],[179,134,23,24],[142,169,22,22]],
 [[114,134,25,25],[194,119,24,26],[160,156,23,24]],
 [[104,130,25,26],[187,115,24,27],[151,153,25,25]],
 [[111,120,23,25],[190,107,21,24],[155,143,22,22]]
];
// Masks follow the ORIGINAL eyebrow strokes. They are never rendered as new artwork.
// Excluding these pixels at both source and destination stops a brow being carried
// into a blinking eye or being repainted by its skin underlay.
const browPaths=[
 [[105,140,111,133,124,135,12],[193,144,203,144,209,151,11]],
 [[86,114,94,106,104,109,10],[162,99,173,95,184,103,10]],
 [[80,109,85,95,98,99,13],[175,84,182,81,192,87,10]],
 [[89,107,98,100,107,101,12],[179,90,188,89,195,96,11]],
 [[83,112,90,104,100,105,12],[172,94,182,94,191,101,11]],
 [[95,112,101,104,110,105,12],[175,87,184,86,190,92,10]],
 [[96,121,103,114,110,115,12],[175,105,184,104,191,110,10]],
 [[86,116,96,109,103,110,12],[171,107,179,108,185,112,10]],
 [[95,109,101,101,110,102,12],[181,85,189,84,197,89,10]],
 [[85,102,92,92,104,91,12],[177,81,185,81,191,85,10]],
 [[96,98,102,90,110,91,11],[177,78,187,78,193,82,10]]
];
function browMask(i){
 const key=i<11?i:4;if(brows.has(key))return brows.get(key);
 const c=make(256*UNIT),g=c.getContext('2d',{willReadFrequently:true});g.scale(UNIT,UNIT);g.strokeStyle='#fff';g.lineCap='round';
 for(const [x,y,cx,cy,ex,ey,w] of browPaths[key]){g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(cx,cy,ex,ey);g.stroke();}
 const result={canvas:c,data:g.getImageData(0,0,c.width,c.height).data};brows.set(key,result);return result;
}
function protectBrow(g,c,i,x,y,w,h){
 g.save();g.globalCompositeOperation='destination-out';g.drawImage(browMask(i).canvas,x*UNIT,y*UNIT,w*UNIT,h*UNIT,0,0,c.width,c.height);g.restore();
}
function index(lv){return style==='segar'&&lv===8?11:style==='segar'&&lv===9?12:lv;}
function anchor(i){return frames[i<11?i:4].anchor;}
function rig(i){return rigs[i<11?i:4];}
function name(lv,fallback){return loaded&&style==='segar'&&lv===8?'Semangka':loaded&&style==='segar'&&lv===9?'Melon':fallback;}
function buildSurfaces(){
 for(let i=0;i<11;i++){
  const c=make(256*UNIT),g=c.getContext('2d'),f=frames[i];g.imageSmoothingQuality='high';
  g.drawImage(atlas,...f.crop,...f.dest.map(v=>v*UNIT));originals.push(c);surfaces.push(c);
 }
 // The optional new fruit use the exact original orange face pixels, with their outlines preserved.
 for(let i=0;i<2;i++){
  const c=make(256*UNIT),g=c.getContext('2d'),a=variantAnchors[11+i],to=frames[4].anchor,k=to.r/a.r;
  g.scale(UNIT,UNIT);g.imageSmoothingQuality='high';g.drawImage(variants[i],to.x-a.x*k,to.y-a.y*k,a.width*k,a.height*k);
  const features=[
   'M79 143 C77 130 85 120 97 119 C110 117 122 125 123 139 C124 153 115 163 103 164 C90 165 81 157 79 143Z',
   'M165 131 C162 119 168 108 179 106 C192 102 203 112 205 125 C207 139 198 150 186 151 C175 152 168 143 165 131Z',
   'M124 150 C137 154 152 148 163 145 C169 152 166 169 158 177 C146 191 128 178 125 164Z',
   'M79 116 C80 105 91 98 99 99 C107 99 109 104 104 108 C95 108 89 110 82 117Z',
   'M168 96 C168 88 180 87 189 93 C196 97 197 104 191 105 C184 99 177 98 171 99Z'
  ];
  for(const p of features){g.save();g.clip(new Path2D(p));g.drawImage(originals[4],0,0,256,256);g.restore();}
  surfaces.push(c);
 }
}
function sprite(lv,R,expression,lock){
 if(!loaded)return null;const i=index(lv),key=i+'|'+R.toFixed(3)+'|'+!!lock;let body=bodies.get(key);
 if(!body){if(bodies.size>64)bodies.clear();const a=anchor(i),side=Math.ceil(R*3.5+10),h=side/2,k=R/a.r;
  body=make(side);const g=body.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(surfaces[i],h-a.x*k,h-a.y*k,256*k,256*k);
  if(lock){g.globalCompositeOperation='source-in';g.fillStyle='#4e405e';g.fillRect(0,0,side,side);}
  body.R=R;body.h=h;bodies.set(key,body);
 }
 const result=make(body.width);result.getContext('2d').drawImage(body,0,0);result.R=R;result.h=body.h;
 if(!lock){result.body=body;result.level=lv;result.expression=expression;}
 return result;
}
// Original eye pixels are a moving layer. A local skin underlay is interpolated from
// the surrounding original texture, so blinking never stretches eyebrows or cheeks.
function eyeLayer(i,part){
 const key=i+'|'+part;if(eyes.has(key))return eyes.get(key);
 const [cx,cy,rx,ry]=rig(i)[part],pad=4,x0=cx-rx-pad,y0=cy-ry-pad,w=2*(rx+pad),h=2*(ry+pad),skin=make(w*UNIT,h*UNIT),g=skin.getContext('2d');
 g.drawImage(surfaces[i],x0*UNIT,y0*UNIT,w*UNIT,h*UNIT,0,0,skin.width,skin.height);
 const pixels=g.getImageData(0,0,skin.width,skin.height),original=new Uint8ClampedArray(pixels.data),W=skin.width,H=skin.height,mask=new Float32Array(W*H),colors=new Float32Array(original.length),offsets=[];
 colors.set(original);const guard=browMask(i).data;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const dx=(x/UNIT-(rx+pad))/rx,dy=(y/UNIT-(ry+pad))/ry,d=Math.sqrt(dx*dx+dy*dy),at=y*W+x;
  const protectedPixel=guard[((Math.round(y0*UNIT)+y)*256*UNIT+Math.round(x0*UNIT)+x)*4+3]/255;
  mask[at]=(1-protectedPixel)*Math.max(0,Math.min(1,(1.055-d)*25));
  if(mask[at]>0&&x>0&&x<W-1&&y>0&&y<H-1){offsets.push(at);const span=rx*Math.sqrt(Math.max(0,1.12-dy*dy))*UNIT,l=Math.max(0,Math.floor((rx+pad)*UNIT-span-2)),r=Math.min(W-1,Math.ceil((rx+pad)*UNIT+span+2)),t=Math.max(0,Math.min(1,(x-l)/Math.max(1,r-l)));for(let k=0;k<3;k++)colors[at*4+k]=original[(y*W+l)*4+k]*(1-t)+original[(y*W+r)*4+k]*t;}
 }
 for(let n=0;n<90;n++)for(const at of offsets)for(let k=0;k<3;k++)colors[at*4+k]=(colors[(at-1)*4+k]+colors[(at+1)*4+k]+colors[(at-W)*4+k]+colors[(at+W)*4+k])*.25;
 // Add only the original skin's fine texture, avoiding a smooth blank spot during a blink.
 const texturePoints=[[151,148],[140,124],[145,120],[146,116],[143,126],[151,126],[150,137],[141,141],[153,127],[145,126],[151,113]],tp=texturePoints[i<11?i:4],sg=surfaces[i].getContext('2d'),texture=sg.getImageData((tp[0]-5)*UNIT,(tp[1]-5)*UNIT,10*UNIT,10*UNIT).data,TW=10*UNIT;
 for(let at=0;at<mask.length;at++){const x=at%W,y=Math.floor(at/W),tx=x%TW,ty=y%TW,ti=(ty*TW+tx)*4,ni=(ty*TW+(tx+1)%TW)*4;for(let k=0;k<3;k++){const grain=(texture[ti+k]-texture[ni+k])*.7;pixels.data[at*4+k]=original[at*4+k]*(1-mask[at])+(colors[at*4+k]+grain)*mask[at];}}
 g.putImageData(pixels,0,0);
 const eye=make(W,H),eg=eye.getContext('2d'),ep=eg.createImageData(W,H);ep.data.set(original);for(let at=0;at<mask.length;at++)ep.data[at*4+3]=Math.round(original[at*4+3]*mask[at]);eg.putImageData(ep,0,0);
 const out={skin,eye,x:x0,y:y0,w,h};eyes.set(key,out);return out;
}
function patch(i,part,step){
 const key=i+'|'+part+'|'+step;if(patches.has(key))return patches.get(key);if(patches.size>420)patches.clear();
 if(part<2){const e=eyeLayer(i,part),c=make(e.skin.width,e.skin.height),g=c.getContext('2d'),q=1-step/12*.94;g.drawImage(e.skin,0,0);
  if(step<11){
   // Lids reveal the ORIGINAL eye; the iris is never scaled into a sticker shape.
   const [cx,cy,rx,ry]=rig(i)[part];g.save();g.beginPath();g.ellipse((cx-e.x)*UNIT,(cy-e.y)*UNIT,rx*UNIT*1.06,ry*UNIT*1.06*q,0,0,Math.PI*2);g.clip();g.drawImage(e.eye,0,0);g.restore();
  }
  else { // A closed lid follows the original eye's width and angle, never a replacement open eye.
   const [cx,cy,rx,ry]=rig(i)[part],x=(cx-e.x)*UNIT,y=(cy-e.y)*UNIT,original=surfaces[i].getContext('2d'),sample=original.getImageData(Math.round(cx*UNIT),Math.round((cy-ry*.84)*UNIT),1,1).data;
   g.strokeStyle='rgb('+Math.min(sample[0],85)+','+Math.min(sample[1],42)+','+Math.min(sample[2],25)+')';g.lineWidth=1.7*UNIT;g.lineCap='round';g.beginPath();g.moveTo(x-rx*.79*UNIT,y-ry*.08*UNIT);g.quadraticCurveTo(x,y+ry*.25*UNIT,x+rx*.79*UNIT,y-ry*.12*UNIT);g.stroke();
  }
  protectBrow(g,c,i,e.x,e.y,e.w,e.h);const result={canvas:c,x:e.x,y:e.y,w:e.w,h:e.h};patches.set(key,result);return result;}
 const [cx,cy,rx,ry]=rig(i)[part],pad=5,x0=cx-rx-pad,y0=cy-ry-pad,w=2*(rx+pad),h=2*(ry+pad),c=make(w*UNIT,h*UNIT),g=c.getContext('2d');
 const ratio=1+step*.02;g.imageSmoothingQuality='high';
 for(let x=0;x<w;x+=2){const width=Math.min(2,w-x),offset=Math.abs(x0+x+width/2-cx),edge=Math.max(0,Math.min(1,(rx+pad-offset)/pad)),weight=edge*edge*(3-2*edge),q=1+(ratio-1)*weight;
  const sy=[y0,cy-ry,cy+ry,y0+h],dy=[0,cy-ry*q-y0,cy+ry*q-y0,h];
  for(let j=0;j<3;j++)g.drawImage(surfaces[i],(x0+x)*UNIT,sy[j]*UNIT,width*UNIT,(sy[j+1]-sy[j])*UNIT,x*UNIT,dy[j]*UNIT,width*UNIT,(dy[j+1]-dy[j])*UNIT);
 }
 // Keep the mouth deformation strictly inside the mouth; never repaint a nearby eye.
 const m=g.getImageData(0,0,c.width,c.height);for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const dx=(x/UNIT-(rx+pad))/rx,dy=(y/UNIT-(ry+pad))/ry,fade=Math.max(0,Math.min(1,(1-Math.sqrt(dx*dx+dy*dy))*12));m.data[(y*c.width+x)*4+3]*=fade;}g.putImageData(m,0,0);
 protectBrow(g,c,i,x0,y0,w,h);const out={canvas:c,x:x0,y:y0,w,h};patches.set(key,out);return out;
}
function pose(lv,ex,clock,identity,moving){
 if(!moving)return {blink:0,mouth:0};
 const cycle=3.2+((identity*.71+lv*.23)%1.8),phase=(clock+identity*.91+lv*.37)%cycle;
 const closure=phase<.08?phase/.08:phase<.12?1:phase<.30?1-(phase-.12)/.18:0;
 const blink=Math.round(Math.max(0,closure)*12);
 const smile=Math.pow(Math.max(0,Math.sin(clock*1.5+identity)),4)*.04+(ex===1?.06:ex===2?-.04:0);
 return {blink,mouth:Math.round(smile/.02)};
}
function paintFace(g,R,lv,ex,clock=0,identity=0,look=0,moving=false){
 if(!loaded)return;const i=index(lv),a=anchor(i),k=R/a.r,p=pose(lv,ex,clock,identity,moving);
 for(let n=0;n<3;n++){
  const step=n<2?p.blink:p.mouth;if(!step)continue;const f=patch(i,n,step);
  g.save();
  g.drawImage(f.canvas,(f.x-a.x)*k,(f.y-a.y)*k,f.w*k,f.h*k);g.restore();
 }
}
function setStyle(value){style=value==='segar'&&sourceMode!=='original-fallback'?'segar':'nusantara';try{localStorage.setItem(KEY,style);}catch(_){}bodies.clear();document.dispatchEvent(new Event('jatuh:appearance'));}
const nativeReady=Promise.all([fetch(BASE+'wajah-asli.json').then(r=>{if(!r.ok)throw Error('Missing original anchors');return r.json();}),fetch(BASE+'art-v4/anchors.json').then(r=>r.json()),atlas.decode(),...variants.map(i=>i.decode())]).then(([data,va])=>{if(loaded)return true;frames=data;variantAnchors=va;buildSurfaces();for(let i=0;i<13;i++)for(let j=0;j<2;j++)eyeLayer(i,j);loaded=true;return true;});
const ready=Promise.race([nativeReady,new Promise((_,reject)=>setTimeout(()=>reject(Error('Original atlas timeout')),8000))]).catch(async()=>{
 // Retain the previous ORIGINAL face even when the larger atlas cannot be fetched.
 const fallback=Array.from({length:11},(_,i)=>{const im=new Image();im.src='/studio/v3/fruit-'+i+'.webp';return im;});
 try{await Promise.all(fallback.map(im=>im.decode()));if(loaded)return true;frames=[{"x":148.8780487804878,"y":154.78048780487805,"r":92.2439024390244},{"x":127.28445747800588,"y":122.98240469208211,"r":119.13782991202346},{"x":127.60000000000001,"y":131.60000000000002,"r":115.2},{"x":127.55483870967743,"y":136.65806451612903,"r":110.19354838709677},{"x":130.1875,"y":137.35795454545456,"r":109.86931818181819},{"x":125.5193370165746,"y":141.48066298342542,"r":105.8232044198895},{"x":127.67226890756302,"y":140.64425770308122,"r":106.6218487394958},{"x":126.01139601139602,"y":143.29344729344731,"r":103.92592592592594},{"x":127.25382262996942,"y":128,"r":119.01529051987768},{"x":127.41993957703927,"y":129.8429003021148,"r":117.2084592145015},{"x":128.69914040114614,"y":122.61031518624642,"r":120.60171919770774}].map(anchor=>({anchor}));surfaces.length=0;originals.length=0;for(const im of fallback){const c=make(256*UNIT);c.getContext('2d').drawImage(im,0,0,c.width,c.height);surfaces.push(c);originals.push(c);}sourceMode='original-fallback';style='nusantara';bodies.clear();patches.clear();eyes.clear();loaded=true;return true;}catch(_){return false;}
});
window.JatuhFruitArt={sprite,paintFace,pose,name,setStyle,ready,get style(){return style;},get readyState(){return loaded;},color(lv,fallback){return loaded&&style==='segar'&&lv===8?'#49b83c':loaded&&style==='segar'&&lv===9?'#c8dc78':fallback;},inspect(){return {version:"original-20261026-v8",loaded,style,originalFaces:true,sourceMode,bodySprites:surfaces.length,atlas:[atlas.naturalWidth,atlas.naturalHeight],bodyCaches:bodies.size,faceCaches:patches.size};}};
})();
