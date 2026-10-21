(function(){'use strict';
function run({fresh,step,stars}){let checks=0;const ok=(v,m)=>{if(!v)throw Error(m);checks++;};
const prepare=(s,chosen)=>{chosen.forEach((value,slot)=>s=step(s,{type:'choose',slot,value}));return step(step(s,{type:'cook'}),{type:'ready'});};
for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++){
 const order=[a,b,c];let s=fresh(order);ok(step(s,{type:'serve'})===s,'Cannot serve raw food');ok(step(s,{type:'cook'})===s,'Incomplete ingredients');
 s=prepare(s,order);ok(step(s,{type:'choose',slot:1,value:1})===s,'Cannot edit cooked dish');s=step(s,{type:'serve'});ok(s.score===20&&s.served===1&&s.attempts===1&&s.last.delta===20,'First accurate order');ok(step(s,{type:'serve'})===s,'Duplicate serving ignored');
 for(const score of [0,2,5,20])for(let wrong=0;wrong<3;wrong++){
  const chosen=[...order];chosen[wrong]=(chosen[wrong]+1)%3;let x=prepare({...fresh(order),score,streak:3},chosen);x=step(x,{type:'serve'});
  ok(x.score===Math.max(0,score-5)&&x.last.delta===-Math.min(5,score)&&x.streak===0&&x.served===0,'Exact penalty and broken streak');
  const retry=step(x,{type:'retry'});ok(retry.order.join()===order.join()&&retry.attempts===1&&retry.score===x.score,'Retry keeps order and session');
 }
}
let s=fresh();for(let i=0;i<10;i++){s=step(prepare(s,s.order),{type:'serve'});ok(s.last.delta===Math.min(40,20+i*5),'Capped streak bonus');s=step(s,{type:'next',order:[i%3,1,2]});}ok(s.phase==='complete'&&s.served===10&&s.score===350&&stars(s)===3,'Ten orders complete exactly once');ok(step(s,{type:'next',order:[0,0,0]})===s,'Completed session locked');
let h=step({...fresh(),streak:4},{type:'hint'});ok(h.hintUsed&&h.hintSlot===0&&h.streak===0,'Hint identifies missing ingredient and resets streak');ok(step(h,{type:'hint'})===h,'Hint only once per order');h=step(prepare(h,[1,0,0]),{type:'serve'});h=step(h,{type:'retry'});ok(h.hintUsed&&step(h,{type:'hint'})===h,'Retry cannot restore hint');h=step(prepare(h,h.order),{type:'serve'});ok(h.last.delta===20&&h.streak===0,'Assisted order earns basic reward');h=step(h,{type:'next',order:[1,1,1]});ok(!h.hintUsed&&h.hintSlot===-1,'Next order restores hint');
for(const [served,attempts,expected] of [[0,0,0],[10,10,3],[9,10,3],[8,10,2],[6,10,2],[5,10,1]])ok(stars({served,attempts})===expected,'Accuracy threshold');
for(const a of [{type:'choose',slot:3,value:0},{type:'choose',slot:0,value:4},{type:'choose',slot:NaN,value:0},{type:'next',order:[]}]){const initial=fresh();ok(step(initial,a)===initial,'Invalid action ignored');}
return checks;
}
if(typeof module==='object'&&module.exports){module.exports=run;if(require.main===module){const fs=require('fs'),vm=require('vm'),path=require('path'),s=fs.readFileSync(path.join(__dirname,'../warung-rasa/index.html'),'utf8'),start=s.indexOf('const SESSION_ORDERS='),end=s.indexOf('let state=fresh()',start);const rules=vm.runInNewContext(s.slice(start,end)+';({fresh,step,stars})',{people:[0,1,2,3]});console.log('PASS '+run(rules)+' Warung Rasa core checks');}}
else{const p=document.createElement('pre');p.id='uji';try{p.textContent='UJI LULUS\n'+run(window.WarungUji)+' pemeriksaan aturan';}catch(e){p.textContent='UJI GAGAL\n'+e.message;}document.body.appendChild(p);}
})();
