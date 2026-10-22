(function(){'use strict';
const T=SortirCairanTuang;
const colors=[['#09e8ff','#0076db','Biru muda'],['#ff2cbc','#b80088','Merah muda'],['#fff329','#ffae00','Kuning'],['#86ff19','#16b94e','Hijau'],['#ae64ff','#6526d9','Ungu'],['#ff9935','#ef4b0d','Jingga'],['#ff4e68','#d51144','Merah'],['#4684ff','#2241cd','Biru tua']];
let serial=0;
const tint=(hex,amount)=>'#'+hex.slice(1).match(/../g).map(v=>Math.round(parseInt(v,16)*(1-amount)+255*amount).toString(16).padStart(2,'0')).join('');
const paints=colors.map((c,i)=>'<linearGradient id="p'+i+'" x1="0" y1="0" x2="1" y2="0"><stop stop-color="'+c[1]+'"/><stop offset=".12" stop-color="'+c[1]+'"/><stop offset=".32" stop-color="'+c[0]+'"/><stop offset=".46" stop-color="'+tint(c[0],.2)+'"/><stop offset=".67" stop-color="'+c[0]+'"/><stop offset=".92" stop-color="'+c[1]+'"/><stop offset="1" stop-color="'+c[1]+'"/></linearGradient>').join('')+
 '<linearGradient id="sc-glass"><stop stop-color="#8ce7ff" stop-opacity=".37"/><stop offset=".13" stop-color="#e9fbff" stop-opacity=".08"/><stop offset=".5" stop-color="#377fc4" stop-opacity=".015"/><stop offset=".88" stop-color="#bdeaff" stop-opacity=".17"/><stop offset="1" stop-color="#d4f7ff" stop-opacity=".44"/></linearGradient>'+
 '<linearGradient id="sc-edge"><stop stop-color="#baf4ff"/><stop offset=".2" stop-color="#639dce"/><stop offset=".46" stop-color="#f1fdff"/><stop offset=".72" stop-color="#6fa2d5"/><stop offset="1" stop-color="#c2f6ff"/></linearGradient>'+
 '<linearGradient id="sc-front"><stop stop-color="white" stop-opacity="0"/><stop offset=".16" stop-color="white" stop-opacity=".28"/><stop offset=".24" stop-color="white" stop-opacity=".03"/><stop offset=".78" stop-color="white" stop-opacity="0"/><stop offset=".93" stop-color="white" stop-opacity=".13"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>'+
 '<linearGradient id="sc-rim" x2="0" y2="1"><stop stop-color="#fff1b8"/><stop offset=".24" stop-color="#f4fbff"/><stop offset=".52" stop-color="#678baa"/><stop offset=".8" stop-color="#e3f8ff"/><stop offset="1" stop-color="#d5a859"/></linearGradient>';
function liquid(a,fill,angle=0,prepared,patterns=false){
 const layers=prepared||T.layers(a,fill==null?a.length:fill,angle);
 return layers.map((layer,index)=>{
  let out='<polygon class="liquid-band" data-color="'+layer.color+'" data-units="'+layer.units+'" points="'+layer.points.map(p=>p[0].toFixed(3)+','+p[1].toFixed(3)).join(' ')+'" fill="url(#p'+layer.color+')"/>';
  if(patterns&&layer.units>.75&&layer.points.length){const center=layer.points.reduce((p,v)=>[p[0]+v[0]/layer.points.length,p[1]+v[1]/layer.points.length],[0,0]);out+='<text x="'+center[0]+'" y="'+(center[1]+5)+'" transform="rotate('+(-angle)+' '+center[0]+' '+center[1]+')" font-family="Nunito,Arial" text-anchor="middle" font-size="16" font-weight="900" fill="#082343" stroke="#ffffff99" stroke-width=".6" paint-order="stroke">'+(layer.color+1)+'</text>';}
  if(layer.surface&&layer.color!==layers[index+1]?.color){const[p,q]=layer.surface,cx=(p[0]+q[0])/2,cy=(p[1]+q[1])/2,rx=Math.hypot(p[0]-q[0],p[1]-q[1])/2;out+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="2.6" transform="rotate('+(-angle)+' '+cx+' '+cy+')" fill="#fff" opacity=".2"/><path class="liquid-surface" d="M'+p[0]+' '+p[1]+'L'+q[0]+' '+q[1]+'" stroke="#f2fdff" stroke-width="1.2" opacity=".52" fill="none"/>';}
  return out;
 }).join('');
}
const shell='M36 12V37Q36 47 22 54Q14 58 14 70V183Q14 204 36 204H64Q86 204 86 183V70Q86 58 78 54Q64 47 64 37V12Z';
const inside='M37 12V38Q37 48 23 56Q16 60 16 70V183Q16 200 36 200H64Q84 200 84 183V70Q84 60 77 56Q63 48 63 38V12Z';
function bottle(a,fill,patterns=false){const id='sc-jar-'+(++serial),done=a.length===4&&a.every(c=>c===a[0]),c=a.length?a.at(-1):-1;
 return '<svg viewBox="0 0 100 220" aria-hidden="true"><defs><clipPath id="'+id+'"><path d="'+inside+'"/></clipPath></defs>'+
 '<ellipse class="ground-shadow" cx="50" cy="212" rx="40" ry="5" fill="#010916" opacity=".65"/>'+(c>=0?'<ellipse cx="50" cy="211" rx="31" ry="3" fill="url(#p'+c+')" opacity=".3"/>':'')+
 '<path class="glass-shell" d="'+shell+'" fill="url(#sc-glass)" stroke="url(#sc-edge)" stroke-width="2.1"/>'+
 '<g class="liquids" data-units="'+(fill==null?a.length:fill)+'" clip-path="url(#'+id+')">'+liquid(a,fill,0,null,patterns)+'</g>'+
 '<path d="'+inside+'" fill="url(#sc-front)" pointer-events="none"/>'+
 '<path d="M20 72V181Q20 196 36 198" fill="none" stroke="#062147" stroke-width="2.2" opacity=".5"/>'+
 '<path d="M24 68V179Q24 192 35 194" fill="none" stroke="#fff" stroke-width="3.4" opacity=".72"/>'+
 '<path d="M29 76v93" fill="none" stroke="#d5faff" stroke-width="1.2" opacity=".25"/>'+
 '<path d="M79 72v107q0 14-12 16" fill="none" stroke="#b7f5ff" stroke-width="2.1" opacity=".68"/>'+
 '<path d="M41 21v15q0 14-16 24" fill="none" stroke="#fff" stroke-width="2.3" opacity=".72"/>'+
 '<path d="M19 184q0 15 17 16h28q15 0 17-14" fill="none" stroke="#eafaff" stroke-width="2.5" opacity=".67"/>'+
 '<rect x="33" y="7" width="34" height="9" rx="4" fill="url(#sc-rim)" stroke="#cff4ff" stroke-width="1.1"/>'+
 '<ellipse cx="50" cy="9.5" rx="14.5" ry="3" fill="#0a2140" stroke="#e1f6ff" stroke-width="1"/>'+
 '<path d="M36 9q14-4 28 0" fill="none" stroke="#fff3cb" stroke-width="1.4"/>'+
 (done?'<g class="bottle-seal"><circle cx="50" cy="45" r="10" fill="#ffe079" stroke="#fff3b0" stroke-width="1"/><path d="m45 45 3.5 3.5 6.5-7" fill="none" stroke="#6e4c0b" stroke-width="2.8"/></g>':'')+'</svg>';
}
window.SortirCairanGelas={colors,paints,liquid,bottle};
})();
