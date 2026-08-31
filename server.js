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
  CREATE TABLE IF NOT EXISTS ministries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🏛',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS ticker_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS memes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    creator TEXT NOT NULL,
    text TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    plays INTEGER NOT NULL DEFAULT 0,
    featured INTEGER NOT NULL DEFAULT 0,
    radio_enabled INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'published',
    source TEXT NOT NULL DEFAULT 'admin',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS petitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    creator TEXT NOT NULL,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    reviewed_at INTEGER,
    review_note TEXT
  );
  CREATE TABLE IF NOT EXISTS banned_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS ip_bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL UNIQUE,
    reason TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'moderator',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS admin_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT,
    created_at INTEGER NOT NULL
  );
`);

/* ---------------------------------------------------------------------
   Seed default content (only runs once — when tables are empty) so the
   public site keeps showing content even before an admin logs in.
   --------------------------------------------------------------------- */
const DEFAULT_MINISTRIES = [
  ["hindi", "हिंदी मीम्स", "🕉️"], ["desi", "Desi India", "🇮🇳"], ["bollywood", "Bollywood", "🎬"],
  ["cricket", "Cricket", "🏏"], ["politics", "Indian Politics", "🏛"], ["student", "Student Life", "🎓"],
  ["funny", "Funny India", "😂"], ["trending", "Trending India", "🔥"], ["genz", "Desi Gen Z", "🧠"],
  ["tech", "Indian Tech", "💻"], ["science", "Science India", "📚"], ["gaming", "Indian Gaming", "🎮"],
  ["love", "Desi Relationships", "💘"]
];
const DEFAULT_TICKER = [
  "BREAKING: Local student opens book after 6 months",
  "EXCLUSIVE: Chai declared official debugging tool",
  "LIVE: Meme Parliament passes bill for shorter syllabus",
  "ALERT: Desi uncle forwards 47 good-morning memes",
  "BREAKING: Indian WiFi router receives family blessings in twelve languages"
];
const DEFAULT_MEMES = [
  ["Breaking: Student Opens Book", "student", "@sarkari_savage", "Breaking news! A local engineering student has opened a textbook for the first time in six months. Scientists say the dust cloud was visible from space."],
  ["Chai Over Everything", "desi", "@chaiwala_coder", "Indian problem-solving flowchart. Step one: drink chai. Step two: discuss problem for two hours. Step three: drink more chai. Problem still unsolved, but friendship level maximum."],
  ["Last Over Panic", "cricket", "@gully_gavaskar", "Eighteen runs needed off six balls, and my heart is playing its own match. The bowler is nervous, the batsman is nervous, but my mother is calmly asking if I have eaten dinner."],
  ["It Works On My Machine", "tech", "@semicolon_sardar", "The developer said, it works on my machine. So the manager shipped the machine to production. And that, my friends, is how cloud computing was invented in India."],
  ["Manifesto Of Memes", "politics", "@meme_neta", "My fellow citizens! If elected, I promise free WiFi in every classroom, and mandatory nap time after lunch. Vote for me, and I shall make the syllabus fifty percent shorter!"],
  ["Bollywood Slow Motion", "bollywood", "@filmy_frames", "He walks in slow motion. The wind blows. Three hundred goons attack. He removes his sunglasses. Physics resigns and leaves the theatre quietly."],
  ["Situationship Status", "love", "@delulu_dilse", "We are not dating. We are not friends. We are in a quantum state of a relationship. Observation collapses it into ignored messages."],
  ["One More Match", "gaming", "@noob_nawab", "It is two in the morning. He says just one more match. Six matches later, the sun rises, the rank drops, and the mother enters with the legendary slipper of judgement."],
  ["Physics Ka Pyaar", "science", "@lab_lafanga", "Newton's fourth law, discovered in India. Every action has an equal and opposite relative who compares your marks with the neighbour's child."],
  ["Aura Farming", "genz", "@vibecheck_vishal", "He did not study, he did not revise, he did not even bring a pen. He walked into the exam hall with pure vibes and left with pure trauma. Absolute aura, zero marks."],
  ["Uncle Ki Advice", "funny", "@whatsapp_university", "Beta, in our time we walked twenty kilometres to school, uphill, both directions, without shoes, and still topped the class. Also beta, please recharge my phone, I cannot find the button."],
  ["Trending On Every App", "trending", "@reel_rishi", "Today's trend is doing nothing productive, but filming it in cinematic mode with sad background music. Congratulations, you are now a content creator."],
  ["सोमवार का सन्नाटा", "hindi", "@dilli_ka_dimaag", "सोमवार सुबह अलार्म बजते ही शरीर कहता है, अभी नहीं, बस पांच मिनट और। दो घंटे बाद वही पांच मिनट, तब तक ऑफिस पहुंचने की सारी योजना बदल चुकी होती है।"],
  ["मम्मी का सीसीटीवी", "hindi", "@ghar_ki_khabrein", "घर में मम्मी से बड़ा कोई जासूस नहीं होता। कमरे का दरवाज़ा बंद करते ही आवाज़ आती है, अंदर क्या कर रहे हो, दरवाज़ा क्यों बंद किया है?"],
  ["परीक्षा से एक रात पहले", "hindi", "@topper_ki_tabahi", "परीक्षा से एक रात पहले अचानक कमरा साफ करने का मन करता है, अलमारी व्यवस्थित होती है, और पूरा सिलेबस एक ही रात में खत्म करने का हौसला अचानक जाग जाता है।"],
  ["पड़ोसी का बेटा", "hindi", "@tulna_ka_tandav", "हर घर में एक काल्पनिक किरदार होता है, पड़ोसी का बेटा, जो हमेशा टॉप करता है, हमेशा समय पर सोता है, और कभी मोबाइल नहीं चलाता।"],
  ["Mumbai Local Olympics", "desi", "@platform_pundit", "Mumbai local mein seat milna koi coincidence nahi, ye timing, strategy aur halka sa Olympic-level shoulder movement ka result hai."],
  ["Bengaluru Traffic Meditation", "desi", "@silicon_samosa", "Bengaluru traffic ne mujhe patience, podcast aur ek hi signal par teen naye life goals de diye."],
  ["Chennai Heat Mode", "desi", "@filtercoffee_fury", "Chennai ki garmi mein phone bhi bolta hai: bhai mujhe charge mat karo, main already 100 percent emotional hoon."],
  ["Kolkata Adda", "desi", "@adda_archivist", "Kolkata adda starts with one question and ends three hours later with politics, poetry, football and no final answer."],
  ["Punjabi Wedding Budget", "desi", "@dhol_department", "Punjabi wedding budget: 20 percent food, 10 percent venue, 70 percent proving that the DJ can hear us from the next district."]
];
const DEFAULT_SETTINGS = {
  site_title: "MemeMantri",
  site_tagline: "MemeMantri The Official Parliament of Indian Memes",
  motd_meme_id: "",
  maintenance_mode: "0",
  maintenance_message: "MemeMantri Sansad abhi thodi der ke liye band hai. Jald hi wapas aayenge!"
};
function seedIfEmpty() {
  const ministryCount = db.prepare("SELECT COUNT(*) AS c FROM ministries").get().c;
  if (!ministryCount) {
    const insert = db.prepare("INSERT INTO ministries (key, name, emoji, sort_order, active) VALUES (?, ?, ?, ?, 1)");
    DEFAULT_MINISTRIES.forEach(([key, name, emoji], index) => insert.run(key, name, emoji, index));
  }
  const tickerCount = db.prepare("SELECT COUNT(*) AS c FROM ticker_items").get().c;
  if (!tickerCount) {
    const insert = db.prepare("INSERT INTO ticker_items (text, sort_order, active) VALUES (?, ?, 1)");
    DEFAULT_TICKER.forEach((text, index) => insert.run(text, index));
  }
  const memeCount = db.prepare("SELECT COUNT(*) AS c FROM memes").get().c;
  if (!memeCount) {
    const now = Date.now();
    const insert = db.prepare("INSERT INTO memes (title, category, creator, text, likes, plays, featured, radio_enabled, status, source, created_at) VALUES (?, ?, ?, ?, 0, 0, 0, 1, 'published', 'seed', ?)");
    DEFAULT_MEMES.forEach(([title, category, creator, text], index) => insert.run(title, category, creator, text, now - index));
  }
  const insertSetting = db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)");
  Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => insertSetting.run(key, value));
}
seedIfEmpty();
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
  const winner = entries.length > 0 ? entries[0] : null;
  const now = Date.now();
  db.prepare("UPDATE voice_contests SET status = 'settled', settled_at = ?, winner_submission_id = ?, winner_author = ?, winner_title = ?, winner_votes = ? WHERE id = ?").run(now, winner?.id || null, winner?.author || null, winner?.title || null, winner?.votes || 0, contestId);
  return true;
}
/* One-time repair: earlier versions only saved a winner when a contest had
   exactly 2 submissions, so any contest settled with 1 submission (e.g. the
   2nd meme arrived after the 24-hour window and landed in a fresh contest)
   silently lost its history even though the raw submission was never
   deleted. Backfill those from voice_submissions so old VoiceMantris
   reappear after this fix is deployed. */
function backfillMissingVoiceHistory() {
  const broken = db.prepare("SELECT id FROM voice_contests WHERE status = 'settled' AND winner_submission_id IS NULL").all();
  broken.forEach(({ id }) => {
    const entries = db.prepare("SELECT * FROM voice_submissions WHERE contest_id = ? ORDER BY votes DESC, created_at ASC, id ASC").all(id);
    if (!entries.length) return;
    const winner = entries[0];
    db.prepare("UPDATE voice_contests SET winner_submission_id = ?, winner_author = ?, winner_title = ?, winner_votes = ? WHERE id = ?").run(winner.id, winner.author, winner.title, winner.votes, id);
  });
}
backfillMissingVoiceHistory();
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

/* ---------------------------------------------------------------------
   Content helpers — ministries, ticker, settings, memes, petitions,
   chat moderation (banned words / ip bans), admin users, activity log.
   --------------------------------------------------------------------- */
function logActivity(actor, action, detail = "") {
  db.prepare("INSERT INTO admin_activity (actor, action, detail, created_at) VALUES (?, ?, ?, ?)").run(actor, action, detail, Date.now());
}
function allMinistries() { return db.prepare("SELECT * FROM ministries ORDER BY sort_order ASC, id ASC").all(); }
function activeMinistries() { return db.prepare("SELECT * FROM ministries WHERE active = 1 ORDER BY sort_order ASC, id ASC").all(); }
function allTicker() { return db.prepare("SELECT * FROM ticker_items ORDER BY sort_order ASC, id ASC").all(); }
function activeTicker() { return db.prepare("SELECT * FROM ticker_items WHERE active = 1 ORDER BY sort_order ASC, id ASC").all(); }
function getSetting(key, fallback = "") { const row = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key); return row ? row.value : fallback; }
function setSetting(key, value) { db.prepare("INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, String(value)); }
function allSettings() { const rows = db.prepare("SELECT key, value FROM site_settings").all(); return Object.fromEntries(rows.map(r => [r.key, r.value])); }
function publishedMemes() { return db.prepare("SELECT * FROM memes WHERE status = 'published' ORDER BY created_at DESC").all(); }
function allMemesAdmin() { return db.prepare("SELECT * FROM memes ORDER BY created_at DESC").all(); }
function bannedWordsList() { return db.prepare("SELECT * FROM banned_words ORDER BY word ASC").all(); }
function censorText(text) {
  const words = bannedWordsList().map(w => w.word.toLowerCase()).filter(Boolean);
  if (!words.length) return text;
  let out = text;
  words.forEach(word => { out = out.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), m => "*".repeat(m.length)); });
  return out;
}
function isIpBanned(ip) { return !!db.prepare("SELECT 1 FROM ip_bans WHERE ip = ?").get(ip); }
function hashPassword(password) { const salt = crypto.randomBytes(16).toString("hex"); const hash = crypto.scryptSync(password, salt, 64).toString("hex"); return `${salt}:${hash}`; }
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(check, "hex"); const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
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
function requireSuperAdmin(req, res, next) {
  if (req.admin?.role !== "super") return res.status(403).json({ message: "Sirf super-admin ye action kar sakta hai." });
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
    memesCount: db.prepare("SELECT COUNT(*) AS c FROM memes WHERE status = 'published'").get().c,
    pendingPetitions: db.prepare("SELECT COUNT(*) AS c FROM petitions WHERE status = 'pending'").get().c,
    ministriesCount: activeMinistries().length,
    ipBansCount: db.prepare("SELECT COUNT(*) AS c FROM ip_bans").get().c,
    settings: allSettings(),
    health: { ok: true, service: "Meme Adda online matchmaking chat" }
  };
}
app.post(`${ADMIN_ROUTE}/api/login`, (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ message: "Admin panel configured nahi hai. Render environment mein ADMIN_PASSWORD set karo." });
  if (!loginAllowed(req)) return res.status(429).json({ message: "Too many login attempts. 15 minutes baad try karo." });
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  let role = null;
  if (secureEqual(username, ADMIN_USERNAME) && secureEqual(password, ADMIN_PASSWORD)) role = "super";
  else {
    const dbUser = db.prepare("SELECT * FROM admin_users WHERE username = ?").get(username);
    if (dbUser && verifyPassword(password, dbUser.password_hash)) role = dbUser.role;
  }
  if (!role) { recordLoginFailure(req); return res.status(401).json({ message: "Username ya password galat hai." }); }
  clearLoginFailures(req);
  const token = crypto.randomBytes(32).toString("hex");
  adminSessions.set(token, { username, role, expiresAt: Date.now() + ADMIN_SESSION_TTL_MS });
  res.setHeader("Set-Cookie", adminCookie(token, ADMIN_SESSION_TTL_MS, req.secure || process.env.NODE_ENV === "production"));
  logActivity(username, "login", "");
  res.json({ user: { username, role } });
});
app.post(`${ADMIN_ROUTE}/api/logout`, (req, res) => {
  if (!sameOriginAdminRequest(req)) return res.status(403).json({ message: "Invalid admin request origin." });
  const token = parseCookies(req.headers.cookie).mm_admin_session;
  if (token) adminSessions.delete(token);
  res.setHeader("Set-Cookie", adminCookie("", 0, req.secure || process.env.NODE_ENV === "production"));
  res.json({ ok: true });
});
app.get(`${ADMIN_ROUTE}/api/me`, requireAdmin, (req, res) => res.json({ user: { username: req.admin.username, role: req.admin.role } }));
app.get(`${ADMIN_ROUTE}/api/dashboard`, requireAdmin, (_req, res) => res.json(adminDashboardState()));

/* -- guard: every admin-mutating route below requires same-origin + admin session -- */
function adminWrite(req, res, next) { if (!sameOriginAdminRequest(req)) return res.status(403).json({ message: "Invalid admin request origin." }); next(); }

/* VoiceMantri contest control */
app.post(`${ADMIN_ROUTE}/api/contest/settle`, requireAdmin, adminWrite, (req, res) => {
  const contest = openVoiceContest();
  if (!contest) return res.status(409).json({ message: "Koi open contest nahi hai." });
  settleVoiceContest(contest.id);
  broadcastVoiceBattle("battle:settled");
  logActivity(req.admin.username, "contest:settle", `contest #${contest.id}`);
  res.json({ ok: true, message: "Current VoiceMantri contest settle kar diya gaya." });
});
app.post(`${ADMIN_ROUTE}/api/contest/new`, requireAdmin, adminWrite, (req, res) => {
  if (openVoiceContest()) return res.status(409).json({ message: "Current contest abhi open hai. Pehle usse settle karo." });
  const id = createVoiceContest();
  broadcastVoiceBattle("battle:update");
  logActivity(req.admin.username, "contest:new", `contest #${id}`);
  res.json({ ok: true, contestId: id, message: "Naya 24-hour VoiceMantri contest start ho gaya." });
});
app.post(`${ADMIN_ROUTE}/api/contest/extend`, requireAdmin, adminWrite, (req, res) => {
  const contest = openVoiceContest();
  if (!contest) return res.status(409).json({ message: "Koi open contest nahi hai." });
  const hours = Math.max(1, Math.min(72, Number(req.body?.hours) || 24));
  db.prepare("UPDATE voice_contests SET ends_at = ends_at + ? WHERE id = ?").run(hours * 60 * 60 * 1000, contest.id);
  broadcastVoiceBattle("battle:update");
  logActivity(req.admin.username, "contest:extend", `contest #${contest.id} +${hours}h`);
  res.json({ ok: true, message: `Contest ${hours} ghante ke liye extend ho gaya.` });
});
app.delete(`${ADMIN_ROUTE}/api/contest/submissions/:id`, requireAdmin, adminWrite, (req, res) => {
  const id = Number(req.params.id);
  const sub = db.prepare("SELECT * FROM voice_submissions WHERE id = ?").get(id);
  if (!sub) return res.status(404).json({ message: "Submission nahi mila." });
  db.prepare("DELETE FROM voice_submissions WHERE id = ?").run(id);
  db.prepare("DELETE FROM voice_votes WHERE submission_id = ?").run(id);
  broadcastVoiceBattle("battle:update");
  logActivity(req.admin.username, "contest:remove-submission", `submission #${id}`);
  res.json({ ok: true, message: "Submission remove kar diya gaya." });
});

