const GLOBAL_VOICES = [
  { id: "anchor_m", label: "🎙️ News Anchor · Male", lang: "hi-IN", pitch: 0.92, rate: 0.94, patterns: ["hindi", "india", "hi-in", "ravi", "hemant"] },
  { id: "anchor_f", label: "🎙️ News Anchor · Female", lang: "hi-IN", pitch: 1.08, rate: 0.93, patterns: ["hindi", "india", "hi-in", "heera"] },
  { id: "rj_m", label: "📻 Radio Jockey · Male", lang: "hi-IN", pitch: 1.02, rate: 1.04, patterns: ["hindi", "india", "hi-in", "ravi"] },
  { id: "rj_f", label: "📻 Radio Jockey · Female", lang: "hi-IN", pitch: 1.16, rate: 1.05, patterns: ["hindi", "india", "hi-in", "heera"] },
  { id: "comic_m", label: "😂 Stand-up Comic · Male", lang: "hi-IN", pitch: 1.0, rate: 0.98, patterns: ["hindi", "india", "hi-in", "ravi"] },
  { id: "comic_f", label: "😂 Stand-up Comic · Female", lang: "hi-IN", pitch: 1.2, rate: 0.98, patterns: ["hindi", "india", "hi-in", "heera"] },
  { id: "roast_m", label: "🔥 Roast Master · Male", lang: "hi-IN", pitch: 0.78, rate: 1.02, patterns: ["hindi", "india", "hi-in", "ravi"] },
  { id: "roast_f", label: "🔥 Roast Master · Female", lang: "hi-IN", pitch: 1.15, rate: 1.02, patterns: ["hindi", "india", "hi-in", "heera"] }
];

const GLOBAL_MEMES = [
  { id: "g1", region: "usa", label: "USA", title: "Monday Motivation, American Style", creator: "@states_of_chaos", likes: 8700, plays: 41000, text: "Corporate America woke up today and chose delusion. The meeting could have been an email, yet here we are, sharing our feelings about Q3 synergy." },
  { id: "g2", region: "uk", label: "UK", title: "Tea O'Clock Diplomacy", creator: "@queues_and_tea", likes: 7600, plays: 33000, text: "In Britain, the weather changes four times before lunch, but the queue for tea remains eternally orderly. Apologising to a lamppost is optional but encouraged." },
  { id: "g3", region: "japan", label: "Japan", title: "Vending Machine Therapy", creator: "@konbini_kid", likes: 12300, plays: 58000, text: "The vending machine has more emotional support than my manager. It also dispenses hot coffee in winter, which is more than I can say for most humans." },
  { id: "g4", region: "korea", label: "South Korea", title: "K-Drama Logic 101", creator: "@ramyun_romance", likes: 15400, plays: 71000, text: "Two people bump into each other once, and now they are destined soulmates for sixteen episodes, four flashbacks, and one tragic memory-loss twist." },
  { id: "g5", region: "china", label: "China", title: "The Great Wall Of Excuses", creator: "@wifi_warrior_cn", likes: 9800, plays: 47000, text: "My exam result was late because the VPN was slow, the router was tired, and honestly the ancestors did not approve of my study schedule this week." },
  { id: "g6", region: "africa", label: "Africa", title: "Family Group Chat Energy", creator: "@savanna_sass", likes: 11200, plays: 52000, text: "Family WhatsApp group at six in the morning, sharing motivational quotes nobody asked for, right after last night's football argument that never really ended." },
  { id: "g7", region: "latam", label: "Latin America", title: "Siesta Diplomacy", creator: "@salsa_and_sarcasm", likes: 10400, plays: 49000, text: "The meeting was scheduled for three, started at four, and everyone agreed this was completely on time, because punctuality here is more of a suggestion." },
  { id: "g8", region: "europe", label: "Europe", title: "Bureaucracy, Continental Edition", creator: "@schengen_shenanigans", likes: 8900, plays: 38000, text: "To renew one document you need three other documents, which each require a fourth document, discontinued sometime around nineteen ninety four." },
  { id: "g9", region: "middleeast", label: "Middle East", title: "Hospitality Overload", creator: "@souq_stories", likes: 9300, plays: 41000, text: "You came for five minutes and now you are being fed a full meal and three rounds of tea, because leaving a guest hungry is simply not permitted." },
  { id: "g10", region: "global", label: "Everywhere", title: "Universal WiFi Prayer", creator: "@planet_earth_official", likes: 22000, plays: 130000, text: "Every human on this planet, regardless of country or language, has said the exact same sentence to a router: please just work today, I am begging you." },
  { id: "g11", region: "canada", label: "Canada", title: "Canada Weather Patch Notes", creator: "@maple_meme", likes: 11800, plays: 52000, text: "Canada weather update: morning is winter, afternoon is summer, evening is winter again, and everyone apologises to the forecast." },
  { id: "g12", region: "australia", label: "Australia", title: "Australian BBQ Parliament", creator: "@outback_observer", likes: 10900, plays: 49000, text: "An Australian barbecue is a national parliament where every citizen has a strong opinion about the sausages and the cricket." },
  { id: "g13", region: "nigeria", label: "Nigeria", title: "Nigerian Family Data Plan", creator: "@lagos_laughs", likes: 12600, plays: 57000, text: "The family data plan has one rule: if someone says the WiFi is slow, three aunties immediately know who used all the data." },
  { id: "g14", region: "france", label: "France", title: "French Bakery Emergency", creator: "@croissant_committee", likes: 9800, plays: 44000, text: "The day begins only after the perfect croissant is found, judged, photographed and discussed like a national policy decision." },
  { id: "g15", region: "brazil", label: "Brazil", title: "Brazil Football Physics", creator: "@samba_syntax", likes: 15100, plays: 68000, text: "In Brazil, the ball has better footwork than most people, and every street corner is secretly preparing for a World Cup final." },
  { id: "g16", region: "nordics", label: "Nordics", title: "Nordic Minimalist Dinner", creator: "@fjord_funnies", likes: 8700, plays: 39000, text: "Nordic dinner: one beautiful potato, a candle, quiet reflection, and a spreadsheet explaining why there are no extra potatoes." },
  { id: "g17", region: "turkey", label: "Türkiye", title: "Türkiye Tea Diplomacy", creator: "@tea_treaty", likes: 11300, plays: 51000, text: "You came to say hello for five minutes and left after tea, snacks and a complete family history narrated with excellent hand gestures." },
  { id: "g18", region: "korea", label: "South Korea", title: "South Korean Group Project", creator: "@han_river_humor", likes: 14400, plays: 63000, text: "The group project has one person doing the work, one person making the slides, and one person appearing in the final presentation like a surprise plot twist." },
  { id: "g19", region: "global", label: "Everywhere", title: "Universal Low Battery", creator: "@planetary_powerbank", likes: 24500, plays: 142000, text: "No matter the continent, low battery turns every human into a sprinter, a negotiator and a believer in miracles." },
  { id: "g20", region: "global", label: "Everywhere", title: "Universal Family Call", creator: "@cross_border_cousin", likes: 21900, plays: 128000, text: "Every family video call has the same soundtrack: can you hear me, your camera is frozen, and someone is speaking while muted." }
];

