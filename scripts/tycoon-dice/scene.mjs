import * as T from 'three';
import {Quaternion as CQ} from 'cannon-es';
import {createBoxGeometry,createInnerGeometry} from './geometry.mjs';
import {simulatePair,faceValue,numberedOrientation} from './physics.mjs';
export {simulatePair};
const managers=new WeakMap();
const PIPS={1:[[0,0]],2:[[-.23,-.23],[.23,.23]],3:[[-.23,-.23],[0,0],[.23,.23]],4:[[-.23,-.23],[.23,-.23],[-.23,.23],[.23,.23]],5:[[-.23,-.23],[.23,-.23],[0,0],[-.23,.23],[.23,.23]],6:[[-.23,-.25],[.23,-.25],[-.23,0],[.23,0],[-.23,.25],[.23,.25]]};
const FACE_ROTATIONS={1:'rotateX(90deg)',2:'rotateY(90deg)',3:'',4:'rotateY(180deg)',5:'rotateY(-90deg)',6:'rotateX(-90deg)'};
const asC=q=>new CQ(q.x,q.y,q.z,q.w);
function makeManager(board){
 const layer=document.createElement('div');layer.id='diceLayer';layer.setAttribute('aria-hidden','true');board.appendChild(layer);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-5,5,5,-5,.1,60);camera.position.set(0,15,6.5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const actors=[],states=[0,1].map(i=>({p:new T.Vector3(i? .55:-.55,.42,0),q:new T.Quaternion().setFromEuler(new T.Euler(0,i?.48:-.32,0)),local:new T.Quaternion(),value:1}));
 let renderer,cssDice,kind='webgl',width=360,frame=0,running=false,paused=false,elapsed=0,previous=0,plan=null,playToken=0,contactIndex=0,runCount=0;
 let queue=[],queued=false;const meshQuaternion=new T.Quaternion(),tempQ=new T.Quaternion(),v=new T.Vector3();
 try{if(new URLSearchParams(location.search).get('dice')==='css')throw Error('Fallback test');renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.setClearColor(0,0);layer.appendChild(renderer.domElement);}catch{kind='css';}
 layer.dataset.renderer=kind;
 let meshes=[];
 if(renderer){
  scene.add(new T.HemisphereLight(0xffffff,0xa4957b,2.2));const light=new T.DirectionalLight(0xffffff,3);light.position.set(-3,9,6);light.castShadow=true;light.shadow.mapSize.set(512,512);Object.assign(light.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:30});light.shadow.bias=-.0003;light.shadow.normalBias=.01;light.shadow.radius=3;scene.add(light);
  const floor=new T.Mesh(new T.PlaneGeometry(12,12),new T.ShadowMaterial({opacity:.22}));floor.rotation.x=-Math.PI/2;floor.position.y=-.008;floor.receiveShadow=true;scene.add(floor);
  const outer=createBoxGeometry(),inner=createInnerGeometry(),plastic=new T.MeshPhongMaterial({color:0xfffaf0,shininess:80,specular:0x77736b}),ink=new T.MeshBasicMaterial({color:0x171a20,side:T.DoubleSide});
  meshes=states.map(()=>{const group=new T.Group(),shell=new T.Mesh(outer,plastic),pips=new T.Mesh(inner,ink);shell.castShadow=true;shell.receiveShadow=true;group.add(shell,pips);group.scale.setScalar(.84);scene.add(group);return group;});
 }else{
  cssDice=states.map(()=>{const root=document.createElement('div');root.className='physical-die';root.innerHTML='<span class="physical-shadow"></span><span class="physical-cube">'+Object.entries(PIPS).map(([n,pips])=>'<span class="physical-face" style="transform:'+FACE_ROTATIONS[n]+' translateZ(calc(var(--die-edge)/2))">'+pips.map(([x,y])=>'<i style="left:'+(50+100*x)+'%;top:'+(50+100*y)+'%"></i>').join('')+'</span>').join('')+'</span>';layer.appendChild(root);return root;});
 }
 function resetState(i){const s=states[i];s.p.set(i?.55:-.55,.42,0);s.q.setFromEuler(new T.Euler(0,i?.48:-.32,0));s.local.copy(numberedOrientation(asC(s.q),s.value));}
 let idleRender=0;
 function draw(){if(running){paintScene();return;}if(!idleRender)idleRender=requestAnimationFrame(()=>{idleRender=0;paintScene();});}
 function paintScene(){
  states.forEach((s,i)=>{
   meshQuaternion.copy(s.q).multiply(s.local);
   if(renderer){meshes[i].position.copy(s.p);meshes[i].quaternion.copy(meshQuaternion);}
   else{
    v.copy(s.p).project(camera);const x=(v.x*.5+.5)*width,y=(-v.y*.5+.5)*width,edge=width/10*.84;
    const view=camera.quaternion.clone().invert().multiply(meshQuaternion),matrix=new T.Matrix4().makeRotationFromQuaternion(view),a=matrix.elements;for(const k of [1,4,6,9])a[k]*=-1;
    const root=cssDice[i];root.style.setProperty('--die-edge',edge+'px');root.style.left=x+'px';root.style.top=y+'px';root.querySelector('.physical-cube').style.transform='matrix3d('+a.join(',')+')';
    v.set(s.p.x,0,s.p.z).project(camera);const shadow=root.querySelector('.physical-shadow');shadow.style.transform='translate('+((v.x*.5+.5)*width-x)+'px,'+((-v.y*.5+.5)*width-y+edge*.45)+'px) scale('+(1+s.p.y*.12)+')';shadow.style.opacity=Math.max(.06,.23-s.p.y*.045);
   }
  });
  renderer?.render(scene,camera);
 }
 function resize(){width=board.clientWidth||360;renderer?.setSize(width,width);draw();}
 function valueText(){actors.forEach((a,i)=>{a.hud.dataset.result=states[i].value;a.hud.setAttribute('aria-label','Dadu '+(i+1)+': '+states[i].value);});}
 function restore(){states.forEach((_,i)=>resetState(i));valueText();draw();}
 function finish(ok){cancelAnimationFrame(frame);frame=0;running=false;paused=false;previous=0;layer.dataset.active='false';actors.forEach(a=>{a.stage.hidden=true;a.hud.classList.remove('rolling');});const pending=queue;queue=[];pending.forEach(r=>r.resolve(ok));valueText();}
 function cancel(){playToken++;queued=false;finish(false);restore();}
 function sound(impact){const a=actors[0];if(!a?.audible())return;const strength=Math.min(1,impact.speed/10);a.audio.noise({dur:.026,filter:1700,q:.7,vol:.06+.09*strength});a.audio.tone({freq:220+strength*100,slideTo:100,dur:.04,type:'triangle',vol:.035*strength});if(strength>.8)a.vibrate(7);}
 function paintFrame(time){
  const f=Math.min(plan.frames.length-1,time*60),index=Math.floor(f),mix=f-index,next=Math.min(index+1,plan.frames.length-1);
  states.forEach((s,i)=>{const a=plan.frames[index][i],b=plan.frames[next][i];s.p.fromArray(a.p).lerp(v.fromArray(b.p),mix);s.q.fromArray(a.q).slerp(tempQ.fromArray(b.q),mix);});draw();
 }
 function tick(now){
  if(!running||paused)return;const delta=previous?Math.min(60,now-previous):0;previous=now;elapsed+=delta;
  paintFrame(Math.min(plan.duration,elapsed/1000));
  while(contactIndex<plan.contacts.length&&plan.contacts[contactIndex].time*1000<=elapsed)sound(plan.contacts[contactIndex++]);
  if(elapsed>=plan.duration*1000+250){finish(true);return;}frame=requestAnimationFrame(tick);
 }
 function begin(){
  queued=false;if(!queue.length)return;runCount++;queue.forEach(r=>states[r.index].value=r.value);valueText();
  const seed=(queue.reduce((v,r)=>v+r.variant*131+r.value*17,71)+runCount*7919)>>>0;
  try{plan=simulatePair(states.map(s=>s.value),seed);}catch(error){layer.dataset.error=error.message;restore();finish(true);return;}states.forEach((s,i)=>s.local.fromArray(plan.orientations[i]));
  layer.dataset.simulation='cannon-es';layer.dataset.collisions=plan.contacts.length;layer.dataset.active='true';running=true;paused=false;elapsed=0;previous=0;contactIndex=0;
  actors.forEach(a=>{a.stage.hidden=false;a.hud.classList.add('rolling');});
  if(actors[0]?.reduced()){paintFrame(plan.duration);finish(true);return;}
  paintFrame(0);frame=requestAnimationFrame(tick);
 }
 function roll(index,value,variant){
  if(![1,2,3,4,5,6].includes(value))return Promise.resolve(false);
  return new Promise(resolve=>{queue.push({index,value,variant,resolve});if(!queued&&!running){queued=true;const token=playToken;queueMicrotask(()=>{if(token===playToken)begin();});}});
 }
 function show(index,value){if(![1,2,3,4,5,6].includes(value))return;if(running)return;const s=states[index];if(s.value!==value){s.value=value;s.local.copy(numberedOrientation(asC(s.q),value));}valueText();draw();}
 function pause(){if(!running||paused)return;paused=true;previous=0;cancelAnimationFrame(frame);frame=0;}
 function resume(){if(!running||!paused)return;paused=false;previous=0;frame=requestAnimationFrame(tick);}
 const manager={register(a){const index=actors.length;actors.push(a);a.hud.innerHTML='<span class="dice-accessible"></span>';a.stage.hidden=true;resetState(index);resize();return {show:n=>show(index,n),roll:(n,v=0)=>roll(index,n,v),cancel,pause,resume,get active(){return running;}};},inspect(){return {renderer:kind,active:running,paused,collisions:plan?.contacts.length||0,frames:plan?.frames.length||0,playhead:elapsed,dice:states.map(s=>{const q=asC(s.q.clone().multiply(s.local));return {result:s.value,top:faceValue(q),position:s.p.toArray(),quaternion:q.toArray()};})};}};
 if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(board);else window.addEventListener('resize',resize);restore();return manager;
}
export function create(options){const board=options.stage.parentElement;let m=managers.get(board);if(!m){m=makeManager(board);managers.set(board,m);}return m.register({hud:options.hud,stage:options.stage,audio:options.audio,vibrate:options.vibrate||(()=>{}),reduced:typeof options.reduced==='function'?options.reduced:()=>!!options.reduced,audible:options.audible||(()=>true)});}
export function inspect(board=document.getElementById('board')){return managers.get(board)?.inspect();}
