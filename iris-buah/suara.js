(function(root){'use strict';
function create(K){let buffer=null,master=null,bound=null,lastSwipe=-1;function channel(){if(!K.settings.get().suara)return null;const c=K.audio.ctx;if(!c||c.state==='closed')return null;if(c!==bound){bound=c;buffer=c.createBuffer(1,Math.ceil(c.sampleRate*.5),c.sampleRate);const a=buffer.getChannelData(0);let smooth=0;for(let i=0;i<a.length;i++){const white=Math.random()*2-1;smooth=smooth*.7+white*.3;a[i]=white*.65+smooth*.35;}master=c.createGain();master.gain.value=.65;master.connect(c.destination);}return c;}
const unsubscribe=K.settings.onChange(s=>{if(master&&bound)master.gain.setValueAtTime(s.suara ? .65 : 0,bound.currentTime);});
function noise(c,t,dur,volume,wet){const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=buffer;f.type=wet?'lowpass':'bandpass';f.Q.value=wet?.65:.8;f.frequency.setValueAtTime(wet?1900:1100,t);f.frequency.exponentialRampToValueAtTime(wet?850:6200,t+dur*.3);f.frequency.exponentialRampToValueAtTime(wet?280:900,t+dur);g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.00001,t+dur);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur+.015);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
function swipe(speed=1){const c=channel();if(!c||c.currentTime-lastSwipe<.11)return false;lastSwipe=c.currentTime;noise(c,c.currentTime+.004,.14,Math.min(.3,.14+speed*.025),false);return true;}
function cut(n=1){const c=channel();if(!c)return false;noise(c,c.currentTime+.003,.095,Math.min(.32,.17+n*.025),true);noise(c,c.currentTime+.008,.035,.055,false);return true;}
return {swipe,cut,dispose(){unsubscribe();if(master)master.disconnect();}};
}
const api={create};if(typeof module==='object')module.exports=api;else root.IrisSuara=api;
})(typeof window==='object'?window:globalThis);