/* Chat channel + moderation */
app.post(`${ADMIN_ROUTE}/api/channels/:id/remove`, requireAdmin, adminWrite, (req, res) => {
  const id = String(req.params.id || "");
  const channel = channels.get(id);
  if (!channel) return res.status(404).json({ message: "Channel nahi mila." });
  for (const memberId of channel.members) {
    const member = io.sockets.sockets.get(memberId);
    if (member) { member.leave(id); member.data.channelId = null; member.emit("channel:left"); }
  }
  channels.delete(id);
  io.emit("channel:list", publicChannels());
  logActivity(req.admin.username, "channel:remove", channel.name);
  res.json({ ok: true, message: `#${channel.name} channel remove kar diya gaya.` });
});
app.get(`${ADMIN_ROUTE}/api/moderation/banned-words`, requireAdmin, (_req, res) => res.json(bannedWordsList()));
app.post(`${ADMIN_ROUTE}/api/moderation/banned-words`, requireAdmin, adminWrite, (req, res) => {
  const word = String(req.body?.word || "").trim().toLowerCase();
  if (!word) return res.status(400).json({ message: "Word required hai." });
  db.prepare("INSERT OR IGNORE INTO banned_words (word) VALUES (?)").run(word);
  logActivity(req.admin.username, "moderation:add-word", word);
  res.json({ ok: true, words: bannedWordsList() });
});
app.delete(`${ADMIN_ROUTE}/api/moderation/banned-words/:id`, requireAdmin, adminWrite, (req, res) => {
  db.prepare("DELETE FROM banned_words WHERE id = ?").run(Number(req.params.id));
  logActivity(req.admin.username, "moderation:remove-word", req.params.id);
  res.json({ ok: true, words: bannedWordsList() });
});
app.get(`${ADMIN_ROUTE}/api/moderation/ip-bans`, requireAdmin, (_req, res) => res.json(db.prepare("SELECT * FROM ip_bans ORDER BY created_at DESC").all()));
app.post(`${ADMIN_ROUTE}/api/moderation/ip-bans`, requireAdmin, adminWrite, (req, res) => {
  const ip = String(req.body?.ip || "").trim();
  const reason = String(req.body?.reason || "").trim().slice(0, 200);
  if (!ip) return res.status(400).json({ message: "IP required hai." });
  db.prepare("INSERT OR IGNORE INTO ip_bans (ip, reason, created_at) VALUES (?, ?, ?)").run(ip, reason, Date.now());
  for (const client of io.sockets.sockets.values()) { if (clientSocketIp(client) === ip) client.disconnect(true); }
  logActivity(req.admin.username, "moderation:ban-ip", ip);
  res.json({ ok: true, message: `${ip} ban ho gaya.` });
});
app.delete(`${ADMIN_ROUTE}/api/moderation/ip-bans/:id`, requireAdmin, adminWrite, (req, res) => {
  db.prepare("DELETE FROM ip_bans WHERE id = ?").run(Number(req.params.id));
  logActivity(req.admin.username, "moderation:unban-ip", req.params.id);
  res.json({ ok: true });
});

