(function(root){'use strict';
// Original procedural effects; no third-party recordings.
function create(K){
 let bound=null,master=null,compressor=null,primed=null,lastSwipe=-1,lastCut=-1,lastBomb=-1,disposed=false;
 const buffers={};
 function channel(){
  if(disposed||!K.settings.get().suara)return null;
  const c=K.audio.ctx;if(!c||c.state==='closed')return null;
  if(c!==bound){
   if(master)master.disconnect();if(compressor)compressor.disconnect();
   bound=c;primed=null;lastSwipe=lastCut=lastBomb=-1;for(const key in buffers)delete buffers[key];
   master=c.createGain();master.gain.value=.8;compressor=c.createDynamicsCompressor();
   compressor.threshold.value=-13;compressor.knee.value=12;compressor.ratio.value=5;compressor.attack.value=.003;compressor.release.value=.12;
   master.connect(compressor);compressor.connect(c.destination);
  }return c;
 }
 function unlock(){
  if(disposed||!K.settings.get().suara)return false;
  try{if(root.navigator&&root.navigator.audioSession)root.navigator.audioSession.type='playback';}catch(_){}
  try{if(K.audio.unlock)K.audio.unlock();const c=channel();if(!c)return false;
   if((c.state==='suspended'||c.state==='interrupted')&&c.resume){const p=c.resume();if(p&&p.catch)p.catch(()=>{});}
   if(primed!==c){const s=c.createBufferSource();s.buffer=c.createBuffer(1,1,c.sampleRate);s.connect(master);s.onended=()=>s.disconnect();s.start(0);primed=c;}
   return true;
  }catch(_){return false;}
 }
 function effect(c,kind,variant=0){
  const key=kind+variant;if(buffers[key])return buffers[key];
  const duration=kind==='bomb'?.95:kind==='blade'?.24:.15,b=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),a=b.getChannelData(0);
  let rng=8713+variant*317,low=0,slow=0,phase=0,metal=0;
  for(let i=0;i<a.length;i++){
   const t=i/c.sampleRate,u=t/duration;rng=(Math.imul(rng,1664525)+1013904223)|0;const white=(rng>>>0)/2147483648-1;
   if(kind==='blade'){
    const freq=900+6500*Math.sin(Math.PI*Math.pow(u,.65)),alpha=1-Math.exp(-2*Math.PI*freq/c.sampleRate);
    low+=alpha*(white-low);slow+=.075*(white-slow);phase+=2*Math.PI*(2600-1450*u)/c.sampleRate;metal+=2*Math.PI*(4100-1800*u)/c.sampleRate;
    const env=Math.pow(Math.sin(Math.PI*u),1.6)*Math.exp(-u*2.4);
    a[i]=((low-slow)*1.35+(.065*Math.sin(phase)+.03*Math.sin(metal))*Math.exp(-u*7))*env*1.6;
   }else if(kind==='cut'){
    low+=.22*(white-low);phase+=2*Math.PI*(340*Math.exp(-t*28)+85)/c.sampleRate;
    a[i]=(.65*low*Math.exp(-t*35)+.14*white*Math.exp(-t*95)+.18*Math.sin(phase)*Math.exp(-t*44))*Math.min(1,t/.002);
   }else{
    low+=.085*(white-low);slow+=.014*(white-slow);phase+=2*Math.PI*(38+83*Math.exp(-t*13))/c.sampleRate;
    const attack=Math.min(1,t/.0025),pressure=.48*Math.sin(phase)*Math.exp(-t*6.8),crack=.58*white*Math.exp(-t*52),rumble=(low*.95+slow*1.8)*Math.exp(-t*5.2);
    a[i]=(pressure+crack+rumble)*attack*Math.min(1,(duration-t)/.08);
   }
  }buffers[key]=b;return b;
 }
 function play(kind,rate=1,volume=1,variant=0){const c=channel();if(!c||(!c.startRendering&&(c.state==='suspended'||c.state==='interrupted')))return false;
  const s=c.createBufferSource(),g=c.createGain();s.buffer=effect(c,kind,variant);s.playbackRate.value=rate;g.gain.value=volume;s.connect(g);g.connect(master);s.onended=()=>{s.disconnect();g.disconnect();};s.start(c.currentTime+.002);return true;
 }
 function swipe(speed=1){const c=channel();if(!c||c.currentTime-lastSwipe<.12)return false;const ok=play('blade',Math.max(.85,Math.min(1.35,.92+speed*.045)),.85,Math.floor(c.currentTime*7)%3);if(ok)lastSwipe=c.currentTime;return ok;}
 function cut(n=1){const c=channel();if(!c||c.currentTime-lastCut<.035)return false;const ok=play('cut',1+(n%3)*.055,Math.min(1.25,.95+n*.06));if(ok)lastCut=c.currentTime;return ok;}
 function bomb(){const c=channel();if(!c||c.currentTime-lastBomb<.18)return false;const ok=play('bomb',1,1);if(ok)lastBomb=c.currentTime;return ok;}
 const unsubscribe=K.settings.onChange(s=>{if(master&&bound)master.gain.setValueAtTime(s.suara?.8:0,bound.currentTime);if(s.suara)unlock();});
 const gestures=['pointerdown','pointerup','touchend','click','keydown'];if(root.document)for(const ev of gestures)root.document.addEventListener(ev,unlock,{capture:true,passive:true});
 return {unlock,swipe,cut,bomb,dispose(){disposed=true;unsubscribe();if(root.document)for(const ev of gestures)root.document.removeEventListener(ev,unlock,true);if(master)master.disconnect();if(compressor)compressor.disconnect();}};
}
const api={create};if(typeof module==='object')module.exports=api;else root.IrisSuara=api;
})(typeof window==='object'?window:globalThis);
