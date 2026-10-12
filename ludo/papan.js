(function(){
'use strict';
const colors=[['#ff506b','#c82248','Merah'],['#2ed494','#078b64','Hijau'],['#32baff','#1766d4','Biru'],['#ffd448','#ce8912','Kuning']];
let drawing=0;
const star='M0-9 2.8-3.1 9.3-2.7 4.5 1.7 5.8 8.2 0 4.8-5.8 8.2-4.5 1.7-9.3-2.7-2.8-3.1Z';
const arrow='M-7-3H1V-7L8 0 1 7V3H-7Z';
function board(prefix='main'){
 const E=LudoMesin,key='ludo-'+String(prefix).replace(/[^a-zA-Z0-9_-]/g,'')+'-'+(++drawing),url=id=>'url(#'+key+'-'+id+')';
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 450" role="img" aria-label="Papan Ludo. Empat markas berwarna, jalur putih, bintang kotak aman, dan tujuan di tengah."><defs>';
 colors.forEach((c,p)=>{s+='<linearGradient id="'+key+'-base'+p+'" x1="0%" y1="0%" x2="80%" y2="100%"><stop stop-color="'+c[0]+'"/><stop offset="1" stop-color="'+c[1]+'"/></linearGradient><linearGradient id="'+key+'-well'+p+'" x1="0%" y1="0%" x2="0%" y2="100%"><stop stop-color="'+c[1]+'"/><stop offset="1" stop-color="'+c[0]+'"/></linearGradient>';});
 s+='<linearGradient id="'+key+'-ivory" x1="0%" y1="0%" x2="0%" y2="100%"><stop stop-color="#fffef8"/><stop offset="1" stop-color="#efeee2"/></linearGradient><linearGradient id="'+key+'-gold" x1="0%" y1="0%" x2="90%" y2="100%"><stop stop-color="#fff1a0"/><stop offset=".5" stop-color="#ffcd42"/><stop offset="1" stop-color="#d89418"/></linearGradient><g id="'+key+'-ornament"><ellipse cy="-5" rx="3.1" ry="5"/><ellipse cy="5" rx="3.1" ry="5"/><ellipse cx="-5" rx="5" ry="3.1"/><ellipse cx="5" rx="5" ry="3.1"/></g></defs>';
 s+='<rect x=".8" y=".8" width="448.4" height="448.4" rx="13" fill="#dae3df" stroke="#29475a" stroke-width="1.6"/>';
 for(let p=0;p<4;p++){
  const x=p===0||p===3?0:270,y=p<2?0:270;
  s+='<rect x="'+(x+2)+'" y="'+(y+2)+'" width="176" height="176" rx="11" fill="'+url('base'+p)+'" stroke="'+colors[p][1]+'" stroke-width="2"/><path d="M'+(x+16)+' '+(y+7)+'h148" stroke="#ffffff" stroke-opacity=".48" stroke-width="2" stroke-linecap="round"/>';
  // Kawung-inspired geometry stays inside the coloured home bases, away from playable cells.
  for(const [dx,dy] of [[18,18],[162,18],[18,162],[162,162]])s+='<use href="#'+key+'-ornament" transform="translate('+(x+dx)+' '+(y+dy)+')" fill="#fff3c4" opacity=".38"/>';
  s+='<rect x="'+(x+30)+'" y="'+(y+34)+'" width="120" height="120" rx="23" fill="'+colors[p][1]+'" opacity=".7"/><rect x="'+(x+30)+'" y="'+(y+29)+'" width="120" height="120" rx="23" fill="'+url('ivory')+'" stroke="#fffaf0" stroke-width="2"/>';
  for(let k=0;k<4;k++){
   const [r,c]=E.coord(p,-1,k),cx=c*30+15,cy=r*30+15;
   s+='<circle cx="'+cx+'" cy="'+cy+'" r="20" fill="'+url('well'+p)+'" stroke="'+colors[p][1]+'" stroke-width="1.5"/><circle cx="'+cx+'" cy="'+(cy+1)+'" r="15" fill="#ffffff" fill-opacity=".88"/><path d="M'+(cx-14)+' '+(cy+10)+'q14 14 28 0" fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="1.5"/>';
  }
 }
 E.TRACK.forEach(([r,c],i)=>{
  const p=E.START.indexOf(i),safe=E.SAFE.has(i),x=c*30,y=r*30,cx=x+15,cy=y+15;
  s+='<rect x="'+(x+.65)+'" y="'+(y+.65)+'" width="28.7" height="28.7" rx="3.1" fill="'+(p>=0?url('base'+p):'#fffcf1')+'" stroke="'+(p>=0?colors[p][1]:'#819590')+'" stroke-width="1.1"/><path d="M'+(x+4)+' '+(y+3.5)+'h22" stroke="#ffffff" stroke-opacity=".8" stroke-linecap="round"/>';
  if(p>=0)s+='<path d="'+arrow+'" transform="translate('+cx+' '+cy+') rotate('+(p*90)+')" fill="#fffdf0" stroke="'+colors[p][1]+'" stroke-width=".7"/>';
  else if(safe)s+='<circle cx="'+cx+'" cy="'+cy+'" r="11.5" fill="#d9e8e3"/><path d="'+star+'" transform="translate('+cx+' '+cy+') scale(.87)" fill="#32615d"/>';
 });
 E.LANES.forEach((lane,p)=>lane.slice(0,5).forEach(([r,c])=>{
  const x=c*30,y=r*30;
  s+='<rect x="'+(x+.65)+'" y="'+(y+.65)+'" width="28.7" height="28.7" rx="3.1" fill="'+url('base'+p)+'" stroke="'+colors[p][1]+'" stroke-width="1.1"/><path d="M-3-5 2 0-3 5" transform="translate('+(x+15)+' '+(y+15)+') rotate('+(p*90)+')" stroke="'+(p===3?'#875811':'#ffffff')+'" stroke-opacity=".78" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
 }));
 const triangles=['180,180 225,225 180,270','180,180 270,180 225,225','270,180 270,270 225,225','180,270 225,225 270,270'];
 triangles.forEach((points,p)=>s+='<polygon points="'+points+'" fill="'+url('base'+p)+'" stroke="#fff8dc" stroke-width="1.6"/>');
 s+='<circle cx="225" cy="227" r="18" fill="#133a4c" fill-opacity=".24"/><circle cx="225" cy="225" r="17" fill="'+url('gold')+'" stroke="#fff9d9" stroke-width="2"/><circle cx="225" cy="225" r="12.5" fill="none" stroke="#bd7919" stroke-width="1"/><path d="'+star+'" transform="translate(225 225)" fill="#946118"/><path d="M212 216a17 17 0 0 1 26 0" fill="none" stroke="#fff9cd" stroke-width="2" stroke-linecap="round"/></svg>';
 return s;
}
function pawn(p,id){
 const c=colors[p],key='ludo-pawn-'+p+'-'+id+'-'+(++drawing);
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54" aria-hidden="true"><defs><linearGradient id="'+key+'" x1="10%" y1="0%" x2="90%" y2="100%"><stop stop-color="'+c[0]+'"/><stop offset=".4" stop-color="'+c[0]+'"/><stop offset="1" stop-color="'+c[1]+'"/></linearGradient></defs><ellipse cx="22" cy="48" rx="17" ry="4" fill="#0a243b" fill-opacity=".35"/><path d="M14 23C14 32 10 34 6 42c-3 8 35 8 32 0-4-8-8-10-8-19Z" fill="url(#'+key+')" stroke="#fffdf1" stroke-width="2.3" stroke-linejoin="round"/><ellipse cx="22" cy="42" rx="13.5" ry="3.6" fill="'+c[1]+'"/><path d="M10 42q12 5 24 0" fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width="1.4"/><path d="M16 28 12 37" stroke="#ffffff" stroke-opacity=".45" stroke-width="2.8" stroke-linecap="round"/><circle cx="22" cy="18.5" r="15.7" fill="url(#'+key+')" stroke="#14324a" stroke-width="1.3"/><circle cx="22" cy="18.5" r="13.5" fill="none" stroke="#fffdf1" stroke-width="1.7"/><circle cx="22" cy="19.5" r="10.1" fill="#142f47"/><path d="M11 12q5-7 12-5" fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="2.1" stroke-linecap="round"/><text x="22" y="25" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="16" fill="#fffef1">'+(id+1)+'</text></svg>';
}
function dice(n){
 const positions={1:[[50,50]],2:[[27,27],[73,73]],3:[[27,27],[50,50],[73,73]],4:[[27,27],[73,27],[27,73],[73,73]],5:[[27,27],[73,27],[50,50],[27,73],[73,73]],6:[[27,24],[73,24],[27,50],[73,50],[27,76],[73,76]]};
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">'+(positions[n]||positions[1]).map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="8.1" fill="#132f49"/><ellipse cx="'+(x-1)+'" cy="'+(y-2)+'" rx="4.5" ry="2.2" fill="#3d586b"/>').join('')+'</svg>';
}
window.LudoPapan={colors,board,pawn,dice};
})();
