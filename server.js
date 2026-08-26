const path = require("node:path");
const http = require("node:http");
const express = require("express");
const { Server } = require("socket.io");
const fs = require("node:fs");
const crypto = require("node:crypto");
const Database = require("better-sqlite3");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.ALLOWED_ORIGIN || true, methods: ["GET", "POST"] },
  maxHttpBufferSize: 16 * 1024
});
const PORT = Number(process.env.PORT || 3000);
const BATTLE_DB_PATH = process.env.BATTLE_DB_PATH || path.join(__dirname, "data", "voice-mantri.db");
fs.mkdirSync(path.dirname(BATTLE_DB_PATH), { recursive: true });
const db = new Database(BATTLE_DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS voice_contests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL DEFAULT 'open',
    starts_at INTEGER NOT NULL,
    ends_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    settled_at INTEGER,
    winner_submission_id INTEGER,
    winner_author TEXT,
    winner_title TEXT,
    winner_votes INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS voice_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id INTEGER NOT NULL,
    slot TEXT NOT NULL CHECK(slot IN ('A', 'B')),
    owner_token TEXT NOT NULL,
    author TEXT NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    votes INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    UNIQUE(contest_id, slot)
  );
  CREATE TABLE IF NOT EXISTS voice_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id INTEGER NOT NULL,
    submission_id INTEGER NOT NULL,
    voter_token TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(contest_id, voter_token)
  );
