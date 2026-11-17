(() => {
const LINES = (() => { const L = []; for (let i = 0; i < 5; i++) { L.push([0,1,2,3,4].map(j => i*5+j)); L.push([0,1,2,3,4].map(j => j*5+i)); } L.push([0,6,12,18,24], [4,8,12,16,20]); return L; })();
const nums = () => shuffle(Array.from({ length: 25 }, (_, i) => i + 1));
const done = (b, called) => { const s = new Set(called), d = LINES.filter(l => l.every(i => s.has(b[i]))); return { n: d.length, cells: new Set(d.flat()) }; };
const valid = b => Array.isArray(b) && b.length === 25 && new Set(b).size === 25 && b.every(n => Number.isInteger(n) && n >= 1 && n <= 25);

register({
  id: "bingo", name: "BINGO", emoji: "🔢", min: 2, max: 8, desc: "Call numbers, make 5 lines",
  setup: p => ({ p, stage: "setup", boards: Object.fromEntries(p.map(id => [id, nums()])), ready: {}, turn: 0, called: [], lines: {} }),
  turnOf: g => g.stage === "play" ? g.p[g.turn] : null,
  myMove: (g, me) => g.stage === "setup" && g.p.includes(me) && !g.ready[me],
  status: (g, c) => g.stage === "setup" ? (g.ready[c.me] ? "Waiting for others to get ready…" : "Arrange your board, then Ready") : g.p[g.turn] === c.me ? "Your turn — tap a number" : `${c.nameOf(g.p[g.turn])}'s turn`,
  badge: (g, id) => g.stage === "setup" ? (g.ready[id] ? "✅" : "⏳") : ("BINGO".slice(0, g.lines[id] || 0) || "–"),
  move(g, pid, a) {
    if (g.stage === "setup") {
      if (a.t === "ready") { if (!valid(a.b)) return false; g.boards[pid] = a.b; g.ready[pid] = true; }
      else if (a.t === "unready") g.ready[pid] = false; else return false;
      if (g.p.every(id => g.ready[id])) { g.stage = "play"; g.turn = rnd(g.p.length); }
      return true;
    }
    const n = a.n;
    if (a.t !== "call" || g.p[g.turn] !== pid || !Number.isInteger(n) || n < 1 || n > 25 || g.called.includes(n)) return false;
    g.called.push(n); g.lastBy = pid;
    for (const id of g.p) g.lines[id] = Math.min(5, done(g.boards[id], g.called).n);
    const w = g.p.filter(id => g.lines[id] >= 5);
    if (w.length) g.over = { winners: w }; else g.turn = (g.turn + 1) % g.p.length;
    return true;
  },
  redact(g, pid) { for (const id of Object.keys(g.boards)) if (id !== pid) delete g.boards[id]; return g; },
  ui(ui, u, g, me) {
    if (!ui.b) ui.b = g.boards[me].slice();
    if (u.shuffle) { ui.b = nums(); ui.pick = null; return; }
    const i = u.i; if (ui.pick == null) ui.pick = i; else { [ui.b[ui.pick], ui.b[i]] = [ui.b[i], ui.b[ui.pick]]; ui.pick = null; }
  },
  render(el, g, c) {
    if (!c.playing) { el.innerHTML = `<p class="info">Called: ${g.called.join(" · ") || "none yet"}</p>`; return; }
    if (g.stage === "setup") {
      const ready = g.ready[c.me], b = ready ? g.boards[c.me] : (c.ui.b || g.boards[c.me]);
      el.innerHTML = `<p class="hint">${ready ? "You're ready." : "Tap two numbers to swap them."}</p>
        <div class="grid bingo">${b.map((n, i) => `<div class="cell${c.ui.pick === i ? " can" : ""}" ${ready ? "" : U({ i })}>${n}</div>`).join("")}</div>
        <div class="row">${ready ? `<button class="alt" ${A({ t: "unready" })}>Change board</button>` : `<button class="alt" ${U({ shuffle: 1 })}>Shuffle</button><button ${A({ t: "ready", b })}>Ready</button>`}</div>`;
      return;
    }
    const b = g.boards[c.me], { n, cells } = done(b, g.called), set = new Set(g.called), mine = !g.over && g.p[g.turn] === c.me;
    el.innerHTML = `<div class="grid bletters">${[..."BINGO"].map((L, i) => `<span class="${i < n ? "on" : ""}">${L}</span>`).join("")}</div>
      <div class="grid bingo">${b.map((v, i) => `<div class="cell${set.has(v) ? (cells.has(i) ? " line" : " hit") : mine ? " can" : ""}" ${mine && !set.has(v) ? A({ t: "call", n: v }) : ""}>${v}</div>`).join("")}</div>
      <p class="info">${g.called.length ? `${esc(c.nameOf(g.lastBy))} called <b>${g.called.at(-1)}</b>` : "No numbers called yet"}</p>
      <div class="called">${g.called.map(x => `<i>${x}</i>`).join("")}</div>`;
  }
});
})();