const voiceSelect = document.getElementById("globalVoice");
voiceSelect.innerHTML = GLOBAL_VOICES.map(v => `<option value="${v.id}">${v.label}</option>`).join("");
const regionSelect = document.getElementById("globalRegion");
const regions = [["all", "All regions"], ["global", "Universal"], ["africa", "Africa"], ["asia", "Asia"], ["europe", "Europe"], ["latam", "Latin America"], ["middleeast", "Middle East"], ["usa", "USA"], ["uk", "UK"], ["japan", "Japan"], ["korea", "South Korea"], ["china", "China"], ["canada", "Canada"], ["australia", "Australia"], ["nigeria", "Nigeria"], ["france", "France"], ["brazil", "Brazil"], ["nordics", "Nordics"], ["turkey", "Türkiye"]];
regionSelect.innerHTML = regions.map(([id, label]) => `<option value="${id}">${label}</option>`).join("");

const likes = JSON.parse(localStorage.getItem("mm_global_likes") || "{}");
const plays = JSON.parse(localStorage.getItem("mm_global_plays") || "{}");
const liked = new Set(JSON.parse(localStorage.getItem("mm_global_liked") || "[]"));
const voices = [];
let activeId = null;
let run = 0;
let timer = null;

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function fmt(n) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n; }
function getLikes(m) { return m.likes + (likes[m.id] || 0); }
function getPlays(m) { return m.plays + (plays[m.id] || 0); }
function save() { localStorage.setItem("mm_global_likes", JSON.stringify(likes)); localStorage.setItem("mm_global_plays", JSON.stringify(plays)); localStorage.setItem("mm_global_liked", JSON.stringify([...liked])); }
function status(text) { document.getElementById("globalVoiceStatus").textContent = text; }
let personaVoiceMap = new Map();
function isFemaleName(name) { return /female|woman|girl|heera|samantha|zira|susan|karen|veena|lekha/i.test(name); }
function isMaleName(name) { return /male|man|boy|ravi|hemant|david|daniel|alex|mark/i.test(name); }
function refreshVoices() {
  voices.splice(0, voices.length, ...(window.speechSynthesis?.getVoices() || [])); personaVoiceMap = new Map(); const used = new Set();
  GLOBAL_VOICES.forEach(profile => { const chosen = voices.map(v => { const n = `${v.name} ${v.lang}`.toLowerCase(); let score = used.has(v.name) ? -120 : 0; if (v.lang.toLowerCase() === profile.lang.toLowerCase()) score += 100; if (/india|hindi|hi-in|en-in|हिन्दी|हिंदी/.test(n)) score += 45; if (profile.id.endsWith("_f") && isFemaleName(n)) score += 42; if (profile.id.endsWith("_m") && isMaleName(n)) score += 42; profile.patterns.forEach(p => { if (n.includes(p)) score += 20; }); return { v, score }; }).sort((a, b) => b.score - a.score)[0]?.v || null; personaVoiceMap.set(profile.id, chosen); if (chosen) used.add(chosen.name); });
  status(`${voices.length} voice${voices.length === 1 ? "" : "s"} found · persona tuning active`);
}
function pickVoice(profile) { return personaVoiceMap.get(profile.id) || null; }
function prepareText(text, profile) { let clean = String(text).replace(/\s+/g, " ").trim(); if (/uncle|aunty/i.test(profile.label)) clean = clean.replace(/!/g, "! ..."); return clean; }
function sentences(text) { return String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || [text]; }
function stop() { run++; if (timer) clearTimeout(timer); timer = null; window.speechSynthesis?.cancel(); activeId = null; render(); status("Voice ready"); }
function narrate(m) {
  stop(); if (!("speechSynthesis" in window)) { status("⚠️ Web Speech API unavailable in this browser"); return; }
  activeId = m.id; const current = ++run; const profile = GLOBAL_VOICES.find(v => v.id === voiceSelect.value) || GLOBAL_VOICES[0]; const voice = pickVoice(profile); const parts = sentences(prepareText(m.text, profile)); let i = 0; plays[m.id] = (plays[m.id] || 0) + 1; save(); render();
  const next = () => { if (current !== run) return; if (i >= parts.length) { activeId = null; render(); return; } const u = new SpeechSynthesisUtterance(parts[i++]); u.voice = voice || null; u.lang = voice?.lang || profile.lang; u.pitch = profile.pitch; u.rate = profile.rate; u.onstart = () => status(`${profile.label} · ${voice ? voice.name : "browser default"}`); u.onend = () => { if (current === run) timer = setTimeout(next, /[!?]$/.test(u.text) ? 360 : 220); }; u.onerror = () => { activeId = null; render(); status("⚠️ Voice failed; install another voice pack"); }; window.speechSynthesis.speak(u); };
  next();
}
function render() {
  const term = document.getElementById("globalSearch").value.toLowerCase().trim(); const region = regionSelect.value;
  const list = GLOBAL_MEMES.filter(m => (region === "all" || m.region === region || (region === "asia" && ["japan", "korea", "china"].includes(m.region)) || (region === "europe" && ["uk", "france", "nordics"].includes(m.region)) || (region === "africa" && m.region === "nigeria") || (region === "latam" && m.region === "brazil")) && (!term || `${m.title} ${m.text} ${m.creator} ${m.label}`.toLowerCase().includes(term)));
  document.getElementById("globalGrid").innerHTML = list.map(m => `<article class="card glass"><span class="tag">${esc(m.label)}</span><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p><div class="meta"><span>${esc(m.creator)}</span><span><button class="like-btn${liked.has(m.id) ? " liked" : ""}" data-like="${m.id}">${liked.has(m.id) ? "❤️" : "🤍"} ${fmt(getLikes(m))}</button> · ▶ ${fmt(getPlays(m))}</span></div><button class="btn ${activeId === m.id ? "btn-green" : "btn-primary"}" data-play="${m.id}">${activeId === m.id ? "■ Speaking" : "🔊 Narrate"}</button></article>`).join("");
  document.getElementById("globalEmpty").hidden = list.length > 0;
}
document.getElementById("globalGrid").onclick = e => { const like = e.target.closest("[data-like]"); if (like) { const id = like.dataset.like; liked.has(id) ? (liked.delete(id), likes[id] = (likes[id] || 0) - 1) : (liked.add(id), likes[id] = (likes[id] || 0) + 1); save(); render(); return; } const play = e.target.closest("[data-play]"); if (play) { const m = GLOBAL_MEMES.find(x => x.id === play.dataset.play); activeId === m.id ? stop() : narrate(m); } };
document.getElementById("globalSearch").oninput = render;
regionSelect.onchange = render;
document.getElementById("stopGlobal").onclick = stop;
if ("speechSynthesis" in window) { refreshVoices(); window.speechSynthesis.onvoiceschanged = refreshVoices; } else status("⚠️ Web Speech API unavailable");
render();
