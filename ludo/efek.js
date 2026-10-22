(function(){'use strict';
function create({root,layer,kit,reduced,audible}){
 const animations=new Set(),sleepers=new Set(),sounds=new Set();let paused=false,generation=0;
 const quiet=()=>typeof reduced==='function'?reduced():reduced;
 function arm(t){t.start=performance.now();t.timer=setTimeout(()=>{sleepers.delete(t);t.resolve(true);},t.left);}
 function wait(ms){return new Promise(resolve=>{const t={left:ms,resolve,timer:0,start:0};sleepers.add(t);if(!paused)arm(t);});}
 function track(a){animations.add(a);if(paused)a.pause();return a.finished.catch(()=>{}).finally(()=>animations.delete(a));}
 function animate(el,frames,options){if(!el?.isConnected)return Promise.resolve();return track(el.animate(frames,options));}
 function stopSounds(kind){for(const s of sounds)if(!kind||s.kind===kind){try{s.os.stop();s.os.disconnect();s.gain.disconnect();}catch(_){}sounds.delete(s);}}
 function pause(){paused=true;for(const a of animations)if(a.playState==='running'||a.pending)a.pause();for(const t of sleepers)if(t.timer){clearTimeout(t.timer);t.timer=0;t.left=Math.max(0,t.left-(performance.now()-t.start));}stopSounds();}
 function resume(){paused=false;for(const a of animations)if(a.playState==='paused')a.play();for(const t of sleepers)if(!t.timer)arm(t);}
 function cancel(){generation++;for(const a of animations)a.cancel();animations.clear();for(const t of sleepers){clearTimeout(t.timer);t.resolve(false);}sleepers.clear();stopSounds();layer.replaceChildren();paused=false;}
 function note(freq,end,dur,vol,type='sine',delay=0,kind='suara'){
  const ctx=kit.audio.ctx;if(paused||!audible()||!kit.settings.get()[kind]||ctx?.state!=='running')return;
  const os=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime+delay,voice={os,gain,kind};sounds.add(voice);os.type=type;os.frequency.setValueAtTime(freq,t);if(end)os.frequency.exponentialRampToValueAtTime(end,t+dur);gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(vol,t+.007);gain.gain.exponentialRampToValueAtTime(.0001,t+dur);os.connect(gain);gain.connect(ctx.destination);os.start(t);os.stop(t+dur+.025);os.onended=()=>{sounds.delete(voice);os.disconnect();gain.disconnect();};
 }
 kit.settings.onChange(s=>{if(!s.suara)stopSounds('suara');if(!s.musik)stopSounds('musik');});
 function strike(){note(180,48,.18,.17);note(840,130,.075,.065,'triangle');kit.audio.noise({dur:.055,filter:1450,q:.6,vol:.17});kit.vibrate([22,30,38]);}
 function fanfare(lost){const notes=lost?[392,311,196]:[523,659,784];notes.forEach((n,i)=>note(n,null,.18,.032,'triangle',i*.065,'musik'));}
 function windup(){note(190,680,.12,.028,'triangle');}
 function point(r,c){const mark=document.createElement('i');mark.style.cssText='position:absolute;width:0;height:0;left:'+((c+.5)/15*100)+'%;top:'+((r+.5)/15*100)+'%';root.querySelector('#pieces').appendChild(mark);const a=mark.getBoundingClientRect(),b=root.getBoundingClientRect();mark.remove();return {x:(a.x-b.x)/b.width*100,y:(a.y-b.y)/b.height*100};}
 async function capture({player,coord,victims,lost,color}){
  const token=generation,xy=point(...coord),burst=document.createElement('div'),banner=document.createElement('div');burst.className='capture-burst';burst.style.cssText='left:'+xy.x+'%;top:'+xy.y+'%;--impact-color:'+color;burst.dataset.effect='capture';burst.dataset.count=victims.length;
  burst.innerHTML='<i class="impact-ring"></i><i class="impact-core"></i>'+Array.from({length:10},(_,i)=>'<i class="impact-spark" style="--a:'+(i*36)+'deg;--d:'+(i%2?57:78)+'px"></i>').join('');banner.className='capture-banner';banner.innerHTML='<b>'+(lost?'KENA TANGKAP!':'TANGKAP!')+'</b><small>'+victims.length+' bidak kembali ke markas</small>';layer.append(burst,banner);strike();fanfare(lost);
  const fx=[];
  if(!quiet()){
   fx.push(animate(root,[{transform:'translate(0)'},{transform:'translate(-4px,2px)'},{transform:'translate(4px,-2px)'},{transform:'translate(-2px,1px)'},{transform:'translate(0)'}],{duration:230,easing:'ease-out'}));
   fx.push(animate(burst.querySelector('.impact-ring'),[{transform:'translate(-50%,-50%) scale(.15)',opacity:1},{transform:'translate(-50%,-50%) scale(1.5)',opacity:0}],{duration:430,easing:'cubic-bezier(.12,.7,.25,1)',fill:'forwards'}));
   fx.push(animate(burst.querySelector('.impact-core'),[{opacity:.8,transform:'translate(-50%,-50%) scale(.3)'},{opacity:0,transform:'translate(-50%,-50%) scale(1.3)'}],{duration:220,fill:'forwards'}));
   for(const spark of burst.querySelectorAll('.impact-spark'))fx.push(animate(spark,[{transform:'rotate(var(--a)) translateY(0) scale(1)',opacity:1},{transform:'rotate(var(--a)) translateY(calc(0px - var(--d))) scale(.3)',opacity:0}],{duration:480,easing:'ease-out',fill:'forwards'}));
   fx.push(animate(banner,[{transform:'translate(-50%,-50%) scale(.8)',opacity:0},{transform:'translate(-50%,-50%) scale(1.05)',opacity:1,offset:.17},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.75},{transform:'translate(-50%,-65%) scale(1)',opacity:0}],{duration:760,easing:'ease-out',fill:'forwards'}));
  }else{burst.classList.add('calm');banner.classList.add('calm');}
  await wait(quiet()?70:85);if(token!==generation)return;
  for(const v of victims){const el=v.el;if(!el?.isConnected)continue;const left=el.style.left,top=el.style.top;el.classList.add('captured');el.style.left=v.left+'%';el.style.top=v.top+'%';
   if(!quiet()){
    fx.push(animate(el,[{left,top},{left:((parseFloat(left)+v.left)/2)+'%',top:(Math.min(parseFloat(top),v.top)-5)+'%',offset:.46},{left:v.left+'%',top:v.top+'%'}],{duration:470,easing:'cubic-bezier(.25,.65,.35,1)'}));
    fx.push(animate(el.firstElementChild,[{transform:'rotate(0)'},{transform:'translateY(-12px) rotate(-28deg)',offset:.35},{transform:'rotate(8deg)',offset:.8},{transform:'rotate(0)'}],{duration:470,easing:'ease-out'}));
   }
  }
  if(quiet())await wait(220);else await Promise.all(fx);
  if(token===generation){burst.remove();banner.remove();}
 }
 async function park(el,coord){if(!el)return;const token=generation,start={left:el.style.left,top:el.style.top,width:el.offsetWidth+'px',height:el.offsetHeight+'px'},left=((coord[1]+.5)/15*100)+'%',top=((coord[0]+.5)/15*100)+'%';el.classList.add('finished');el.style.left=left;el.style.top=top;el.style.width='4.6%';el.style.height='6.5%';
  note(740,1047,.18,.055,'triangle');if(!quiet())await animate(el,[start,{left,top,width:'4.6%',height:'6.5%'}],{duration:320,easing:'cubic-bezier(.2,.7,.2,1)'});else await wait(70);
  if(token===generation)kit.vibrate(12);
 }
 return {wait,track,animate,pause,resume,cancel,capture,park,windup};
}
window.LudoEfek={create};
})();
