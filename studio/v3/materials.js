(function(){'use strict';
const V=window.DehayukVisual;if(!V)return;const cache=new Map();
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
// Solid glass blocks, with an inset face and visible bevels; cached at render size.
V.jewel=function(g,x,y,size,color,alpha=1){const key=color+'|'+Math.round(size*2);let c=cache.get(key);if(!c){c=document.createElement('canvas');c.width=c.height=Math.max(16,Math.ceil(size*2));const q=c.getContext('2d'),k=c.width/size;q.scale(k,k);const p=size*.055,s=size*.89,r=size*.10;
 q.shadowBlur=size*.09;q.shadowColor=V.tint(color,.15);q.fillStyle=V.tint(color,-.7);rr(q,p,p+size*.08,s,s-size*.08,r);q.fill();q.shadowBlur=0;
 const body=q.createLinearGradient(p,p,size-p,size-p);body.addColorStop(0,V.tint(color,.65));body.addColorStop(.17,V.tint(color,.2));body.addColorStop(.55,color);body.addColorStop(1,V.tint(color,-.42));q.fillStyle=body;rr(q,p,p,s,s-size*.10,r);q.fill();
 const face=q.createLinearGradient(0,size*.18,0,size*.78);face.addColorStop(0,V.tint(color,.22));face.addColorStop(.4,color);face.addColorStop(1,V.tint(color,-.27));q.fillStyle=face;rr(q,size*.15,size*.15,size*.70,size*.63,size*.065);q.fill();
 q.lineWidth=Math.max(.8,size*.025);q.strokeStyle=V.tint(color,.75);rr(q,p+.4,p+.4,s-.8,s-size*.10-.8,r);q.stroke();q.strokeStyle='#ffffffba';q.lineWidth=size*.018;q.beginPath();q.moveTo(size*.17,size*.17);q.lineTo(size*.81,size*.17);q.moveTo(size*.16,size*.18);q.lineTo(size*.16,size*.60);q.stroke();
 q.fillStyle='#fff3';q.beginPath();q.moveTo(size*.17,size*.2);q.lineTo(size*.79,size*.2);q.lineTo(size*.17,size*.52);q.closePath();q.fill();cache.set(key,c);if(cache.size>192)cache.delete(cache.keys().next().value);}
g.save();g.globalAlpha*=alpha;g.drawImage(c,x,y,size,size);g.restore();V.stats.materialFrames++;};
})();
