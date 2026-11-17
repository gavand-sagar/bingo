(() => {
const CATS = ["Ones", "Twos", "Threes", "Fours", "Fives", "Sixes", "3 of a kind", "4 of a kind", "Full house", "Small straight", "Large straight", "Yacht", "Chance"];
const FACE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
function score(c, d) {
  const n = [0, 0, 0, 0, 0, 0, 0]; d.forEach(x => n[x]++);
  const s = d.reduce((a, b) => a + b, 0), mx = Math.max(...n), has = k => n[k] > 0;
  if (c < 6) return n[c + 1] * (c + 1);
  switch (c) {
    case 6: return mx >= 3 ? s : 0;
    case 7: return mx >= 4 ? s : 0;
    case 8: return n.includes(3) && n.includes(2) ? 25 : 0;
    case 9: return [1, 2, 3].some(a => [0, 1, 2, 3].every(o => has(a + o))) ? 30 : 0;
    case 10: return [1, 2].some(a => [0, 1, 2, 3, 4].every(o => has(a + o))) ? 40 : 0;
    case 11: return mx === 5 ? 50 : 0;
    default: return s;
  }
}
const upper = sc => sc.slice(0, 6).reduce((a, b) => a + (b || 0), 0);
const total = sc => sc.reduce((a, b) => a + (b || 0), 0) + (upper(sc) >= 63 ? 35 : 0);
register({
  id: "yacht", name: "Yacht Dice", emoji: "🎲", min: 1, max: 6, desc: "Roll 5 dice, fill 13 boxes",
  setup: p => ({ p, turn: 0, dice: [1, 2, 3, 4, 5], held: [0, 0, 0, 0, 0], rolls: 0, sc: Object.fromEntries(p.map(id => [id, Array(13).fill(null)])) }),
  turnOf: g => g.p[g.turn],
  badge: (g, id) => total(g.sc[id]),
  move(g, pid, a) {
    if (g.p[g.turn] !== pid) return false;
    if (a.t === "roll") { if (g.rolls >= 3) return false; g.dice = g.dice.map((d, i) => g.rolls && g.held[i] ? d : rnd(6) + 1); g.rolls++; return true; }
    if (a.t === "hold") { if (!g.rolls || g.rolls >= 3 || !(a.i >= 0 && a.i < 5)) return false; g.held[a.i] ^= 1; return true; }
    if (a.t === "score") {
      const c = a.c, sc = g.sc[pid]; if (!g.rolls || !Number.isInteger(c) || c < 0 || c > 12 || sc[c] !== null) return false;
      sc[c] = score(c, g.dice);
      g.rolls = 0; g.held = [0, 0, 0, 0, 0];
      if (g.p.every(id => g.sc[id].every(x => x !== null))) { const m = Math.max(...g.p.map(id => total(g.sc[id]))); g.over = { winners: g.p.length > 1 ? g.p.filter(id => total(g.sc[id]) === m) : [], text: g.p.length > 1 ? "" : `You scored ${m}` }; }
      else g.turn = (g.turn + 1) % g.p.length;
      return true;
    }
    return false;
  },
  render(el, g, c) {
    const cur = g.p[g.turn], mine = !g.over && cur === c.me;
    const dice = g.dice.map((d, i) => `<div class="die${g.held[i] ? " held" : ""}${!g.rolls ? " faded" : ""}" ${mine && g.rolls && g.rolls < 3 ? A({ t: "hold", i }) : ""}>${FACE[d]}</div>`).join("");
    const head = g.p.map(id => `<th>${esc(c.nameOf(id).slice(0, 6))}</th>`).join("");
    const rows = CATS.map((name, k) => `<tr${k === 6 ? ' class="sep"' : ""}><td>${name}</td>${g.p.map(id => { const v = g.sc[id][k];
      if (v !== null) return `<td>${v}</td>`;
      if (id === cur && g.rolls && !g.over) return `<td class="pot" ${mine ? A({ t: "score", c: k }) : ""}>${score(k, g.dice)}</td>`;
      return "<td></td>"; }).join("")}</tr>`).join("");
    el.innerHTML = `<div class="dice">${dice}</div>
      ${mine ? `<button ${g.rolls >= 3 ? "disabled" : ""} ${A({ t: "roll" })}>${g.rolls === 0 ? "Roll dice" : g.rolls < 3 ? `Roll again (${3 - g.rolls} left)` : "Pick a box below"}</button>
      <p class="hint">${g.rolls ? "Tap dice to hold them. Tap a highlighted number to score." : ""}</p>` : ""}
      <table class="sheet"><tr><th></th>${head}</tr>${rows}
      <tr class="sep"><td>Bonus (63+ upper)</td>${g.p.map(id => `<td>${upper(g.sc[id]) >= 63 ? 35 : `<small>${upper(g.sc[id])}/63</small>`}</td>`).join("")}</tr>
      <tr class="tot"><td>Total</td>${g.p.map(id => `<td>${total(g.sc[id])}</td>`).join("")}</tr></table>`;
  }
});
})();
