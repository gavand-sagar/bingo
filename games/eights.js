(() => {
// Cards are 0..51: suit = n/13|0, rank = n%13 (0=A … 7=8 … 12=K). Eights are wild.
const SU = ["♠", "♥", "♦", "♣"], RK = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const suit = n => n / 13 | 0, rank = n => n % 13;
const card = (n, extra = "", attr = "") => n < 0 ? `<div class="pcard back">🂠</div>` : `<div class="pcard${suit(n) % 3 ? " red" : ""}${extra}" ${attr}><b>${RK[rank(n)]}</b><span>${SU[suit(n)]}</span></div>`;
const playable = (g, n) => rank(n) === 7 || suit(n) === g.suit || rank(n) === rank(g.pile.at(-1));
function next(g) { g.turn = (g.turn + 1) % g.p.length; g.drew = false; }
register({
  id: "eights", name: "Crazy Eights", emoji: "🃏", min: 2, max: 6, desc: "Match suit or rank, 8s wild",
  setup(p) {
    const deck = shuffle([...Array(52).keys()]), hands = {};
    for (const id of p) hands[id] = deck.splice(0, p.length === 2 ? 7 : 5);
    let i = deck.findIndex(n => rank(n) !== 7); const top = deck.splice(i, 1)[0];
    return { p, turn: 0, hands, draw: deck, pile: [top], suit: suit(top), drew: false };
  },
  turnOf: g => g.p[g.turn],
  badge: (g, id) => `🂠${g.hands[id].length}`,
  move(g, pid, a) {
    if (g.p[g.turn] !== pid) return false;
    const h = g.hands[pid];
    if (a.t === "play") {
      const n = a.c, k = h.indexOf(n);
      if (k < 0 || !playable(g, n)) return false;
      if (rank(n) === 7 && !(a.s >= 0 && a.s < 4)) return false;
      h.splice(k, 1); g.pile.push(n); g.suit = rank(n) === 7 ? a.s : suit(n); g.lastBy = pid;
      if (!h.length) g.over = { winners: [pid] }; else next(g);
      return true;
    }
    if (a.t === "draw") {
      if (g.drew) return false;
      if (!g.draw.length && g.pile.length > 1) { const top = g.pile.pop(); g.draw = shuffle(g.pile); g.pile = [top]; }
      if (g.draw.length) h.push(g.draw.pop());
      g.drew = true; return true;
    }
    if (a.t === "pass") { if (!g.drew) return false; next(g); return true; }
    return false;
  },
  redact(g, pid) { for (const id of Object.keys(g.hands)) if (id !== pid) g.hands[id] = g.hands[id].map(() => -1); g.draw = g.draw.map(() => -1); return g; },
  ui(ui, u) { ui.eight = u.eight ?? null; },
  render(el, g, c) {
    const mine = !g.over && g.p[g.turn] === c.me, h = (g.hands[c.me] || []).slice().sort((a, b) => suit(a) - suit(b) || rank(a) - rank(b));
    const top = g.pile.at(-1);
    let picker = "";
    if (mine && c.ui.eight != null) picker = `<div class="card-pick"><p class="hint">Choose the new suit</p><div class="row">${SU.map((s, i) => `<button class="alt suitb${i % 3 ? " red" : ""}" ${A({ t: "play", c: c.ui.eight, s: i })}>${s}</button>`).join("")}</div><button class="ghost" ${U({ eight: null })}>Cancel</button></div>`;
    el.innerHTML = `<div class="table">
        <div class="pilebox">${card(-1)}<small>${g.draw.length} left</small></div>
        <div class="pilebox">${card(top)}<small>${g.lastBy ? esc(c.nameOf(g.lastBy)) : "start"}</small></div>
        <div class="pilebox"><div class="suitnow${g.suit % 3 ? " red" : ""}">${SU[g.suit]}</div><small>suit</small></div>
      </div>
      ${picker}
      ${mine ? `<div class="row">${g.drew ? `<button class="alt" ${A({ t: "pass" })}>Pass</button>` : `<button class="alt" ${A({ t: "draw" })}>Draw a card</button>`}</div>` : ""}
      ${c.playing ? `<div class="hand">${h.map(n => { const ok = mine && playable(g, n); return card(n, ok ? " ok" : mine ? " no" : "", ok ? (rank(n) === 7 ? U({ eight: n }) : A({ t: "play", c: n })) : ""); }).join("")}</div>
      <p class="hint">${mine ? "Play a glowing card, or draw one." : ""}</p>` : ""}`;
  }
});
})();
