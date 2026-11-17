(() => {
// 15x15 cross board. Token pos: -1 base, 0..50 track (relative to own start), 51..55 home lane, 56 finished.
const T = [];
for (let c = 1; c <= 5; c++) T.push([6, c]);
for (let r = 5; r >= 0; r--) T.push([r, 6]);
T.push([0, 7], [0, 8]);
for (let r = 1; r <= 5; r++) T.push([r, 8]);
for (let c = 9; c <= 14; c++) T.push([6, c]);
T.push([7, 14], [8, 14]);
for (let c = 13; c >= 9; c--) T.push([8, c]);
for (let r = 9; r <= 14; r++) T.push([r, 8]);
T.push([14, 7], [14, 6]);
for (let r = 13; r >= 9; r--) T.push([r, 6]);
for (let c = 5; c >= 0; c--) T.push([8, c]);
T.push([7, 0], [6, 0]);
const START = [0, 13, 26, 39], SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const COL = ["#ef4444", "#22c55e", "#eab308", "#3b82f6"];
const QUAD = [[0, 0], [0, 9], [9, 9], [9, 0]];
const lane = (k, j) => [[7, j], [j, 7], [7, 14 - j], [14 - j, 7]][k];
const seats = n => n === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, n);
function cellOf(k, pos, t) {
  if (pos === -1) { const [r0, c0] = QUAD[k], o = [[1, 1], [1, 4], [4, 1], [4, 4]][t]; return [r0 + o[0], c0 + o[1]]; }
  if (pos <= 50) return T[(START[k] + pos) % 52];
  if (pos <= 55) return lane(k, pos - 50);
  return [7, 7];
}
const legal = (pos, d) => pos === -1 ? d === 6 : pos < 56 && pos + d <= 56;
const DIE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
function next(g) { g.turn = (g.turn + 1) % g.p.length; g.rolled = false; }
register({
  id: "ludo", name: "Race Home", emoji: "🏁", min: 2, max: 4, desc: "Roll a 6 to start, race your 4 tokens home", colored: true,
  colorOf: (g, i) => COL[g.seat[i]],
  setup: p => ({ p, seat: seats(p.length), turn: 0, die: 0, rolled: false, tok: Object.fromEntries(p.map(id => [id, [-1, -1, -1, -1]])) }),
  turnOf: g => g.p[g.turn],
  badge: (g, id) => `🏠${g.tok[id].filter(x => x === 56).length}/4`,
  move(g, pid, a) {
    if (g.p[g.turn] !== pid) return false;
    const toks = g.tok[pid];
    if (a.t === "roll") {
      if (g.rolled) return false;
      g.die = rnd(6) + 1; g.rolled = true; g.note = "";
      if (!toks.some(p => legal(p, g.die))) { g.note = `${g.die === 6 ? "" : ""}no move`; next(g); }
      return true;
    }
    if (a.t === "move") {
      const k = a.k; if (!g.rolled || !(k >= 0 && k < 4) || !legal(toks[k], g.die)) return false;
      const np = toks[k] === -1 ? 0 : toks[k] + g.die; toks[k] = np;
      let bonus = g.die === 6 || np === 56;
      const me = g.seat[g.turn];
      if (np <= 50) {
        const abs = (START[me] + np) % 52;
        if (!SAFE.has(abs)) g.p.forEach((id, i) => { if (id === pid) return; g.tok[id].forEach((q, t) => { if (q >= 0 && q <= 50 && (START[g.seat[i]] + q) % 52 === abs) { g.tok[id][t] = -1; bonus = true; } }); });
      }
      if (toks.every(x => x === 56)) { g.over = { winners: [pid] }; return true; }
      if (bonus) g.rolled = false; else next(g);
      return true;
    }
    return false;
  },
  status: (g, c) => { const cur = g.p[g.turn], mine = cur === c.me;
    return mine ? (g.rolled ? `You rolled ${g.die} — tap a token` : "Your turn — roll the die") : `${c.nameOf(cur)}'s turn${g.rolled ? ` · rolled ${g.die}` : ""}`; },
  render(el, g, c) {
    const meI = g.p.indexOf(c.me), mine = !g.over && meI === g.turn;
    const cells = Array.from({ length: 225 }, () => ({ cls: "", st: "" }));
    const at = (r, q) => cells[r * 15 + q];
    for (let r = 0; r < 15; r++) for (let q = 0; q < 15; q++) {
      const x = at(r, q);
      if (r < 6 && q < 6) { x.cls = "qd"; x.st = `--q:${COL[0]}`; }
      else if (r < 6 && q > 8) { x.cls = "qd"; x.st = `--q:${COL[1]}`; }
      else if (r > 8 && q > 8) { x.cls = "qd"; x.st = `--q:${COL[2]}`; }
      else if (r > 8 && q < 6) { x.cls = "qd"; x.st = `--q:${COL[3]}`; }
      else if (r >= 6 && r <= 8 && q >= 6 && q <= 8) x.cls = "ctr";
    }
    T.forEach(([r, q], i) => { const x = at(r, q); x.cls = "tr" + (SAFE.has(i) ? " safe" : ""); const s = START.indexOf(i); if (s >= 0) x.st = `background:${COL[s]}`; });
    for (let k = 0; k < 4; k++) for (let j = 1; j <= 5; j++) { const [r, q] = lane(k, j); at(r, q).cls = "tr"; at(r, q).st = `background:${COL[k]}`; }
    const stacks = {};
    g.p.forEach((id, i) => g.tok[id].forEach((pos, t) => { if (pos === 56) return; const [r, q] = cellOf(g.seat[i], pos, t); (stacks[r * 15 + q] ||= []).push({ i, t, pos }); }));
    el.innerHTML = `<div class="ludo">${cells.map((x, n) => { const s = stacks[n];
      let inner = "";
      if (s) { const mv = s.find(o => mine && o.i === meI && legal(o.pos, g.die) && g.rolled); const o = mv || s[0];
        inner = `<i class="tk${mv ? " go" : ""}" style="background:${COL[g.seat[o.i]]}" ${mv ? A({ t: "move", k: o.t }) : ""}>${s.length > 1 ? s.length : ""}</i>`; }
      return `<div class="${x.cls}" style="${x.st}">${inner}</div>`; }).join("")}</div>
      <div class="row ludoctl"><div class="bigdie">${g.die ? DIE[g.die] : "🎲"}</div>${mine && !g.rolled ? `<button ${A({ t: "roll" })}>Roll</button>` : `<p class="hint">${g.note ? "No move possible" : mine ? "Tap a glowing token" : ""}</p>`}</div>`;
  }
});
})();