`);
const BATTLE_DAY_MS = 24 * 60 * 60 * 1000;
function createVoiceContest(now = Date.now()) {
  const result = db.prepare("INSERT INTO voice_contests (status, starts_at, ends_at, created_at) VALUES ('open', ?, ?, ?)").run(now, now + BATTLE_DAY_MS, now);
  return result.lastInsertRowid;
}
function openVoiceContest() { return db.prepare("SELECT * FROM voice_contests WHERE status = 'open' ORDER BY id DESC LIMIT 1").get(); }
function voiceMantriHistory() { return db.prepare("SELECT id, winner_author AS author, winner_title AS title, winner_votes AS votes, settled_at FROM voice_contests WHERE status = 'settled' AND winner_submission_id IS NOT NULL ORDER BY settled_at DESC, id DESC").all(); }
function latestVoiceMantri() { return voiceMantriHistory()[0] || null; }
function settleVoiceContest(contestId) {
  const contest = db.prepare("SELECT * FROM voice_contests WHERE id = ? AND status = 'open'").get(contestId);
  if (!contest) return false;
  const entries = db.prepare("SELECT * FROM voice_submissions WHERE contest_id = ? ORDER BY votes DESC, created_at ASC, id ASC").all(contestId);
  const winner = entries.length === 2 ? entries[0] : null;
  const now = Date.now();
  db.prepare("UPDATE voice_contests SET status = 'settled', settled_at = ?, winner_submission_id = ?, winner_author = ?, winner_title = ?, winner_votes = ? WHERE id = ?").run(now, winner?.id || null, winner?.author || null, winner?.title || null, winner?.votes || 0, contestId);
  return true;
}
function ensureVoiceContest() {
  let contest = openVoiceContest();
  if (contest && contest.ends_at <= Date.now()) { settleVoiceContest(contest.id); contest = null; }
  if (!contest) { createVoiceContest(); contest = openVoiceContest(); }
  return contest;
}
function voiceBattleState(socket) {
  const contest = ensureVoiceContest();
  const submissions = db.prepare("SELECT id, slot, author, title, text, votes, created_at FROM voice_submissions WHERE contest_id = ? ORDER BY slot ASC").all(contest.id);
  const own = submissions.find(entry => db.prepare("SELECT 1 FROM voice_submissions WHERE id = ? AND owner_token = ?").get(entry.id, socket.data.voiceBattleToken));
  const voted = !!db.prepare("SELECT 1 FROM voice_votes WHERE contest_id = ? AND voter_token = ?").get(contest.id, socket.data.voiceBattleToken);
  const history = voiceMantriHistory();
  return { contestId: contest.id, status: contest.status, startsAt: contest.starts_at, endsAt: contest.ends_at, submissions, viewerSubmissionId: own?.id || null, viewerVoted: voted, todayVoiceMantri: history[0] || null, retiredVoiceMantris: history.slice(1) };
}
function broadcastVoiceBattle(event = "battle:update") { io.sockets.sockets.forEach(client => client.emit(event, voiceBattleState(client))); }
function settleExpiredVoiceContest() { const contest = openVoiceContest(); if (contest && contest.ends_at <= Date.now() && settleVoiceContest(contest.id)) broadcastVoiceBattle("battle:settled"); }
setInterval(settleExpiredVoiceContest, 30 * 1000).unref();
const waiting = [];
const partnerOf = new Map();
const pendingInvites = new Map();
const inviteBySocket = new Map();
const channels = new Map();
const names = ["Chai Citizen", "Meme Yatri", "Roast Republic", "Laughing Lok", "Desi Debater", "Punchline Pilot"];

app.use(express.json({ limit: "32kb" }));

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const ADMIN_ROUTE = `/${String(process.env.ADMIN_ROUTE || "meme-mantri-control-7f2a").replace(/^\/+|\/+$/g, "")}`;
const adminSessions = new Map();
const adminLoginAttempts = new Map();
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map(part => part.trim().split("=")).filter(pair => pair.length === 2).map(([key, ...value]) => [key, decodeURIComponent(value.join("="))]));
}
function secureEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function adminSession(req) {
  const token = parseCookies(req.headers.cookie).mm_admin_session;
  const session = token && adminSessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) { adminSessions.delete(token); return null; }
  session.expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  return { token, ...session };
}
function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).json({ message: "Admin panel configured nahi hai. Render environment mein ADMIN_PASSWORD set karo." });
  const session = adminSession(req);
  if (!session) return res.status(401).json({ message: "Admin login required hai." });
  req.admin = session;
  next();
}
function clientIp(req) { return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim(); }
function loginAllowed(req) {
  const now = Date.now(); const ip = clientIp(req); const record = adminLoginAttempts.get(ip);
  if (!record || record.windowStarted + ADMIN_LOGIN_WINDOW_MS <= now) { adminLoginAttempts.set(ip, { windowStarted: now, attempts: 0 }); return true; }
  return record.attempts < ADMIN_LOGIN_MAX_ATTEMPTS;
}
function recordLoginFailure(req) {
  const ip = clientIp(req); const now = Date.now(); const record = adminLoginAttempts.get(ip);
  if (!record || record.windowStarted + ADMIN_LOGIN_WINDOW_MS <= now) adminLoginAttempts.set(ip, { windowStarted: now, attempts: 1 });
  else record.attempts += 1;
}
function clearLoginFailures(req) { adminLoginAttempts.delete(clientIp(req)); }
function adminCookie(token, maxAge = ADMIN_SESSION_TTL_MS, secure = false) { return `mm_admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=${ADMIN_ROUTE}; Max-Age=${Math.max(0, Math.floor(maxAge / 1000))}${secure ? "; Secure" : ""}`; }
function sameOriginAdminRequest(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
function adminDashboardState() {
  const contest = ensureVoiceContest();
  const submissions = db.prepare("SELECT id, slot, author, title, text, votes, created_at FROM voice_submissions WHERE contest_id = ? ORDER BY slot ASC").all(contest.id);
  return {
    contest: { id: contest.id, status: contest.status, starts_at: contest.starts_at, ends_at: contest.ends_at, submissions },
    history: voiceMantriHistory(),
    channels: publicChannels(),
    health: { ok: true, service: "Meme Adda online matchmaking chat" }
  };
}
app.post(`${ADMIN_ROUTE}/api/login`, (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ message: "Admin panel configured nahi hai. Render environment mein ADMIN_PASSWORD set karo." });
  if (!loginAllowed(req)) return res.status(429).json({ message: "Too many login attempts. 15 minutes baad try karo." });
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (!secureEqual(username, ADMIN_USERNAME) || !secureEqual(password, ADMIN_PASSWORD)) { recordLoginFailure(req); return res.status(401).json({ message: "Username ya password galat hai." }); }
  clearLoginFailures(req);
  const token = crypto.randomBytes(32).toString("hex");
  adminSessions.set(token, { username: ADMIN_USERNAME, expiresAt: Date.now() + ADMIN_SESSION_TTL_MS });
  res.setHeader("Set-Cookie", adminCookie(token, ADMIN_SESSION_TTL_MS, req.secure || process.env.NODE_ENV === "production"));
  res.json({ user: { username: ADMIN_USERNAME } });
});
app.post(`${ADMIN_ROUTE}/api/logout`, (req, res) => {
  if (!sameOriginAdminRequest(req)) return res.status(403).json({ message: "Invalid admin request origin." });
  const token = parseCookies(req.headers.cookie).mm_admin_session;
  if (token) adminSessions.delete(token);
  res.setHeader("Set-Cookie", adminCookie("", 0, req.secure || process.env.NODE_ENV === "production"));
  res.json({ ok: true });
});
app.get(`${ADMIN_ROUTE}/api/me`, requireAdmin, (req, res) => res.json({ user: { username: req.admin.username } }));
app.get(`${ADMIN_ROUTE}/api/dashboard`, requireAdmin, (_req, res) => res.json(adminDashboardState()));
app.post(`${ADMIN_ROUTE}/api/contest/settle`, requireAdmin, (req, res) => {
  if (!sameOriginAdminRequest(req)) return res.status(403).json({ message: "Invalid admin request origin." });
  const contest = openVoiceContest();
  if (!contest) return res.status(409).json({ message: "Koi open contest nahi hai." });
  settleVoiceContest(contest.id);
  broadcastVoiceBattle("battle:settled");
  res.json({ ok: true, message: "Current VoiceMantri contest settle kar diya gaya." });
});
app.post(`${ADMIN_ROUTE}/api/contest/new`, requireAdmin, (req, res) => {
  if (!sameOriginAdminRequest(req)) return res.status(403).json({ message: "Invalid admin request origin." });
  if (openVoiceContest()) return res.status(409).json({ message: "Current contest abhi open hai. Pehle usse settle karo." });
  const id = createVoiceContest();
  broadcastVoiceBattle("battle:update");
  res.json({ ok: true, contestId: id, message: "Naya 24-hour VoiceMantri contest start ho gaya." });
});
app.post(`${ADMIN_ROUTE}/api/channels/:id/remove`, requireAdmin, (req, res) => {
  if (!sameOriginAdminRequest(req)) return res.status(403).json({ message: "Invalid admin request origin." });
  const id = String(req.params.id || "");
  const channel = channels.get(id);
  if (!channel) return res.status(404).json({ message: "Channel nahi mila." });
  for (const memberId of channel.members) {
    const member = io.sockets.sockets.get(memberId);
    if (member) { member.leave(id); member.data.channelId = null; member.emit("channel:left"); }
  }
  channels.delete(id);
  io.emit("channel:list", publicChannels());
  res.json({ ok: true, message: `#${channel.name} channel remove kar diya gaya.` });
});
app.get(`${ADMIN_ROUTE}/`, (_req, res) => { res.set("Cache-Control", "no-store"); res.sendFile(path.join(__dirname, "admin.html")); });
app.get(ADMIN_ROUTE, (_req, res) => res.redirect(`${ADMIN_ROUTE}/`));
app.get(`${ADMIN_ROUTE}/admin.js`, (_req, res) => { res.set("Cache-Control", "no-store"); res.sendFile(path.join(__dirname, "admin.js")); });
app.get(["/admin", "/admin/", "/admin.html", "/admin.js"], (_req, res) => res.status(404).send("Not found"));
app.use(express.static(__dirname));
app.get("/health", (_req, res) => res.json({ ok: true, service: "Meme Adda online matchmaking chat" }));

