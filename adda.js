const SOCKET_SERVER_URL = window.MEME_CHAT_SERVER_URL || (location.protocol === "file:" ? "http://localhost:3000" : location.origin);
const DEBATE_TOPICS = {
  politics: "Politics",
  cricket: "Cricket",
  "movies-series": "Movies / Series",
  behavior: "Human Behavior",
  "technology-ai": "Technology / AI",
  "village-city-life": "Village / City Life"
};
const state = { mode: "chat", socket: null, paired: false, inviteId: null, partnerName: "", connected: false, searching: false, channelId: null, channelName: "" };
const statusEl = document.getElementById("addaStatus");
const messagesEl = document.getElementById("addaMessages");
const messageInput = document.getElementById("messageInput");
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const debatePanel = document.getElementById("debatePanel");
const channelPanel = document.getElementById("channelPanel");
const debateTopic = document.getElementById("debateTopic");
const customTopic = document.getElementById("customTopic");
const modeHint = document.getElementById("modeHint");
const leaveBtn = document.getElementById("leaveBtn");
const acceptBtn = document.getElementById("acceptInviteBtn");
const rejectBtn = document.getElementById("rejectInviteBtn");
const inviteHint = document.getElementById("inviteHint");
const notifyBtn = document.getElementById("notifyBtn");
function setStatus(text, strong = false) { statusEl.textContent = text; if (strong) statusEl.innerHTML = `🟢 <strong>${text}</strong>`; }
function appendMessage(who, text) { const row = document.createElement("div"); row.className = `adda-msg ${who}`; row.textContent = text; messagesEl.appendChild(row); messagesEl.scrollTop = messagesEl.scrollHeight; }
function appendSystem(text) { appendMessage("system", text); }
function notify(title, body) { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body }); }
async function enableNotifications(showMessage = true) {
  if (!("Notification" in window)) { if (showMessage) appendSystem("Is browser mein notifications supported nahi hain."); return; }
  try { const result = await Notification.requestPermission(); if (showMessage) appendSystem(result === "granted" ? "🔔 Browser notifications enabled." : "🔕 Permission nahi mili; in-page invite alert available rahega."); if (result === "granted") notifyBtn.textContent = "🔔 Notifications Enabled"; } catch { if (showMessage) appendSystem("Notification permission browser ne block kar di."); }
}
function clearInvite() { state.inviteId = null; acceptBtn.classList.add("adda-hidden"); rejectBtn.classList.add("adda-hidden"); }
function updateControls() { leaveBtn.classList.toggle("adda-hidden", !state.connected); }
function currentTopic() { if (debateTopic.value === "custom") return customTopic.value.trim().slice(0, 160); return DEBATE_TOPICS[debateTopic.value] || DEBATE_TOPICS.politics; }
function contextFor(mode = state.mode) { return mode === "debate" ? { mode, topic: currentTopic() } : { mode: "chat" }; }
function showMode(mode) {
  state.mode = mode; modeButtons.forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
  debatePanel.classList.toggle("adda-hidden", mode !== "debate"); channelPanel.classList.toggle("adda-hidden", mode !== "channel");
  if (mode === "chat") modeHint.textContent = "Random chat page open hote hi automatically start hoti hai.";
  if (mode === "debate") { modeHint.textContent = "Topic choose karo; phir debate partner search hoga."; inviteHint.textContent = "Fixed topic select karke debate partner dhoondho."; }
  if (mode === "channel") { modeHint.textContent = "Public Meme Channel create ya join karo."; inviteHint.textContent = "Channel mode mein group members ke saath chat hogi."; if (state.socket?.connected) loadChannels(); }
}
function connectSocket() {
  if (state.socket?.connected) return state.socket;
  if (typeof io === "undefined") { setStatus("Socket.IO load nahi hua. Chat server check karo."); return null; }
  state.socket = io(SOCKET_SERVER_URL, { transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: 8, timeout: 8000 });
  state.socket.on("connect", () => { state.connected = true; updateControls(); setStatus("Online server connected", true); if (state.mode === "chat") findChat(); if (state.mode === "debate" && state.searching) findDebate(); if (state.mode === "channel") loadChannels(); });
  state.socket.on("connect_error", error => { state.connected = false; setStatus(`Online server se connect nahi ho pa raha: ${error?.message || "server unavailable"}`); });
  state.socket.io.on("reconnect_attempt", attempt => setStatus(`Server reconnect attempt ${attempt}/8…`));
  state.socket.io.on("reconnect", () => { state.connected = true; updateControls(); if (state.mode === "chat") findChat(); if (state.mode === "debate" && state.searching) findDebate(); });
  state.socket.on("adda:waiting", () => { state.searching = true; setStatus("Doosre meme citizen ko search kiya ja raha hai…"); notify("Meme Adda", "Aap matching queue mein ho. Partner milte hi invite aayega."); });
  state.socket.on("adda:invite", invite => { state.searching = false; state.inviteId = invite.inviteId; state.partnerName = invite.partnerName || "Meme Citizen"; acceptBtn.classList.remove("adda-hidden"); rejectBtn.classList.remove("adda-hidden"); const label = invite.mode === "debate" ? `debate: ${invite.topic || "chosen topic"}` : "chat"; inviteHint.textContent = `${state.partnerName} ne ${label} invite bheja hai.`; setStatus(`${state.partnerName} ka invite pending hai.`); notify("Meme Adda Invite", `${state.partnerName} aapse ${label} ke liye connect hona chahte hain.`); });
  state.socket.on("adda:invite-rejected", () => { clearInvite(); setStatus("Invite reject ho gaya. Naya partner dhoondho."); });
  state.socket.on("adda:paired", data => { state.paired = true; state.searching = false; clearInvite(); state.partnerName = data.partnerName || "Meme Citizen"; setStatus(`${state.partnerName} ke saath connected`, true); appendSystem(`✅ Connected with ${state.partnerName}. ${data.mode === "debate" ? `Debate: ${data.topic || "custom topic"}` : "Thought share karo!"}`); updateControls(); notify("Meme Adda Connected", `${state.partnerName} ke saath aap connect ho gaye.`); });
  state.socket.on("adda:message", payload => appendMessage("them", payload.text || ""));
  state.socket.on("adda:partner-left", () => { state.paired = false; appendSystem("Partner chat se chala gaya. Find Another Person dabao."); setStatus("Partner disconnected"); });
  state.socket.on("channel:list", renderChannels);
  state.socket.on("channel:created", channel => { appendSystem(`📡 Channel created: ${channel.name}`); loadChannels(); joinChannel(channel.id); });
  state.socket.on("channel:joined", channel => { state.channelId = channel.id; state.channelName = channel.name; document.getElementById("currentChannel").classList.remove("adda-hidden"); document.getElementById("currentChannelName").textContent = `# ${channel.name}`; appendSystem(`📡 Aap #${channel.name} channel mein join ho gaye. Members: ${channel.members}`); setStatus(`#${channel.name} group connected`, true); });
  state.socket.on("channel:left", () => { state.channelId = null; state.channelName = ""; document.getElementById("currentChannel").classList.add("adda-hidden"); appendSystem("Aap channel se leave ho gaye."); });
  state.socket.on("channel:members", data => { if (state.channelId === data.id) appendSystem(`👥 #${data.name}: ${data.members} members online`); });
  state.socket.on("channel:message", payload => appendMessage("them", `${payload.fromName || "Channel member"}: ${payload.text || ""}`));
  return state.socket;
}
function findChat() { const socket = connectSocket(); if (!socket) return; state.mode = "chat"; state.searching = true; state.paired = false; socket.emit("adda:find", { mode: "chat" }); }
function findDebate() { const socket = connectSocket(); if (!socket) return; const topic = currentTopic(); if (!topic) return appendSystem("Custom debate topic likhna zaroori hai."); state.searching = true; state.paired = false; socket.emit("adda:find", { mode: "debate", topic }); setStatus(`“${topic}” debate partner search ho raha hai…`); }
function sendText() { const text = messageInput.value.trim(); if (!text || !state.socket?.connected) return; if (state.mode === "channel" && state.channelId) state.socket.emit("channel:message", { id: state.channelId, text }); else if (state.paired) state.socket.emit("adda:message", { kind: "text", text }); else return appendSystem("Pehle kisi user ya Meme Channel se connect ho jao."); appendMessage("me", text); messageInput.value = ""; }
function acceptInvite() { if (!state.inviteId || !state.socket) return; state.socket.emit("adda:accept", { inviteId: state.inviteId }); appendSystem("Invite accept kiya. Connection establish ho raha hai…"); acceptBtn.classList.add("adda-hidden"); }
function rejectInvite() { if (!state.inviteId || !state.socket) return; state.socket.emit("adda:reject", { inviteId: state.inviteId }); clearInvite(); setStatus("Invite reject kar diya."); }
function leave() { if (state.socket) { state.socket.emit("adda:leave"); state.socket.disconnect(); } state.socket = null; state.connected = false; state.paired = false; state.searching = false; state.channelId = null; clearInvite(); setStatus("🔌 Not connected"); updateControls(); }
function loadChannels() { if (state.socket?.connected) state.socket.emit("channel:list"); }
function renderChannels(channels = []) { const list = document.getElementById("channelList"); list.innerHTML = channels.length ? channels.map(channel => `<div class="channel-row"><div><strong>#${channel.name}</strong><small>${channel.members} members online</small></div><button class="btn btn-ghost" data-join-channel="${channel.id}">Join</button></div>`).join("") : "<p class=\"sub\">Abhi koi public channel nahi hai. Apna channel create karo.</p>"; }
function createChannel() { const name = document.getElementById("channelName").value.trim(); if (!name) return appendSystem("Channel name likho."); connectSocket()?.emit("channel:create", { name }); document.getElementById("channelName").value = ""; }
function joinChannel(id) { if (!state.socket?.connected) return; if (state.paired || state.searching) state.socket.emit("adda:leave"); state.mode = "channel"; state.paired = false; state.searching = false; state.socket.emit("channel:join", { id }); }
modeButtons.forEach(button => button.onclick = () => { showMode(button.dataset.mode); if (button.dataset.mode === "chat") findChat(); });
document.getElementById("debateTopic").onchange = () => customTopic.classList.toggle("adda-hidden", debateTopic.value !== "custom");
document.getElementById("debateStartBtn").onclick = findDebate;
document.getElementById("createChannelBtn").onclick = createChannel;
document.getElementById("refreshChannelsBtn").onclick = loadChannels;
document.getElementById("channelList").onclick = event => { const button = event.target.closest("[data-join-channel]"); if (button) joinChannel(button.dataset.joinChannel); };
document.getElementById("leaveChannelBtn").onclick = () => { if (state.socket?.connected && state.channelId) state.socket.emit("channel:leave", { id: state.channelId }); };
notifyBtn.onclick = () => enableNotifications(true);
document.getElementById("searchAgainBtn").onclick = () => { showMode("chat"); findChat(); };
leaveBtn.onclick = leave;
acceptBtn.onclick = acceptInvite;
rejectBtn.onclick = rejectInvite;
document.getElementById("sendBtn").onclick = sendText;
messageInput.addEventListener("keydown", event => { if (event.key === "Enter") sendText(); });
window.addEventListener("beforeunload", () => state.socket?.disconnect());
showMode("chat");
connectSocket();
setTimeout(() => { if ("Notification" in window && Notification.permission === "default") enableNotifications(false); }, 500);
