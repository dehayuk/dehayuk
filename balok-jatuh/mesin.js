/* Aturan Balok Jatuh. Tanpa DOM, jam, audio, atau penyimpanan. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Balok = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const W = 10, H = 20, TYPES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  const SHAPES = {
    I: ['0000','1111','0000','0000'], J: ['100','111','000'],
    L: ['001','111','000'], O: ['11','11'], S: ['011','110','000'],
    T: ['010','111','000'], Z: ['110','011','000']
  };
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function matrix(type) { return SHAPES[type].map(row => [...row].map(Number)); }
  function rotate(m, dir) { return m.map((r, y) => r.map((v, x) => dir > 0 ? m[m.length - 1 - x][y] : m[x][m.length - 1 - y])); }
  function cells(piece) {
    const out = []; piece.m.forEach((r, y) => r.forEach((v, x) => { if (v) out.push([piece.x + x, piece.y + y]); })); return out;
  }
  class Game {
    constructor(seed) {
      this.seed = seed >>> 0; this.random = rng(this.seed);
      this.board = Array.from({length:H}, () => Array(W).fill(null));
      this.score = 0; this.lines = 0; this.level = 1; this.over = false;
      this.next = this.pick(); this.spawn();
    }
    // Acak klasik: setiap bentuk punya peluang yang sama, pengulangan diperbolehkan.
    pick() { return TYPES[Math.floor(this.random() * 7)]; }
    spawn() {
      const type = this.next, m = matrix(type);
      this.active = {type, m, x:Math.floor((W - m.length) / 2), y:0};
      this.next = this.pick();
      if (!this.fits(this.active)) this.over = true;
    }
    fits(p) { return cells(p).every(([x,y]) => x >= 0 && x < W && y >= -2 && y < H && (y < 0 || !this.board[y][x])); }
    move(dx) {
      if (this.over) return false;
      const p = {...this.active, x:this.active.x + dx};
      if (!this.fits(p)) return false; this.active = p; return true;
    }
    turn(dir = 1) {
      if (this.over) return false;
      const p = {...this.active, m:rotate(this.active.m,dir)};
      // Putaran klasik: tidak menerobos dinding/tumpukan dan tidak menendang ke atas.
      if (!this.fits(p)) return false; this.active = p; return true;
    }
    ghost() { const p = {...this.active}; while (this.fits({...p,y:p.y+1})) p.y++; return p; }
    down(soft = false) {
      if (this.over) return null;
      const p = {...this.active, y:this.active.y + 1};
      if (this.fits(p)) { this.active = p; if (soft) this.score++; return null; }
      return this.lock();
    }
    drop() {
      if (this.over) return null;
      const p = this.ghost(), distance = p.y - this.active.y;
      this.score += 2 * distance; this.active = p; return this.lock();
    }
    lock() {
      if (this.over) return null;
      const landed = cells(this.active);
      // Balok yang terkunci melampaui bibir papan mengakhiri permainan.
      if (landed.some(([,y]) => y < 0)) { this.over = true; return {rows:[],landed,points:0,over:true}; }
      for (const [x,y] of landed) this.board[y][x] = this.active.type;
      const rows = []; this.board.forEach((r,y) => { if (r.every(Boolean)) rows.push(y); });
      const points = [0,40,100,300,1200][rows.length] * this.level;
      if (rows.length) {
        this.board = this.board.filter((r,y) => !rows.includes(y));
        while (this.board.length < H) this.board.unshift(Array(W).fill(null));
        this.score += points; this.lines += rows.length; this.level = 1 + Math.floor(this.lines / 10);
      }
      this.spawn(); return {rows,landed,points,over:this.over};
    }
    get interval() { return Math.max(70, Math.round(800 * Math.pow(.84,this.level-1))); }
  }
  function selfTest() {
    const results = [], check = (name, test) => { if (!test) throw Error(name); results.push(name); };
    for (const t of TYPES) {
      let m = matrix(t), original = JSON.stringify(m);
      check(t+' terdiri dari empat kotak',m.flat().reduce((a,b)=>a+b,0)===4);
      for (let i=0;i<4;i++) m=rotate(m,1);
      check(t+' empat putaran kembali',JSON.stringify(m)===original);
    }
    const a=new Game(1234),b=new Game(1234);
    for(let i=0;i<100;i++) check('benih sama '+i,a.pick()===b.pick());
    const g=new Game(99); for(let i=0;i<20;i++)g.move(-1);
    check('dinding kiri',cells(g.active).every(([x])=>x>=0));
    for(let i=0;i<20;i++)g.move(1);
    check('dinding kanan',cells(g.active).every(([x])=>x<10));
    for(let count=1;count<=4;count++) {
      const e=new Game(1); e.active={type:'I',m:rotate(matrix('I'),1),x:2,y:16};
      for(let y=20-count;y<20;y++)e.board[y]=Array.from({length:10},(_,x)=>x===4?null:'O');
      e.board[10][0]='T';const out=e.lock();
      check(count+' baris serentak',out.rows.length===count && e.lines===count);
      check(count+' skor klasik',e.score===[0,40,100,300,1200][count]);
      check(count+' gravitasi tumpukan',e.board[10+count][0]==='T' && e.board.length===20);
    }
    const e=new Game(2);e.active={type:'O',m:matrix('O'),x:4,y:18}; e.lines=9;
    e.board[19]=Array.from({length:10},(_,x)=>x===4||x===5?null:'I');e.lock();
    check('level naik tiap sepuluh baris',e.level===2&&e.interval<800&&e.score===40);
    const f=new Game(3);f.active={type:'O',m:matrix('O'),x:4,y:0};f.down(true);
    check('turun lembut satu poin',f.active.y===1&&f.score===1);
    f.drop();check('jatuh cepat terkunci',f.board[19][4]==='O'&&f.board[18][5]==='O');
    const wall=new Game(4);wall.active={type:'I',m:rotate(matrix('I'),1),x:-2,y:5};
    check('rotasi terhalang dinding',wall.fits(wall.active)&&!wall.turn());
    const top=new Game(5);top.active={type:'O',m:matrix('O'),x:4,y:-1};top.board[1][4]='I';top.down();
    check('melewati bibir papan berakhir',top.over);
    const score=top.score;top.drop();top.move(1);top.turn();check('sesudah kalah tidak berubah',score===top.score);
    return results;
  }
  return {Game,TYPES,matrix,rotate,cells,selfTest,W,H};
});
