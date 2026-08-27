/* =========================================================================
   MemeMantri — mm.js
   CHANGES IN THIS VERSION:
   1. Fixed a real bug: the voice <select> dropdowns were populated from
      VOICE_STYLES (ids like "anchor","hero"...) but speak() looked up
      voices from a different object keyed by "news_anchor","radio_jockey"...
      So the voice you picked was NEVER actually used. Fixed by using one
      single VOICES array as the source of truth everywhere.
   2. Added 16 Indian/Hindi-oriented browser voice personas. The browser
      selects the best installed Hindi/Indian voice and tunes pitch/rate.
   3. Removed two dead lines (`#seats`, `#badges`) that referenced
      elements not present in the HTML — they were throwing errors and
      could silently break every script below them (generator, submit,
      smooth-scroll).
   4. Added Indian city/state memes and a dedicated Hindi (Devanagari) meme category;
      all international and universal content lives in global.js/global.html.
   5. Added "Meme Adda" — random-pairing chat + meme-sharing + debate
      feature using Socket.IO. Needs a small backend addition — see
      CHAT_SERVER_SETUP.md for the chat-server setup.
   ========================================================================= */

/* ---------------------------------------------------------------------
   VOICES — one persona, two genders each = 16 real Indian voices.
   Replace every "REPLACE_WITH_..." with a real voice ID from your TTS
   provider. On ElevenLabs, search their Voice Library for Indian /
   Hindi-accented voices (filter by language "Hindi" or accent "Indian"),
   pick a male and a female voice per persona, and paste the voice_id.
   --------------------------------------------------------------------- */
const VOICES = [
  { id: "anchor_m", persona: "News Anchor", gender: "male", emoji: "🎙️", lang: "hi-IN", pitch: 0.92, rate: 0.94, patterns: ["hindi", "india", "hi-in", "ravi", "hemant"], pause: 220 },
  { id: "anchor_f", persona: "News Anchor", gender: "female", emoji: "🎙️", lang: "hi-IN", pitch: 1.08, rate: 0.93, patterns: ["hindi", "india", "hi-in", "heera"], pause: 240 },
  { id: "rj_m", persona: "Radio Jockey", gender: "male", emoji: "📻", lang: "hi-IN", pitch: 1.02, rate: 1.04, patterns: ["hindi", "india", "hi-in", "ravi"], pause: 200 },
  { id: "rj_f", persona: "Radio Jockey", gender: "female", emoji: "📻", lang: "hi-IN", pitch: 1.16, rate: 1.05, patterns: ["hindi", "india", "hi-in", "heera"], pause: 240 },
  { id: "bolly_m", persona: "Bollywood Narrator", gender: "male", emoji: "🎬", lang: "hi-IN", pitch: 0.82, rate: 0.88, patterns: ["hindi", "india", "hi-in", "ravi"], pause: 200 },
  { id: "bolly_f", persona: "Bollywood Narrator", gender: "female", emoji: "🎬", lang: "hi-IN", pitch: 1.22, rate: 0.90, patterns: ["hindi", "india", "hi-in", "heera"], pause: 240 },
  { id: "cric_m", persona: "Cricket Commentator", gender: "male", emoji: "🏏", lang: "en-IN", pitch: 0.90, rate: 1.08, patterns: ["en-in", "india", "ravi"], pause: 180 },
  { id: "cric_f", persona: "Cricket Commentator", gender: "female", emoji: "🏏", lang: "en-IN", pitch: 1.10, rate: 1.06, patterns: ["en-in", "india", "heera"], pause: 190 },
  { id: "comic_m", persona: "Stand-up Comic", gender: "male", emoji: "😂", lang: "hi-IN", pitch: 1.00, rate: 0.98, patterns: ["hindi", "india", "hi-in", "ravi"], pause: 200 },
  { id: "comic_f", persona: "Stand-up Comic", gender: "female", emoji: "😂", lang: "hi-IN", pitch: 1.20, rate: 0.98, patterns: ["hindi", "india", "hi-in", "heera"], pause: 240 },
  { id: "roast_m", persona: "Roast Master", gender: "male", emoji: "🔥", lang: "hi-IN", pitch: 0.78, rate: 1.02, patterns: ["hindi", "india", "hi-in", "ravi"], pause: 200 },
  { id: "roast_f", persona: "Roast Master", gender: "female", emoji: "🔥", lang: "hi-IN", pitch: 1.15, rate: 1.02, patterns: ["hindi", "india", "hi-in", "heera"], pause: 240 },
  { id: "uncle_m", persona: "Desi Uncle", gender: "male", emoji: "👴", lang: "hi-IN", pitch: 0.72, rate: 0.86, patterns: ["hindi", "india", "hi-in", "ravi"], pause: 200 },
  { id: "aunty_f", persona: "Desi Aunty", gender: "female", emoji: "👵", lang: "hi-IN", pitch: 1.28, rate: 0.87, patterns: ["hindi", "india", "hi-in", "heera"], pause: 240 },
  { id: "dada_m", persona: "Dada Storyteller", gender: "male", emoji: "👴", lang: "hi-IN", pitch: 0.68, rate: 0.78, patterns: ["hindi", "india", "hi-in", "ravi"], pause: 200 },
  { id: "dadi_f", persona: "Dadi Storyteller", gender: "female", emoji: "👵", lang: "hi-IN", pitch: 1.12, rate: 0.80, patterns: ["hindi", "india", "hi-in", "heera"], pause: 240 }
];

