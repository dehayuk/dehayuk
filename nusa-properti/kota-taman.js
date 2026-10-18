/* Original lightweight isometric city. Ownership and building height follow the board. */
(function(){'use strict';
const C=window.PropertiKota,E=window.NusaProperti,colors=window.PropertiArt.players;
C.city=function(state){
 const cities=E.tiles.filter(t=>t.type==='city');
 let out='<svg viewBox="0 0 440 350" aria-hidden="true"><defs><linearGradient id="city-water" x2="1" y2="1"><stop stop-color="#73dce1"/><stop offset="1" stop-color="#32a2bd"/></linearGradient></defs><path d="M18 175 220 70 422 175 220 293Z" fill="#6aa497"/><path d="M18 166 220 58 422 166 220 280Z" fill="#f5e3b3" stroke="#fff2d0" stroke-width="3"/><path d="M32 166 220 69 408 166 220 268Z" fill="#80b994"/><path d="M36 174 221 76 235 84 49 183Z" fill="url(#city-water)"/><path d="M65 185 221 101 374 183 219 265Z" fill="#8bc295"/>';
 for(let i=0;i<5;i++){const y=100+i*29;out+='<path d="M'+(220-i*38)+' '+y+'l152 82m'+(-152)+' -82l-152 82" fill="none" stroke="#e8ddb8" stroke-width="9"/>';}
 const lots=cities.map((t,i)=>({t,r:Math.floor(i/4),c:i%4})).sort((a,b)=>a.r+a.c-b.r-b.c);
 for(const {t,r,c} of lots){const x=220+(c-r)*38,y=102+(c+r)*21,level=state.levels[t.i]||0,owner=state.owners[t.i],h=16+level*10+(t.i%3)*4;
 out+='<g transform="translate('+x+' '+y+')"><path d="M-31 17 0 1 31 17 0 34Z" fill="#c2daaa" stroke="#e7efc9"/><path d="M-21 16 0 5 23 17 2 29Z" fill="#426a5d" opacity=".2"/><path d="M-19 '+(14-h)+' 0 '+(24-h)+'V24L-19 14Z" fill="#e6bf7b" stroke="#617e6b" stroke-width=".8"/><path d="M0 '+(24-h)+' 21 '+(13-h)+'V13L0 24Z" fill="#ffedb9" stroke="#617e6b" stroke-width=".8"/><path d="M-23 '+(15-h)+' 0 '+(2-h)+' 24 '+(14-h)+' 0 '+(27-h)+'Z" fill="'+t.color+'" stroke="#fef4d5" stroke-width="1.2"/>';
 for(let floor=0;floor<=level;floor++)out+='<path d="M5 '+(18-floor*8)+'v-4l4-2v4m5-3v-4l4-2v4" fill="#4c98ac" stroke="#d2efdc" stroke-width=".5"/><path d="M-13 '+(14-floor*8)+'v-4l5 3v4" fill="#50858b"/>';
 out+='<path d="M-2 23v-7l-5-3v7" fill="#6d6851"/>';
 if(owner>=0)out+='<path d="M-25 18v-28" stroke="#48695e" stroke-width="1.7"/><path d="M-25-10h13l-3 5 3 5h-13Z" fill="'+colors[owner]+'" stroke="#fff7d7" stroke-width="1"/>';
 else out+='<ellipse cx="25" cy="20" rx="5" ry="3" fill="#538f73"/><path d="M25 20v-8" stroke="#926a43" stroke-width="2"/><circle cx="25" cy="10" r="5" fill="#44a876"/><circle cx="23" cy="8" r="3" fill="#85d88e"/>';
 out+='</g>';}
 out+='<path d="M76 189l20 11-16 9-20-12Z" fill="#f4e4c3" stroke="#8eaa89"/><path d="M75 187v-8m20 20v-8m-35 5v-8" stroke="#d9c58e" stroke-width="2"/><ellipse cx="346" cy="205" rx="12" ry="5" fill="#538f7355"/><path d="M346 204v-25" stroke="#97794e" stroke-width="4"/><path d="M346 179q-22-15-27 1q17-4 27-1q10-20 22-6q-14 0-22 6q9-2 18 11q-15-6-18-11" fill="#2e986f" stroke="#267857" stroke-width="1"/></svg>';
 return out;
};})();
