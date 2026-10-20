(function(root){'use strict';
// Results belong to the game engine. This module only presents the committed throw.
const ROTATIONS={1:[90,0],2:[0,0],3:[90,-90],4:[90,90],5:[180,0],6:[90,180]};
const FACES=[{n:1,axis:'Y',angle:0,normal:[0,0,1]},{n:6,axis:'Y',angle:180,normal:[0,0,-1]},{n:3,axis:'Y',angle:90,normal:[1,0,0]},{n:4,axis:'Y',angle:-90,normal:[-1,0,0]},{n:2,axis:'X',angle:90,normal:[0,-1,0]},{n:5,axis:'X',angle:-90,normal:[0,1,0]}];
const CONTACTS=[520,760,930],SETTLE=1200,DURATION=1680,rad=d=>d*Math.PI/180;
const PIPS={1:[[0,0]],2:[[-.23,-.23],[.23,.23]],3:[[-.23,-.23],[0,0],[.23,.23]],4:[[-.23,-.23],[.23,-.23],[-.23,.23],[.23,.23]],5:[[-.23,-.23],[.23,-.23],[0,0],[-.23,.23],[.23,.23]],6:[[-.23,-.25],[.23,-.25],[-.23,0],[.23,0],[-.23,.25],[.23,.25]]};
function rotate(v,axis,d){const c=Math.cos(rad(d)),s=Math.sin(rad(d)),[x,y,z]=v;return axis==='X'?[x,y*c-z*s,y*s+z*c]:axis==='Y'?[x*c+z*s,y,-x*s+z*c]:[x*c-y*s,x*s+y*c,z];}
function body(v,x,y,z){return rotate(rotate(rotate(v,'Z',z),'Y',y),'X',x);}
function camera(v){return rotate(rotate(v,'Y',-25),'X',-55);}
function normal(face,x,y,z=0){return camera(body(face.normal,x,y,z));}
function pose(ms,result,variant=0){
 const [tx,ty]=ROTATIONS[result],t=Math.min(SETTLE,Math.max(0,ms)),direction=variant%2?-1:1,remaining=Math.pow(1-t/SETTLE,2.15);
 let height=0;
 if(t<520){const u=t/520;height=24*(1-u)+48*4*u*(1-u);}
 else if(t<760){const u=(t-520)/240;height=15*4*u*(1-u);}
 else if(t<930){const u=(t-760)/170;height=4.5*4*u*(1-u);}
 // Travel is measured against a 360px board, independently of the die's size.
 const x=-124*remaining*direction,groundY=94*remaining;
 let rx=tx+690*remaining,ry=ty-450*remaining*direction,rz=36*Math.sin(t/195)*remaining;
 if(t>=930){const u=(t-930)/(SETTLE-930),decay=(1-u)*(1-u);rx=tx+690*Math.pow(1-930/SETTLE,2.15)*decay;ry=ty-450*Math.pow(1-930/SETTLE,2.15)*decay*direction;rz=3.5*Math.sin(u*Math.PI*3)*decay;}
 return {x,y:groundY-height,groundY,height,rx,ry,rz,shadowScale:1+height/110,shadowOpacity:.3-height/290};
}

// A solid rounded cube: flat faces, curved edge strips and spherical corners.
// Projecting this small mesh locally avoids seams between six CSS panels and
// requires neither a WebGL context nor a downloaded graphics/physics library.
const MESH=[];
function facet(points,n){MESH.push({points,n});}
for(const f of FACES){facet([[-.4,-.4,.5],[.4,-.4,.5],[.4,.4,.5],[-.4,.4,.5]].map(v=>rotate(v,f.axis,f.angle)),f.normal);}
const steps=6,radius=.1,core=.4;
for(let axis=0;axis<3;axis++)for(const a of [-1,1])for(const b of [-1,1])for(let j=0;j<steps;j++){
 const u=(axis+1)%3,v=(axis+2)%3,start=j*Math.PI/(2*steps),end=(j+1)*Math.PI/(2*steps);
 function edge(t,l){const p=[0,0,0];p[axis]=l;p[u]=a*(core+radius*Math.cos(t));p[v]=b*(core+radius*Math.sin(t));return p;}
 const n=[0,0,0];n[u]=a*Math.cos((start+end)/2);n[v]=b*Math.sin((start+end)/2);
 facet([edge(start,-core),edge(start,core),edge(end,core),edge(end,-core)],n);
}
for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1])for(let i=0;i<steps;i++)for(let j=0;j<steps;j++){
 const a=i*Math.PI/(2*steps),b=(i+1)*Math.PI/(2*steps),c=j*Math.PI/(2*steps),d=(j+1)*Math.PI/(2*steps);
 function sphere(theta,phi){return [sx*Math.sin(phi)*Math.cos(theta),sy*Math.sin(phi)*Math.sin(theta),sz*Math.cos(phi)];}
 const n=sphere((a+b)/2,(c+d)/2),points=[[a,c],[b,c],[b,d],[a,d]].map(([theta,phi])=>sphere(theta,phi).map((v,k)=>[sx,sy,sz][k]*core+radius*v));
 facet(points,n);
}
function draw(actor,p){
 const ctx=actor.ctx;if(!ctx)return;
 const edge=actor.edge,dpr=actor.dpr,transform=v=>camera(body(v,p.rx,p.ry,p.rz));
 ctx.setTransform(dpr,0,0,dpr,edge*dpr,edge*dpr);ctx.clearRect(-edge,-edge,edge*2,edge*2);
 const basis=[[1,0,0],[0,1,0],[0,0,1]].map(transform),project=v=>basis[0].map((_,k)=>v[0]*basis[0][k]+v[1]*basis[1][k]+v[2]*basis[2][k]);
 const faces=MESH.map(f=>({n:project(f.n),points:f.points.map(project)})).filter(f=>f.n[2]>.001);
 faces.sort((a,b)=>a.points.reduce((s,v)=>s+v[2],0)/a.points.length-b.points.reduce((s,v)=>s+v[2],0)/b.points.length);
 function path(points){ctx.beginPath();points.forEach((v,i)=>{if(i)ctx.lineTo(v[0]*edge,v[1]*edge);else ctx.moveTo(v[0]*edge,v[1]*edge);});ctx.closePath();}
 for(const f of faces){
  const light=Math.max(0,-f.n[0]*.34-f.n[1]*.55+f.n[2]*.76),shine=Math.pow(Math.max(0,-f.n[0]*.21-f.n[1]*.36+f.n[2]*.9),28)*12;
  const shade=.69+.3*light,color='rgb('+[255,252,239].map(v=>Math.min(255,Math.round(v*shade+shine))).join(',')+')';
  path(f.points);ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=.45;ctx.lineJoin='round';ctx.fill();ctx.stroke();
 }
 for(const f of FACES){
  const n=project(f.normal);if(n[2]<=.02)continue;
  // Recessed dark pips: a subtle ivory rim, dark inner wall and a small lower glint.
  const u=project(rotate([1,0,0],f.axis,f.angle)),v=project(rotate([0,1,0],f.axis,f.angle));
  for(const [x,y] of PIPS[f.n]){
   const center=project(rotate([x,y,.501],f.axis,f.angle));
   ctx.save();ctx.transform(u[0],u[1],v[0],v[1],center[0]*edge,center[1]*edge);
   const radius=edge*.076,g=ctx.createRadialGradient(0,-radius*.4,0,0,0,radius);
   g.addColorStop(0,'#101921');g.addColorStop(.76,'#25323a');g.addColorStop(1,'#58646a');
   ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#f7efdbb0';ctx.lineWidth=.48;ctx.stroke();
   ctx.beginPath();ctx.arc(0,0,radius*.81,.25,2.5);ctx.strokeStyle='#6f7a8090';ctx.lineWidth=.5;ctx.stroke();ctx.restore();
  }
 }
 actor.cube.dataset.rotation=[p.rx,p.ry,p.rz].map(v=>v.toFixed(3)).join(',');
}
function create({hud,stage,audio,vibrate,reduced=false,audible=()=>true}){
 function mount(container,board){
  container.innerHTML='<span class="dice-shadow"></span><span class="dice-flight"><canvas class="dice-cube" aria-hidden="true"></canvas></span>';
  const cube=container.querySelector('.dice-cube');return {root:container,flight:container.querySelector('.dice-flight'),cube,ctx:cube.getContext('2d'),shadow:container.querySelector('.dice-shadow'),board,edge:32,dpr:1,scale:1,p:null};
 }
 const h=mount(hud,false),a=mount(stage,true);hud.insertAdjacentHTML('beforeend','<span class="dice-face" aria-hidden="true"></span>');const face=hud.querySelector('.dice-face');let frame=0,active=null,last=1,sequence=0,paused=false,tick=null,lastTime=null;
 function resize(actor){
  const width=actor.root.clientWidth||360;
  actor.scale=actor.board?width/360:1;
  actor.edge=actor.board?Math.max(22,Math.min(43,width*.082)):(parseFloat(getComputedStyle(actor.root).getPropertyValue('--edge'))||34);
  actor.dpr=Math.min(2,root.devicePixelRatio||1);if(actor.board)actor.root.style.setProperty('--edge',actor.edge+'px');
  actor.cube.width=Math.ceil(actor.edge*2*actor.dpr);actor.cube.height=Math.ceil(actor.edge*2*actor.dpr);
  if(actor.p)paint(actor,actor.p);
 }
 function paint(actor,p){
  actor.p=p;const scale=actor.scale,x=p.x*scale,groundY=p.groundY*scale;
  // The lowest vertex remains above the board as the body rocks over its edges.
  const support=(.1+.4*[[1,0,0],[0,1,0],[0,0,1]].reduce((sum,v)=>sum+Math.abs(body(v,p.rx,p.ry,p.rz)[1]),0))*actor.edge;
  actor.flight.style.transform='translate3d('+x+'px,'+(p.y*scale-support*.574)+'px,0)';
  actor.shadow.style.transform='translate('+x+'px,'+groundY+'px) scale('+p.shadowScale+')';
  actor.shadow.style.opacity=p.shadowOpacity;actor.shadow.style.filter='blur('+(1.2+p.height*scale*.045)+'px)';draw(actor,p);
 }
 function show(n){if(!ROTATIONS[n])return;last=n;hud.dataset.result=n;hud.setAttribute('aria-label','Hasil dadu '+n);face.innerHTML=PIPS[n].map(([x,y])=>'<i style="left:'+(50+x*100)+'%;top:'+(50+y*100)+'%"></i>').join('');paint(h,pose(SETTLE,n));}
 function stop(){cancelAnimationFrame(frame);frame=0;sequence++;paused=false;tick=null;lastTime=null;if(active){const done=active;active=null;done(false);}stage.hidden=true;stage.classList.remove('settled');hud.classList.remove('rolling');show(last);}
 function impact(strength){if(!audible())return;audio.noise({dur:.027,filter:2900,q:.65,vol:.14*strength});audio.tone({freq:360,dur:.04,type:'triangle',slideTo:155,vol:.075*strength});if(strength>.9)vibrate(9);}
 function roll(n,variant=0){
  stop();show(n);hud.classList.add('rolling');if(typeof reduced==='function'?reduced():reduced){hud.classList.remove('rolling');impact(.55);return Promise.resolve(true);}
  stage.hidden=false;stage.dataset.result=n;resize(a);const token=sequence;let hit=0,elapsed=0;paint(a,pose(0,n,variant));
  if(audible())audio.noise({dur:.045,filter:1900,vol:.018});
  return new Promise(resolve=>{active=resolve;tick=function(now){
   if(token!==sequence||paused)return;const delta=lastTime===null?0:Math.min(50,Math.max(0,now-lastTime));lastTime=now;elapsed+=delta*1.45;paint(a,pose(elapsed,n,variant));
   while(hit<CONTACTS.length&&elapsed>=CONTACTS[hit]){impact([1,.48,.2][hit]);hit++;}
   if(elapsed>=SETTLE)stage.classList.add('settled');
   if(elapsed<DURATION)frame=requestAnimationFrame(tick);else{active=null;frame=0;tick=null;lastTime=null;stage.hidden=true;hud.classList.remove('rolling');show(n);resolve(true);}
  };frame=requestAnimationFrame(tick);});
 }
 function pause(){if(!active||paused)return;paused=true;cancelAnimationFrame(frame);frame=0;lastTime=null;}
 function resume(){if(!active||!paused)return;if(typeof reduced==='function'?reduced():reduced){const done=active;active=null;stop();done(true);return;}paused=false;lastTime=null;frame=requestAnimationFrame(tick);}
 resize(h);resize(a);const observer=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{for(const e of entries){const actor=e.target===hud?h:a;if(actor.root.clientWidth)resize(actor);}}):null;
 if(observer){observer.observe(hud);observer.observe(stage);}stage.hidden=true;show(1);
 return {show,roll,cancel:stop,pause,resume,get active(){return !!active;}};
}
const api={create,pose,normal,faces:FACES,rotations:ROTATIONS,contacts:CONTACTS,duration:DURATION/1.45};if(typeof module==='object')module.exports=api;else root.TycoonDadu=api;
})(typeof window==='object'?window:globalThis);
