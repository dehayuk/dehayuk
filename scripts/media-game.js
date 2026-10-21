// Original canvas illustrations for square game icons, independent of gameplay.
window.drawGameIcon=function(c,slug,color){
 const W=512;c.clearRect(0,0,W,W);let g=c.createLinearGradient(0,0,512,512);g.addColorStop(0,color);g.addColorStop(1,'#172139');c.fillStyle=g;c.fillRect(0,0,512,512);
 c.fillStyle='#ffffff10';for(let i=0;i<8;i++){c.beginPath();c.arc(i*93%512,i*137%512,45+i*3,0,Math.PI*2);c.fill();}
 function round(x,y,w,h,r,fill,stroke='#18303c'){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=6;c.strokeStyle=stroke;c.stroke();}}
 function ball(x,y,r,fill){const a=c.createRadialGradient(x-r*.35,y-r*.4,0,x,y,r);a.addColorStop(0,'#ffffff');a.addColorStop(.18,fill);a.addColorStop(1,fill);c.fillStyle=a;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.strokeStyle='#17303c77';c.lineWidth=4;c.stroke();}
 function text(s,x,y,size=65,fill='#fff7dc'){c.font='900 '+size+'px "Baloo 2",system-ui';c.textAlign='center';c.textBaseline='middle';c.lineWidth=9;c.strokeStyle='#263044';c.strokeText(s,x,y);c.fillStyle=fill;c.fillText(s,x,y);}
 function tile(x,y,fill,s){round(x,y,108,108,22,fill);if(s)text(s,x+54,y+57,64);}
 function pawn(x,y,fill){c.save();c.translate(x,y);c.fillStyle='#0003';c.beginPath();c.ellipse(0,68,49,17,0,0,Math.PI*2);c.fill();c.fillStyle=fill;c.strokeStyle='#fff8';c.lineWidth=5;c.beginPath();c.moveTo(-40,48);c.quadraticCurveTo(-24,12,-21,-20);c.lineTo(21,-20);c.quadraticCurveTo(24,12,40,48);c.quadraticCurveTo(0,75,-40,48);c.fill();c.stroke();ball(0,-33,31,fill);c.restore();}
 function board(){round(87,87,338,338,26,'#fff4d2');const colors=['#ff6585','#4ad3a2','#ffd65a','#48bafa'];for(let i=0;i<4;i++){const x=107+i%2*173,y=107+Math.floor(i/2)*173;round(x,y,125,125,19,colors[i]);for(let j=0;j<4;j++)ball(x+35+j%2*54,y+35+Math.floor(j/2)*54,14,'#fff7dd');}}
 switch(slug){
 case 'balok-jatuh':
  for(const [x,y,k] of [[0,0,0],[0,1,0],[0,2,0],[0,3,0],[1,2,1],[1,3,1],[2,3,1],[2,2,2],[3,2,2],[3,3,2],[2,1,3],[3,1,3],[4,1,3],[3,0,3],[4,3,4],[4,2,4],[5,2,4]]){
   const xx=43+x*71,yy=153+y*70,cl=['#38d9ee','#5487ff','#ffe259','#bc83ff','#64e299'][k];round(xx,yy,67,67,9,cl,'#10223d');round(xx+8,yy+7,51,7,3,'#ffffff77',null);
  }text('BALOK JATUH',256,79,43);break;
 case 'iris-buah':case 'jatuh-buah':
  window.IrisBuah.draw(c,slug==='iris-buah'?2:4,246,275,113,-.18);window.IrisBuah.draw(c,0,345,353,65,.3);window.IrisBuah.draw(c,1,134,350,67,-.25);
  if(slug==='iris-buah'){c.strokeStyle='#d6ffff';c.lineWidth=12;c.lineCap='round';c.beginPath();c.moveTo(110,340);c.bezierCurveTo(210,325,310,170,407,131);c.stroke();}else{c.fillStyle='#ffd24b';c.strokeStyle='#775024';c.lineWidth=5;c.beginPath();c.moveTo(182,155);c.lineTo(166,100);c.lineTo(218,130);c.lineTo(248,77);c.lineTo(282,129);c.lineTo(331,103);c.lineTo(315,155);c.closePath();c.fill();c.stroke();}break;
 case 'warung-rasa':
  c.fillStyle='#ffd685';c.beginPath();c.ellipse(256,300,155,82,0,0,Math.PI*2);c.fill();c.fillStyle='#fff4d3';c.beginPath();c.ellipse(256,291,130,64,0,0,Math.PI*2);c.fill();
  c.fillStyle='#f7bb5e';c.beginPath();c.ellipse(256,265,96,65,0,0,Math.PI*2);c.fill();for(let i=0;i<25;i++)round(185+i*29%142,235+i*17%55,10,5,2,i%3?'#fff6b1':'#48a76d',null);ball(279,255,30,'#fffdf1');ball(279,255,15,'#ffbb22');
  c.strokeStyle='#ffedc5';c.lineWidth=10;c.lineCap='round';for(let i=0;i<3;i++){c.beginPath();c.moveTo(194+i*63,175);c.bezierCurveTo(165+i*63,145,220+i*63,135,200+i*63,108);c.stroke();}break;
 case 'ludo':board();pawn(198,267,'#ff6283');pawn(318,319,'#42bfff');break;
 case 'nusa-properti':
  round(79,100,354,314,25,'#fff0c6');for(let i=0;i<8;i++)round(94+i%4*82,115+Math.floor(i/4)*236,72,48,4,['#f86e74','#ffcd4e','#4fcbb0','#62b7f5'][i%4],null);
  c.fillStyle='#ef7154';c.beginPath();c.moveTo(133,250);c.lineTo(256,149);c.lineTo(379,250);c.closePath();c.fill();round(160,246,194,111,10,'#fffbe5');round(235,285,45,72,4,'#25a998');for(let i=0;i<2;i++)round(183+i*112,274,32,38,5,'#75d4f5');ball(355,335,43,'#ffd34f');text('N',355,339,48,'#74471d');break;
 case 'blok-ledak':case 'bola-pantul':
  for(let i=0;i<8;i++){const x=95+i%3*111,y=99+Math.floor(i/3)*111;tile(x,y,['#ff70ac','#64d9f6','#b68aff','#ffbd56'][i%4],slug==='bola-pantul'?String(2+i*3):'');}
  if(slug==='bola-pantul'){c.strokeStyle='#fff8c8';c.lineWidth=5;c.setLineDash([5,17]);c.beginPath();c.moveTo(380,420);c.lineTo(360,180);c.lineTo(180,350);c.stroke();c.setLineDash([]);ball(370,407,26,'#fff');}else{text('✦',315,338,126,'#ffe668');}break;
 case 'tumpuk-lapis':
  c.fillStyle='#e5f7ff';c.beginPath();c.ellipse(256,393,161,40,0,0,Math.PI*2);c.fill();for(let i=0;i<11;i++)round(149+i%2*5,365-i*22,214,28,4,['#ffe79a','#ff86b2','#8561b8','#64c8aa'][i%4],'#5b3e5266');ball(255,121,25,'#f75f7e');break;
 case 'oyen-nyebrang':
  round(66,309,380,110,18,'#526681',null);for(let i=0;i<4;i++)round(92+i*97,360,48,9,1,'#ffeaaa',null);
  c.fillStyle='#ffbd5e';c.strokeStyle='#71422c';c.lineWidth=7;c.beginPath();c.moveTo(139,182);c.lineTo(144,101);c.lineTo(213,147);c.quadraticCurveTo(255,130,298,148);c.lineTo(366,100);c.lineTo(373,185);c.quadraticCurveTo(404,319,258,331);c.quadraticCurveTo(116,320,139,182);c.fill();c.stroke();
  for(const x of [208,307]){ball(x,237,27,'#fff8d7');ball(x,242,10,'#2d2f39');}c.fillStyle='#ba6b54';c.beginPath();c.moveTo(244,274);c.lineTo(271,274);c.lineTo(257,289);c.fill();break;
 case 'susun-kata':tile(106,122,'#ae89ff','K');tile(232,122,'#ffe36a','A');tile(161,253,'#ffac75','T');tile(287,253,'#8ae4ef','A');break;
 case 'congklak':
  c.save();c.translate(256,256);c.rotate(-.3);round(-189,-105,378,210,80,'#dba361','#744c34');for(let row=0;row<2;row++)for(let i=0;i<5;i++){ball(-107+i*54,-47+row*94,22,'#885a39');for(let k=0;k<3;k++)ball(-113+i*54+k%2*13,-51+row*94+Math.floor(k/2)*13,5,'#fff5d2');}ball(-157,0,25,'#805237');ball(157,0,25,'#805237');c.restore();break;
 case 'jajan-manis':
  c.fillStyle='#d3a34d';c.beginPath();c.ellipse(256,346,170,67,0,0,Math.PI*2);c.fill();for(let i=0;i<5;i++)round(146,308-i*21,112,26,4,i%2?'#ff83bc':'#fff1ac','#ae587855');
  ball(321,282,67,'#57db67');for(let i=0;i<9;i++){c.fillStyle='#fcffe0';c.beginPath();c.arc(283+i*19%80,248+i*17%65,4,0,Math.PI*2);c.fill();}c.fillStyle='#aa72ed';c.beginPath();c.moveTo(190,230);c.quadraticCurveTo(201,120,249,119);c.quadraticCurveTo(278,178,279,230);c.closePath();c.fill();break;
 case 'catur':
  for(let i=0;i<12;i++)round(76+i%4*90,286+Math.floor(i/4)*40,90,40,0,i%2?'#f7dfae':'#b68964',null);pawn(186,270,'#2c2458');pawn(323,232,'#fff0c9');round(308,117,30,67,5,'#fff1ce');round(289,132,68,22,4,'#fff1ce');break;
 case 'mahjong-nusantara':
  for(let i=0;i<3;i++){c.save();c.translate(139+i*115,253);c.rotate((i-1)*.13);round(-65,-100,130,208,20,'#dfbd7c');round(-65,-115,130,208,20,'#fff7df');if(i===1){c.fillStyle='#e983a1';for(let k=0;k<5;k++){c.beginPath();c.ellipse(Math.cos(k*1.256)*25,Math.sin(k*1.256)*25,20,28,k*1.256,0,Math.PI*2);c.fill();}ball(0,0,13,'#ffda67');}else{c.fillStyle=i?'#ffc65c':'#49ba8d';c.beginPath();c.moveTo(-40,26);c.lineTo(0,-45);c.lineTo(40,26);c.fill();c.strokeStyle='#8d5944';c.lineWidth=8;c.stroke();}c.restore();}break;
 case 'sortir-cairan':
  for(let i=0;i<3;i++){c.save();c.translate(142+i*113,252);c.rotate((i-1)*.12);round(-19,-133,38,54,9,'#e9e6ff66','#e8daff');round(-42,-90,84,214,27,'#e5deff55','#e7d8ff');for(let j=0;j<3;j++)round(-34,36-j*59,68,57,j===0?12:2,['#ff65b8','#ffdc40','#28d4f4','#6befaa'][(i+j)%4],null);round(-28,-75,9,162,4,'#ffffff55',null);c.restore();}break;
 }
};