/* Memes CRUD */
app.get(`${ADMIN_ROUTE}/api/memes`, requireAdmin, (_req, res) => res.json(allMemesAdmin()));
app.post(`${ADMIN_ROUTE}/api/memes`, requireAdmin, adminWrite, (req, res) => {
  const { title, category, creator, text } = req.body || {};
  if (!title || !category || !creator || !text) return res.status(400).json({ message: "Title, category, creator, text sab required hain." });
  const info = db.prepare("INSERT INTO memes (title, category, creator, text, likes, plays, featured, radio_enabled, status, source, created_at) VALUES (?, ?, ?, ?, 0, 0, 0, 1, 'published', 'admin', ?)").run(String(title).slice(0, 120), String(category).slice(0, 40), String(creator).slice(0, 60), String(text).slice(0, 800), Date.now());
  logActivity(req.admin.username, "meme:create", title);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put(`${ADMIN_ROUTE}/api/memes/:id`, requireAdmin, adminWrite, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM memes WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ message: "Meme nahi mila." });
  const { title, category, creator, text, featured, radio_enabled, status } = req.body || {};
  db.prepare("UPDATE memes SET title=?, category=?, creator=?, text=?, featured=?, radio_enabled=?, status=? WHERE id=?").run(
    String(title ?? existing.title).slice(0, 120), String(category ?? existing.category).slice(0, 40), String(creator ?? existing.creator).slice(0, 60),
    String(text ?? existing.text).slice(0, 800), featured != null ? (featured ? 1 : 0) : existing.featured, radio_enabled != null ? (radio_enabled ? 1 : 0) : existing.radio_enabled,
    String(status ?? existing.status), id);
  logActivity(req.admin.username, "meme:update", `#${id}`);
  res.json({ ok: true });
});
app.delete(`${ADMIN_ROUTE}/api/memes/:id`, requireAdmin, adminWrite, (req, res) => {
  db.prepare("DELETE FROM memes WHERE id = ?").run(Number(req.params.id));
  logActivity(req.admin.username, "meme:delete", `#${req.params.id}`);
  res.json({ ok: true });
});

