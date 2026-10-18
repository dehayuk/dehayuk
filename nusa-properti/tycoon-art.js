(function(root){'use strict';
// Small original illustrations: regional architecture and trade, drawn for a game board.
const path=(d,f,s='#344e57',w=2)=>'<path d="'+d+'" fill="'+f+'" stroke="'+s+'" stroke-width="'+w+'" stroke-linejoin="round"/>',rect=(x,y,w,h,f,rx=1)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+f+'"/>',circle=(x,y,r,f)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+f+'"/>',group=(x,y,scale,body)=>'<g transform="translate('+x+' '+y+') scale('+scale+')">'+body+'</g>';
const tree=(x,y)=>group(x,y,1,rect(-2,0,4,19,'#987149')+circle(0,-2,11,'#298765')+circle(-3,-5,7,'#65b77a'));
const palm=(x,y)=>group(x,y,1,path('M0 23Q5 7 0-6','#996941','#785033',4)+path('M0-6Q-21-20-25-3Q-12-11 0-6Q-5-30 10-23Q4-19 0-6Q21-21 25-5Q13-10 0-6','#369b68','#237955'));
const windows=(xs,y)=>xs.map(x=>rect(x,y,6,10,'#40647c',2)+rect(x+1,y+1,2,5,'#9adddb')).join('');
const rumah=(roof='#9e3c43')=>path('M28 63H127V95H28Z','#f2c986')+path('M19 65Q36 49 27 33Q47 57 67 46L78 34L89 46Q110 58 129 33Q120 52 138 65Z',roof)+rect(34,91,5,11,'#714f3c')+rect(115,91,5,11,'#714f3c')+windows([39,57,99,115],75)+rect(75,76,15,25,'#995d42');
const mosque=()=>path('M25 67H135V98H25Z','#fff4d7')+path('M51 56Q50 37 66 31Q79 11 83 19Q88 31 104 37Q116 52 109 56Z','#35474e')+rect(49,56,63,13,'#e8ce98')+path('M14 96V46H27V96M133 96V46H146V96','#f8e4b4')+path('M12 46L21 27L29 46ZM131 46L140 27L148 46Z','#466469')+windows([37,56,100,120],78)+path('M72 98V80Q80 65 89 80V98','#435b68');
const warehouse=(f='#efb968')=>path('M26 61H133V97H26Z',f)+path('M18 62L81 29L141 62Z','#ba6553')+rect(68,73,25,25,'#506570')+windows([35,49,107,121],76);
const boat=(sails=true)=>path('M21 78L142 78L123 97H41Z','#bc7751')+path('M42 97H122L131 91H34Z','#764941')+path('M78 78V16','none','#72533d',3)+(sails?path('M73 22L30 72H73Z','#fff7d4')+path('M85 32V72H130Z','#f6db95'):rect(47,55,62,21,'#f9d489')+path('M40 57L54 42H112L122 57Z','#de7862'));
const bridge=()=>path('M11 89H149M38 88V35M122 88V35M38 39Q80 110 122 39M40 66H120','none','#d86450',5)+path('M54 62V89M68 77V89M94 77V89M108 62V89','none','#eabe73',2)+path('M7 91H153','none','#f3cf89',5);
const art={
 'Aceh':['Arsitektur masjid Aceh','#bfe5d7',mosque()],
 'Medan':['Arsitektur istana Melayu','#d6e7c5',path('M22 61H140V98H22Z','#f4d37b')+path('M12 61L35 46H126L149 61Z','#36755b')+path('M55 47Q55 28 80 20Q107 29 107 47Z','#4a785b')+rect(50,49,61,19,'#ecc36d')+windows([29,43,111,125],76)+path('M68 99V77Q80 62 92 77V99','#6e603f')+path('M14 44V96M145 44V96','none','#e5b451',4)],
 'Padang':['Rumah gadang','#d2eac3',rumah()],
 'Pekanbaru':['Rumah Melayu','#d3e9cb',path('M30 60H131V90H30Z','#edb352')+path('M21 62L78 31L142 62Z','#9a5545')+path('M39 49L78 16L122 49Z','#b76444')+rect(39,90,5,12,'#8b573b')+rect(116,90,5,12,'#8b573b')+windows([41,59,100,118],71)+rect(77,67,16,28,'#634f3b')],
 'Jakarta':['Monas','#c3e6ee',path('M48 99H111V91H101V81H61V91H48Z','#f0dcaf')+path('M70 81L76 32H87L93 81Z','#fff9e5')+path('M69 32H94V26H69Z','#e4cd95')+path('M76 26Q72 14 83 3Q94 18 85 26Z','#ffc73f')+rect(20,63,19,34,'#80b2c2')+rect(125,51,19,46,'#75a0b5')+windows([23,31,129,137],68)],
 'Bandung':['Gedung Sate','#d0e7dd',path('M16 73H144V100H16Z','#fff4df')+path('M10 73L31 60H129L151 73Z','#635f5b')+path('M55 57H106V85H55Z','#f9e8c9')+path('M49 57L81 42L112 57Z','#746f67')+path('M67 44H95L87 36H75Z','#56686b')+path('M81 37V13','none','#70523b',3)+[17,22,27,32].map(y=>circle(81,y,2.2,'#e1b44c')).join('')+windows([25,39,53,106,120,134],80)+path('M70 100V80Q81 66 92 80V100','#50707c')],
 'Semarang':['Arsitektur Kota Lama','#cfe3df',path('M14 64H147V99H14Z','#ffedcf')+rect(24,42,25,55,'#f6dcac')+rect(113,42,25,55,'#f6dcac')+path('M18 43L36 21L55 43ZM108 43L125 21L145 43Z','#b65744')+path('M48 66L81 45L115 66Z','#c57552')+windows([27,39,64,80,96,116,128],77)+windows([30,120],51)],
 'Yogyakarta':['Tugu Yogyakarta','#e5e7c9',path('M50 100H113V93H102V87H60V93H50Z','#dbc496')+path('M65 87L71 58H91L98 87Z','#fff9e3')+path('M69 58H94V49H69Z','#e5c275')+path('M73 49L78 22H84L89 49Z','#fffbe9')+path('M77 22L81 9L85 22Z','#e6ba54')+tree(27,79)+tree(139,79)],
 'Surabaya':['Jembatan dan perdagangan','#c4e4e9',bridge()],
 'Denpasar':['Gerbang dan meru Bali','#e2ecc6',path('M22 96V54H33V44H41V29H49V16H56V96ZM138 96V54H127V44H119V29H111V16H104V96Z','#ac7453')+path('M22 75H56M104 75H138M32 56H56M104 56H127','none','#dfb38a',3)+path('M69 95V64H93V95Z','#efd695')+path('M60 65L81 51L102 65ZM65 51L81 38L97 51ZM70 39L81 27L92 39Z','#466554')],
 'Balikpapan':['Pelabuhan dan perdagangan','#bfe8ee',warehouse('#e9bb6d')+rect(15,82,31,17,'#599a9c')+rect(113,82,34,17,'#ba665d')],
 'Banjarmasin':['Pasar terapung','#c7e9e5',group(3,18,.85,boat(false))+group(86,32,.46,boat(false))+circle(40,63,6,'#e5ad79')+path('M31 60L41 48L51 60Z','#f5d272')+circle(74,69,5,'#9ec66b')+circle(88,70,6,'#ffd477')],
 'Makassar':['Kapal pinisi','#b7e4ee',boat()],
 'Manado':['Laut dan pesisir','#b9e6f0',path('M0 88Q30 35 63 76Q85 52 113 85H160V110H0Z','#73b895','none')+palm(120,50)+group(13,20,.72,boat())],
 'Ambon':['Teluk dan rempah','#c0e6e8',path('M0 89Q28 28 72 89Q113 50 160 90V110H0Z','#70af85','none')+group(57,32,.64,boat(false))+tree(26,76)+circle(24,75,3,'#c57247')+circle(33,79,3,'#d7894d')],
 'Jayapura':['Teluk dan perbukitan','#c3e7e7',path('M0 77L30 28L62 63L83 38L132 79L160 58V110H0Z','#65a77f','none')+path('M0 101Q67 66 160 92V110H0Z','#58b6c6','none')+group(21,44,.45,warehouse('#f9d990'))+group(85,34,.46,warehouse('#f2d4ab'))+palm(136,73)]
};

art.Palembang=['Jembatan di atas sungai','#bee6ec',bridge()+group(58,51,.48,boat(false))];
art.Solo=['Paviliun keraton Jawa','#e6e8cd',path('M28 70H135V99H28Z','#e6c790')+path('M17 71L48 49H114L148 71Z','#638670')+path('M45 49L80 25L116 49Z','#447661')+path('M79 25V17','none','#e1af4f',3)+windows([39,53,111,125],80)+rect(73,75,20,25,'#826247')];
art.Malang=['Permukiman warna-warni','#cee5e4',path('M0 92L55 41L160 86V110H0Z','#94bc89','none')+[['#efb650',15,49],['#df6b68',51,32],['#77b7c6',91,45],['#ab87c3',113,65]].map(([c,x,y])=>group(x,y,.33,warehouse(c))).join('')];
art.Ternate=['Pulau gunung dan rempah','#bce9ee',path('M0 94L79 17L160 94Z','#609c78','none')+path('M66 30L79 17L91 30Z','#b3c5ae','none')+path('M0 96Q85 86 160 98V110H0Z','#58b7cd','none')+palm(25,70)];
art.Lombok=['Lumbung dan perbukitan','#d3e8c7',path('M2 83L52 24L111 81L142 54L160 78V110H0Z','#7eaf91','none')+path('M48 88V64H112V88Z','#b58a55')+path('M36 64Q35 31 80 24Q124 31 124 64Z','#9e6d47')+path('M48 88H112M57 88V105M102 88V105','none','#765435',5)+rect(73,66,15,21,'#665445')];
art['Labuan Bajo']=['Perahu dan bukit pesisir','#bfe6eb',path('M0 90L38 29L73 84L111 43L160 90V110H0Z','#82ab6d','none')+path('M0 99Q70 77 160 98V110H0Z','#54b6c7','none')+group(47,38,.59,boat())];
art['Raja Ampat']=['Gugusan pulau karst','#afe3ed',path('M0 78Q80 67 160 81V110H0Z','#49adbd','none')+path('M9 87Q14 35 35 40Q56 44 56 87ZM69 81Q78 24 96 28Q115 36 117 81ZM122 96Q130 55 146 58L160 96Z','#508663')+path('M13 87H55M71 82H116M125 96H160','none','#b2c68b',4)];

function scene(name){const a=art[name]||art.Jakarta;return '<svg class="city-scene" viewBox="0 0 160 110" aria-hidden="true"><rect width="160" height="110" rx="7" fill="'+a[1]+'"/>'+circle(132,23,14,'#fff3cb')+'<path d="M8 29H44M104 12H120" stroke="#fff9" stroke-width="6" stroke-linecap="round"/><path d="M0 91Q75 78 160 93V110H0Z" fill="#80bd8a"/>'+a[2]+'<path d="M0 105H160" stroke="#2e7c7950" stroke-width="10"/></svg>';}
const pawnNames=['Mobil','Kapal','Kereta','Pesawat'];
function pawn(id){id=((id%4)+4)%4;const colors=[['#f46d70','#b43e50','#ffc0b1'],['#4ea9ed','#296695','#b4e9ff'],['#e9b32e','#9b651f','#ffe79c'],['#af85e5','#694a9f','#e4d0ff']][id],[c,d,l]=colors;
const models=[
 path('M7 43L12 28L33 25L47 34L54 42L52 54L9 56Z',d)+path('M10 40L16 24L34 21L44 32L52 39L49 46L12 49Z',c)+path('M18 26L32 24L40 32L16 35Z','#c4edf2')+path('M32 24L34 33M15 39L44 34','none','#fff5',2)+circle(18,51,6,'#293b49')+circle(45,47,6,'#293b49')+circle(18,51,2.8,'#c7d8d6')+circle(45,47,2.8,'#c7d8d6')+rect(10,40,5,4,'#fff0b8')+rect(47,35,4,4,'#fff0b8'),
 path('M6 44L53 37L44 55L18 61Z',d)+path('M6 40L53 34L48 45L18 51Z',c)+path('M31 40V9','none',d,3)+path('M27 14L10 38L27 35Z',l)+path('M34 19L48 33L34 35Z','#fff5dc')+path('M10 41L45 37','none','#d9f6ff',2),
 path('M12 34L35 27L51 35V53L28 61L10 52Z',d)+path('M12 23L34 17L49 25V44L27 52L12 44Z',c)+path('M12 23L28 29L49 25L34 17Z',l)+path('M29 32L45 28V39L29 44Z','#d0f1f3')+rect(16,29,6,10,'#9ed7df')+path('M25 49L51 41V52L28 61Z',d)+circle(17,51,5,'#2b4149')+circle(34,55,5,'#2b4149')+circle(47,50,5,'#2b4149')+path('M15 20V11L25 8V17Z',d)+path('M13 11L25 7L28 11L17 15Z',l),
 path('M30 9Q35 9 36 18L38 30L55 39L54 46L37 43L37 51L45 58L43 63L31 58L18 63L16 59L25 51V43L7 46L6 39L25 30L25 17Q26 10 30 9Z',d)+path('M29 6Q33 5 34 15L36 28L53 36L52 41L34 37L34 49L42 55L39 59L29 53L18 59L17 55L26 49V37L8 41L8 36L27 27V15Q27 8 29 6Z',c)+path('M28 17Q31 12 33 17L34 23H27Z','#c8eaf1')+path('M30 27V48','none',l,2)
 ];
return '<svg class="pawn-model" viewBox="0 0 60 70" aria-hidden="true"><ellipse cx="30" cy="62" rx="24" ry="6" fill="#203a4940"/><g stroke-linejoin="round">'+models[id]+'</g></svg>';}
function house(level){return '<svg viewBox="0 0 64 24" aria-hidden="true">'+Array.from({length:level},(_,i)=>group(i*20,0,1,path('M3 11H17V23H3Z','#a8d269','#416743',1)+path('M0 12L10 3L20 12Z','#4d9263','#416743',1)+rect(8,16,4,7,'#47634b'))).join('')+'</svg>';}
root.PropertiKota={scene,pawn,pawnNames,house,label:name=>(art[name]||art.Jakarta)[0]};
})(window);