let CATEGORIES = [
  ["all", "All India", "🇮🇳"],
  ["hindi", "हिंदी मीम्स", "🕉️"],
  ["desi", "Desi India", "🇮🇳"],
  ["bollywood", "Bollywood", "🎬"],
  ["cricket", "Cricket", "🏏"],
  ["politics", "Indian Politics", "🏛"],
  ["student", "Student Life", "🎓"],
  ["funny", "Funny India", "😂"],
  ["trending", "Trending India", "🔥"],
  ["genz", "Desi Gen Z", "🧠"],
  ["tech", "Indian Tech", "💻"],
  ["science", "Science India", "📚"],
  ["gaming", "Indian Gaming", "🎮"],
  ["love", "Desi Relationships", "💘"]
];

const MEMES = [
  { id: "m1", title: "Breaking: Student Opens Book", category: "student", creator: "@sarkari_savage", likes: 12400, plays: 88200, text: "Breaking news! A local engineering student has opened a textbook for the first time in six months. Scientists say the dust cloud was visible from space." },
  { id: "m2", title: "Chai Over Everything", category: "desi", creator: "@chaiwala_coder", likes: 9800, plays: 60110, text: "Indian problem-solving flowchart. Step one: drink chai. Step two: discuss problem for two hours. Step three: drink more chai. Problem still unsolved, but friendship level maximum." },
  { id: "m3", title: "Last Over Panic", category: "cricket", creator: "@gully_gavaskar", likes: 15200, plays: 120300, text: "Eighteen runs needed off six balls, and my heart is playing its own match. The bowler is nervous, the batsman is nervous, but my mother is calmly asking if I have eaten dinner." },
  { id: "m4", title: "It Works On My Machine", category: "tech", creator: "@semicolon_sardar", likes: 21100, plays: 143000, text: "The developer said, it works on my machine. So the manager shipped the machine to production. And that, my friends, is how cloud computing was invented in India." },
  { id: "m5", title: "Manifesto Of Memes", category: "politics", creator: "@meme_neta", likes: 30400, plays: 288000, text: "My fellow citizens! If elected, I promise free WiFi in every classroom, and mandatory nap time after lunch. Vote for me, and I shall make the syllabus fifty percent shorter!" },
  { id: "m6", title: "Bollywood Slow Motion", category: "bollywood", creator: "@filmy_frames", likes: 18700, plays: 99000, text: "He walks in slow motion. The wind blows. Three hundred goons attack. He removes his sunglasses. Physics resigns and leaves the theatre quietly." },
  { id: "m7", title: "Situationship Status", category: "love", creator: "@delulu_dilse", likes: 25600, plays: 176000, text: "We are not dating. We are not friends. We are in a quantum state of a relationship. Observation collapses it into ignored messages." },
  { id: "m8", title: "One More Match", category: "gaming", creator: "@noob_nawab", likes: 14300, plays: 87000, text: "It is two in the morning. He says just one more match. Six matches later, the sun rises, the rank drops, and the mother enters with the legendary slipper of judgement." },
  { id: "m9", title: "Physics Ka Pyaar", category: "science", creator: "@lab_lafanga", likes: 11200, plays: 65400, text: "Newton's fourth law, discovered in India. Every action has an equal and opposite relative who compares your marks with the neighbour's child." },
  { id: "m10", title: "Aura Farming", category: "genz", creator: "@vibecheck_vishal", likes: 33200, plays: 240100, text: "He did not study, he did not revise, he did not even bring a pen. He walked into the exam hall with pure vibes and left with pure trauma. Absolute aura, zero marks." },
  { id: "m11", title: "Uncle Ki Advice", category: "funny", creator: "@whatsapp_university", likes: 27800, plays: 198000, text: "Beta, in our time we walked twenty kilometres to school, uphill, both directions, without shoes, and still topped the class. Also beta, please recharge my phone, I cannot find the button." },
  { id: "m12", title: "Trending On Every App", category: "trending", creator: "@reel_rishi", likes: 41000, plays: 320000, text: "Today's trend is doing nothing productive, but filming it in cinematic mode with sad background music. Congratulations, you are now a content creator." },


  /* ---- pure Hindi (Devanagari) memes ---- */
  { id: "h1", title: "सोमवार का सन्नाटा", category: "hindi", creator: "@dilli_ka_dimaag", likes: 13500, plays: 62000, text: "सोमवार सुबह अलार्म बजते ही शरीर कहता है, अभी नहीं, बस पांच मिनट और। दो घंटे बाद वही पांच मिनट, तब तक ऑफिस पहुंचने की सारी योजना बदल चुकी होती है।" },
  { id: "h2", title: "मम्मी का सीसीटीवी", category: "hindi", creator: "@ghar_ki_khabrein", likes: 18900, plays: 91000, text: "घर में मम्मी से बड़ा कोई जासूस नहीं होता। कमरे का दरवाज़ा बंद करते ही आवाज़ आती है, अंदर क्या कर रहे हो, दरवाज़ा क्यों बंद किया है?" },
  { id: "h3", title: "परीक्षा से एक रात पहले", category: "hindi", creator: "@topper_ki_tabahi", likes: 21400, plays: 105000, text: "परीक्षा से एक रात पहले अचानक कमरा साफ करने का मन करता है, अलमारी व्यवस्थित होती है, और पूरा सिलेबस एक ही रात में खत्म करने का हौसला अचानक जाग जाता है।" },
  { id: "h4", title: "पड़ोसी का बेटा", category: "hindi", creator: "@tulna_ka_tandav", likes: 16700, plays: 78000, text: "हर घर में एक काल्पनिक किरदार होता है, पड़ोसी का बेटा, जो हमेशा टॉप करता है, हमेशा समय पर सोता है, और कभी मोबाइल नहीं चलाता।" }
];

