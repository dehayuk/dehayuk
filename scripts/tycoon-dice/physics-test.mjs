import assert from 'node:assert/strict';import {Quaternion} from 'cannon-es';import {simulatePair,faceValue} from './physics.mjs';
let tested=0,diceContacts=0,longest=0;
const start=performance.now();
for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let repeat=0;repeat<3;repeat++){
 const values=[a,b],roll=simulatePair(values,19+a*131+b*17+repeat*7919),final=roll.frames.at(-1);
 final.forEach((f,i)=>{const q=new Quaternion(...f.q).mult(new Quaternion(...roll.orientations[i])),top=faceValue(q);assert.equal(top.value,values[i]);assert(top.alignment>.999);assert(Math.abs(f.p[1]-.42)<.02);});
 assert(roll.contacts.some(c=>c.kind==='board'));diceContacts+=roll.contacts.filter(c=>c.kind==='dice').length;longest=Math.max(longest,roll.duration);tested++;
 for(const f of roll.frames)for(const d of f)assert(d.p.every(Number.isFinite)&&d.q.every(Number.isFinite));
}
assert(diceContacts>0);console.log({tested,diceContacts,longestSeconds:longest,cpuMilliseconds:Math.round(performance.now()-start)});
