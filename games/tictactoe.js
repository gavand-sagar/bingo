(() => {
const W = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const MARK = ["❌", "⭕"];
register({
  id: "ttt", name: "Tic-Tac-Toe", emoji: "❌", min: 2, max: 2, desc: "Three in a row",
  setup: p => ({ p, turn: 0, b: Array(9).fill(-1) }),
  turnOf: g => g.p[g.turn],
  badge: (g, id) => MARK[g.p.indexOf(id)],
  move(g, pid, a) {
    const i = a.i;
    if (g.p[g.turn] !== pid || !Number.isInteger(i) || i < 0 || i > 8 || g.b[i] !== -1) return false;
    g.b[i] = g.turn;
    const w = W.find(l => l.every(j => g.b[j] === g.turn));
    if (w) { g.win = w; g.over = { winners: [pid] }; }
    else if (g.b.every(x => x !== -1)) g.over = { winners: [] };
    else g.turn ^= 1;
    return true;
  },
  render(el, g, c) {
    const mine = !g.over && g.p[g.turn] === c.me;
    el.innerHTML = `<div class="grid ttt">${g.b.map((v, i) => `<div class="cell${g.win && g.win.includes(i) ? " line" : ""}${mine && v < 0 ? " can" : ""}" ${mine && v < 0 ? A({ i }) : ""}>${v < 0 ? "" : MARK[v]}</div>`).join("")}</div>`;
  }
});
})();