const EXTRA_MEMES = [
  { id: "h5", title: "ऑनलाइन क्लास का कैमरा", category: "hindi", creator: "@mute_mode_maharaj", likes: 19800, plays: 93000, text: "ऑनलाइन क्लास में कैमरा बंद था, माइक्रोफोन बंद था, लेकिन मम्मी की आवाज़ पूरे लेक्चर में लाइव थी।" },
  { id: "h6", title: "चाय और बारिश", category: "hindi", creator: "@baarish_babu", likes: 17600, plays: 81000, text: "बारिश शुरू होते ही भारतीय मन में दो विचार आते हैं: पकौड़े बनेंगे और आज काम बिल्कुल नहीं होगा।" },
  { id: "r1", title: "Mumbai Local Olympics", category: "desi", creator: "@platform_pundit", likes: 14500, plays: 69000, text: "Mumbai local mein seat milna koi coincidence nahi, ye timing, strategy aur halka sa Olympic-level shoulder movement ka result hai." },
  { id: "r2", title: "Bengaluru Traffic Meditation", category: "desi", creator: "@silicon_samosa", likes: 16300, plays: 74000, text: "Bengaluru traffic ne mujhe patience, podcast aur ek hi signal par teen naye life goals de diye." },
  { id: "r3", title: "Chennai Heat Mode", category: "desi", creator: "@filtercoffee_fury", likes: 12100, plays: 55000, text: "Chennai ki garmi mein phone bhi bolta hai: bhai mujhe charge mat karo, main already 100 percent emotional hoon." },
  { id: "r4", title: "Kolkata Adda", category: "desi", creator: "@adda_archivist", likes: 13200, plays: 58000, text: "Kolkata adda starts with one question and ends three hours later with politics, poetry, football and no final answer." },
  { id: "r5", title: "Punjabi Wedding Budget", category: "desi", creator: "@dhol_department", likes: 18700, plays: 88000, text: "Punjabi wedding budget: 20 percent food, 10 percent venue, 70 percent proving that the DJ can hear us from the next district." },
];

const INDIAN_CATEGORIES = new Set([
  "funny", "trending", "desi", "hindi", "genz", "bollywood", "cricket",
  "politics", "science", "tech", "gaming", "love", "student"
]);
let MAIN_MEMES = MEMES.concat(EXTRA_MEMES).filter(m => INDIAN_CATEGORIES.has(m.category));
let radioMemes = MAIN_MEMES;
let motdPinnedId = null;

const ARENAS = [
  ["😂 Laugh Sabha", "a-orange", "comic_m"],
  ["🤣 Party Firki", "a-green", "comic_f"],
  ["🅱️ Free Bekari", "a-blue", "anchor_f"],
  ["🔴 Zero% Vaada", "a-red", "roast_m"]
];

const ROASTS = [
  "Our opponents promised roads. They delivered potholes with premium seating.",
  "They said they would digitise the village. Now even the buffalo has a QR code.",
  "Their manifesto had four hundred pages. Three hundred ninety nine were photographs of themselves.",
  "They promised twenty-four hour electricity. Technically true, spread across one full week."
];
const TICKER = [
  "BREAKING: Local student opens book after 6 months",
  "EXCLUSIVE: Chai declared official debugging tool",
  "LIVE: Meme Parliament passes bill for shorter syllabus",
  "ALERT: Desi uncle forwards 47 good-morning memes",
  "BREAKING: Indian WiFi router receives family blessings in twelve languages"
];

/* ---- local storage helpers (likes, plays, liked-state, user memes) ---- */
const LS_KEYS = { likeExtra: "mv_like_extra", likedIds: "mv_liked_ids", playExtra: "mv_play_extra", userMemes: "mv_user_memes" };

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v || fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

let likeExtra = loadJSON(LS_KEYS.likeExtra, {});
let likedIds = new Set(loadJSON(LS_KEYS.likedIds, []));
let playExtra = loadJSON(LS_KEYS.playExtra, {});
let userMemes = loadJSON(LS_KEYS.userMemes, []);