/* Ministries CRUD */
app.get(`${ADMIN_ROUTE}/api/ministries`, requireAdmin, (_req, res) => res.json(allMinistries()));
app.post(`${ADMIN_ROUTE}/api/ministries`, requireAdmin, adminWrite, (req, res) => {
  const key = String(req.body?.key || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const name = String(req.body?.name || "").trim().slice(0, 60);
  const emoji = String(req.body?.emoji || "🏛").slice(0, 8);
  if (!key || !name) return res.status(400).json({ message: "Key aur name required hain." });
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM ministries").get().m;
  try { db.prepare("INSERT INTO ministries (key, name, emoji, sort_order, active) VALUES (?, ?, ?, ?, 1)").run(key, name, emoji, maxOrder + 1); }
  catch { return res.status(409).json({ message: "Ye key already exist karti hai." }); }
  logActivity(req.admin.username, "ministry:create", key);
  res.json({ ok: true });
});
app.put(`${ADMIN_ROUTE}/api/ministries/:id`, requireAdmin, adminWrite, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM ministries WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ message: "Ministry nahi mili." });
  const { name, emoji, active, sort_order } = req.body || {};
  db.prepare("UPDATE ministries SET name=?, emoji=?, active=?, sort_order=? WHERE id=?").run(
    String(name ?? existing.name).slice(0, 60), String(emoji ?? existing.emoji).slice(0, 8),
    active != null ? (active ? 1 : 0) : existing.active, sort_order != null ? Number(sort_order) : existing.sort_order, id);
  logActivity(req.admin.username, "ministry:update", `#${id}`);
  res.json({ ok: true });
});
app.delete(`${ADMIN_ROUTE}/api/ministries/:id`, requireAdmin, adminWrite, (req, res) => {
  db.prepare("DELETE FROM ministries WHERE id = ?").run(Number(req.params.id));
  logActivity(req.admin.username, "ministry:delete", `#${req.params.id}`);
  res.json({ ok: true });
});

