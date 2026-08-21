const SOCKET_SERVER_URL = window.MEME_CHAT_SERVER_URL || (location.protocol === "file:" ? "http://localhost:3000" : location.origin);
const INDIAN_MEMES = [
  { id: "adda-h1", title: "मम्मी का सीसीटीवी", text: "घर में मम्मी से बड़ा कोई जासूस नहीं होता। कमरे का दरवाज़ा बंद करते ही सवाल शुरू हो जाते हैं।" },
  { id: "adda-desi1", title: "Chai Over Everything", text: "Step one: chai. Step two: problem par do ghante discussion. Step three: aur chai. Problem abhi bhi wahi hai." },
  { id: "adda-cricket1", title: "Last Over Panic", text: "Eighteen runs needed off six balls, bowler nervous, batsman nervous, aur mummy pooch rahi hain: dinner kiya?" },
  { id: "adda-student1", title: "Exam Se Ek Raat Pehle", text: "Exam se ek raat pehle room clean karne ki energy aati hai, syllabus kholne ki nahi." },
  { id: "adda-city1", title: "Bengaluru Traffic Meditation", text: "Bengaluru traffic ne patience, podcast aur ek signal par teen naye life goals de diye." },
  { id: "adda-bolly1", title: "Bollywood Slow Motion", text: "Hero sunglasses utarta hai, physics resign karke theatre se bahar chali jaati hai." }
];
const state = { mode: "chat", socket: null, paired: false, inviteId: null, partnerName: "", connected: false };
const statusEl = document.getElementById("addaStatus");
const messagesEl = document.getElementById("addaMessages");
const messageInput = document.getElementById("messageInput");
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const memeSelect = document.getElementById("memeSelect");
const debateTopic = document.getElementById("debateTopic");
const joinBtn = document.getElementById("joinBtn");
const leaveBtn = document.getElementById("leaveBtn");
const acceptBtn = document.getElementById("acceptInviteBtn");
const rejectBtn = document.getElementById("rejectInviteBtn");
const inviteHint = document.getElementById("inviteHint");

