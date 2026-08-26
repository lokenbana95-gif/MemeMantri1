const ADMIN_ROUTE = window.ADMIN_ROUTE || location.pathname.replace(/\/+$/, "");
const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginMsg = document.getElementById("loginMsg");
const contestMsg = document.getElementById("contestMsg");
const logoutBtn = document.getElementById("logoutBtn");

function setNotice(element, message, kind = "") {
  element.textContent = message;
  element.className = `notice ${kind}`.trim();
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
function showDashboard(user) {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  document.getElementById("welcomeText").textContent = `Logged in as ${user.username}. Protected operations only.`;
  loadDashboard();
}
function showLogin() {
  loginView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
  logoutBtn.classList.add("hidden");
}
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}
function renderDashboard(data) {
  const contest = data.contest;
  document.getElementById("serverMetric").textContent = data.health.ok ? "Online" : "Issue";
  document.getElementById("slotsMetric").textContent = `${contest.submissions.length}/2`;
  document.getElementById("channelsMetric").textContent = data.channels.length;
  document.getElementById("historyMetric").textContent = data.history.length;
  const pill = document.getElementById("contestPill");
  pill.textContent = contest.status === "open" ? "Open" : "Settled";
  pill.className = `pill${contest.status === "open" ? "" : " warn"}`;
  document.getElementById("contestRows").innerHTML = contest.submissions.length
    ? contest.submissions.map(item => `<div class="row"><div class="row-top"><strong>Slot ${escapeHtml(item.slot)} · ${escapeHtml(item.author)}</strong><span>${item.votes} votes</span></div><small><b>${escapeHtml(item.title)}</b><br />${escapeHtml(item.text)}</small></div>`).join("")
    : '<div class="empty">Abhi dono slots empty hain.</div>';
  document.getElementById("historyRows").innerHTML = data.history.length
    ? data.history.map((item, index) => `<div class="row"><div class="row-top"><strong>#${data.history.length - index} ${escapeHtml(item.author)}</strong><span>${item.votes} votes</span></div><small>${escapeHtml(item.title)} · ${item.settled_at ? new Date(item.settled_at).toLocaleString("en-IN") : "Date unavailable"}</small></div>`).join("")
    : '<div class="empty">No retired winners yet.</div>';
  document.getElementById("channelRows").innerHTML = data.channels.length
    ? data.channels.map(channel => `<div class="row"><div class="row-top"><strong>#${escapeHtml(channel.name)}</strong><button class="danger" data-remove-channel="${escapeHtml(channel.id)}">Remove</button></div><small>${channel.members} members online</small></div>`).join("")
    : '<div class="empty">No live channels right now.</div>';
  document.getElementById("settleBtn").disabled = contest.status !== "open";
  document.getElementById("newContestBtn").disabled = contest.status === "open";
}
async function loadDashboard() {
  try { renderDashboard(await api(`${ADMIN_ROUTE}/api/dashboard`)); }
  catch (error) { if (/401|403|login/i.test(error.message)) { showLogin(); setNotice(loginMsg, "Session expire ho gaya. Dobara login karo.", "error"); } else setNotice(contestMsg, error.message, "error"); }
}
loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  setNotice(loginMsg, "Checking credentials…");
  try {
    const data = await api(`${ADMIN_ROUTE}/api/login`, { method: "POST", body: JSON.stringify({ username: document.getElementById("username").value.trim(), password: document.getElementById("password").value }) });
    loginForm.reset();
    showDashboard(data.user);
  } catch (error) { setNotice(loginMsg, error.message, "error"); }
});
document.getElementById("refreshBtn").onclick = loadDashboard;
document.getElementById("settleBtn").onclick = async () => {
  if (!confirm("Current VoiceMantri contest ko settle karna hai?")) return;
  try { const data = await api(`${ADMIN_ROUTE}/api/contest/settle`, { method: "POST" }); setNotice(contestMsg, data.message, "ok"); loadDashboard(); }
  catch (error) { setNotice(contestMsg, error.message, "error"); }
};
document.getElementById("newContestBtn").onclick = async () => {
  if (!confirm("New 24-hour VoiceMantri contest start karna hai?")) return;
  try { const data = await api(`${ADMIN_ROUTE}/api/contest/new`, { method: "POST" }); setNotice(contestMsg, data.message, "ok"); loadDashboard(); }
  catch (error) { setNotice(contestMsg, error.message, "error"); }
};
document.getElementById("channelRows").onclick = async event => {
  const button = event.target.closest("[data-remove-channel]");
  if (!button || !confirm("Is live channel ko remove karna hai?")) return;
  try { const data = await api(`${ADMIN_ROUTE}/api/channels/${encodeURIComponent(button.dataset.removeChannel)}/remove`, { method: "POST" }); setNotice(contestMsg, data.message, "ok"); loadDashboard(); }
  catch (error) { setNotice(contestMsg, error.message, "error"); }
};
logoutBtn.onclick = async () => { try { await api(`${ADMIN_ROUTE}/api/logout`, { method: "POST" }); } finally { showLogin(); } };
(async () => { try { const data = await api(`${ADMIN_ROUTE}/api/me`); showDashboard(data.user); } catch { showLogin(); } })();