function randomName() { return names[Math.floor(Math.random() * names.length)] + " #" + Math.floor(10 + Math.random() * 90); }
function publicChannels() { return [...channels.values()].map(channel => ({ id: channel.id, name: channel.name, members: channel.members.size })).sort((a, b) => a.name.localeCompare(b.name)); }
function channelPayload(channel) { return { id: channel.id, name: channel.name, members: channel.members.size }; }
function leaveChannel(socket, notify = true) {
  const id = socket.data.channelId; if (!id) return;
  const channel = channels.get(id); socket.data.channelId = null;
  if (!channel) return;
  channel.members.delete(socket.id);
  if (notify) io.to(id).emit("channel:members", channelPayload(channel));
  if (!channel.members.size) channels.delete(id);
}
function uniqueChannelId() { return `channel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function safeChannelName(value) { return String(value || "").trim().replace(/\s+/g, " ").slice(0, 50); }
function removeFromWaiting(socketId) { const index = waiting.indexOf(socketId); if (index >= 0) waiting.splice(index, 1); }
function sanitizeContext(payload = {}) {
  const mode = ["chat", "debate", "meme"].includes(payload.mode) ? payload.mode : "chat";
  const topic = typeof payload.topic === "string" ? payload.topic.trim().slice(0, 160) : "";
  const meme = payload.meme && typeof payload.meme === "object" ? { title: String(payload.meme.title || "Selected meme").slice(0, 160), text: String(payload.meme.text || "").slice(0, 700) } : null;
  return { mode, topic, meme };
}
function clearInvite(inviteId, notify = false) {
  const invite = pendingInvites.get(inviteId); if (!invite) return;
  pendingInvites.delete(inviteId); inviteBySocket.delete(invite.a); inviteBySocket.delete(invite.b);
  if (notify) {
    const a = io.sockets.sockets.get(invite.a); const b = io.sockets.sockets.get(invite.b);
    if (a) a.emit("adda:invite-rejected"); if (b) b.emit("adda:invite-rejected");
  }
}
function makeInvite(a, b, context) {
  const inviteId = `invite_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const invite = { inviteId, a: a.id, b: b.id, context, accepted: new Set() };
  pendingInvites.set(inviteId, invite); inviteBySocket.set(a.id, inviteId); inviteBySocket.set(b.id, inviteId);
  a.emit("adda:invite", { inviteId, partnerName: b.data.displayName, ...context });
  b.emit("adda:invite", { inviteId, partnerName: a.data.displayName, ...context });
}
function findMatch(socket, payload) {
  removeFromWaiting(socket.id);
  const context = sanitizeContext(payload);
  let matchId;
  for (let i = 0; i < waiting.length; i += 1) {
    const candidate = io.sockets.sockets.get(waiting[i]);
    if (!candidate) { waiting.splice(i, 1); i -= 1; continue; }
    if (candidate.data.mode === context.mode) { matchId = candidate.id; waiting.splice(i, 1); break; }
  }
  if (!matchId) { socket.data.mode = context.mode; socket.data.context = context; waiting.push(socket.id); socket.emit("adda:waiting", { mode: context.mode }); return; }
  const other = io.sockets.sockets.get(matchId);
  if (!other) { waiting.push(socket.id); socket.emit("adda:waiting", { mode: context.mode }); return; }
  const merged = other.data.context || context;
  makeInvite(other, socket, { mode: context.mode, topic: context.topic || merged.topic, meme: context.meme || merged.meme });
}
function leaveSession(socket, notifyPartner = true) {
  removeFromWaiting(socket.id);
  const inviteId = inviteBySocket.get(socket.id);
  if (inviteId) clearInvite(inviteId, true);
  const partnerId = partnerOf.get(socket.id);
  partnerOf.delete(socket.id);
  if (!partnerId) return;
  partnerOf.delete(partnerId);
  const partner = io.sockets.sockets.get(partnerId);
  if (partner && notifyPartner) partner.emit("adda:partner-left");
}
function establishPair(invite) {
  const a = io.sockets.sockets.get(invite.a); const b = io.sockets.sockets.get(invite.b);
  if (!a || !b) { clearInvite(invite.inviteId, true); return; }
  partnerOf.set(a.id, b.id); partnerOf.set(b.id, a.id); pendingInvites.delete(invite.inviteId); inviteBySocket.delete(a.id); inviteBySocket.delete(b.id);
  const payload = { mode: invite.context.mode, topic: invite.context.topic, meme: invite.context.meme };
  a.emit("adda:paired", { partnerName: b.data.displayName, ...payload }); b.emit("adda:paired", { partnerName: a.data.displayName, ...payload });
}

