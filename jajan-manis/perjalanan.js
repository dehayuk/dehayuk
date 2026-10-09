/* Jajan Manis — original, code-drawn Nusantara journey. */
(function () {
  'use strict';
  var LIMIT = 999999;
  var CHAPTERS = [
    { name: 'Sabang', subtitle: 'Angin laut & timphan manis', island: 'Sumatra', theme: 'pesisir', x: 100, y: 121, color: '#ffb746' },
    { name: 'Medan', subtitle: 'Kota hangat & bika ambon', island: 'Sumatra', theme: 'kota', x: 162, y: 195, color: '#ff9675' },
    { name: 'Padang', subtitle: 'Bukit hijau & lapek manis', island: 'Sumatra', theme: 'bukit', x: 182, y: 279, color: '#9bce61' },
    { name: 'Jakarta', subtitle: 'Pasar ceria & kue ape', island: 'Jawa', theme: 'kota', x: 306, y: 350, color: '#ffadca' },
    { name: 'Yogyakarta', subtitle: 'Sawah emas & geplak warna', island: 'Jawa', theme: 'sawah', x: 374, y: 373, color: '#e4c768' },
    { name: 'Surabaya', subtitle: 'Kampung cerah & kue lapis', island: 'Jawa', theme: 'kota', x: 440, y: 370, color: '#ff927e' },
    { name: 'Bali & Lombok', subtitle: 'Pantai kelapa & jaje manis', island: 'Nusa Tenggara', theme: 'tropis', x: 509, y: 383, color: '#ffb5d1' },
    { name: 'Banjarmasin', subtitle: 'Pasar apung & bingka', island: 'Kalimantan', theme: 'sungai', x: 466, y: 255, color: '#79cba6' },
    { name: 'Makassar', subtitle: 'Layar pinisi & barongko', island: 'Sulawesi', theme: 'pesisir', x: 594, y: 289, color: '#b6b4ed' },
    { name: 'Ambon', subtitle: 'Pulau rempah & sagu manis', island: 'Maluku', theme: 'rempah', x: 726, y: 271, color: '#ffbd70' },
    { name: 'Jayapura', subtitle: 'Teluk biru & kue lontar', island: 'Papua', theme: 'papua', x: 879, y: 253, color: '#91d07b' },
    { name: 'Merauke', subtitle: 'Langit timur & sagu kelapa', island: 'Papua', theme: 'papua', x: 865, y: 337, color: '#f3ba77' }
  ];
  var panel, state, lastFocus;
  var star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.1 6.1 6.8 1-4.9 4.8 1.2 6.8-6.2-3.2-6.2 3.2L7 13.9 2.1 9.1l6.8-1z"/></svg>';
  var lock = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M12 14v3" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  var arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function levelNumber(n) { return Math.max(1, Math.min(LIMIT, Math.floor(Number(n) || 1))); }
  function region(n) {
    n = levelNumber(n);
    var chapter = Math.floor((n - 1) / 10), index = chapter % 12, item = CHAPTERS[index];
    return { name: item.name, subtitle: item.subtitle, index: index, theme: item.theme, start: chapter * 10 + 1, end: Math.min(LIMIT, chapter * 10 + 10), tour: Math.floor(chapter / 12) + 1 };
  }
  function starsOf(n) {
    try { return Math.max(0, Math.min(3, Math.floor(Number(state.starsOf(n)) || 0))); }
    catch (_) { return 0; }
  }
  function starRow(n) {
    var out = '';
    for (var i = 0; i < 3; i++) out += '<span class="' + (i < n ? 'is-earned' : '') + '">' + star + '</span>';
    return out;
  }
  function atlas() {
    return '<svg class="jm-atlas" viewBox="0 0 960 460" role="img" aria-label="Peta ilustrasi perjalanan dari Sabang di Sumatra, melalui Jawa, Bali, Kalimantan, Sulawesi, Maluku, hingga Merauke di Papua">' +
      '<defs><linearGradient id="jmSea" x2="0" y2="1"><stop stop-color="#c2eee8"/><stop offset="1" stop-color="#78d3d1"/></linearGradient><linearGradient id="jmLand" x2="0.15" y2="1"><stop stop-color="#d4ef9b"/><stop offset="1" stop-color="#83c977"/></linearGradient><linearGradient id="jmJava" x2="0" y2="1"><stop stop-color="#f5e891"/><stop offset="1" stop-color="#bad477"/></linearGradient><filter id="jmIslandShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="7" stdDeviation="0" flood-color="#328f8b" flood-opacity=".24"/></filter><g id="jmTree"><path d="m0 0 0-18" stroke="#56916c" stroke-width="4" stroke-linecap="round"/><path d="m0-31-11 18h22z" fill="#78ad61"/><path d="m0-24-14 21h28z" fill="#58985b"/></g><g id="jmWave" fill="none" stroke="#edffec" stroke-width="3" stroke-linecap="round" opacity=".6"><path d="M0 0q7 6 14 0t14 0t14 0"/></g><g id="jmCloud" fill="#fff9e8"><ellipse cy="8" rx="35" ry="10"/><circle cx="-12" cy="0" r="14"/><circle cx="8" cy="-6" r="20"/><circle cx="28" cy="6" r="11"/></g></defs>' +
      '<rect width="960" height="460" fill="url(#jmSea)"/><path d="M0 88Q236 34 464 103T960 93M0 412Q200 444 420 425T960 411" fill="none" stroke="#e2f8de" stroke-width="23" opacity=".28"/>' +
      '<g class="jm-clouds" opacity=".8"><use href="#jmCloud" x="334" y="58"/><use href="#jmCloud" x="822" y="82"/><use href="#jmCloud" x="56" y="374" transform="translate(20 25) scale(.82)"/></g>' +
      '<g filter="url(#jmIslandShadow)" stroke="#588f6a" stroke-width="3" stroke-linejoin="round" fill="url(#jmLand)">' +
      '<path d="m73 98 29 5 23 29 32 20 4 20 27 21 7 23 32 26 7 25 31 28 7 22 24 18-7 18-23-3-13-24-22-10-15-24-19-9-16-25-20-14-9-26-19-20-10-26-21-18-9-29z"/>' +
      '<path d="m281 337 25-4 24 13 36 5 18 8 42-2 15 9 23-1 18 12-17 15-35-6-33 1-24-8-31-4-23-10-31-3-17-12z" fill="url(#jmJava)"/>' +
      '<path d="m386 169 21-14 12-22 19 13 29-8 27 9 18 22 4 30 14 26-14 28-25 8-14 24-35-6-22-20-22-9-3-23-19-22z"/>' +
      '<path d="m591 185 15 13-3 30 17 1 21-17 26-3 4 13-23 11-12 15-20 2 9 18-3 25-15-6-3-21-11-12-6 20 6 26-14 14-14-12 2-32 9-25 3-26z"/>' +
      '<path d="m604 194 16-17 27-2 16-14 14 5-10 20-31 3-21 16z"/>' +
      '<path d="m485 375 16-2 14 9-9 10-20-3zM523 383l19-4 12 9-14 7-17-2zM559 387l19-4 21 9-12 8-23-3zM605 392l18 1 21-9 9 9-23 13-20-4zM592 416l22-1 13 13-20 3-16-7z" fill="url(#jmJava)"/>' +
      '<path d="m714 230 10-16 10 3-1 25-9 7-4-10zM713 273l19-9 20 3-6 12-26 3zM759 269l10-7 10 8-12 6zM747 195l9-10 8 9-8 19-7-3zM722 311l10-6 7 11-7 11-10-5z"/>' +
      '<path d="m784 212 25 2 17 17 23-3 19 13 25-4 18 16 28 3 13 16-3 78-18-8-14-21-24-2-15-22-25-9-10-28-24-4-17-15-17 4-19-13-6-16z"/>' +
      '<path d="m784 198 17-5 10 8-11 10-17-2zM829 203l11 1 5 10-13 2zM148 266l10 9-2 14-12-8zM181 310l10 5 2 16-13-9z"/></g>' +
      '<g opacity=".68"><use href="#jmTree" x="155" y="205"/><use href="#jmTree" x="218" y="293"/><use href="#jmTree" x="413" y="217"/><use href="#jmTree" x="436" y="186"/><use href="#jmTree" x="490" y="224"/><use href="#jmTree" x="838" y="253"/><use href="#jmTree" x="907" y="303"/><use href="#jmTree" x="882" y="288"/></g>' +
      '<g fill="#8eac65" stroke="#6b9864" stroke-width="2"><path d="m185 243 13-26 13 26z"/><path d="m336 357 10-17 11 20z"/><path d="m401 368 10-21 14 21z"/><path d="m847 277 16-25 18 30z"/></g>' +
      '<g><use href="#jmWave" x="55" y="270"/><use href="#jmWave" x="278" y="214"/><use href="#jmWave" x="362" y="301"/><use href="#jmWave" x="555" y="342"/><use href="#jmWave" x="682" y="360"/><use href="#jmWave" x="812" y="393"/><use href="#jmWave" x="811" y="167"/></g>' +
      '<g class="jm-map-labels" fill="#387973" font-size="13" font-weight="900" letter-spacing="2"><text x="45" y="211" transform="rotate(46 45 211)">SUMATRA</text><text x="363" y="129">KALIMANTAN</text><text x="579" y="146">SULAWESI</text><text x="704" y="180">MALUKU</text><text x="844" y="194">PAPUA</text><text x="336" y="422">JAWA</text></g>' +
      '<path class="jm-map-route jm-map-route-shadow" d="M100 121Q123 134 162 195Q207 225 182 279Q209 338 306 350Q334 371 374 373T440 370Q471 355 509 383Q553 353 466 255Q521 274 594 289Q648 337 726 271Q786 285 879 253Q918 291 865 337"/>' +
      '<path class="jm-map-route" d="M100 121Q123 134 162 195Q207 225 182 279Q209 338 306 350Q334 371 374 373T440 370Q471 355 509 383Q553 353 466 255Q521 274 594 289Q648 337 726 271Q786 285 879 253Q918 291 865 337"/>' +
      '<g class="jm-boat" transform="translate(280 265)"><path d="m-22 0 43 0-9 13h-24z" fill="#b17753" stroke="#684638" stroke-width="3"/><path d="M0-48V0M-17-7H18" stroke="#684638" stroke-width="3" stroke-linecap="round"/><path d="M-4-44-4-10-23-10z" fill="#fff7cf"/><path d="M2-41 2-10h20z" fill="#ffb79e"/><path d="M-22 20q11 6 22 0t22 0" fill="none" stroke="#effff1" stroke-width="3"/></g>' +
      '<g transform="translate(666 401) rotate(7)"><ellipse cx="0" cy="19" rx="39" ry="8" fill="#448e82" opacity=".16"/><path d="M-33 6Q0 36 33 6" fill="#8eb966" stroke="#55875c" stroke-width="3"/><circle cx="-15" cy="0" r="16" fill="#abd06c" stroke="#55875c" stroke-width="2.5"/><circle cx="16" cy="0" r="16" fill="#cbe78f" stroke="#55875c" stroke-width="2.5"/><circle cx="0" cy="-13" r="17" fill="#cbe78f" stroke="#55875c" stroke-width="2.5"/><path d="m-8-16 3 2m10-5 3 2m-25 11 3 2M15-7l3 2" stroke="#fffadd" stroke-width="3" stroke-linecap="round"/><circle cx="-5" cy="-11" r="2" fill="#4b5e3d"/><circle cx="6" cy="-11" r="2" fill="#4b5e3d"/><path d="M-2-5q3 3 6-1" fill="none" stroke="#4b5e3d" stroke-width="2" stroke-linecap="round"/></g>' +
      '<g id="jmMapStops"></g></svg>';
  }
  function build() {
    if (panel) return;
    panel = document.createElement('section');
    panel.id = 'sJourney';
    panel.className = 'jm-journey dk-overlay';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'jmTitle');
    panel.tabIndex = -1;
    panel.innerHTML = '<div class="jm-shell"><header class="jm-top"><button class="jm-back" id="jmBack">' + arrow + '<span>Kembali</span></button><div class="jm-title"><span class="jm-eyebrow">JAJAN MANIS</span><h1 id="jmTitle">Jelajah Nusantara</h1></div><div class="jm-total" aria-label="Total bintang">' + star + '<b id="jmTotal">0</b></div></header>' +
      '<div class="jm-layout"><div class="jm-map-card"><div class="jm-map-heading"><span>Sabang <i>→</i> Merauke</span><b id="jmTour">TUR 1</b></div>' + atlas() + '<div class="jm-map-bottom"><span id="jmLocation"></span><span class="jm-compass" aria-hidden="true">✦</span></div></div>' +
      '<div class="jm-itinerary"><div class="jm-chapter-nav"><button id="jmPrev" class="jm-arrow" aria-label="Bab sebelumnya">' + arrow + '</button><div class="jm-chapter-heading" aria-live="polite" aria-atomic="true"><span class="jm-eyebrow" id="jmChapter"></span><h2 id="jmCity"></h2><p id="jmSubtitle"></p></div><button id="jmNext" class="jm-arrow jm-forward" aria-label="Bab berikutnya">' + arrow + '</button></div>' +
      '<div class="jm-progress"><div class="jm-progress-track"><i id="jmProgress"></i></div><span id="jmProgressText"></span></div>' +
      '<div class="jm-trail"><svg class="jm-level-route" viewBox="0 0 500 180" preserveAspectRatio="none" aria-hidden="true"><path d="M50 44H450Q496 44 496 88T450 132H50"/></svg><div class="jm-levels" id="jmLevels" role="group" aria-label="Level dalam bab ini"></div></div>' +
      '<div class="jm-preview"><div class="jm-preview-copy" aria-live="polite" aria-atomic="true"><span id="jmPreviewHint"></span><strong id="jmPreviewLevel"></strong></div><button id="jmPlay" class="jm-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 4 13 8-13 8z"/></svg><span>MAIN</span></button></div>' +
      '<button id="jmCurrent" class="jm-current"></button></div></div></div>';
    document.body.appendChild(panel);
    find('jmBack').addEventListener('click', close);
    find('jmPrev').addEventListener('click', function () { changeChapter(-1); });
    find('jmNext').addEventListener('click', function () { changeChapter(1); });
    find('jmCurrent').addEventListener('click', function () {
      state.chapter = Math.floor((state.level - 1) / 10);
      renderChapter();
      var current = panel.querySelector('.is-current');
      if (current) current.focus();
    });
    find('jmLevels').addEventListener('click', function (event) {
      var node = event.target.closest('.jm-level');
      if (!node || node.disabled) return;
      state.selected = Number(node.dataset.level);
      renderSelection();
    });
    find('jmPlay').addEventListener('click', function () {
      if (!state || panel.hidden || state.selected > state.level) return;
      var play = state.onPlay, selected = state.selected;
      close();
      if (typeof play === 'function') play(selected);
    });
    document.addEventListener('keydown', function (event) {
      if (panel.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      } else if (event.key === 'Tab') {
        var items = panel.querySelectorAll('button:not(:disabled):not([hidden])');
        var first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    }, true);
    document.addEventListener('focusin', function (event) {
      if (!panel.hidden && !panel.contains(event.target)) find('jmBack').focus();
    });
  }
  function find(id) { return panel.querySelector('#' + id); }
  function changeChapter(delta) {
    var chapter = Math.max(0, Math.min(state.maxChapter, state.chapter + delta));
    if (chapter === state.chapter) return;
    state.chapter = chapter;
    renderChapter();
  }
  function renderMap(info) {
    var tourStart = Math.floor(state.chapter / 12) * 120;
    find('jmMapStops').innerHTML = CHAPTERS.map(function (item, index) {
      var active = index === info.index, visited = tourStart + index * 10 + 10 < state.level;
      return '<g class="jm-map-stop' + (active ? ' is-active' : '') + (visited ? ' is-visited' : '') + '" transform="translate(' + item.x + ' ' + item.y + ')">' +
        (active ? '<circle class="jm-map-halo" r="25"/><path class="jm-map-pin" d="M-16-31a16 16 0 1 1 32 0c0 12-16 23-16 23s-16-11-16-23z"/><circle cx="0" cy="-31" r="5" fill="#fff9db"/>' : '') +
        '<circle class="jm-map-dot" r="' + (active ? 12 : 10) + '"/><text text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="900">' + (visited ? '✓' : index + 1) + '</text></g>';
    }).join('');
    find('jmTour').textContent = 'TUR ' + info.tour;
    find('jmLocation').innerHTML = '<i aria-hidden="true"></i>' + CHAPTERS[info.index].island + ' · Bab ' + (info.index + 1) + ' dari 12';
  }
  function renderChapter() {
    var info = region(state.chapter * 10 + 1), item = CHAPTERS[info.index];
    state.selected = Math.max(info.start, Math.min(info.end, state.level));
    panel.style.setProperty('--jm-accent', item.color);
    find('jmChapter').textContent = 'BAB ' + String(info.index + 1).padStart(2, '0') + ' / 12';
    find('jmCity').textContent = info.name;
    find('jmSubtitle').textContent = info.subtitle;
    find('jmPrev').disabled = state.chapter === 0;
    find('jmNext').disabled = state.chapter >= state.maxChapter;
    var completed = Math.max(0, Math.min(info.end - info.start + 1, state.level - info.start));
    find('jmProgress').style.width = (completed / (info.end - info.start + 1) * 100) + '%';
    find('jmProgressText').textContent = completed + ' / ' + (info.end - info.start + 1) + ' level';
    var nodes = '';
    for (var n = info.start; n <= info.end; n++) {
      var current = n === state.level, locked = n > state.level, count = starsOf(n), index = n - info.start;
      var label = 'Level ' + n + (locked ? ', terkunci' : current ? ', perjalananmu sekarang' : ', ' + count + ' dari 3 bintang');
      var numberSize = n >= 100000 ? '12px' : n >= 10000 ? '14px' : n >= 1000 ? '16px' : '';
      nodes += '<button class="jm-level' + (current ? ' is-current' : n < state.level ? ' is-complete' : ' is-locked') + '" data-level="' + n + '" style="--jm-column:' + (index < 5 ? index + 1 : 10 - index) + ';--jm-row:' + (index < 5 ? 1 : 2) + (numberSize ? ';--jm-number-size:' + numberSize : '') + '" aria-label="' + label + '"' + (current ? ' aria-current="step"' : '') + (locked ? ' disabled' : '') + '><span class="jm-level-circle">' + (current ? '<span class="jm-here">KAMU</span>' : '') + '<b>' + n + '</b>' + (locked ? '<i class="jm-lock">' + lock + '</i>' : '') + '</span><span class="jm-level-stars" aria-hidden="true">' + starRow(count) + '</span></button>';
    }
    find('jmLevels').innerHTML = nodes;
    renderMap(info);
    renderSelection();
  }
  function renderSelection() {
    var n = state.selected, locked = n > state.level;
    panel.querySelectorAll('.jm-level').forEach(function (node) {
      var selected = Number(node.dataset.level) === n;
      node.classList.toggle('is-selected', selected);
      node.setAttribute('aria-pressed', String(selected));
    });
    find('jmPreviewHint').textContent = locked ? 'Selesaikan level ' + (n - 1) : n < state.level ? 'Kumpulkan tiga bintang' : 'Petualangan berikutnya';
    find('jmPreviewLevel').textContent = 'Level ' + n;
    find('jmPlay').disabled = locked;
    find('jmPlay').setAttribute('aria-label', locked ? 'Level ' + n + ' terkunci' : 'Main level ' + n);
    find('jmPlay').querySelector('span').textContent = locked ? 'TERKUNCI' : 'MAIN';
    find('jmCurrent').textContent = n === state.level ? 'Dari barat ke timur, satu jajan lagi!' : 'Kembali ke level ' + state.level + ' →';
    find('jmCurrent').disabled = n === state.level;
  }
  function open(options) {
    options = options || {};
    build();
    if (panel.hidden) lastFocus = document.activeElement;
    var level = levelNumber(options.level);
    state = {
      level: level,
      chapter: Math.floor((level - 1) / 10),
      maxChapter: Math.min(Math.floor((LIMIT - 1) / 10), Math.floor((level - 1) / 120) * 12 + 11),
      selected: level,
      starsOf: typeof options.starsOf === 'function' ? options.starsOf : function () { return 0; },
      onPlay: options.onPlay
    };
    var total = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(options.totalStars) || 0)));
    find('jmTotal').textContent = total.toLocaleString('id-ID');
    find('jmTotal').parentElement.setAttribute('aria-label', total + ' total bintang');
    renderChapter();
    panel.hidden = false;
    var current = panel.querySelector('.is-current');
    (current || find('jmBack')).focus({ preventScroll: true });
  }
  function close() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    if (lastFocus && lastFocus.isConnected && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
  }
  window.JajanJourney = Object.freeze({ region: region, open: open, close: close });
})();
