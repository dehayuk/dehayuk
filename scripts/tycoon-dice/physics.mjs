import * as C from 'cannon-es';
export const NORMALS=[null,[0,1,0],[1,0,0],[0,0,1],[0,0,-1],[-1,0,0],[0,-1,0]];
function random(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
export function faceValue(q){let best=-2,value=1;for(let n=1;n<=6;n++){const v=q.vmult(new C.Vec3(...NORMALS[n]));if(v.y>best){best=v.y;value=n;}}return {value,alignment:best};}
// A cube is rotationally symmetric. Choosing its local numbering orientation
// before playback retains the recorded physical path and the game's result.
export function numberedOrientation(bodyQuaternion,value){
 for(let x=0;x<4;x++)for(let y=0;y<4;y++)for(let z=0;z<4;z++){
  const local=new C.Quaternion();local.setFromEuler(x*Math.PI/2,y*Math.PI/2,z*Math.PI/2,'XYZ');
  if(bodyQuaternion.mult(local).vmult(new C.Vec3(...NORMALS[value])).y>.999)return local;
 }
 throw new Error('Die has not settled flat');
}
export function simulatePair(values,seed=1){
 for(let attempt=0;attempt<6;attempt++){
  const rand=random(seed+attempt*7919),world=new C.World({gravity:new C.Vec3(0,-22,0),allowSleep:true});
  world.solver.iterations=14;world.solver.tolerance=.001;
  const diceMaterial=new C.Material('dice'),floorMaterial=new C.Material('board');
  world.addContactMaterial(new C.ContactMaterial(diceMaterial,floorMaterial,{friction:.42,restitution:.32,contactEquationStiffness:1e7,contactEquationRelaxation:3}));
  world.addContactMaterial(new C.ContactMaterial(diceMaterial,diceMaterial,{friction:.25,restitution:.3}));
  const floor=new C.Body({mass:0,material:floorMaterial,shape:new C.Plane()});floor.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(floor);
  for(const [x,z,sx,sz] of [[-3.85,0,.18,4],[3.85,0,.18,4],[0,-3.65,4,.18],[0,3.65,4,.18]]){const wall=new C.Body({mass:0,material:floorMaterial,shape:new C.Box(new C.Vec3(sx,3,sz))});wall.position.set(x,2,z);world.addBody(wall);}
  let tick=0;const impacts=[];
  const bodies=values.map((_,i)=>{
   const body=new C.Body({mass:1,material:diceMaterial,shape:new C.Box(new C.Vec3(.42,.42,.42)),linearDamping:.24,angularDamping:.32,sleepSpeedLimit:.12,sleepTimeLimit:.35});
   body.position.set(-2.65+i*.95,2.6+i*.6,2.35+i*.45);body.quaternion.setFromEuler(rand()*Math.PI*2,rand()*Math.PI*2,rand()*Math.PI*2);
   body.velocity.set(5.7+rand()*1.6,1+rand(),-3.5-rand()*1.2);body.angularVelocity.set(10+rand()*8,8+rand()*10,5+rand()*12);
   body.addEventListener('collide',ev=>{const speed=Math.abs(ev.contact.getImpactVelocityAlongNormal());if(speed>1.7)impacts.push({time:tick/120,speed,kind:ev.body.mass>0?'dice':ev.body===floor?'board':'edge'});});world.addBody(body);return body;
  });
  const frames=[];let sleepTick=0;
  for(tick=0;tick<960;tick++){
   world.step(1/120);
   if(tick%2===0)frames.push(bodies.map(b=>({p:b.position.toArray(),q:b.quaternion.toArray()})));
   if(bodies.every(b=>b.sleepState===C.Body.SLEEPING)){if(!sleepTick)sleepTick=tick;if(tick-sleepTick>40&&tick>240)break;}else sleepTick=0;
  }
  if(!bodies.every(b=>faceValue(b.quaternion).alignment>.999))continue;
  const orientations=bodies.map((b,i)=>numberedOrientation(b.quaternion,values[i]).toArray());
  const contacts=[];for(const impact of impacts.sort((a,b)=>a.time-b.time)){const last=contacts.at(-1);if(!last||impact.time-last.time>.075)contacts.push(impact);else last.speed=Math.max(last.speed,impact.speed);}
  return {frames,orientations,contacts,duration:(frames.length-1)/60,attempt,seed};
 }
 throw new Error('Dice did not settle');
}
