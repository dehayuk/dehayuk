(function(root){'use strict';
const E=UlarMesin,COLORS=['#ff355d','#00cd91','#258dff','#ffd337'];
// Animation and illustration share the exact snake centreline.
function route(a,b,t,snake){const p=E.coord(+a),q=E.coord(+b),dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1,w=snake?Math.sin(t*Math.PI*4)*Math.sin(t*Math.PI)*2.5:0;return [p[0]+dx*t-dy/len*w,p[1]+dy*t+dx/len*w];}
function svg(prefix='b',withLabels=true){
const id=n=>prefix+n;
let out=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Papan Ular Tangga 100 petak"><defs>
<linearGradient id="${id('ivory')}" x2="0" y2="1"><stop stop-color="#fffbe7"/><stop offset=".38" stop-color="#f9edbd"/><stop offset="1" stop-color="#e9cf83"/></linearGradient>
<linearGradient id="${id('aqua')}" x2="0" y2="1"><stop stop-color="#b7f4e9"/><stop offset=".4" stop-color="#79ddcf"/><stop offset="1" stop-color="#42b8b2"/></linearGradient>
<linearGradient id="${id('dangerIvory')}" x2="0" y2="1"><stop stop-color="#fff4d4"/><stop offset=".42" stop-color="#f6dda2"/><stop offset="1" stop-color="#dfb96f"/></linearGradient>
<linearGradient id="${id('dangerAqua')}" x2="0" y2="1"><stop stop-color="#a9eee7"/><stop offset=".42" stop-color="#65d1ca"/><stop offset="1" stop-color="#329fa9"/></linearGradient>
<linearGradient id="${id('gold')}" x2="1" y2=".25"><stop stop-color="#713006"/><stop offset=".16" stop-color="#d77d08"/><stop offset=".37" stop-color="#ffbd23"/><stop offset=".52" stop-color="#fff4a0"/><stop offset=".68" stop-color="#ffbf24"/><stop offset=".86" stop-color="#c25d05"/><stop offset="1" stop-color="#6f2b05"/></linearGradient>
<linearGradient id="${id('goldShine')}" x2="0" y2="1"><stop stop-color="#fffbe1"/><stop offset=".32" stop-color="#fff0a0"/><stop offset="1" stop-color="#ff9f0c"/></linearGradient>
<filter id="${id('shadow')}" x="-40%" y="-40%" width="190%" height="200%"><feDropShadow dx=".12" dy=".28" stdDeviation=".16" flood-color="#092f3b" flood-opacity=".7"/></filter>
<filter id="${id('routeGlow')}" x="-45%" y="-45%" width="190%" height="190%"><feDropShadow dx="0" dy="0" stdDeviation=".34" flood-color="#fff6b0" flood-opacity=".95"/><feDropShadow dx="0" dy=".28" stdDeviation=".2" flood-color="#082f3e" flood-opacity=".7"/></filter>
${[['green','#efff84','#52ed70','#10ae59','#075e36'],['pink','#ffe2f3','#ff64ad','#d91e70','#741041'],['blue','#e6ffff','#55dfff','#1688e5','#183c91'],['orange','#fff6a0','#ffc542','#f07419','#9d2611']].map(([n,a,b,c,d])=>`<radialGradient id="${id(n)}" cx=".25" cy=".16" r=".95"><stop stop-color="${a}"/><stop offset=".3" stop-color="${b}"/><stop offset=".7" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></radialGradient>`).join('')}
</defs><rect width="100" height="100" fill="#164f5b"/>`;
for(let n=1;n<=100;n++){
 const [x,y]=E.coord(n),row=Math.floor((n-1)/10);
 const material=n>=81?((n+row)%2?'dangerIvory':'dangerAqua'):((n+row)%2?'ivory':'aqua');
 out+=`<g class="board-cell"><rect x="${x-4.78}" y="${y-4.78}" width="9.56" height="9.56" rx=".52" fill="url(#${id(material)})" stroke="#174856" stroke-width=".28"/>
 <rect x="${x-4.48}" y="${y-4.48}" width="8.96" height="8.96" rx=".34" fill="none" stroke="#ffffff" stroke-opacity=".43" stroke-width=".16"/>
 <path d="M${x-4.08},${y-3.94}h8.16" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width=".2"/>
 <path d="M${x-4.08},${y+4.03}h8.16" fill="none" stroke="#123b48" stroke-opacity=".42" stroke-width=".25"/>
 </g>`;
}
for(const [a,b]of Object.entries(E.UP)){
 const p=E.coord(+a),q=E.coord(b),dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy),ux=-dy/len*.92,uy=dx/len*.92;
 const rail=`M${p[0]+ux},${p[1]+uy}L${q[0]+ux},${q[1]+uy}M${p[0]-ux},${p[1]-uy}L${q[0]-ux},${q[1]-uy}`;
 out+=`<g data-link="${a}" data-to="${b}" class="ladder-route" filter="url(#${id('shadow')})" stroke-linecap="round" stroke-linejoin="round"><title>Tangga ${a} ke ${b}</title><path d="${rail}" stroke="#4c2a0a" stroke-width=".92"/><path d="${rail}" stroke="url(#${id('gold')})" stroke-width=".58"/><path d="${rail}" transform="translate(-.08,-.08)" stroke="#fff8c9" stroke-opacity=".92" stroke-width=".14"/>`;
 const count=Math.ceil(len/4);for(let i=0;i<=count;i++){const t=i/count,x=p[0]+dx*t,y=p[1]+dy*t;out+=`<path d="M${x-ux},${y-uy+.05}L${x+ux},${y+uy+.05}" stroke="#4b290b" stroke-width=".66"/><path d="M${x-ux},${y-uy}L${x+ux},${y+uy}" stroke="url(#${id('gold')})" stroke-width=".4"/><path d="M${x-ux+.08},${y-uy-.08}L${x+ux+.08},${y+uy-.08}" stroke="#fff6c1" stroke-opacity=".76" stroke-width=".1"/>`;}
 out+=`</g>`;
}
Object.entries(E.DOWN).forEach(([a,b],i)=>{
 const color=['green','pink','blue','orange'][i%4],p=E.coord(+a),points=Array.from({length:65},(_,j)=>route(a,b,j/64,true)),d='M'+points.map(v=>v.join(',')).join('L');
 out+=`<g data-link="${a}" data-to="${b}" class="snake-route" filter="url(#${id('shadow')})"><title>Ular ${a} ke ${b}</title><path d="${taper(points,.94)}" transform="translate(.12,.2)" fill="#0a2832" opacity=".72"/><path d="${taper(points,.85)}" fill="#fff7cf" stroke="#543514" stroke-width=".16" stroke-linejoin="round"/><path d="${taper(points,.69)}" fill="url(#${id(color)})" stroke="#063e4c" stroke-width=".22" stroke-linejoin="round"/><path d="${d}" transform="translate(-.16,-.18)" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".18" stroke-linecap="round"/>`;
 for(let j=10;j<61;j+=13){const [x,y]=points[j];out+=`<ellipse cx="${x+.1}" cy="${y+.14}" rx=".28" ry=".19" fill="#fff1a2" stroke="#54300c" stroke-width=".06" opacity=".94"/>`;}
 out+=`<ellipse cx="${p[0]+.14}" cy="${p[1]+.56}" rx="1.76" ry="1.24" fill="#123640" opacity=".42"/><ellipse cx="${p[0]}" cy="${p[1]+.24}" rx="1.82" ry="1.52" fill="#fff7d2" stroke="#503017" stroke-width=".18"/><ellipse cx="${p[0]}" cy="${p[1]+.22}" rx="1.54" ry="1.22" fill="url(#${id(color)})" stroke="#073f4a" stroke-width=".24"/><ellipse cx="${p[0]-.38}" cy="${p[1]-.12}" rx=".7" ry=".4" fill="#fff" opacity=".3" transform="rotate(-24 ${p[0]-.38} ${p[1]-.12})"/><ellipse cx="${p[0]}" cy="${p[1]+.66}" rx="1.02" ry=".42" fill="#fff0a0" stroke="#814e25" stroke-width=".08"/>
 ${[-.57,.57].map(dx=>`<ellipse cx="${p[0]+dx}" cy="${p[1]-.42}" rx=".54" ry=".68" fill="#fffdf4" stroke="#063e4b" stroke-width=".12"/><ellipse cx="${p[0]+dx+.09}" cy="${p[1]-.28}" rx=".29" ry=".4" fill="#102435"/><circle cx="${p[0]+dx-.02}" cy="${p[1]-.45}" r=".13" fill="white"/>`).join('')}
 <ellipse cx="${p[0]-.28}" cy="${p[1]+.39}" rx=".08" ry=".055" fill="#54301f"/><ellipse cx="${p[0]+.28}" cy="${p[1]+.39}" rx=".08" ry=".055" fill="#54301f"/><path d="M${p[0]-.57},${p[1]+.57}q.57 .52 1.14 0q-.57 .82-1.14 0Z" fill="#711936" stroke="#3d1d28" stroke-width=".1"/></g>`;
});
out+=`<g transform="translate(6.5,6.6)"><circle r="2.6" fill="url(#${id('gold')})" stroke="#fff" stroke-width=".25"/><path d="M-1.6 1l-.3-2 1.1.7L0-1.6l.8 1.3 1.1-.7-.3 2z" fill="#925217"/><path d="M-1.4 1.5h2.8" stroke="#925217" stroke-width=".3"/></g></svg>`;
return withLabels?out.replace('</svg>',labels(prefix+'Labels')+'</svg>'):out;
}
function pawn(p){return '<img src="/ludo/pion-'+p+'-scene.webp" alt="" draggable="false"><i class="pawn-id" aria-hidden="true">'+(p+1)+'</i>';}
function taper(points,scale=1){const sides=[[],[]];points.forEach((p,i)=>{const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],dx=next[0]-prev[0],dy=next[1]-prev[1],l=Math.hypot(dx,dy)||1,r=(1.08*Math.pow(1-i/(points.length-1),.48)+.05)*scale;sides[0].push([p[0]-dy/l*r,p[1]+dx/l*r]);sides[1].push([p[0]+dy/l*r,p[1]-dx/l*r]);});return 'M'+sides[0].concat(sides[1].reverse()).map(v=>v.join(',')).join('L')+'Z';}
function labels(prefix='n'){let out='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" class="number-layer">';for(let n=1;n<=100;n++){const [x,y]=E.coord(n),ladder=!!E.UP[n],snake=!!E.DOWN[n],fill=ladder?'#7d3e00':snake?'#9c164a':'#123b4b';out+='<g data-number="'+n+'"><text x="'+(x-4.18)+'" y="'+(y-1.72)+'" font-family="Nunito,Arial,sans-serif" font-size="2.85" font-weight="1000" fill="'+fill+'" stroke="#fffbe8" stroke-width=".48" stroke-linejoin="round" paint-order="stroke">'+n+'</text></g>';}return out+'</svg>';}
root.UlarPapan={svg,pawn,COLORS,route,labels};
})(window);

