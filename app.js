// Shared helpers + multiplayer engine. The room creator's phone is the host and
// runs every game's rules; others send moves and receive (redacted) state.
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
const A = o => `data-a='${JSON.stringify(o)}'`; // sends a move to the host
const U = o => `data-u='${JSON.stringify(o)}'`; // local UI action (game.ui)
const rnd = n => Math.random() * n | 0;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#06b6d4", "#ec4899"];
const GAMES = {}, ORDER = [];
function register(g) { GAMES[g.id] = g; ORDER.push(g.id); }

const ICE = { config: { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }] } };
const PREFIX = "gs-gamenight-";
let peer, isHost = false, me = "host", hostConn = null, conns = {}, room = null, ui = {}, uiKey = null, prevTurn = null, prevOver = false;

function toast(t) { const el = $("toast"); el.textContent = t; el.classList.remove("hidden"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.add("hidden"), 2500); }
function show(id) { for (const s of ["home", "lobby", "play"]) $(s).classList.toggle("hidden", s !== id); }
function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch {} }
function myName() { return ($("name").value.trim() || "Player").slice(0, 14); }
function nameOf(id) { const p = room && room.players.find(p => p.id === id); return p ? p.name : "(left)"; }
function openPeer(id) { return new Promise((res, rej) => { const p = id ? new Peer(id, ICE) : new Peer(ICE); p.once("open", () => res(p)); p.once("error", rej); }); }

// ---------- host ----------
async function createRoom() {
  saveName(); $("create").disabled = true;
  for (let i = 0; i < 5; i++) {
    const code = Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[rnd(24)]).join("");
    try {
      peer = await openPeer(PREFIX + code); isHost = true; me = "host";
      room = { code, phase: "lobby", game: ORDER[0], gid: 0, players: [{ id: "host", name: myName() }], g: null };
      peer.on("connection", c => {
        c.on("data", m => hostHandle(c.peer, m, c));
        c.on("close", () => playerLeft(c.peer));
      });
      peer.on("disconnected", () => { try { peer.reconnect(); } catch {} });
      enterRoom(); return;
    } catch (e) { if (e.type !== "unavailable-id") { toast("Couldn't reach the server. Try again."); break; } }
  }
  $("create").disabled = false;
}

function hostHandle(from, m, c) {
  if (m.t === "hello") {
    if (room.players.length >= 12) { c.send({ t: "err", msg: "Room is full" }); return setTimeout(() => c.close(), 400); }
    conns[from] = c; room.players.push({ id: from, name: String(m.name || "Player").slice(0, 14) });
    toast(room.players.at(-1).name + " joined"); broadcast();
  } else if (m.t === "move") {
    const game = GAMES[room.game];
    if (room.phase === "play" && room.g && !room.g.over && room.g.p.includes(from)) {
      let ok = false; try { ok = game.move(room.g, from, m.a || {}); } catch (e) { console.warn(e); }
      if (ok) broadcast();
    }
  }
}

function playerLeft(id) {
  delete conns[id];
  const i = room.players.findIndex(p => p.id === id); if (i < 0) return;
  const nm = room.players[i].name; room.players.splice(i, 1);
  if (room.phase === "play" && room.g && !room.g.over && room.g.p.includes(id)) room.g.over = { winners: [], text: `${nm} left — game ended` };
  toast(nm + " left"); broadcast();
}

function viewFor(pid) {
  const game = GAMES[room.game];
  if (!room.g || !game.redact) return room;
  return { ...room, g: game.redact(structuredClone(room.g), pid) };
}
function broadcast() { for (const [id, c] of Object.entries(conns)) if (c.open) c.send({ t: "state", s: viewFor(id) }); render(); }

function hostStart() {
  const game = GAMES[room.game], ids = room.players.map(p => p.id).slice(0, game.max);
  if (ids.length < game.min) return toast(`${game.name} needs at least ${game.min} players`);
  room.g = game.setup(ids); room.phase = "play"; room.gid++; broadcast();
}

// ---------- client ----------
async function joinRoom() {
  const code = $("joinCode").value.trim().toUpperCase();
  if (code.length !== 4) return toast("Enter the 4-letter code");
  saveName(); $("join").disabled = true;
  try {
    peer = await openPeer(); me = peer.id;
    hostConn = peer.connect(PREFIX + code, { reliable: true });
    const timer = setTimeout(() => { if (!room) { toast("Room not found"); $("join").disabled = false; } }, 9000);
    hostConn.on("open", () => { clearTimeout(timer); hostConn.send({ t: "hello", name: myName() }); });
    hostConn.on("data", m => {
      if (m.t === "state") { const first = !room; room = m.s; if (first) enterRoom(); else render(); }
      else if (m.t === "err") toast(m.msg);
    });
    hostConn.on("close", () => { toast("Host closed the room"); setTimeout(() => location.href = location.pathname, 1500); });
  } catch { toast("Connection failed"); $("join").disabled = false; }
}

function sendMove(a) { if (isHost) hostHandle("host", { t: "move", a }); else if (hostConn && hostConn.open) hostConn.send({ t: "move", a }); }

// ---------- UI ----------
function saveName() { try { localStorage.setItem("gn-name", myName()); } catch {} }
function enterRoom() { history.replaceState(null, "", "?r=" + room.code); render(); }

