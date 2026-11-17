(() => {
const C = 7, R = 6, DISC = ["#ef4444", "#eab308"];
register({
  id: "four", name: "Four in a Row", emoji: "🔴", min: 2, max: 2, desc: "Drop discs, connect 4", colored: true,
  colorOf: (g, i) => DISC[i],
  setup: p => ({ p, turn: 0, b: Array(C * R).fill(-1), last: -1 }),
  turnOf: g => g.p[g.turn],
  move(g, pid, a) {
    const c = a.c;
    if (g.p[g.turn] !== pid || !Number.isInteger(c) || c < 0 || c >= C) return false;
    let r = R - 1; while (r >= 0 && g.b[r * C + c] !== -1) r--;
    if (r < 0) return false;
    const i = r * C + c; g.b[i] = g.turn; g.last = i;
    for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
      const line = [i];
      for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < R && cc >= 0 && cc < C && g.b[rr * C + cc] === g.turn) { line.push(rr * C + cc); rr += dr * s; cc += dc * s; } }
      if (line.length >= 4) { g.win = line; g.over = { winners: [pid] }; return true; }
    }
    if (g.b.every(x => x !== -1)) g.over = { winners: [] }; else g.turn ^= 1;
    return true;
  },
  render(el, g, c) {
    const mine = !g.over && g.p[g.turn] === c.me;
    el.innerHTML = `<div class="grid four">${g.b.map((v, i) => `<div class="slot" ${mine ? A({ c: i % C }) : ""}><i style="${v >= 0 ? `background:${DISC[v]}` : ""}" class="${i === g.last ? "last" : ""}${g.win && g.win.includes(i) ? " w" : ""}"></i></div>`).join("")}</div>
      <p class="hint">${mine ? "Tap a column to drop your disc" : ""}</p>`;
  }
});
})();