function getAllMemes() {
  return MAIN_MEMES.concat(userMemes.filter(m => INDIAN_CATEGORIES.has(m.category)));
}
function getLikes(m) {
  return (m.likes || 0) + (likeExtra[m.id] || 0);
}
function getPlays(m) {
  return (m.plays || 0) + (playExtra[m.id] || 0);
}
function toggleLike(id) {
  if (likedIds.has(id)) {
    likedIds.delete(id);
    likeExtra[id] = (likeExtra[id] || 0) - 1;
  } else {
    likedIds.add(id);
    likeExtra[id] = (likeExtra[id] || 0) + 1;
  }
  saveJSON(LS_KEYS.likedIds, [...likedIds]);
  saveJSON(LS_KEYS.likeExtra, likeExtra);
}
function bumpPlay(id) {
  playExtra[id] = (playExtra[id] || 0) + 1;
  saveJSON(LS_KEYS.playExtra, playExtra);
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---- smooth browser-only AI persona narration ---- */
let currentAudio = null;
let currentId = null;
let speechTimer = null;
let speechRun = 0;
let browserVoices = [];
let personaVoiceMap = new Map();

function getVoice(styleId) { return VOICES.find(v => v.id === styleId) || VOICES[0]; }
function updateVoiceStatus(text) { const el = document.getElementById("voiceStatus"); if (el) el.textContent = text; }
function isFemaleName(name) { return /female|woman|girl|heera|samantha|zira|susan|karen|veena|lekha/i.test(name); }
function isMaleName(name) { return /male|man|boy|ravi|hemant|david|daniel|alex|mark/i.test(name); }
function refreshBrowserVoices() {
  if (!("speechSynthesis" in window)) { browserVoices = []; updateVoiceStatus("⚠️ Browser speech is unsupported"); return; }
  browserVoices = window.speechSynthesis.getVoices() || [];
  personaVoiceMap = new Map();
  assignPersonaVoices();
  const indian = browserVoices.filter(v => /(^|[-_])(IN|hi)([-_]|$)/i.test(v.lang) || /india|hindi|हिन्दी|हिंदी/i.test(v.name));
  updateVoiceStatus(`${browserVoices.length} voice${browserVoices.length === 1 ? "" : "s"} found · ${indian.length} Hindi/Indian · persona tuning active`);
}
function scoreVoice(profile, voice, used) {
  const name = `${voice.name} ${voice.lang}`.toLowerCase(); let score = used.has(voice.name) ? -120 : 0;
  if (voice.lang.toLowerCase() === profile.lang.toLowerCase()) score += 110;
  if (voice.lang.toLowerCase().startsWith(profile.lang.slice(0, 2).toLowerCase())) score += 58;
  if (/india|hindi|hi-in|en-in|हिन्दी|हिंदी/.test(name)) score += 48;
  if (profile.gender === "female" && isFemaleName(name)) score += 42;
  if (profile.gender === "male" && isMaleName(name)) score += 42;
  profile.patterns.forEach(p => { if (name.includes(p.toLowerCase())) score += 24; });
  if (voice.default) score += 4;
  return score;
}
function assignPersonaVoices() {
  const used = new Set();
  VOICES.forEach(profile => {
    const ranked = browserVoices.map(v => ({ voice: v, score: scoreVoice(profile, v, used) })).sort((a, b) => b.score - a.score);
    const chosen = ranked[0]?.voice || null;
    personaVoiceMap.set(profile.id, chosen);
    if (chosen) used.add(chosen.name);
  });
}
function choosePersonaVoice(profile) { return personaVoiceMap.get(profile.id) || null; }
function prepareSpeechText(text, profile) {
  let clean = String(text).replace(/[😂🔥🇮🇳🏏🎬🗳💀🎙🌍🎮📚💘🎓]/g, " ").replace(/\s+/g, " ").trim();
  if (profile.id === "uncle_m" || profile.id === "aunty_f") clean = clean.replace(/!/g, "! ...");
  if (profile.id === "dada_m" || profile.id === "dadi_f") clean = clean.replace(/,/g, ", ...");
  return clean;
}
function splitSpeech(text) { return String(text).trim().match(/[^.!?।！？]+[.!?।！？]+|[^.!?।！？]+$/g)?.map(s => s.trim()).filter(Boolean) || [String(text)]; }
function finishSpeech(run, onEnd) {
  if (run !== speechRun) return;
  currentId = null; currentAudio = null; renderGrid(); renderMotd(); renderUserGrid(); renderRadioButton(); if (onEnd) onEnd();
}
function speak(id, text, styleId, speed = 1, onEnd) {
  stopSpeak();
  if (!("speechSynthesis" in window)) { updateVoiceStatus("⚠️ Web Speech API is not available"); return; }
  currentId = id; const run = ++speechRun; const profile = getVoice(styleId); const voice = choosePersonaVoice(profile); const parts = splitSpeech(prepareSpeechText(text, profile)); let i = 0;
  bumpPlay(id); renderGrid(); renderMotd(); renderUserGrid(); renderRadioButton();
  const next = () => {
    if (run !== speechRun) return;
    if (i >= parts.length) return finishSpeech(run, onEnd);
    const utterance = new SpeechSynthesisUtterance(parts[i++]);
    utterance.voice = voice || null; utterance.lang = voice?.lang || profile.lang; utterance.pitch = profile.pitch; utterance.rate = Math.max(0.65, Math.min(1.3, profile.rate * speed)); utterance.volume = 1;
    utterance.onstart = () => updateVoiceStatus(`${profile.persona} · ${profile.gender} · ${voice ? voice.name : "browser default"}`);
    utterance.onerror = error => { if (run === speechRun && error.error !== "canceled" && error.error !== "interrupted") { updateVoiceStatus("⚠️ Voice failed; try another persona or install a voice pack"); finishSpeech(run, onEnd); } };
    utterance.onend = () => { if (run === speechRun) speechTimer = setTimeout(next, /[!?।！？]$/.test(utterance.text) ? profile.pause + 160 : profile.pause); };
    window.speechSynthesis.speak(utterance);
  };
  next();
}
function stopSpeak() {
  speechRun++; if (speechTimer) clearTimeout(speechTimer); speechTimer = null; window.speechSynthesis?.cancel(); currentAudio = null; currentId = null; radioPlaying = false; renderGrid(); renderUserGrid(); renderRadioButton(); updateVoiceStatus("Voice ready");
}
if ("speechSynthesis" in window) { refreshBrowserVoices(); window.speechSynthesis.onvoiceschanged = refreshBrowserVoices; }

/* ---- hero + ticker ---- */
["😂", "🔥", "🇮🇳", "🏏", "🎬", "🗳", "💀", "🎙", "🌍"].forEach((e, i) => {
  const s = document.createElement("span");
  s.textContent = e;
  s.style.left = (8 + i * 10) + "%";
  s.style.animationDelay = (i * 0.8) + "s";
  document.getElementById("floaters").appendChild(s);
});

document.getElementById("ticker").innerHTML = [0, 1].map(() => TICKER.map(t => `<span>${t}</span>`).join("")).join("");

/* ---- voice selects (Male/Female optgroups, single source of truth) ---- */
function voiceOptionsHTML() {
  const male = VOICES.filter(v => v.gender === "male")
    .map(v => `<option value="${v.id}">${v.emoji} ${v.persona} · Male</option>`).join("");
  const female = VOICES.filter(v => v.gender === "female")
    .map(v => `<option value="${v.id}">${v.emoji} ${v.persona} · Female</option>`).join("");
  return `<optgroup label="♂ Male Voices">${male}</optgroup><optgroup label="♀ Female Voices">${female}</optgroup>`;
}

const voiceSel = document.getElementById("voice");
const voiceA = document.getElementById("voiceA");
const voiceB = document.getElementById("voiceB");

voiceSel.innerHTML = voiceOptionsHTML();
voiceA.innerHTML = voiceOptionsHTML();
voiceB.innerHTML = voiceOptionsHTML();
voiceA.value = "anchor_m";
voiceB.value = "roast_f";

/* ---- feed ---- */
let category = "all";
let speedVal = 1;
let searchTerm = "";

const chips = document.getElementById("chips");
chips.innerHTML = CATEGORIES.map(([id, l, e]) => `<button class="chip${id === "all" ? " active" : ""}" data-cat="${id}">${e} ${l}</button>`).join("");

chips.onclick = e => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  category = b.dataset.cat;
  [...chips.children].forEach(c => c.classList.toggle("active", c.dataset.cat === category));
  renderGrid();
};
function fmt(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : n;
}