/* Ticker CRUD */
app.get(`${ADMIN_ROUTE}/api/ticker`, requireAdmin, (_req, res) => res.json(allTicker()));
app.post(`${ADMIN_ROUTE}/api/ticker`, requireAdmin, adminWrite, (req, res) => {
  const text = String(req.body?.text || "").trim().slice(0, 200);
  if (!text) return res.status(400).json({ message: "Text required hai." });
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM ticker_items").get().m;
  db.prepare("INSERT INTO ticker_items (text, sort_order, active) VALUES (?, ?, 1)").run(text, maxOrder + 1);
  logActivity(req.admin.username, "ticker:create", text);
  res.json({ ok: true });
});
app.put(`${ADMIN_ROUTE}/api/ticker/:id`, requireAdmin, adminWrite, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM ticker_items WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ message: "Ticker item nahi mila." });
  const { text, active } = req.body || {};
  db.prepare("UPDATE ticker_items SET text=?, active=? WHERE id=?").run(String(text ?? existing.text).slice(0, 200), active != null ? (active ? 1 : 0) : existing.active, id);
  logActivity(req.admin.username, "ticker:update", `#${id}`);
  res.json({ ok: true });
});
app.delete(`${ADMIN_ROUTE}/api/ticker/:id`, requireAdmin, adminWrite, (req, res) => {
  db.prepare("DELETE FROM ticker_items WHERE id = ?").run(Number(req.params.id));
  logActivity(req.admin.username, "ticker:delete", `#${req.params.id}`);
  res.json({ ok: true });
});