io.on("connection", socket => {
  socket.data.displayName = randomName();
  socket.on("channel:list", () => socket.emit("channel:list", publicChannels()));
  socket.on("channel:create", payload => {
    const name = safeChannelName(payload?.name); if (!name) return socket.emit("channel:error", { message: "Channel name required hai." });
    const duplicate = [...channels.values()].find(channel => channel.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return socket.emit("channel:error", { message: "Is naam ka channel already exist karta hai." });
    const channel = { id: uniqueChannelId(), name, members: new Set() }; channels.set(channel.id, channel); socket.emit("channel:created", channelPayload(channel)); io.emit("channel:list", publicChannels());
  });
  socket.on("channel:join", payload => {
    const channel = channels.get(String(payload?.id || "")); if (!channel) return socket.emit("channel:error", { message: "Channel nahi mila. List refresh karo." });
    leaveChannel(socket, false); channel.members.add(socket.id); socket.join(channel.id); socket.data.channelId = channel.id; socket.emit("channel:joined", channelPayload(channel)); io.to(channel.id).emit("channel:members", channelPayload(channel));
  });
  socket.on("channel:leave", () => { const id = socket.data.channelId; leaveChannel(socket); if (id) socket.leave(id); socket.emit("channel:left"); io.emit("channel:list", publicChannels()); });
  socket.on("channel:message", payload => {
    const id = socket.data.channelId; const channel = channels.get(id); if (!channel || !channel.members.has(socket.id)) return;
    const message = String(payload?.text || "").trim().slice(0, 500); if (message) io.to(id).except(socket.id).emit("channel:message", { fromName: socket.data.displayName, text: message });
  });
  socket.data.voiceBattleToken = String(socket.handshake.auth?.voiceBattleToken || crypto.randomBytes(18).toString("hex")).slice(0, 120);
  socket.on("battle:state", () => socket.emit("battle:state", voiceBattleState(socket)));
  socket.on("battle:submit", payload => {
    const contest = ensureVoiceContest();
    const total = db.prepare("SELECT COUNT(*) AS count FROM voice_submissions WHERE contest_id = ?").get(contest.id).count;
    if (total >= 2) return socket.emit("battle:error", { message: "Is 24-hour VoiceMantri contest ke dono slots fill ho chuke hain." });
    if (db.prepare("SELECT 1 FROM voice_submissions WHERE contest_id = ? AND owner_token = ?").get(contest.id, socket.data.voiceBattleToken)) return socket.emit("battle:error", { message: "Aap is contest mein already ek meme submit kar chuke ho." });
    const author = String(payload?.handle || "").trim().replace(/^@+/, "@").slice(0, 60);
    const title = String(payload?.title || "").trim().slice(0, 120);
    const memeText = String(payload?.text || "").trim().slice(0, 700);
    if (!author || !title || !memeText) return socket.emit("battle:error", { message: "Name/handle, title aur meme text required hain." });
    const slot = total === 0 ? "A" : "B";
    db.prepare("INSERT INTO voice_submissions (contest_id, slot, owner_token, author, title, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(contest.id, slot, socket.data.voiceBattleToken, author, title, memeText, Date.now());
    socket.emit("battle:submitted"); broadcastVoiceBattle();
  });
  socket.on("battle:vote", payload => {
    const contest = ensureVoiceContest();
    const submission = db.prepare("SELECT * FROM voice_submissions WHERE id = ? AND contest_id = ?").get(Number(payload?.submissionId), contest.id);
    if (!submission) return socket.emit("battle:error", { message: "Ye meme current contest ka hissa nahi hai." });
    if (submission.owner_token === socket.data.voiceBattleToken) return socket.emit("battle:error", { message: "Aap apne khud ke meme ko vote nahi kar sakte." });
    if (db.prepare("SELECT 1 FROM voice_votes WHERE contest_id = ? AND voter_token = ?").get(contest.id, socket.data.voiceBattleToken)) return socket.emit("battle:error", { message: "Aap is contest mein already vote kar chuke ho." });
    if (db.prepare("SELECT COUNT(*) AS count FROM voice_submissions WHERE contest_id = ?").get(contest.id).count < 2) return socket.emit("battle:error", { message: "Voting tab shuru hogi jab dono users meme submit kar denge." });
    const vote = db.transaction(() => { db.prepare("INSERT INTO voice_votes (contest_id, submission_id, voter_token, created_at) VALUES (?, ?, ?, ?)").run(contest.id, submission.id, socket.data.voiceBattleToken, Date.now()); db.prepare("UPDATE voice_submissions SET votes = votes + 1 WHERE id = ?").run(submission.id); });
    vote(); socket.emit("battle:vote-accepted"); broadcastVoiceBattle();
  });
  socket.on("adda:find", payload => { leaveSession(socket, false); findMatch(socket, payload); });
  socket.on("adda:accept", ({ inviteId } = {}) => {
    const invite = pendingInvites.get(inviteId); if (!invite || (invite.a !== socket.id && invite.b !== socket.id)) return;
    invite.accepted.add(socket.id); socket.emit("adda:accepted", { inviteId });
    if (invite.accepted.size === 2) establishPair(invite);
  });
  socket.on("adda:reject", ({ inviteId } = {}) => {
    const invite = pendingInvites.get(inviteId); if (!invite || (invite.a !== socket.id && invite.b !== socket.id)) return;
    const otherId = invite.a === socket.id ? invite.b : invite.a; const other = io.sockets.sockets.get(otherId);
    if (other) other.emit("adda:invite-rejected"); clearInvite(inviteId, false); socket.emit("adda:invite-rejected");
  });
  socket.on("adda:message", payload => {
    const partnerId = partnerOf.get(socket.id); const partner = partnerId && io.sockets.sockets.get(partnerId);
    if (!partner || !payload || typeof payload !== "object") return;
    if (payload.kind === "meme" && payload.meme) {
      partner.emit("adda:message", { kind: "meme", fromName: socket.data.displayName, meme: { title: String(payload.meme.title || "Selected meme").slice(0, 160), text: String(payload.meme.text || "").slice(0, 700) } });
    } else if (typeof payload.text === "string") {
      const text = payload.text.trim().slice(0, 500); if (text) partner.emit("adda:message", { kind: "text", fromName: socket.data.displayName, text });
    }
  });
  socket.on("adda:leave", () => leaveSession(socket));
  socket.on("disconnect", () => { leaveChannel(socket); leaveSession(socket); });
});

httpServer.listen(PORT, () => console.log(`MemeMantri online server running on http://localhost:${PORT}`));
