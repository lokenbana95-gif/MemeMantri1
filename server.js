const path = require("node:path");
const http = require("node:http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.ALLOWED_ORIGIN || true, methods: ["GET", "POST"] },
  maxHttpBufferSize: 16 * 1024
});
const PORT = Number(process.env.PORT || 3000);
const waiting = [];
const partnerOf = new Map();
const pendingInvites = new Map();
const inviteBySocket = new Map();
const names = ["Chai Citizen", "Meme Yatri", "Roast Republic", "Laughing Lok", "Desi Debater", "Punchline Pilot"];

app.use(express.static(__dirname));
app.get("/health", (_req, res) => res.json({ ok: true, service: "Meme Adda online matchmaking chat" }));

function randomName() { return names[Math.floor(Math.random() * names.length)] + " #" + Math.floor(10 + Math.random() * 90); }
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
  socket.on("disconnect", () => leaveSession(socket));
});

httpServer.listen(PORT, () => console.log(`MemeMantri online server running on http://localhost:${PORT}`));