/* Site settings (MOTD pin, title, tagline, maintenance mode) */
app.get(`${ADMIN_ROUTE}/api/settings`, requireAdmin, (_req, res) => res.json(allSettings()));
app.put(`${ADMIN_ROUTE}/api/settings`, requireAdmin, adminWrite, (req, res) => {
  const body = req.body || {};
  Object.keys(DEFAULT_SETTINGS).forEach(key => { if (body[key] !== undefined) setSetting(key, body[key]); });
  logActivity(req.admin.username, "settings:update", Object.keys(body).join(","));
  res.json({ ok: true, settings: allSettings() });
});

/* Petitions moderation */
app.get(`${ADMIN_ROUTE}/api/petitions`, requireAdmin, (req, res) => {
  const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : "pending";
  res.json(db.prepare("SELECT * FROM petitions WHERE status = ? ORDER BY created_at DESC").all(status));
});
app.post(`${ADMIN_ROUTE}/api/petitions/:id/approve`, requireAdmin, adminWrite, (req, res) => {
  const petition = db.prepare("SELECT * FROM petitions WHERE id = ?").get(Number(req.params.id));
  if (!petition || petition.status !== "pending") return res.status(404).json({ message: "Pending petition nahi mili." });
  db.prepare("INSERT INTO memes (title, category, creator, text, likes, plays, featured, radio_enabled, status, source, created_at) VALUES (?, ?, ?, ?, 0, 0, 0, 1, 'published', 'petition', ?)").run(petition.title, petition.category, petition.creator, petition.text, Date.now());
  db.prepare("UPDATE petitions SET status='approved', reviewed_at=? WHERE id=?").run(Date.now(), petition.id);
  logActivity(req.admin.username, "petition:approve", petition.title);
  res.json({ ok: true, message: "Petition approve karke feed me add kar diya gaya." });
});
app.post(`${ADMIN_ROUTE}/api/petitions/:id/reject`, requireAdmin, adminWrite, (req, res) => {
  const note = String(req.body?.note || "").slice(0, 200);
  const result = db.prepare("UPDATE petitions SET status='rejected', reviewed_at=?, review_note=? WHERE id=? AND status='pending'").run(Date.now(), note, Number(req.params.id));
  if (!result.changes) return res.status(404).json({ message: "Pending petition nahi mili." });
  logActivity(req.admin.username, "petition:reject", String(req.params.id));
  res.json({ ok: true, message: "Petition reject kar di gayi." });
});

