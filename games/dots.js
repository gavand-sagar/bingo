(() => {
const D = 5, B = D - 1; // 5x5 dots, 4x4 boxes
register({
  id: "dots", name: "Dots & Boxes", emoji: "🔲", min: 2, max: 4, desc: "Close boxes, go again", colored: true,
  setup: p => ({ p, turn: 0, h: Array(D * B).fill(-1), v: Array(B * D).fill(-1), box: Array(B * B).fill(-1), sc: Object.fromEntries(p.map(id => [id, 0])) }),
  turnOf: g => g.p[g.turn],
  badge: (g, id) => g.sc[id],
  move(g, pid, a) {
    const k = a.k, i = a.i, arr = k === "h" ? g.h : k === "v" ? g.v : null;
    if (g.p[g.turn] !== pid || !arr || !Number.isInteger(i) || i < 0 || i >= arr.length || arr[i] !== -1) return false;
    arr[i] = g.turn;
    const cand = k === "h" ? [[(i / B | 0) - 1, i % B], [i / B | 0, i % B]] : [[i / D | 0, i % D - 1], [i / D | 0, i % D]];
    let got = 0;
    for (const [r, c] of cand) {
      if (r < 0 || r >= B || c < 0 || c >= B || g.box[r * B + c] !== -1) continue;
      if (g.h[r * B + c] >= 0 && g.h[(r + 1) * B + c] >= 0 && g.v[r * D + c] >= 0 && g.v[r * D + c + 1] >= 0) { g.box[r * B + c] = g.turn; g.sc[pid]++; got++; }
    }
    if (g.box.every(x => x >= 0)) { const m = Math.max(...Object.values(g.sc)); g.over = { winners: g.p.filter(id => g.sc[id] === m) }; }
    else if (!got) g.turn = (g.turn + 1) % g.p.length;
    return true;
  },
  render(el, g, c) {
    const mine = !g.over && g.p[g.turn] === c.me, N = 2 * D - 1; let html = "";
    for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
      if (r % 2 === 0 && q % 2 === 0) html += `<i class="d"></i>`;
      else if (r % 2 === 0) { const i = (r / 2) * B + (q - 1) / 2, o = g.h[i]; html += `<b class="ln h${o >= 0 ? " on" : mine ? " can" : ""}" style="${o >= 0 ? `--c:${COLORS[o]}` : ""}" ${o < 0 && mine ? A({ k: "h", i }) : ""}></b>`; }
      else if (q % 2 === 0) { const i = ((r - 1) / 2) * D + q / 2, o = g.v[i]; html += `<b class="ln v${o >= 0 ? " on" : mine ? " can" : ""}" style="${o >= 0 ? `--c:${COLORS[o]}` : ""}" ${o < 0 && mine ? A({ k: "v", i }) : ""}></b>`; }
      else { const o = g.box[((r - 1) / 2) * B + (q - 1) / 2]; html += `<span class="bx" style="${o >= 0 ? `background:${COLORS[o]}` : ""}">${o >= 0 ? esc(c.nameOf(g.p[o])[0]) : ""}</span>`; }
    }
    el.innerHTML = `<div class="dots">${html}</div><p class="hint">${mine ? "Tap between two dots to draw a line. Close a box to go again." : ""}</p>`;
  }
});
})();