function matchesSearch(m, term) {
  if (!term) return true;
  const t = term.toLowerCase();
  return m.title.toLowerCase().includes(t) || m.text.toLowerCase().includes(t) || m.creator.toLowerCase().includes(t);
}

function memeCardHTML(m) {
  const likes = getLikes(m);
  const plays = getPlays(m);
  const liked = likedIds.has(m.id);
  return `
    <article class="card glass">
      <span class="tag">${escapeHtml(m.category)}${m.userSubmitted ? " · community" : ""}</span>
      <h3>${escapeHtml(m.title)}</h3>
      <p>${escapeHtml(m.text)}</p>
      <div class="meta">
        <span>${escapeHtml(m.creator)}</span>
        <span>
          <span class="like-btn${liked ? " liked" : ""}" data-like="${m.id}">${liked ? "❤️" : "🤍"} ${fmt(likes)}</span>
          · ▶ ${fmt(plays)}
        </span>
      </div>
      <button class="btn ${currentId === m.id ? "btn-green" : "btn-primary"}" data-play="${m.id}">
        ${currentId === m.id ? '<span class="eq"><i></i><i></i><i></i><i></i></span> Playing' : "🔊 Narrate"}
      </button>
    </article>`;
}

function renderGrid() {
  const pool = getAllMemes();
  const list = pool.filter(m => (category === "all" || m.category === category) && matchesSearch(m, searchTerm));
  document.getElementById("memeGrid").innerHTML = list.map(memeCardHTML).join("");
  document.getElementById("emptyState").style.display = list.length ? "none" : "block";
}

document.getElementById("memeGrid").onclick = e => {
  const likeBtn = e.target.closest("[data-like]");
  if (likeBtn) {
    toggleLike(likeBtn.dataset.like);
    renderGrid();
    return;
  }
  const b = e.target.closest("[data-play]");
  if (!b) return;
  const m = getAllMemes().find(x => x.id === b.dataset.play);
  currentId === m.id ? stopSpeak() : speak(m.id, m.text, voiceSel.value, speedVal);
};
document.getElementById("speed").oninput = e => {
  speedVal = +e.target.value;
  updateSpeedVal();
};

function updateSpeedVal() {
  document.getElementById("speedVal").textContent = speedVal.toFixed(2);
}

document.getElementById("stopAll").onclick = stopSpeak;

let searchDebounce;
document.getElementById("search").oninput = e => {
  clearTimeout(searchDebounce);
  const val = e.target.value;
  searchDebounce = setTimeout(() => {
    searchTerm = val;
    renderGrid();
  }, 150);
};

renderGrid();

/* ---- meme of the day ---- */
function renderMotd() {
  const pool = MAIN_MEMES;
  const pinned = motdPinnedId ? pool.find(x => x.id === motdPinnedId) : null;
  const dayIndex = Math.floor(Date.now() / 86400000) % pool.length;
  const m = pinned || pool[dayIndex];
  document.getElementById("motdCard").innerHTML = `
    <h3>${escapeHtml(m.title)}</h3>
    <p style="color:#ddd7cf">${escapeHtml(m.text)}</p>
    <div class="meta"><span>${escapeHtml(m.creator)}</span><span>❤️ ${fmt(getLikes(m))} · ▶ ${fmt(getPlays(m))}</span></div>
    <button class="btn btn-primary" data-play-motd="${m.id}" style="align-self:flex-start">
      ${currentId === m.id ? '<span class="eq"><i></i><i></i><i></i><i></i></span> Playing' : "🔊 Narrate"}
    </button>`;
}
document.getElementById("motdCard").onclick = e => {
  const b = e.target.closest("[data-play-motd]");
  if (!b) return;
  const m = MAIN_MEMES.find(x => x.id === b.dataset.playMotd);
  currentId === m.id ? stopSpeak() : speak(m.id, m.text, voiceSel.value, speedVal);
};
renderMotd();

/* ---- radio ---- */
let rIdx = 0;
let radioPlaying = false;