/* Admin users + roles (super-admin only) */
app.get(`${ADMIN_ROUTE}/api/admins`, requireAdmin, requireSuperAdmin, (_req, res) => res.json(db.prepare("SELECT id, username, role, created_at FROM admin_users ORDER BY created_at DESC").all()));
app.post(`${ADMIN_ROUTE}/api/admins`, requireAdmin, requireSuperAdmin, adminWrite, (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const role = ["admin", "moderator"].includes(req.body?.role) ? req.body.role : "moderator";
  if (!username || password.length < 6) return res.status(400).json({ message: "Username aur kam se kam 6-character password required hai." });
  try { db.prepare("INSERT INTO admin_users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)").run(username, hashPassword(password), role, Date.now()); }
  catch { return res.status(409).json({ message: "Ye username already exist karta hai." }); }
  logActivity(req.admin.username, "admin:create", `${username} (${role})`);
  res.json({ ok: true });
});
app.delete(`${ADMIN_ROUTE}/api/admins/:id`, requireAdmin, requireSuperAdmin, adminWrite, (req, res) => {
  db.prepare("DELETE FROM admin_users WHERE id = ?").run(Number(req.params.id));
  logActivity(req.admin.username, "admin:delete", req.params.id);
  res.json({ ok: true });
});

/* Activity log + DB backup */
app.get(`${ADMIN_ROUTE}/api/activity`, requireAdmin, (_req, res) => res.json(db.prepare("SELECT * FROM admin_activity ORDER BY created_at DESC LIMIT 200").all()));
app.get(`${ADMIN_ROUTE}/api/backup`, requireAdmin, requireSuperAdmin, (req, res) => {
  logActivity(req.admin.username, "backup:download", "");
  res.download(BATTLE_DB_PATH, "mememantri-backup.db");
});

