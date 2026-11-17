(() => {
// Player 0 (red) starts at the bottom and moves up. Captures are compulsory; multi-jumps continue.
const PC = ["#ef4444", "#f8fafc"];
function moves(g, o) {
  const out = [];
  for (let i = 0; i < 64; i++) {
    const p = g.b[i]; if (!p || p.o !== o) continue;
    if (g.chain != null && g.chain !== i) continue;
    const r = i >> 3, c = i & 7, dirs = p.k ? [-1, 1] : [o === 0 ? -1 : 1];
    for (const dr of dirs) for (const dc of [-1, 1]) {
      const r1 = r + dr, c1 = c + dc; if (r1 < 0 || r1 > 7 || c1 < 0 || c1 > 7) continue;
      const t = g.b[r1 * 8 + c1];
      if (!t) out.push({ f: i, t: r1 * 8 + c1 });
      else if (t.o !== o) { const r2 = r1 + dr, c2 = c1 + dc; if (r2 >= 0 && r2 <= 7 && c2 >= 0 && c2 <= 7 && !g.b[r2 * 8 + c2]) out.push({ f: i, t: r2 * 8 + c2, x: r1 * 8 + c1 }); }
    }
  }
  const caps = out.filter(m => m.x != null);
  return caps.length || g.chain != null ? caps : out;
}
register({
  id: "checkers", name: "Checkers", emoji: "⚫", min: 2, max: 2, desc: "Jump & crown", colored: true,
  colorOf: (g, i) => PC[i],
  setup(p) { const b = Array(64).fill(null); for (let i = 0; i < 64; i++) { const r = i >> 3, c = i & 7; if ((r + c) % 2) { if (r < 3) b[i] = { o: 1, k: false }; else if (r > 4) b[i] = { o: 0, k: false }; } } return { p, turn: 0, b, chain: null }; },
  turnOf: g => g.p[g.turn],
  badge: (g, id) => g.b.filter(x => x && x.o === g.p.indexOf(id)).length,
  move(g, pid, a) {
    if (g.p[g.turn] !== pid) return false;
    const m = moves(g, g.turn).find(m => m.f === a.f && m.t === a.t); if (!m) return false;
    const pc = g.b[m.f]; g.b[m.t] = pc; g.b[m.f] = null; g.last = [m.f, m.t];
    let crowned = false; const r = m.t >> 3;
    if (!pc.k && ((pc.o === 0 && r === 0) || (pc.o === 1 && r === 7))) { pc.k = true; crowned = true; }
    if (m.x != null) { g.b[m.x] = null; g.chain = m.t; if (crowned || !moves(g, g.turn).length) g.chain = null; } else g.chain = null;
    if (g.chain == null) g.turn ^= 1;
    if (!moves(g, g.turn).length) g.over = { winners: [g.p[g.turn ^ 1]], text: g.b.some(x => x && x.o === g.turn) ? "No moves left" : "" };
    return true;
  },
  ui(ui, u) { ui.sel = ui.sel === u.s ? null : u.s; },
  render(el, g, c) {
    const meI = g.p.indexOf(c.me), mine = !g.over && meI === g.turn;
    const ms = mine ? moves(g, g.turn) : [], from = new Set(ms.map(m => m.f));
    if (g.chain != null && mine) c.ui.sel = g.chain;
    if (c.ui.sel != null && !from.has(c.ui.sel)) c.ui.sel = null;
    const targets = new Set(ms.filter(m => m.f === c.ui.sel).map(m => m.t));
    const order = [...Array(64).keys()]; if (meI === 1) order.reverse();
    el.innerHTML = `<div class="ck">${order.map(i => { const dark = ((i >> 3) + (i & 7)) % 2, p = g.b[i];
      const act = targets.has(i) ? A({ f: c.ui.sel, t: i }) : from.has(i) ? U({ s: i }) : "";
      return `<div class="sq${dark ? " dk" : ""}${g.last && g.last.includes(i) ? " lst" : ""}${targets.has(i) ? " tgt" : ""}" ${act}>${p ? `<i class="pc${p.o ? " w" : ""}${c.ui.sel === i ? " sel" : from.has(i) ? " mv" : ""}">${p.k ? "♛" : ""}</i>` : ""}</div>`; }).join("")}</div>
      <p class="hint">${mine ? (g.chain != null ? "Keep jumping!" : "Tap a piece, then where to move. Jumps are required.") : ""}</p>`;
  }
});
})();
