// Utilidades compartidas por el jugador y el profesor.
window.ER = (() => {
  let offset = 0; // diferencia entre el reloj del servidor y el del dispositivo

  async function api(action, data = {}) {
    const r = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...data })
    });
    let j;
    try { j = await r.json(); } catch (e) { throw new Error("Sin conexión con el servidor."); }
    if (!r.ok) { const err = new Error(j.error || "Error"); err.status = r.status; throw err; }
    if (j.session && j.session.now) offset = j.session.now - Date.now();
    return j;
  }

  const now = () => Date.now() + offset;
  const mmss = ms => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s, r = document) => r.querySelector(s);

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }
  };

  let toastT;
  function toast(msg) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3000);
  }

  function confetti(colors = ["#39f29a", "#4fd1ff", "#ffc548", "#b388ff", "#ff5470"]) {
    const box = document.createElement("div");
    box.className = "confetti";
    for (let i = 0; i < 90; i++) {
      const c = document.createElement("i");
      c.style.left = Math.random() * 100 + "%";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.8 + Math.random() * 1.8 + "s";
      c.style.animationDelay = Math.random() * .6 + "s";
      box.appendChild(c);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4500);
  }

  const padlock = (open = false, size = 40) => `
    <svg class="padlock ${open ? "open" : ""}" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path class="shackle" d="M15 22v-6a9 9 0 0 1 18 0v6" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
      <rect x="9" y="21" width="30" height="22" rx="6" fill="currentColor" opacity=".9"/>
      <circle cx="24" cy="31" r="3" fill="#06080f"/><rect x="22.5" y="32" width="3" height="6" rx="1.5" fill="#06080f"/>
    </svg>`;

  return { api, now, mmss, esc, $, store, toast, confetti, padlock };
})();
