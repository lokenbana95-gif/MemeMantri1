/* MemeMantri Identity — one fixed name across Meme Adda, VoiceMantri and meme submissions.
   Stored client-side (localStorage). Uses an on-page modal (not window.prompt, which
   browsers silently block after repeated use) so it always shows up reliably. */
(function (global) {
  const KEY = "mm_identity_name";
  let modalEl = null;
  let pendingCallbacks = [];

  function normalize(raw) {
    let name = String(raw || "").trim().replace(/\s+/g, " ").slice(0, 40);
    if (!name) return "";
    name = name.replace(/^@+/, "");
    return "@" + name;
  }
  function get() { return localStorage.getItem(KEY) || ""; }
  function randomGuestName() { return "@Guest" + Math.floor(1000 + Math.random() * 9000); }
  function save(name) { localStorage.setItem(KEY, name); document.dispatchEvent(new CustomEvent("mm-identity-change", { detail: { name } })); }

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.id = "mmIdentityOverlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(6,7,6,.72);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Space Grotesk',sans-serif;";
    overlay.innerHTML = `
      <div style="width:100%;max-width:420px;background:var(--card,#1b1a18);border:1px solid var(--border,#332f2a);border-radius:16px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--gold,#ffd45e);font-weight:700;">MemeMantri Identity</div>
        <h2 style="font-family:'Bebas Neue',Impact,sans-serif;font-size:30px;margin:8px 0 6px;color:var(--text,#f6f3ee);">Apna naam set karo</h2>
        <p style="color:var(--muted,#a9a29a);font-size:14px;line-height:1.5;margin:0 0 16px;">Isi naam se tum Meme Adda chat, VoiceMantri contest aur apne submit kiye memes har jagah dikhoge.</p>
        <input id="mmIdentityInput" type="text" maxlength="40" placeholder="e.g. meme_neta" style="width:100%;box-sizing:border-box;padding:11px 13px;border-radius:10px;border:1px solid var(--border,#332f2a);background:rgba(0,0,0,.25);color:var(--text,#f6f3ee);font:inherit;outline:none;" />
        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
          <button id="mmIdentitySave" type="button" style="flex:1;min-width:120px;border:0;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;background:var(--gold,#ffd45e);color:#211a08;">Save Name</button>
          <button id="mmIdentitySkip" type="button" style="border:1px solid var(--border,#332f2a);border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;background:transparent;color:var(--muted,#a9a29a);">Skip for now</button>
        </div>
        <p id="mmIdentityMsg" style="min-height:16px;font-size:12px;color:var(--red,#e23b3b);margin:10px 0 0;"></p>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector("#mmIdentityInput");
    const msg = overlay.querySelector("#mmIdentityMsg");
    const closeWith = name => {
      overlay.remove();
      modalEl = null;
      const callbacks = pendingCallbacks; pendingCallbacks = [];
      callbacks.forEach(cb => cb(name));
    };
    overlay.querySelector("#mmIdentitySave").onclick = () => {
      const name = normalize(input.value);
      if (!name || name === "@") { msg.textContent = "Kam se kam ek character to likho."; return; }
      save(name);
      closeWith(name);
    };
    overlay.querySelector("#mmIdentitySkip").onclick = () => {
      if (!get()) save(randomGuestName());
      closeWith(get());
    };
    input.addEventListener("keydown", e => { if (e.key === "Enter") overlay.querySelector("#mmIdentitySave").click(); });
    setTimeout(() => input.focus(), 30);
    return overlay;
  }

  /* Opens the modal (or reuses one already open) and resolves with the chosen name. */
  function openModal(onDone) {
    if (typeof onDone === "function") pendingCallbacks.push(onDone);
    if (!modalEl) modalEl = buildModal();
  }

  function get_() { return get(); }
  function set(raw) { const name = normalize(raw); if (name && name !== "@") save(name); return get(); }

  /* Returns the current name immediately (assigning a random guest name if none
     exists yet, so callers never block) and — the first time — also opens the
     modal in the background so the visitor can personalize it. */
  function ensure() {
    let name = get();
    if (!name) { name = randomGuestName(); save(name); openModal(() => {}); }
    return name;
  }

  function change() { openModal(() => {}); }

  /* Wires an "identity pill" button: shows current name, opens the modal on click,
     and calls onChange(newName) whenever the name is saved. */
  function bindPill(buttonEl, onChange) {
    if (!buttonEl) return;
    const refresh = () => { buttonEl.textContent = "👤 " + ensure(); };
    refresh();
    buttonEl.onclick = () => openModal(name => { refresh(); if (typeof onChange === "function") onChange(name); });
    document.addEventListener("mm-identity-change", refresh);
  }

  global.MMIdentity = { get: get_, set, ensure, change, bindPill, normalize };
})(window);