app.get([`${ADMIN_ROUTE}/`, ADMIN_ROUTE], (req, res) => {
  if (!req.path.endsWith("/")) return res.redirect(301, `${ADMIN_ROUTE}/`);
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "admin.html"));
});
app.get(`${ADMIN_ROUTE}/admin.js`, (_req, res) => { res.set("Cache-Control", "no-store"); res.sendFile(path.join(__dirname, "admin.js")); });
app.get(["/admin", "/admin/", "/admin.html", "/admin.js"], (_req, res) => res.status(404).send("Not found"));

/* ---------------------------------------------------------------------
   Public (no-auth) API — used by index.html/mm.js so admin changes show
   up live on the real site.
   --------------------------------------------------------------------- */
app.get("/api/public/site", (_req, res) => {
  const settings = allSettings();
  res.json({
    siteTitle: settings.site_title, tagline: settings.site_tagline,
    maintenance: settings.maintenance_mode === "1", maintenanceMessage: settings.maintenance_message,
    ministries: activeMinistries().map(m => [m.key, m.name, m.emoji]),
    ticker: activeTicker().map(t => t.text),
    motdMemeId: settings.motd_meme_id ? Number(settings.motd_meme_id) : null
  });
});
app.get("/api/public/memes", (_req, res) => res.json(publishedMemes()));
app.post("/api/public/petitions", (req, res) => {
  const title = String(req.body?.title || "").trim().slice(0, 120);
  const text = String(req.body?.text || "").trim().slice(0, 800);
  const category = String(req.body?.category || "funny").trim().slice(0, 40);
  const creatorRaw = String(req.body?.creator || "").trim().slice(0, 60);
  if (!title || !text) return res.status(400).json({ message: "Title aur meme text dono zaroori hain." });
  const creator = creatorRaw ? (creatorRaw.startsWith("@") ? creatorRaw : "@" + creatorRaw) : "@anonymous";
  db.prepare("INSERT INTO petitions (title, category, creator, text, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)").run(title, category, creator, censorText(text), Date.now());
  res.json({ ok: true, message: "Petition file ho gayi — admin review ke baad feed me aa jaayegi." });
});

function maintenanceGate(req, res, next) {
  if (getSetting("maintenance_mode", "0") !== "1") return next();
  if (req.path.startsWith(ADMIN_ROUTE) || req.path.startsWith("/api/") || req.path === "/health" || req.path.endsWith(".css") || req.path.endsWith(".js")) return next();
  res.set("Cache-Control", "no-store");
  res.status(503).send(`<!doctype html><meta charset="utf-8"><title>MemeMantri — Maintenance</title><body style="background:#0e100f;color:#f7f2e9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px"><div><h1>🛠 MemeMantri</h1><p>${censorText(getSetting("maintenance_message", "Site abhi maintenance mein hai."))}</p></div></body>`);
}
app.use(maintenanceGate);
app.use(express.static(__dirname));
app.get("/health", (_req, res) => res.json({ ok: true, service: "Meme Adda online matchmaking chat" }));

function clientSocketIp(socket) { return String(socket.handshake.headers["x-forwarded-for"] || socket.handshake.address || "unknown").split(",")[0].trim(); }
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

io.use((socket, next) => {
  if (isIpBanned(clientSocketIp(socket))) return next(new Error("banned"));
  next();
});
function sanitizeDisplayName(raw) {
  let name = String(raw || "").trim().replace(/\s+/g, " ").slice(0, 40);
  if (!name) return "";
  name = name.replace(/^@+/, "");
  return name ? censorText("@" + name) : "";
}
io.on("connection", socket => {
  socket.data.displayName = sanitizeDisplayName(socket.handshake.auth?.displayName) || randomName();
  socket.on("identity:update", payload => {
    const name = sanitizeDisplayName(payload?.displayName);
    if (name) socket.data.displayName = name;
  });
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
    const message = String(payload?.text || "").trim().slice(0, 500); if (message) io.to(id).except(socket.id).emit("channel:message", { fromName: socket.data.displayName, text: censorText(message) });
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
      const text = payload.text.trim().slice(0, 500); if (text) partner.emit("adda:message", { kind: "text", fromName: socket.data.displayName, text: censorText(text) });
    }
  });
  socket.on("adda:leave", () => leaveSession(socket));
  socket.on("disconnect", () => { leaveChannel(socket); leaveSession(socket); });
});

httpServer.listen(PORT, () => console.log(`MemeMantri online server running on http://localhost:${PORT}`));