function renderRadio() {
  const m = radioMemes[rIdx];
  if (!m) return;
  document.getElementById("radioTitle").textContent = m.title;
  document.getElementById("radioText").textContent = m.text;
  document.getElementById("radioIdx").textContent = `Track ${rIdx + 1} / ${radioMemes.length}`;
}

function renderRadioButton() {
  const btn = document.getElementById("radioPlay");
  const isOn = currentId === "radio" && radioPlaying;
  btn.textContent = isOn ? "■ Stop" : "▶ Tune In";
  btn.classList.toggle("btn-green", isOn);
  btn.classList.toggle("btn-primary", !isOn);
}

function playRadio() {
  radioPlaying = true;
  const m = radioMemes[rIdx];
  if (!m) { radioPlaying = false; return; }
  speak("radio", "You are listening to Meme FM sixty nine point nine. " + m.text, "rj_m", 1, () => {
    if (!radioPlaying) return;
    rIdx = (rIdx + 1) % radioMemes.length;
    renderRadio();
    playRadio();
  });
}
document.getElementById("radioPlay").onclick = () => {
  radioPlaying ? stopSpeak() : playRadio();
};

document.getElementById("radioNext").onclick = () => {
  rIdx = (rIdx + 1) % radioMemes.length;
  renderRadio();
  if (radioPlaying) playRadio();
};

renderRadio();
renderRadioButton();

