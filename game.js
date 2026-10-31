(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BREATH_MS = 1200;
  const STORAGE_NAME = "apology-recipient";
  const STORAGE_SOUND = "apology-sound";

  const CATEGORIES = {
    joke: { label: "a joke, to soften the blow", short: "joke", color: "#a85b2e", bg: "#fde9d8" },
    evidence: { label: "evidence for the defence", short: "evidence", color: "#3f6b55", bg: "#e3efe7" },
    sorry: { label: "the actual sorry", short: "sorry", color: "#a83a5c", bg: "#fde4eb" }
  };

  const NOTES = [
    { id: 1, category: "joke", text: "I could have just said sorry. Instead I built a whole website. Please clap." },
    { id: 2, category: "sorry", text: "I'm sorry for turning the same mistake into a recurring subscription you never asked for." },
    { id: 3, category: "evidence", text: "You spend all day being the calm, competent one. You shouldn't have to be that at home too." },
    { id: 4, category: "joke", text: "I asked a vet how to fix a broken thing. She said, 'Stitch it, don't repeat it.' I'm taking notes." },
    { id: 5, category: "joke", text: "You save animals all day, then come home to me — the most high-maintenance patient you never signed up for." },
    { id: 6, category: "joke", text: "You eat the hottest chillies on Earth for fun. My behaviour? Somehow spicier. And not in a good way." },
    { id: 7, category: "evidence", text: "You work 13-hour shifts saving lives, and I still made myself the hardest part of your day. Fixing that." },
    { id: 8, category: "evidence", text: "Your eyes are the most beautiful thing I've ever witnessed — and I still made them sad. Peak stupidity." },
    { id: 9, category: "sorry", text: "You outsmart diseases for a living. And I thought the same old mistake would go unnoticed. Delusional." },
    { id: 10, category: "sorry", text: "I'm not promising to be perfect. I'm promising to pause before I explode." },
    { id: 11, category: "joke", text: "If patience were a school subject, I'd be in remedial class. With extra homework. Prescribed by a doctor, probably." },
    { id: 12, category: "evidence", text: "Last one. You've got this. So do I. Hopefully." }
  ];

  const PALETTES = [
    ["#ffd3dd", "#f29ab2"], ["#ffe1c6", "#f4b07c"], ["#e8e1f6", "#b8a6dd"],
    ["#dcecd5", "#a1c697"], ["#fde9b9", "#e8c25f"], ["#d8eaf4", "#9fc4d8"],
    ["#f9cfc3", "#ec8f7b"], ["#f4dce9", "#d6a0c1"], ["#ffe6d1", "#f0a56f"],
    ["#e2e7f7", "#a8b5e0"], ["#e9f0d6", "#b4c98a"], ["#f7d9d2", "#dd9c9c"]
  ];

  const LABELS = [
    { min: 12, label: "forgiven (probation: forever)" },
    { min: 9, label: "almost there, don't ruin it" },
    { min: 6, label: "cautiously optimistic" },
    { min: 3, label: "warming up, suspiciously" },
    { min: 0, label: "highly skeptical" }
  ];

  const state = {
    recipient: "Aditi",
    popped: new Map(),
    soundOn: true,
    hotAttempts: 0,
    hotCalmed: 0,
    breath: null,
    view: "intro",
    completed: false
  };

  /* ----------------------------- audio ----------------------------- */
  let audioCtx = null;
  let masterGain = null;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.16;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, duration, opts = {}) {
    if (!state.soundOn) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const { type = "sine", delay = 0, gain = 0.35, slideTo = null } = opts;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.06);
  }

  function noise(duration, opts = {}) {
    if (!state.soundOn) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const { gain = 0.3, freq = 1300, q = 1, delay = 0 } = opts;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    src.start(t0);
    src.stop(t0 + duration);
  }

  function playPop(calm) {
    noise(0.09, { gain: 0.32, freq: calm ? 720 : 1500, q: 1.1 });
    tone(calm ? 520 : 390, 0.15, { gain: 0.28, slideTo: calm ? 260 : 125 });
    if (calm) tone(784, 0.45, { gain: 0.12, delay: 0.08 });
  }
  function playPuff() {
    noise(0.18, { gain: 0.22, freq: 500, q: 0.6 });
    tone(180, 0.2, { gain: 0.1, slideTo: 90 });
  }
  function playClick() { tone(660, 0.04, { type: "triangle", gain: 0.07 }); }
  function playUnlock() {
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(f, 1.1, { gain: 0.13, delay: i * 0.13 });
    });
  }

  /* ---------------------------- helpers ---------------------------- */
  function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function nameFromUrl() {
    const raw = new URLSearchParams(window.location.search).get("to");
    return raw ? raw.trim().slice(0, 24) : "";
  }

  function loadRecipient() {
    const fromUrl = nameFromUrl();
    if (fromUrl) return fromUrl;
    try {
      return localStorage.getItem(STORAGE_NAME) || "Aditi";
    } catch (err) {
      return "Aditi";
    }
  }

  function applyRecipient(rawName) {
    const name = (rawName || "").trim().slice(0, 24) || "Aditi";
    state.recipient = name;
    $$("[data-recipient]").forEach((el) => { el.textContent = name; });
    document.title = `Sorry, ${name} — an apology you can play`;
    const url = new URL(window.location.href);
    if (name !== "Aditi") url.searchParams.set("to", name);
    else url.searchParams.delete("to");
    window.history.replaceState(null, "", url);
    try { localStorage.setItem(STORAGE_NAME, name); } catch (err) { /* private mode */ }
  }

  let toastTimer = 0;
  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  function syncSoundButton() {
    const btn = $("#soundToggle");
    btn.classList.toggle("is-muted", !state.soundOn);
    btn.setAttribute("aria-pressed", String(state.soundOn));
    btn.setAttribute("aria-label", state.soundOn ? "Mute sound" : "Unmute sound");
  }

  function syncConfession() {
    const details = $(".confession");
    if (!details) return;
    const wide = window.matchMedia("(min-width: 981px)").matches;
    details.open = wide;
  }

  /* ----------------------------- screens --------------------------- */
  function showScreen(name) {
    state.view = name;
    document.body.dataset.screen = name;
    ["intro", "game", "unlock"].forEach((id) => {
      const section = document.getElementById(id);
      if (!section) return;
      const active = id === name;
      section.hidden = !active;
      section.inert = !active;
      section.setAttribute("aria-hidden", String(!active));
      if (active) {
        section.classList.remove("screen-enter");
        void section.offsetWidth;
        section.classList.add("screen-enter");
      }
    });
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    window.setTimeout(() => {
      const heading = document.querySelector(`#${name} h1, #${name} h2`);
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }, 320);
  }

  /* ----------------------------- balloons -------------------------- */
  function updateProgress() {
    const count = state.popped.size;
    const label = LABELS.find((item) => count >= item.min).label;
    $("#progressCount").textContent = `${count} / 12`;
    $("#progressLabel").textContent = label;
    $("#meterFill").style.width = `${(count / 12) * 100}%`;
    const meter = $("#meter");
    meter.setAttribute("aria-valuenow", String(count));
    meter.setAttribute("aria-valuetext", `${count} of 12 balloons popped. Forgiveness level: ${label}.`);
    $("#gameFootnote").textContent = count === 12
      ? "All twelve. The real sorry is ready."
      : "Pop every balloon to unlock the real sorry.";
  }

  function buildGrid() {
    const grid = $("#balloonGrid");
    grid.innerHTML = "";
    shuffle(NOTES).forEach((note, index) => {
      const isHot = note.category === "sorry";
      const palette = PALETTES[index % PALETTES.length];
      const slot = document.createElement("div");
      slot.className = "balloon-slot";
      slot.dataset.noteId = String(note.id);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `balloon${isHot ? " hot" : ""}`;
      btn.dataset.noteId = String(note.id);
      btn.style.setProperty("--c1", isHot ? "#ffc2a8" : palette[0]);
      btn.style.setProperty("--c2", isHot ? "#e0516e" : palette[1]);
      btn.style.setProperty("--delay", `${(-index * 0.37).toFixed(2)}s`);
      btn.style.setProperty("--dur", `${(4.4 + (index % 5) * 0.4).toFixed(2)}s`);
      btn.setAttribute("aria-label", `Balloon ${note.id}: ${CATEGORIES[note.category].short} note. ${isHot ? "Hot balloon. Press and hold to breathe." : "Press to pop."}`);
      if (isHot) btn.setAttribute("aria-describedby", "hotHint");
      btn.innerHTML = `
        <span class="balloon-float">
          <span class="balloon-body">
            <span class="balloon-knot" aria-hidden="true"></span>
            ${isHot ? '<span class="hot-badge" aria-hidden="true">🔥</span>' : ""}
            <span class="breath-ring" aria-hidden="true"></span>
          </span>
          <svg class="balloon-string" viewBox="0 0 28 70" aria-hidden="true"><path d="M14 1 C 4 16, 24 40, 14 68" /></svg>
        </span>`;
      attachBalloonHandlers(btn, note);
      slot.appendChild(btn);
      grid.appendChild(slot);
    });
  }

  function attachBalloonHandlers(btn, note) {
    const isHot = note.category === "sorry";
    let pointerActive = false;
    let pointerDownAt = 0;

    btn.addEventListener("pointerdown", (event) => {
      if (state.popped.has(note.id)) return;
      if (event.button !== undefined && event.button !== 0) return;
      pointerActive = true;
      pointerDownAt = performance.now();
      if (isHot) {
        event.preventDefault();
        startBreath(btn, note);
      } else {
        btn.classList.add("is-pressed");
      }
    });

    const finish = (cancelled) => {
      if (!pointerActive) return;
      pointerActive = false;
      if (isHot) {
        const elapsed = performance.now() - pointerDownAt;
        if (!cancelled && elapsed >= BREATH_MS) completeBreath(btn);
        else cancelBreath(btn, true);
      } else {
        btn.classList.remove("is-pressed");
        if (!cancelled) popBalloon(note, btn, false);
      }
    };

    btn.addEventListener("pointerup", () => finish(false));
    btn.addEventListener("pointercancel", () => finish(true));
    btn.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") finish(true);
    });

    btn.addEventListener("click", (event) => {
      if (event.detail !== 0) return;
      event.preventDefault();
      if (state.popped.has(note.id)) return;
      if (isHot) {
        if (!state.breath) startBreath(btn, note, true);
      } else {
        popBalloon(note, btn, false);
      }
    });

    btn.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (state.popped.has(note.id)) return;
      if (isHot) {
        if (!state.breath) startBreath(btn, note, true);
      } else {
        popBalloon(note, btn, false);
      }
    });
  }

  function startBreath(btn, note, auto = false) {
    if (state.popped.has(note.id) || state.breath) return;
    const startedAt = performance.now();
    const breath = { btn, note, raf: 0, auto };
    state.breath = breath;
    btn.classList.add("breathing");
    btn.setAttribute("aria-label", `Balloon ${note.id}: hot balloon. Breathing. Keep holding.`);

    const tick = (now) => {
      if (state.breath !== breath) return;
      const progress = Math.min(1, (now - startedAt) / BREATH_MS);
      btn.style.setProperty("--breath", progress.toFixed(3));
      if (progress >= 1) {
        completeBreath(btn);
        return;
      }
      breath.raf = window.requestAnimationFrame(tick);
    };
    breath.raf = window.requestAnimationFrame(tick);
  }

  function completeBreath(btn) {
    const breath = state.breath;
    if (!breath || breath.btn !== btn) return;
    state.breath = null;
    window.cancelAnimationFrame(breath.raf);
    btn.classList.remove("breathing");
    btn.style.setProperty("--breath", "0");
    popBalloon(breath.note, btn, true);
  }

  function cancelBreath(btn, puff) {
    const breath = state.breath;
    if (!breath || breath.btn !== btn) return;
    state.breath = null;
    window.cancelAnimationFrame(breath.raf);
    btn.classList.remove("breathing");
    btn.style.setProperty("--breath", "0");
    if (!puff) return;
    state.hotAttempts += 1;
    puffAway(btn);
    playPuff();
    showToast("Temper got there first. Hold the balloon, breathe, then pop.");
    btn.setAttribute("aria-label", `Balloon ${breath.note.id}: hot balloon. Press and hold to breathe.`);
  }

  function puffAway(btn) {
    if (btn.classList.contains("puffing")) return;
    btn.classList.add("puffing");
    btn.disabled = true;
    window.setTimeout(() => {
      btn.classList.add("away");
      btn.classList.remove("puffing");
    }, 430);
    window.setTimeout(() => {
      btn.classList.remove("away");
      btn.classList.add("returning");
      btn.disabled = false;
      window.setTimeout(() => btn.classList.remove("returning"), 520);
    }, 2000);
  }

  function popBalloon(note, btn, calm) {
    if (!btn || state.popped.has(note.id)) return;
    state.popped.set(note.id, { calm });
    if (calm) state.hotCalmed += 1;
    btn.classList.remove("breathing", "is-pressed");
    btn.disabled = true;
    btn.classList.add("popping");
    spawnBurst(btn, calm);
    playPop(calm);
    updateProgress();

    const slot = btn.closest(".balloon-slot");
    window.setTimeout(() => {
      slot.classList.add("popped");
      btn.setAttribute("aria-hidden", "true");
      slot.appendChild(buildChip(note, calm));
      openNote(note, calm, state.popped.size === NOTES.length);
    }, reduceMotion ? 0 : 260);
  }

  function buildChip(note, calm) {
    const meta = CATEGORIES[note.category];
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "note-chip";
    chip.style.setProperty("--cat-color", meta.color);
    chip.style.setProperty("--cat-bg", meta.bg);
    chip.innerHTML = `
      <span class="chip-check" aria-hidden="true">✓</span>
      <span class="chip-cat">${meta.short}</span>
      <span class="chip-num">#${note.id}</span>`;
    chip.setAttribute("aria-label", `Read again: balloon ${note.id}, ${meta.short} note${calm ? ", breathed through" : ""}.`);
    chip.addEventListener("click", () => openNote(note, calm, false));
    return chip;
  }

  /* ----------------------------- modals ---------------------------- */
  let modalTrigger = null;
  let unlockTimer = 0;

  function openModal(modal, preferredFocus) {
    if (!modal || !modal.hidden) return;
    modalTrigger = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    $("#main").inert = true;
    $(".footer").inert = true;
    $(".topbar").inert = true;

    const focusables = () => $$("button, input, [href], [tabindex]:not([tabindex='-1'])", modal)
      .filter((el) => !el.disabled && el.offsetParent !== null);
    const trap = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal(modal);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    modal._trap = trap;
    document.addEventListener("keydown", trap);
    const target = preferredFocus || modal.querySelector(".modal-close") || focusables()[0];
    window.setTimeout(() => { if (target) target.focus({ preventScroll: true }); }, 70);
  }

  function nextBalloon() {
    return $$("#balloonGrid .balloon").find((btn) => (
      !btn.disabled && !btn.closest(".balloon-slot").classList.contains("popped")
    )) || null;
  }

  function closeModal(modal, restoreFocus = true) {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (modal._trap) document.removeEventListener("keydown", modal._trap);
    modal._trap = null;
    const anyOpen = $$(".modal").some((item) => !item.hidden);
    if (!anyOpen) {
      document.body.classList.remove("modal-open");
      $("#main").inert = false;
      $(".footer").inert = false;
      $(".topbar").inert = false;
    }
    if (restoreFocus) {
      if (modal.id === "noteModal") {
        const next = nextBalloon();
        const chip = $$("#balloonGrid .note-chip").pop();
        const target = next || chip;
        if (target) target.focus({ preventScroll: true });
      } else if (modalTrigger && document.contains(modalTrigger)) {
        modalTrigger.focus({ preventScroll: true });
      }
    }
    if (modal.id === "noteModal" && modal.dataset.final === "1") {
      modal.dataset.final = "0";
      window.clearTimeout(unlockTimer);
      unlockTimer = window.setTimeout(showUnlock, 150);
    }
  }

  function openNote(note, calm, final) {
    const meta = CATEGORIES[note.category];
    const tag = $("#noteCategory");
    tag.textContent = meta.label;
    tag.style.setProperty("--tag-color", meta.color);
    tag.style.setProperty("--tag-bg", meta.bg);
    $("#noteNumber").textContent = `balloon #${note.id}`;
    $("#noteText").textContent = note.text;
    $("#notePopped").textContent = final ? "popped with love · final balloon" : "popped with love";
    $("#calmBadge").hidden = !calm;
    $("#keepPopping").textContent = final ? "Unlock the real sorry →" : "Keep popping";
    const modal = $("#noteModal");
    modal.dataset.final = final ? "1" : "0";
    openModal(modal, $("#keepPopping"));
  }

  $("#noteClose").addEventListener("click", () => closeModal($("#noteModal")));
  $("#keepPopping").addEventListener("click", () => closeModal($("#noteModal")));
  $("[data-close-note]").addEventListener("click", () => closeModal($("#noteModal")));

  /* ---------------------------- confetti --------------------------- */
  function confettiLayer() {
    let layer = $(".confetti-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "confetti-layer";
      document.body.appendChild(layer);
    }
    return layer;
  }

  function burstAt(x, y, colors, count) {
    if (reduceMotion) return;
    const layer = confettiLayer();
    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      const size = 5 + Math.random() * 6;
      piece.style.left = `${x}px`;
      piece.style.top = `${y}px`;
      piece.style.width = `${size}px`;
      piece.style.height = `${size * (1 + Math.random())}px`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      layer.appendChild(piece);
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 85;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance + 55;
      piece.animate([
        { transform: "translate(-50%, -50%) scale(1) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(.35) rotate(${Math.random() * 540 - 270}deg)`, opacity: 0 }
      ], {
        duration: 620 + Math.random() * 420,
        easing: "cubic-bezier(.2, .7, .3, 1)",
        fill: "both"
      }).onfinish = () => piece.remove();
    }
  }

  function spawnBurst(btn, calm) {
    const body = btn.querySelector(".balloon-body") || btn;
    const rect = body.getBoundingClientRect();
    burstAt(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      calm
        ? ["#c9953c", "#e66a8a", "#fff1c9", "#f7d98c"]
        : ["#f29ab2", "#f4b07c", "#b8a6dd", "#a1c697", "#e8c25f"],
      calm ? 18 : 12
    );
  }

  function celebrate() {
    if (reduceMotion) return;
    const layer = confettiLayer();
    const colors = ["#e66a8a", "#f29ab2", "#f4b07c", "#e8c25f", "#b8a6dd", "#a1c697", "#c9953c"];
    for (let i = 0; i < 80; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      const width = 5 + Math.random() * 7;
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.top = "-18px";
      piece.style.width = `${width}px`;
      piece.style.height = `${width * (1.2 + Math.random())}px`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      layer.appendChild(piece);
      piece.animate([
        { transform: "translate3d(0, -10px, 0) rotate(0deg)", opacity: 1 },
        { transform: `translate3d(${(Math.random() - 0.5) * 200}px, ${window.innerHeight + 80}px, 0) rotate(${Math.random() * 900 - 450}deg)`, opacity: 0 }
      ], {
        duration: 2400 + Math.random() * 1800,
        delay: Math.random() * 600,
        easing: "cubic-bezier(.15, .6, .35, 1)",
        fill: "both"
      }).onfinish = () => piece.remove();
    }
    window.setTimeout(() => {
      const existing = $(".confetti-layer");
      if (existing && !existing.childElementCount) existing.remove();
    }, 5200);
  }

  /* ----------------------------- unlock ---------------------------- */
  function showUnlock() {
    if (state.popped.size !== NOTES.length) return;
    state.completed = true;
    const calmResult = $("#calmResult");
    calmResult.innerHTML = `<strong>3</strong> hot ones, ${state.hotAttempts === 0 ? "handled" : "eventually"}`;
    const today = new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "long", year: "numeric"
    }).format(new Date());
    $("#certDate").textContent = `· ${today}`;
    showScreen("unlock");
    window.setTimeout(() => {
      playUnlock();
      celebrate();
    }, 260);
  }

  /* -------------------------- personalize -------------------------- */
  function openPersonalize() {
    $("#nameInput").value = state.recipient;
    openModal($("#personalizeModal"), $("#nameInput"));
    window.setTimeout(() => {
      const input = $("#nameInput");
      input.focus({ preventScroll: true });
      input.select();
    }, 110);
  }

  function saveName() {
    const value = $("#nameInput").value.trim().slice(0, 24) || "Aditi";
    applyRecipient(value);
    closeModal($("#personalizeModal"));
    showToast("Saved. It's personal now.");
  }

  $("#personalizeBtn").addEventListener("click", openPersonalize);
  $("#editNameBtn").addEventListener("click", openPersonalize);
  $("#personalizeClose").addEventListener("click", () => closeModal($("#personalizeModal")));
  $("#personalizeCancel").addEventListener("click", () => closeModal($("#personalizeModal")));
  $("[data-close-personalize]").addEventListener("click", () => closeModal($("#personalizeModal")));
  $("#personalizeSave").addEventListener("click", saveName);
  $("#nameInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveName();
    }
  });

  /* ---------------------------- actions ---------------------------- */
  async function shareApology() {
    const url = new URL(window.location.href);
    if (state.recipient !== "Aditi") url.searchParams.set("to", state.recipient);
    else url.searchParams.delete("to");
    const data = {
      title: `Sorry, ${state.recipient}`,
      text: "An apology you can play. 12 balloons, one very nervous sorry.",
      url: url.toString()
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      showToast("Link copied. Send it with your most apologetic face.");
    } catch (err) {
      showToast("Copy this page's URL and send it along.");
    }
  }

  function resetGame() {
    window.clearTimeout(unlockTimer);
    state.popped.clear();
    state.hotAttempts = 0;
    state.hotCalmed = 0;
    state.breath = null;
    state.completed = false;
    $("#noteModal").dataset.final = "0";
    closeModal($("#noteModal"), false);
    updateProgress();
    buildGrid();
    showScreen("game");
    showToast("Fresh balloons. Same sorry. Maybe better this time.");
  }

  $("#beginBtn").addEventListener("click", () => {
    ensureAudio();
    playClick();
    showScreen("game");
  });
  $("#brandLink").addEventListener("click", (event) => {
    event.preventDefault();
    showScreen("intro");
  });
  $("#soundToggle").addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    try { localStorage.setItem(STORAGE_SOUND, state.soundOn ? "on" : "off"); } catch (err) { /* ignore */ }
    syncSoundButton();
    if (state.soundOn) {
      ensureAudio();
      playClick();
    }
  });
  $("#restartGameBtn").addEventListener("click", resetGame);
  $("#footerRestart").addEventListener("click", resetGame);
  $("#replayBtn").addEventListener("click", resetGame);
  $("#printBtn").addEventListener("click", () => {
    showToast("Tip: enable background graphics for the full gold.");
    window.setTimeout(() => window.print(), 300);
  });
  $("#shareBtn").addEventListener("click", shareApology);

  /* ------------------------------ init ----------------------------- */
  function init() {
    state.recipient = loadRecipient() || "Aditi";
    try { state.soundOn = localStorage.getItem(STORAGE_SOUND) !== "off"; } catch (err) { state.soundOn = true; }
    applyRecipient(state.recipient);
    syncSoundButton();
    syncConfession();
    buildGrid();
    updateProgress();
    showScreen("intro");
    $("#game").inert = true;
    $("#unlock").inert = true;
    window.matchMedia("(min-width: 981px)").addEventListener("change", syncConfession);
  }

  init();
})();

