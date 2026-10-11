(function(){'use strict';
const symbols=[
['Angklung','#ffbc45','<path d="M20 9v44m22-44v44M13 17h37M13 48h37"/><path fill="#ffc75a" d="M24 14h6v29h-6zm10 8h6v24h-6z"/>'],
['Wayang','#b68bff','<path fill="#c896ff" d="m34 9 11 8-10 7 7 8-8 6 12 16H19l7-20-6-12 9-5z"/><path d="m24 35-12 8 7 9m17-13 16 4-3 9M30 53v7"/><circle cx="33" cy="18" r="2" fill="#fff"/>'],
['Rumah gadang','#ff7b96','<path fill="#fa6e86" d="M7 10q6 20 25 11Q51 30 57 10L49 31H15Z"/><path fill="#ffc978" d="M16 32h32v19H16z"/><path d="M20 51v8m24-8v8M28 36h8v15"/>'],
['Pinisi','#39cdeb','<path fill="#34c9e3" d="M8 43h48l-9 12H20Z"/><path d="M32 7v36"/><path fill="#fff4be" d="m29 11-19 27h19zm6 6v21h18z"/>'],
['Rafflesia','#ff707d','<g fill="#ff7185"><ellipse cx="32" cy="19" rx="10" ry="14"/><ellipse cx="19" cy="29" rx="14" ry="10"/><ellipse cx="24" cy="44" rx="11" ry="14"/><ellipse cx="43" cy="43" rx="11" ry="14"/><ellipse cx="46" cy="26" rx="14" ry="10"/></g><circle cx="33" cy="32" r="10" fill="#8f3049"/><path stroke="#ffe1a0" d="m22 16 2 3m22 10 3 1m-8 15 1 3m-20-4-2 3m-4-17-3 1"/>'],
['Ketupat','#58d6a0','<path fill="#65dda4" d="m32 10 22 22-22 22L10 32Z"/><path d="m21 21 22 22m-11-33v44M10 32h44m11-11L21 43M25 53l-4 7m17-7 5 7"/>'],
['Keris','#90b8ff','<path fill="#c9dcff" d="M34 7q-11 7-3 14t-3 13l3 12h8l-1-11q-8-7 0-14t-4-14Z"/><path stroke="#b07646" stroke-width="7" d="M24 48h22M35 48v11l9-2"/>'],
['Cenderawasih','#ffc84b','<path fill="#ffd35e" d="M19 27q1-17 15-13l14 8-11 5q-1 16-15 15Z"/><path fill="#ff7c57" d="M23 37Q6 60 13 14q4 19 13 17Q46 43 51 57q-17-3-28-20Z"/><circle cx="34" cy="19" r="2" fill="#183b42"/>'],
['Gamelan','#ffc05e','<path fill="#f2ae39" d="M13 12h38v42H13z"/><circle cx="32" cy="32" r="15" fill="#ffe287"/><circle cx="32" cy="32" r="5" fill="#db8d32"/><path d="M10 56h44M17 54v6m30-6v6"/>'],
['Kopi','#b88d76','<path fill="#b78059" d="M13 25h31v21q-15 12-31 0Z"/><path d="M44 28h7q10 15-7 15M9 55h42m-30-36q-6-5 0-11m11 11q-6-5 0-11"/>'],
['Batik','#af8bff','<path fill="#ae88ee" d="M10 10h44v44H10z"/><g fill="#ffe1a0"><path d="M32 16q-16 0-8 12l8 4 8-4q8-12-8-12Zm0 32q16 0 8-12l-8-4-8 4q-8 12 8 12Z"/></g><circle cx="32" cy="32" r="4" fill="#fff"/>'],
['Kelapa','#57d6bc','<path stroke="#98653f" stroke-width="7" d="M26 57q12-24 7-35"/><path fill="#51cea0" d="M32 23Q8 2 6 28q11-9 26-5Q27 0 52 8q-8 3-20 15Q62 5 57 34q-12-11-25-11Z"/><circle cx="33" cy="26" r="5" fill="#bd874d"/>']
];
function svg(i){const s=symbols[i];return '<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#493837" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" fill="none">'+s[2]+'</g></svg>';}
window.NusantaraSymbols={symbols,svg};
})();