/* ---- 24-hour VoiceMantri public meme battle ---- */
let battleSocket = null;
let battleState = null;
const BATTLE_VOTER_TOKEN = (() => {
  const key = "mm_voice_mantri_voter_token";
  let token = localStorage.getItem(key);
  if (!token) { token = (crypto.randomUUID ? crypto.randomUUID() : `voter_${Date.now()}_${Math.random().toString(36).slice(2)}`); localStorage.setItem(key, token); }
  return token;
})();
function battleServerUrl() { return window.MEME_CHAT_SERVER_URL || (location.protocol === "file:" ? "http://localhost:3000" : location.origin); }
function battleMessage(message, error = false) { const el = document.getElementById("battleSubmitMsg"); if (el) { el.textContent = message; el.style.color = error ? "#ff6b6b" : "var(--muted)"; } }
function battleSubmission(slot) { return battleState?.submissions?.find(s => s.slot === slot) || null; }
function battleCountdown() {
  const el = document.getElementById("battleCountdown"); if (!el || !battleState?.endsAt) return;
  const ms = Math.max(0, new Date(battleState.endsAt).getTime() - Date.now()); const total = Math.floor(ms / 1000);
  el.textContent = ms > 0 ? `${String(Math.floor(total / 3600)).padStart(2, "0")}:${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")} left` : "Contest settling…";
}
function renderBattle() {
  if (!battleState) return;
  const open = battleState.status === "open";
  const status = document.getElementById("battleStatus");
  if (status) status.textContent = open ? (battleState.submissions.length < 2 ? "Waiting for two random meme users" : "Voting is live") : "Contest settled";
  battleCountdown();
  ["A", "B"].forEach(slot => {
    const item = battleSubmission(slot); const title = document.getElementById(`battleTitle${slot}`); const body = document.getElementById(`battleText${slot}`); const author = document.getElementById(`battleAuthor${slot}`); const votesEl = document.getElementById(`votes${slot}`);
    if (title) title.textContent = item ? item.title : slot === "A" ? "Waiting for first user…" : "Waiting for second user…";
    if (body) body.textContent = item ? item.text : slot === "A" ? "Pehla random user apni choice ke topic par meme submit karega." : "Doosra random user apni choice ke topic par competing meme submit karega.";
    if (author) author.textContent = item ? item.author : "Open slot";
    if (votesEl) votesEl.textContent = item ? item.votes : "0";
    document.querySelectorAll(`[data-battle="${slot}"]`).forEach(btn => { btn.disabled = !item; });
    document.querySelectorAll(`[data-vote="${slot}"]`).forEach(btn => { btn.disabled = !item || !open || battleState.viewerVoted || battleState.viewerSubmissionId === item.id; });
  });
  const submitBtn = document.getElementById("battleSubmitBtn"); if (submitBtn) submitBtn.disabled = !open || battleState.submissions.length >= 2 || !!battleState.viewerSubmissionId;
  const winner = battleState.todayVoiceMantri; const winnerEl = document.getElementById("todayVoiceMantri");
  if (winnerEl) winnerEl.textContent = winner ? `${winner.author} — ${winner.title} (${winner.votes} votes)` : "Aaj ka winner 24-hour contest ke baad yahan show hoga.";
  const historyEl = document.getElementById("retiredVoiceMantriList");
  if (historyEl) {
    const history = battleState.retiredVoiceMantris || [];
    historyEl.innerHTML = history.length ? history.map((entry, index) => {
      const date = entry.settled_at ? new Date(entry.settled_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Date unavailable";
      return `<div class="glass card" style="margin-top:10px;padding:12px"><div class="meta"><strong>#${history.length - index} Retired VoiceMantri</strong><span>${date}</span></div><p style="margin:8px 0 4px"><strong>${entry.author}</strong> — ${entry.title}</p><small class="sub">${entry.votes} votes</small></div>`;
    }).join("") : "<p class=\"sub\">Abhi koi retired VoiceMantri history available nahi hai.</p>";
  }
}
function connectBattle() {
  if (typeof io === "undefined") { battleMessage("Realtime contest client load nahi hua.", true); return; }
  const serverUrl = battleServerUrl();
  battleSocket = io(serverUrl, { transports: ["websocket", "polling"], auth: { battleVoterToken: BATTLE_VOTER_TOKEN }, reconnection: true, reconnectionAttempts: 8, timeout: 8000 });
  battleSocket.on("connect", () => { battleSocket.emit("battle:state"); });
  battleSocket.on("battle:state", state => { battleState = state; renderBattle(); });
  battleSocket.on("battle:update", state => { battleState = state; renderBattle(); });
  battleSocket.on("battle:error", ({ message }) => battleMessage(message || "Contest request failed.", true));
  battleSocket.on("battle:submitted", () => { battleMessage("✅ Aapka meme submit ho gaya. Doosre user ka wait hai."); document.getElementById("battleTitle").value = ""; document.getElementById("battleSubmissionText").value = ""; });
  battleSocket.on("battle:vote-accepted", () => battleMessage("✅ Vote record ho gaya. Ek user ek contest mein sirf ek vote de sakta hai."));
  battleSocket.on("battle:settled", state => { battleState = state; renderBattle(); battleMessage("🏆 24-hour contest settle ho gaya. Today’s VoiceMantri update ho gaya."); });
  battleSocket.on("connect_error", err => {
    const sameOrigin = (() => { try { return new URL(serverUrl, location.href).origin === location.origin; } catch { return true; } })();
    const netlifyStatic = /(^|\\.)netlify\\.app$/i.test(location.hostname) || /(^|\\.)netlify\\.com$/i.test(location.hostname);
    const hint = sameOrigin && netlifyStatic
      ? " Netlify par sirf frontend hai—server.js ko HTTPS Node hosting par chalao aur index.html mein MEME_CHAT_SERVER_URL set karo."
      : " Backend URL, HTTPS aur CORS setting check karo.";
    battleMessage(`Contest server se connect nahi ho pa raha: ${err?.message || "server unavailable"}.${hint}`, true);
  });
}
document.getElementById("battleSubmitBtn").onclick = () => {
  const handle = document.getElementById("battleHandle").value.trim(); const title = document.getElementById("battleTitle").value.trim(); const memeText = document.getElementById("battleSubmissionText").value.trim();
  if (!handle || !title || !memeText) return battleMessage("Name/handle, title aur meme text teeno bharna zaroori hai.", true);
  if (!battleSocket?.connected) return battleMessage("Contest server se connection nahi hua.", true);
  battleSocket.emit("battle:submit", { handle, title, text: memeText });
};
document.querySelectorAll("[data-battle]").forEach(button => { button.onclick = () => { const item = battleSubmission(button.dataset.battle); if (item) speak("battle" + button.dataset.battle, item.text, button.dataset.battle === "A" ? voiceA.value : voiceB.value, 1); }; });
document.querySelectorAll("[data-vote]").forEach(button => { button.onclick = () => { const item = battleSubmission(button.dataset.vote); if (item && battleSocket?.connected) battleSocket.emit("battle:vote", { submissionId: item.id }); }; });
setInterval(battleCountdown, 1000);
connectBattle();

/* ---- roast arena ---- */
const arenas = document.getElementById("arenas");
arenas.innerHTML = ARENAS.map(([name, cls, voice], i) => `
  <div class="arena ${cls}">
    <h3>${name}</h3>
    <p style="color:#ddd7cf;margin:10px 0 14px">${ROASTS[i]}</p>
    <button class="btn btn-ghost" data-roast="${i}" data-voice="${voice}">🔥 Roast It</button>
  </div>`).join("");

arenas.onclick = e => {
  const b = e.target.closest("[data-roast]");
  if (!b) return;
  speak("roast" + b.dataset.roast, ROASTS[+b.dataset.roast], b.dataset.voice, 1);
};

/* ---- generator (template-based, no API needed) ---- */
const TPL = [
  t => `Breaking news from every Indian household: ${t} has officially defeated all productivity. Experts are calling it a national emergency of laughter.`,
  t => `Scene one: ${t} enters. Scene two: everyone panics. Scene three: someone makes chai. Interval.`,
  t => `Beta, in our time we handled ${t} without internet, without shortcuts, and still topped the class. Now please recharge my phone.`,
  t => `My fellow citizens! If elected, I promise to eliminate ${t} within one hundred days. Vote for me and enjoy free WiFi with it.`
];
const genPlay = document.getElementById("genPlay");

document.getElementById("genBtn").onclick = () => {
  const t = (document.getElementById("topic").value || "Monday morning traffic").trim();
  const line = TPL[Math.floor(Math.random() * TPL.length)](t);
  document.getElementById("genOut").textContent = `[${document.getElementById("lang").value}] ${line}`;
  genPlay.disabled = false;
  genPlay.dataset.text = line;
};

genPlay.onclick = () => speak("gen", genPlay.dataset.text, voiceSel.value, 1);

/* ---- user meme submission ---- */
const subCategory = document.getElementById("subCategory");
subCategory.innerHTML = CATEGORIES.filter(([id]) => id !== "all").map(([id, l, e]) => `<option value="${id}">${e} ${l}</option>`).join("");

function renderUserGrid() {
  const submittedIndian = userMemes.filter(m => INDIAN_CATEGORIES.has(m.category));
  document.getElementById("userMemeGrid").innerHTML = submittedIndian.length
    ? submittedIndian.slice().reverse().map(memeCardHTML).join("")
    : `<p class="empty-state">Koi Indian meme submit nahi hua abhi tak — sabse pehla tum ho jao! 🎤</p>`;
}
document.getElementById("userMemeGrid").onclick = e => {
  const likeBtn = e.target.closest("[data-like]");
  if (likeBtn) {
    toggleLike(likeBtn.dataset.like);
    renderUserGrid();
    renderGrid();
    return;
  }
  const b = e.target.closest("[data-play]");
  if (!b) return;
  const m = getAllMemes().find(x => x.id === b.dataset.play);
  currentId === m.id ? stopSpeak() : speak(m.id, m.text, voiceSel.value, speedVal);
};

document.getElementById("subBtn").onclick = async () => {
  const title = document.getElementById("subTitle").value.trim();
  const text = document.getElementById("subText").value.trim();
  const creatorRaw = document.getElementById("subCreator").value.trim();
  const cat = subCategory.value;
  const msg = document.getElementById("subMsg");

  if (!title || !text) {
    msg.textContent = "⚠️ Title aur meme text dono zaroori hain.";
    msg.style.color = "var(--red)";
    return;
  }
  const creator = creatorRaw ? (creatorRaw.startsWith("@") ? creatorRaw : "@" + creatorRaw) : "@anonymous";
  try {
    const res = await fetch("/api/public/petitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, text, category: cat, creator }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Submit fail ho gaya.");
    msg.textContent = "✅ " + data.message;
    msg.style.color = "var(--green)";
    document.getElementById("subTitle").value = "";
    document.getElementById("subText").value = "";
    document.getElementById("subCreator").value = "";
  } catch (err) {
    /* server unreachable — fall back to local-only preview so the page still works */
    const meme = { id: "u" + Date.now(), title, text, category: cat, creator, likes: 0, plays: 0, userSubmitted: true };
    userMemes.push(meme);
    saveJSON(LS_KEYS.userMemes, userMemes);
    msg.textContent = "✅ Submit ho gaya (local preview). Neeche dekho.";
    msg.style.color = "var(--green)";
    renderUserGrid();
    renderGrid();
  }
};

renderUserGrid();

/* Meme Adda now lives on adda.html. */

/* ---- day/night mode toggle ---- */
const themeToggleBtn = document.getElementById("themeToggle");
function applyThemeIcon() {
  if (!themeToggleBtn) return;
  themeToggleBtn.textContent = document.documentElement.classList.contains("light-theme") ? "☀️" : "🌙";
}
if (themeToggleBtn) {
  applyThemeIcon();
  themeToggleBtn.onclick = () => {
    document.documentElement.classList.toggle("light-theme");
    localStorage.setItem("mm_theme", document.documentElement.classList.contains("light-theme") ? "light" : "dark");
    applyThemeIcon();
  };
}

/* ---- smooth scroll nav ---- */
document.querySelectorAll("[data-jump]").forEach(b => {
  b.onclick = () => {
    const el = document.getElementById(b.dataset.jump);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
});

const ELEVENLABS_API_KEY = ""; // not used — browser-native speechSynthesis handles narration

/* ---------------------------------------------------------------------
   Live sync with the admin-managed backend (memes, ministries, ticker,
   MOTD pin, maintenance mode). Falls back to the static content above
   if the server is unreachable, so the page still works standalone.
   --------------------------------------------------------------------- */
function showMaintenanceOverlay(message, title) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:#0e100f;color:#f7f2e9;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:'Space Grotesk',sans-serif;";
  overlay.innerHTML = `<div><div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#ffad3d;">Maintenance</div><h1 style="font-family:'Bebas Neue',sans-serif;font-size:48px;margin:10px 0;">${escapeHtml(title || "MemeMantri")}</h1><p style="color:#a8afa9;max-width:480px;margin:auto">${escapeHtml(message || "Site abhi maintenance mein hai.")}</p></div>`;
  document.body.appendChild(overlay);
}
async function syncWithServer() {
  let site, memes;
  try {
    [site, memes] = await Promise.all([
      fetch("/api/public/site").then(r => r.json()),
      fetch("/api/public/memes").then(r => r.json())
    ]);
  } catch { return; /* server unreachable — keep static fallback content */ }

  if (site.maintenance) { showMaintenanceOverlay(site.maintenanceMessage, site.siteTitle); return; }

  if (site.siteTitle) document.title = document.title.replace(/^[^—]+/, site.siteTitle + " ");
  const taglineEl = document.getElementById("siteTagline");
  if (taglineEl && site.tagline) taglineEl.textContent = site.tagline;

  if (Array.isArray(site.ministries) && site.ministries.length) {
    CATEGORIES = [["all", "All India", "🇮🇳"], ...site.ministries];
  }
  if (Array.isArray(memes) && memes.length) {
    MAIN_MEMES = memes.map(m => ({ id: "srv" + m.id, title: m.title, category: m.category, creator: m.creator, text: m.text, likes: m.likes || 0, plays: m.plays || 0, _radio: !!m.radio_enabled }));
    radioMemes = MAIN_MEMES.filter(m => m._radio);
    if (!radioMemes.length) radioMemes = MAIN_MEMES;
  }
  motdPinnedId = site.motdMemeId ? "srv" + site.motdMemeId : null;

  if (Array.isArray(site.ticker) && site.ticker.length) {
    document.getElementById("ticker").innerHTML = [0, 1].map(() => site.ticker.map(t => `<span>${escapeHtml(t)}</span>`).join("")).join("");
  }

  chips.innerHTML = CATEGORIES.map(([id, l, e]) => `<button class="chip${id === category ? " active" : ""}" data-cat="${id}">${e} ${l}</button>`).join("");
  subCategory.innerHTML = CATEGORIES.filter(([id]) => id !== "all").map(([id, l, e]) => `<option value="${id}">${e} ${l}</option>`).join("");
  rIdx = 0;
  renderGrid();
  renderMotd();
  renderRadio();
  renderUserGrid();
}
syncWithServer();