memeSelect.innerHTML = INDIAN_MEMES.map(m => `<option value="${m.id}">${m.title}</option>`).join("");
function selectedMeme() { return INDIAN_MEMES.find(m => m.id === memeSelect.value) || INDIAN_MEMES[0]; }
function setStatus(text, strong = false) { statusEl.textContent = text; if (strong) statusEl.innerHTML = `🟢 <strong>${text}</strong>`; }
function appendMessage(who, text) { const row = document.createElement("div"); row.className = `adda-msg ${who}`; row.textContent = text; messagesEl.appendChild(row); messagesEl.scrollTop = messagesEl.scrollHeight; }
function appendSystem(text) { appendMessage("system", text); }
function notify(title, body) { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body, icon: "./favicon.ico" }); }
async function enableNotifications() { if (!("Notification" in window)) { appendSystem("Is browser mein notifications supported nahi hain."); return; } const result = await Notification.requestPermission(); appendSystem(result === "granted" ? "🔔 Browser notifications enabled." : "🔕 Notification permission nahi mili; in-page invite alert available rahega."); }
function clearInvite() { state.inviteId = null; acceptBtn.classList.add("adda-hidden"); rejectBtn.classList.add("adda-hidden"); }
function updateControls() { joinBtn.textContent = state.paired ? "🟢 Connected" : state.connected ? "🔎 Searching…" : "🎲 Find Someone"; joinBtn.disabled = state.paired || state.connected; leaveBtn.classList.toggle("adda-hidden", !state.connected); }
function chooseMode(mode) { state.mode = mode; modeButtons.forEach(b => b.classList.toggle("active", b.dataset.mode === mode)); if (mode === "debate") { debateTopic.focus(); inviteHint.textContent = "Debate mode: topic ke saath partner ko invite milega."; } else if (mode === "meme") inviteHint.textContent = "Meme mode: selected Indian meme ke context ke saath invite milega."; else inviteHint.textContent = "Chat mode: partner milte hi browser notification aur invite alert dikhega."; }
function connectAndFind() {
  if (state.socket?.connected) { state.socket.emit("adda:find", contextPayload()); return; }
  if (typeof io === "undefined") { setStatus("Socket.IO load nahi hua. Server/connection check karo."); return; }
  state.socket = io(SOCKET_SERVER_URL, { transports: ["websocket", "polling"] });
  state.socket.on("connect", () => { state.connected = true; updateControls(); state.socket.emit("adda:find", contextPayload()); });
  state.socket.on("connect_error", () => setStatus("Online server se connect nahi ho pa raha."));
  state.socket.on("adda:waiting", () => { setStatus("Doosre meme citizen ko search kiya ja raha hai…"); notify("Meme Adda", "Aap matching queue mein ho. Partner milte hi invite aayega."); });
  state.socket.on("adda:invite", invite => { state.inviteId = invite.inviteId; state.partnerName = invite.partnerName || "Meme Citizen"; acceptBtn.classList.remove("adda-hidden"); rejectBtn.classList.remove("adda-hidden"); const label = invite.mode === "debate" ? "debate" : invite.mode === "meme" ? "meme comparison" : "chat"; inviteHint.textContent = `${state.partnerName} ne ${label} invite bheja hai.`; setStatus(`${state.partnerName} ka invite pending hai.`); notify("Meme Adda Invite", `${state.partnerName} aapse ${label} ke liye connect hona chahte hain.`); });
  state.socket.on("adda:invite-rejected", () => { clearInvite(); setStatus("Invite reject ho gaya. Naya partner dhoondho."); updateControls(); });
  state.socket.on("adda:paired", data => { state.paired = true; state.connected = true; clearInvite(); state.partnerName = data.partnerName || "Meme Citizen"; setStatus(`${state.partnerName} ke saath connected`, true); appendSystem(`✅ Connected with ${state.partnerName}. ${data.mode === "debate" ? "Debate shuru karo!" : data.mode === "meme" ? "Meme compare karo!" : "Thought share karo!"}`); if (data.topic) appendSystem(`Debate topic: ${data.topic}`); if (data.meme) appendSystem(`Selected meme: ${data.meme.title}`); updateControls(); notify("Meme Adda Connected", `${state.partnerName} ke saath aap connect ho gaye.`); });
  state.socket.on("adda:message", payload => { if (payload.kind === "meme" && payload.meme) appendMessage("them", `📎 ${payload.fromName || state.partnerName} shared: ${payload.meme.title}\n${payload.meme.text}`); else appendMessage("them", payload.text || ""); });
  state.socket.on("adda:partner-left", () => { state.paired = false; appendSystem("Partner chat se chala gaya. Aap naya partner dhoondh sakte ho."); setStatus("Partner disconnected"); updateControls(); });
  state.socket.on("disconnect", () => { state.connected = false; state.paired = false; clearInvite(); setStatus("🔌 Connection closed"); updateControls(); });
}
function contextPayload() { const meme = selectedMeme(); return { mode: state.mode, topic: debateTopic.value.trim().slice(0, 160), meme: state.mode === "meme" || state.mode === "debate" ? meme : null }; }
function sendText() { const text = messageInput.value.trim(); if (!text || !state.socket?.connected || !state.paired) return; state.socket.emit("adda:message", { kind: "text", text }); appendMessage("me", text); messageInput.value = ""; }
function shareMeme() { const meme = selectedMeme(); if (!state.socket?.connected || !state.paired) { appendSystem("Pehle partner ke saath connect ho jao."); return; } state.socket.emit("adda:message", { kind: "meme", meme }); appendMessage("me", `📎 You shared: ${meme.title}\n${meme.text}`); }
function acceptInvite() { if (!state.inviteId || !state.socket) return; state.socket.emit("adda:accept", { inviteId: state.inviteId }); appendSystem("Invite accept kiya. Doosre user ke response ka wait hai…"); acceptBtn.classList.add("adda-hidden"); }
function rejectInvite() { if (!state.inviteId || !state.socket) return; state.socket.emit("adda:reject", { inviteId: state.inviteId }); clearInvite(); setStatus("Invite reject kar diya."); }
function leave() { if (state.socket) { state.socket.emit("adda:leave"); state.socket.disconnect(); } state.socket = null; state.connected = false; state.paired = false; clearInvite(); setStatus("🔌 Not connected"); updateControls(); appendSystem("Aap Adda se leave ho gaye."); }

modeButtons.forEach(button => button.onclick = () => chooseMode(button.dataset.mode));
document.getElementById("notifyBtn").onclick = enableNotifications;
joinBtn.onclick = connectAndFind;
leaveBtn.onclick = leave;
acceptBtn.onclick = acceptInvite;
rejectBtn.onclick = rejectInvite;
document.getElementById("sendBtn").onclick = sendText;
document.getElementById("shareMemeBtn").onclick = shareMeme;
messageInput.addEventListener("keydown", e => { if (e.key === "Enter") sendText(); });
window.addEventListener("beforeunload", () => state.socket?.disconnect());
updateControls();
