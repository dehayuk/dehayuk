(function(root){'use strict';
// The engine chooses the result before this presentation starts.
const ROTATIONS={1:[90,0],2:[0,0],3:[90,-90],4:[90,90],5:[180,0],6:[90,180]};
const FACES=[{n:1,axis:'Y',angle:0,normal:[0,0,1]},{n:6,axis:'Y',angle:180,normal:[0,0,-1]},{n:3,axis:'Y',angle:90,normal:[1,0,0]},{n:4,axis:'Y',angle:-90,normal:[-1,0,0]},{n:2,axis:'X',angle:90,normal:[0,-1,0]},{n:5,axis:'X',angle:-90,normal:[0,1,0]}];
const rad=d=>d*Math.PI/180;
function rotate(v,axis,d){const c=Math.cos(rad(d)),s=Math.sin(rad(d)),[x,y,z]=v;return axis==='X'?[x,y*c-z*s,y*s+z*c]:axis==='Y'?[x*c+z*s,y,-x*s+z*c]:[x*c-y*s,x*s+y*c,z];}
function normal(face,x,y,z=0){let v=rotate(face.normal,'Z',z);v=rotate(v,'Y',y);v=rotate(v,'X',x);v=rotate(v,'Y',-25);return rotate(v,'X',-55);}
function pose(ms,result,variant=0){const [tx,ty]=ROTATIONS[result],t=Math.min(1100,Math.max(0,ms)),direction=variant%2?-1:1;let x=0,y=0;if(t<520){const u=t/520;x=(-38+56*u)*direction;y=-14*(1-u)-54*4*u*(1-u);}else if(t<760){const u=(t-520)/240;x=(18-25*u)*direction;y=-21*4*u*(1-u);}else if(t<930){const u=(t-760)/170;x=(-7+7*u)*direction;y=-6*4*u*(1-u);}const rest=Math.pow(1-t/1100,1.65);return {x,y,rx:tx+720*rest,ry:ty-900*rest*direction,rz:24*Math.sin(t/150)*rest,shadowScale:1-Math.min(.4,-y/180),shadowOpacity:.29-Math.min(.16,-y/390)};}
function create({hud,stage,face,audio,vibrate,reduced=false,audible=()=>true}){
 function mount(container){container.innerHTML='<span class="dice-ground"></span><span class="dice-shadow"></span><span class="dice-flight"><span class="dice-view"><span class="dice-cube">'+FACES.map(f=>'<span class="dice-face" data-face="'+f.n+'" style="transform:rotate'+f.axis+'('+f.angle+'deg) translateZ(calc(var(--edge) / 2))">'+face(f.n)+'</span>').join('')+'</span></span></span>';
 return {root:container,flight:container.querySelector('.dice-flight'),cube:container.querySelector('.dice-cube'),shadow:container.querySelector('.dice-shadow'),faces:[...container.querySelectorAll('.dice-face')]};}
 const h=mount(hud),a=mount(stage);let frame=0,active=null,last=1,sequence=0,paused=false,tick=null,lastTime=null;
 function paint(actor,p){actor.flight.style.transform='translate3d('+p.x+'px,'+p.y+'px,0)';actor.cube.style.transform='rotateX('+p.rx+'deg) rotateY('+p.ry+'deg) rotateZ('+p.rz+'deg)';actor.shadow.style.transform='translateX('+p.x+'px) scale('+p.shadowScale+')';actor.shadow.style.opacity=p.shadowOpacity;
 actor.faces.forEach((el,i)=>{const n=normal(FACES[i],p.rx,p.ry,p.rz),light=Math.max(0,-n[0]*.35-n[1]*.45+n[2]*.8),v=.68+.32*light;el.style.filter='brightness('+v.toFixed(3)+')';});}
 function show(n){if(!ROTATIONS[n])return;last=n;hud.dataset.result=n;hud.setAttribute('aria-label','Hasil dadu '+n);paint(h,pose(1100,n));}
 function stop(){cancelAnimationFrame(frame);frame=0;sequence++;paused=false;tick=null;lastTime=null;if(active){const done=active;active=null;done(false);}stage.hidden=true;stage.classList.remove('settled');hud.classList.remove('rolling');show(last);}
 function impact(strength){if(!audible())return;audio.noise({dur:.038,filter:2250,q:.7,vol:.17*strength});audio.tone({freq:245,dur:.055,type:'triangle',slideTo:130,vol:.09*strength});if(strength>.9)vibrate(9);}
 function roll(n,variant=0){stop();show(n);hud.classList.add('rolling');if(typeof reduced==='function'?reduced():reduced){hud.classList.remove('rolling');impact(.55);return Promise.resolve(true);}stage.hidden=false;stage.dataset.result=n;const token=sequence;let hit=0,elapsed=0;const impacts=[520,760,930];paint(a,pose(0,n,variant));if(audible())audio.noise({dur:.065,filter:1600,vol:.035});
 return new Promise(resolve=>{active=resolve;tick=function(now){if(token!==sequence||paused)return;const delta=lastTime===null?0:Math.min(50,Math.max(0,now-lastTime));lastTime=now;elapsed+=delta;paint(a,pose(elapsed,n,variant));while(hit<impacts.length&&elapsed>=impacts[hit]){impact([1,.52,.22][hit]);hit++;}if(elapsed>=1100)stage.classList.add('settled');if(elapsed<1450){frame=requestAnimationFrame(tick);}else{active=null;frame=0;tick=null;lastTime=null;stage.hidden=true;hud.classList.remove('rolling');show(n);resolve(true);}};frame=requestAnimationFrame(tick);});}
 function pause(){if(!active||paused)return;paused=true;cancelAnimationFrame(frame);frame=0;lastTime=null;}
 function resume(){if(!active||!paused)return;if(typeof reduced==='function'?reduced():reduced){const done=active;active=null;stop();done(true);return;}paused=false;lastTime=null;frame=requestAnimationFrame(tick);}

 stage.hidden=true;show(1);return {show,roll,cancel:stop,pause,resume,get active(){return !!active;}};
}
const api={create,pose,normal,faces:FACES,rotations:ROTATIONS};if(typeof module==='object')module.exports=api;else root.PropertiDadu=api;
})(typeof window==='object'?window:globalThis);
