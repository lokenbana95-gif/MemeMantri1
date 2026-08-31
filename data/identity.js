/* MemeMantri Identity — one fixed name across Meme Adda, VoiceMantri and meme submissions.
   Stored client-side (localStorage) — no login required. */
(function (global) {
  const KEY = "mm_identity_name";

  function normalize(raw) {
    let name = String(raw || "").trim().replace(/\s+/g, " ").slice(0, 40);
    if (!name) return "";
    name = name.replace(/^@+/, "");
    return "@" + name;
  }

  function get() {
    return localStorage.getItem(KEY) || "";
  }

  function set(raw) {
    const name = normalize(raw);
    if (name && name !== "@") { localStorage.setItem(KEY, name); return name; }
    return get();
  }

  function randomGuestName() {
    return "@Guest" + Math.floor(1000 + Math.random() * 9000);
  }

  /* Ensures an identity exists; asks the visitor once via a prompt if not set yet. */
  function ensure() {
    let name = get();
    if (name) return name;
    const input = global.prompt(
      "MemeMantri par apna naam ya handle set karo.\nIsi naam se tum Meme Adda, VoiceMantri contest aur apne submitted memes har jagah dikhoge.",
      ""
    );
    name = input === null ? randomGuestName() : (normalize(input) || randomGuestName());
    localStorage.setItem(KEY, name);
    return name;
  }

  function change() {
    const input = global.prompt("Apna naya MemeMantri naam/handle likho:", get().replace(/^@/, ""));
    if (input === null) return get();
    const name = normalize(input);
    if (name && name !== "@") localStorage.setItem(KEY, name);
    return get();
  }

  /* Wires an optional "identity pill" button: shows current name, click to change,
     and re-runs `onChange` (if given) with the fresh name after every change. */
  function bindPill(buttonEl, onChange) {
    if (!buttonEl) return;
    const refresh = () => { buttonEl.textContent = "👤 " + ensure(); };
    refresh();
    buttonEl.onclick = () => { change(); refresh(); if (typeof onChange === "function") onChange(get()); };
  }

  global.MMIdentity = { get, set, ensure, change, bindPill, normalize };
})(window);