function gameCards(el, pickable) {
  el.innerHTML = ORDER.map(id => { const g = GAMES[id];
    return `<div class="g${pickable ? " pickable" : ""}${room && room.game === id ? " sel" : ""}" data-pick="${id}"><span class="e">${g.emoji}</span><b>${g.name}</b><small>${g.min === g.max ? g.min : g.min + "–" + g.max} players · ${g.desc}</small></div>`; }).join("");
}

function render() {
  if (!room) return;
  if (room.phase === "lobby") {
    show("lobby"); $("codeTxt").textContent = room.code;
    $("lobbyPlayers").innerHTML = room.players.map(p => `<span class="chip">${p.id === me ? "⭐ " : ""}${esc(p.name)}${p.id === "host" ? " 👑" : ""}</span>`).join("");
    gameCards($("lobbyGames"), isHost);
    const game = GAMES[room.game], n = room.players.length;
    $("pickHint").textContent = isHost ? "Pick a game" : `Host picked ${game.emoji} ${game.name}`;
    $("start").classList.toggle("hidden", !isHost);
    $("start").textContent = `Start ${game.name}`;
    $("start").disabled = n < game.min;
    $("lobbyHint").textContent = n < game.min ? `Waiting for players… (${game.name} needs ${game.min})` : n > game.max ? `Only the first ${game.max} play; others watch` : isHost ? "" : "Waiting for host to start…";
    prevOver = false; prevTurn = null;
    return;
  }
  show("play");
  const game = GAMES[room.game], g = room.g;
  if (uiKey !== room.gid) { ui = {}; uiKey = room.gid; }
  const ctx = { me, ui, nameOf, send: sendMove, rerender: render, playing: g.p.includes(me) };
  $("gTitle").textContent = `${game.emoji} ${game.name}`;
  const turn = game.turnOf ? game.turnOf(g) : null;
  $("chips").innerHTML = g.p.map((id, i) => `<span class="chip${!g.over && id === turn ? " turn" : ""}">${game.colored ? `<i class="dot" style="background:${game.colorOf ? game.colorOf(g, i) : COLORS[i]}"></i>` : ""}${id === me ? "⭐ " : ""}${esc(nameOf(id))}${game.badge ? ` <span class="l">${game.badge(g, id, i)}</span>` : ""}</span>`).join("");
  let banner = g.over ? "Game over" : game.status ? game.status(g, ctx) : turn === me ? "Your turn" : `${nameOf(turn)}'s turn`;
  if (!ctx.playing && !g.over) banner = "👀 Watching · " + banner;
  $("banner").textContent = banner;
  $("banner").classList.toggle("me", !g.over && (turn === me || (game.myMove && game.myMove(g, me))));
  if (!g.over && turn === me && prevTurn !== me) vibrate(50);
  prevTurn = turn;
  game.render($("stage"), g, ctx);
  $("overbar").classList.toggle("hidden", !g.over);
  if (g.over) {
    const w = g.over.winners || [];
    $("winTxt").textContent = (w.length ? (w.includes(me) ? (w.length > 1 ? "🎉 You tied for the win!" : "🎉 You win!") : `🏆 ${w.map(nameOf).join(" & ")} won`) : "") + (g.over.text ? (w.length ? " · " : "") + g.over.text : (w.length ? "" : "🤝 It's a draw"));
    $("hostBtns").classList.toggle("hidden", !isHost);
    $("overHint").textContent = isHost ? "" : "Waiting for host…";
    if (!prevOver) { vibrate(w.includes(me) ? [100, 60, 100, 60, 200] : 200); setTimeout(() => $("overbar").scrollIntoView({ behavior: "smooth", block: "center" }), 300); }
  }
  prevOver = !!g.over;
}

function boot() {
  try { $("name").value = localStorage.getItem("gn-name") || localStorage.getItem("bingo-name") || ""; } catch {}
  const r = new URLSearchParams(location.search).get("r"); if (r) $("joinCode").value = r.toUpperCase();
  gameCards($("homeGames"), false);
  $("create").onclick = createRoom;
  $("join").onclick = joinRoom;
  $("share").onclick = async () => {
    const url = location.origin + location.pathname + "?r=" + room.code;
    try { if (navigator.share) await navigator.share({ title: "Game Night", text: "Join my game room " + room.code, url }); else { await navigator.clipboard.writeText(url); toast("Link copied"); } } catch {}
  };
  $("lobbyGames").onclick = e => { const t = e.target.closest("[data-pick]"); if (t && isHost) { room.game = t.dataset.pick; broadcast(); } };
  $("start").onclick = hostStart;
  $("again").onclick = hostStart;
  $("toLobby").onclick = () => { room.phase = "lobby"; room.g = null; broadcast(); };
  $("leave").onclick = () => { if (confirm(isHost ? "Leave and close the room for everyone?" : "Leave the room?")) location.href = location.pathname; };
  $("stage").onclick = e => {
    const t = e.target.closest("[data-a],[data-u]"); if (!t) return;
    if (t.dataset.a) sendMove(JSON.parse(t.dataset.a));
    else { const game = GAMES[room.game]; game.ui && game.ui(ui, JSON.parse(t.dataset.u), room.g, me); render(); }
  };
  window.addEventListener("beforeunload", e => { if (isHost && room && room.players.length > 1) { e.preventDefault(); e.returnValue = ""; } });
}
