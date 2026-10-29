// Tréning mysle – spoločná kostra: povinné meno hráča, hlavička s nastaveniami,
// úvodná obrazovka s rekordom, tabuľka najlepších vpravo, číselná klávesnica,
// časovač, výsledky v localStorage a napojenie na Denný tréning.
//
// localStorage:
//   brain.user, brain.users     – aktuálny hráč, zoznam mien na tomto zariadení
//   brain.u.<meno>.<kľúč>       – údaje hráča (história, rekordy, nastavenia, denný tréning)
//   brain.lb.<kľúč>             – tabuľka najlepších hráčov tohto zariadenia: { meno: najlepší výsledok }
//
// Spoločná tabuľka online: keď je vyplnené CLOUD nižšie, výsledky sa zdieľajú cez
// Firebase Firestore (kolekcia scores, dokument { g: kľúč hry, n: meno, s: výsledok, lower }).
const Brain = (() => {
  // Firebase projekt pre spoločnú tabuľku (verejné údaje z firebaseConfig, nie tajomstvo).
  // Prázdne = tabuľka len v tomto prehliadači. Nastavenie: README → Spoločná tabuľka.
  const CLOUD = { projectId: "", apiKey: "" };
  const L = (sk, cs, en) => ({ sk, cs, en });
  const S = {
    start: L("Štart ▶", "Start ▶", "Start ▶"),
    again: L("Znova", "Znovu", "Again"),
    best: L("Rekord:", "Rekord:", "Best:"),
    noBest: L("Zatiaľ bez výsledku", "Zatím bez výsledku", "No results yet"),
    newBest: L("🏆 Nový rekord!", "🏆 Nový rekord!", "🏆 New best!"),
    result: L("Výsledok", "Výsledek", "Result"),
    back: L("← Tréning mysle", "← Trénink mysli", "← Brain training"),
    backDaily: L("← Denný tréning", "← Denní trénink", "← Daily workout"),
    nextDaily: L("Ďalšia hra ▶", "Další hra ▶", "Next game ▶"),
    dailyDone: L("Denný tréning hotový ✅", "Denní trénink hotový ✅", "Daily workout done ✅"),
    daily: L("Denný tréning", "Denní trénink", "Daily workout"),
    next: L("Ďalej ▶", "Dále ▶", "Next ▶"),
    board: L("Najlepšie výkony", "Nejlepší výkony", "Leaderboard"),
    boardEmpty: L("Zatiaľ nikto. Buď prvý!", "Zatím nikdo. Buď první!", "No one yet. Be the first!"),
    who: L("Kto hrá?", "Kdo hraje?", "Who's playing?"),
    whyName: L("Meno sa ukáže v tabuľke najlepších výkonov. Výsledky sa ukladajú v tomto prehliadači.", "Jméno se ukáže v tabulce nejlepších výkonů. Výsledky se ukládají v tomto prohlížeči.", "Your name appears on the leaderboard. Results are stored in this browser."),
    whyNameCloud: L("Meno sa ukáže v spoločnej tabuľke najlepších výkonov – vidia ju všetci hráči.", "Jméno se ukáže ve společné tabulce nejlepších výkonů – vidí ji všichni hráči.", "Your name appears on the shared leaderboard that all players see."),
    netLocal: L("📱 Len hráči z tohto zariadenia", "📱 Jen hráči z tohoto zařízení", "📱 Players on this device only"),
    netSync: L("🌐 Načítavam…", "🌐 Načítám…", "🌐 Loading…"),
    netOn: L("🌐 Spoločná tabuľka", "🌐 Společná tabulka", "🌐 Shared leaderboard"),
    netOff: L("⚠️ Bez spojenia – len toto zariadenie", "⚠️ Bez připojení – jen toto zařízení", "⚠️ Offline – this device only"),
    namePh: L("Tvoje meno", "Tvoje jméno", "Your name"),
    nameReq: L("Zadaj meno.", "Zadej jméno.", "Please enter a name."),
    play: L("Hrať ▶", "Hrát ▶", "Play ▶"),
    cancel: L("Zrušiť", "Zrušit", "Cancel"),
  };
  const $ = id => document.getElementById(id);
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // ---- úložisko: gload/gsave = spoločné pre zariadenie, load/save = aktuálneho hráča ----
  function gload(k, def) {
    try { const v = localStorage.getItem("brain." + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; }
  }
  function gsave(k, v) {
    try { localStorage.setItem("brain." + k, JSON.stringify(v)); } catch (e) { /* bez úložiska sa len nepamätá */ }
  }
  const load = (k, def) => gload(`u.${user()}.${k}`, def);
  const save = (k, v) => gsave(`u.${user()}.${k}`, v);

  // ---- hráč ----
  const cleanName = s => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, 20);
  function user() { return cleanName(gload("user", "")); }
  function users() { return gload("users", []); }
  function setUser(name) {
    name = cleanName(name);
    if (!name) return false;
    gsave("user", name);
    if (!users().includes(name)) gsave("users", [...users(), name]);
    return true;
  }

  function today(d = new Date()) {
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  const locale = () => ({ sk: "sk-SK", cs: "cs-CZ", en: "en-US" })[I18N.lang] || "sk-SK";
  // Číslo podľa jazyka (medzera/čiarka); fixed = vždy `dec` desatinných miest.
  function num(x, dec = 0, fixed = false) {
    return Number(x).toLocaleString(locale(), { maximumFractionDigits: dec, minimumFractionDigits: fixed ? dec : 0 });
  }
  const secs = ms => num(ms / 1000, 1, true) + " s";

  // ---- výsledky ----
  function history(key) { return load("h." + key, []); }
  function best(key) { return load("best." + key, null); }
  function markDay() {
    const days = load("days", {});
    days[today()] = (days[today()] || 0) + 1;
    save("days", days);
  }
  // Uloží výsledok: história (posledných 60), rekord, aktívny deň.
  function record(key, score, lower = false) {
    const hist = history(key);
    hist.push({ d: today(), s: score });
    save("h." + key, hist.slice(-60));
    const prev = best(key);
    const isBest = prev === null || (lower ? score < prev : score > prev);
    if (isBest) save("best." + key, score);
    // tabuľka: pre každého hráča len jeho najlepší výsledok
    const lb = gload("lb." + key, {}), me = user() || "?";
    if (!(me in lb) || (lower ? score < lb[me] : score > lb[me])) { lb[me] = score; gsave("lb." + key, lb); }
    markDay();
    return { isBest, prev, best: isBest ? score : prev, hist: hist.slice(-60) };
  }

  // ---- denný tréning (plán uložený z dospeli/trening/) ----
  let gameKey = "";
  function dailyPlan() { const d = load("daily", null); return d && d.date === today() ? d : null; }
  function inDaily() {
    const d = dailyPlan();
    return /[?&]daily\b/.test(location.search || "") && !!d && d.games.includes(gameKey);
  }
  // Označí aktuálnu hru ako hotovú, vráti ďalšiu (alebo null, keď je všetko).
  function dailyFinish() {
    const d = dailyPlan();
    if (!d) return null;
    if (!d.done.includes(gameKey)) d.done.push(gameKey);
    save("daily", d);
    const next = d.games.find(g => !d.done.includes(g)) || null;
    if (!next) { const all = load("dailyDone", {}); all[d.date] = true; save("dailyDone", all); }
    return next;
  }

  // ---- klávesnica: jeden aktívny handler, vráti true = spracované ----
  let keyFn = null, gateOpen = false;
  function onKey(fn) { keyFn = fn; }
  document.addEventListener("keydown", e => {
    // písanie do poľa (meno) a otvorený výber hráča nesmú ovládať hru
    if (gateOpen || (e.target && e.target.tagName === "INPUT")) return;
    if (keyFn && !e.ctrlKey && !e.metaKey && !e.altKey && keyFn(e.key)) e.preventDefault();
  });

  // ---- výber hráča ----
  // Okno s menom: známe mená na ťuknutie + pole pre nové. Po voľbe sa stránka
  // načíta znova, aby sa zobrazili údaje zvoleného hráča.
  function askUser(canCancel = false) {
    if (document.querySelector(".usergate")) return;
    gateOpen = true;
    const ov = document.createElement("div");
    ov.className = "usergate";
    const known = users();
    ov.innerHTML = `
      <div class="card gate">
        <h2>👤 ${t(S.who)}</h2>
        ${known.length ? `<div class="known">${known.map(n => `<button type="button" data-n="${esc(n)}">${esc(n)}</button>`).join("")}</div>` : ""}
        <input id="userName" type="text" maxlength="20" placeholder="${t(S.namePh)}" autocomplete="nickname">
        <p class="err" id="userErr"></p>
        <p class="muted">${t(cloudOn() ? S.whyNameCloud : S.whyName)}</p>
        <div class="btnrow">
          ${canCancel ? `<button type="button" id="userCancel">${t(S.cancel)}</button>` : ""}
          <button type="button" class="primary" id="userOk">${t(S.play)}</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const choose = name => {
      if (!setUser(name)) { $("userErr").textContent = t(S.nameReq); return; }
      gateOpen = false;
      location.reload();
    };
    ov.querySelectorAll(".known button").forEach(b => b.addEventListener("click", () => choose(b.dataset.n)));
    $("userOk").addEventListener("click", () => choose($("userName").value));
    $("userName").addEventListener("keydown", e => { if (e.key === "Enter") choose($("userName").value); });
    if (canCancel) $("userCancel").addEventListener("click", () => { ov.remove(); gateOpen = false; });
    $("userName").focus();
  }
  // Tlačidlo s menom do hlavičky; bez mena hneď otvorí výber (meno je povinné).
  function ensureUser(header) {
    if (header && !header.querySelector(".userchip")) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "userchip";
      b.textContent = "👤 " + (user() || "?");
      b.addEventListener("click", () => askUser(!!user()));
      header.appendChild(b);
    }
    if (!user()) askUser(false);
  }

  // ---- spoločná tabuľka online (Firestore REST, bez knižnice) ----
  const cloudOn = () => !!(CLOUD.projectId && CLOUD.apiKey) && typeof fetch === "function";
  async function fsCall(path, body) {
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctl && setTimeout(() => ctl.abort(), 8000);
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(CLOUD.projectId)}/databases/(default)/documents${path}?key=${encodeURIComponent(CLOUD.apiKey)}`;
      const r = await fetch(url, {
        method: path.startsWith(":") ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctl ? ctl.signal : undefined,
      });
      if (!r.ok) throw new Error("Firestore HTTP " + r.status);
      return r.json();
    } finally { if (timer) clearTimeout(timer); }
  }
  // { meno: výsledok } zo servera; pri viacerých dokumentoch s rovnakým menom ten najlepší
  async function cloudLoad(key, lower) {
    const rows = await fsCall(":runQuery", { structuredQuery: {
      from: [{ collectionId: "scores" }],
      where: { fieldFilter: { field: { fieldPath: "g" }, op: "EQUAL", value: { stringValue: key } } },
      limit: 1000,
    } });
    const lb = {};
    for (const { document: d } of rows) {
      if (!d || !d.fields || !d.fields.n || !d.fields.s) continue;
      const n = cleanName(d.fields.n.stringValue), v = d.fields.s;
      const s = Number(v.integerValue ?? v.doubleValue);
      if (n && Number.isFinite(s) && (!(n in lb) || better(s, lb[n], lower))) lb[n] = s;
    }
    return lb;
  }
  function cloudPut(key, name, score, lower) {
    const id = encodeURIComponent(encodeURIComponent(key + "|" + name));
    return fsCall("/scores/" + id, { fields: {
      g: { stringValue: key },
      n: { stringValue: name },
      s: Number.isInteger(score) ? { integerValue: String(score) } : { doubleValue: score },
      lower: { booleanValue: !!lower },
      t: { timestampValue: new Date().toISOString() },
    } });
  }
  // Stiahne tabuľku zo servera a nahrá doň lepšie výsledky hráčov z tohto zariadenia
  // (aj tie spred zapnutia spoločnej tabuľky). Vráti spojenú tabuľku.
  async function cloudSync(key, lower) {
    const lb = await cloudLoad(key, lower);
    const ups = Object.entries(gload("lb." + key, {}))
      .filter(([n, s]) => !(n in lb) || better(s, lb[n], lower))
      .map(([n, s]) => { lb[n] = s; return cloudPut(key, n, s, lower).catch(() => {}); });
    await Promise.all(ups);
    return lb;
  }

  // ---- tabuľka najlepších (vpravo vedľa hry) ----
  const better = (a, b, lower) => (lower ? a < b : a > b);
  let boardSeq = 0;
  function board(key, { lower = false, fmt = String } = {}) {
    if (!$("board")) return;
    const seq = ++boardSeq;
    if (!cloudOn()) { drawBoard(gload("lb." + key, {}), lower, fmt, S.netLocal); return; }
    drawBoard(gload("lb." + key, {}), lower, fmt, S.netSync);
    // kým príde odpoveď, mohla sa zobraziť iná tabuľka (zmena režimu) – tá staršia sa zahodí
    cloudSync(key, lower).then(
      lb => { if (seq === boardSeq) drawBoard(lb, lower, fmt, S.netOn); },
      () => { if (seq === boardSeq) drawBoard(gload("lb." + key, {}), lower, fmt, S.netOff); });
  }
  function drawBoard(lb, lower, fmt, net) {
    const el = $("board");
    if (!el) return;
    const me = user();
    const all = Object.entries(lb).sort((a, b) => (lower ? a[1] - b[1] : b[1] - a[1]));
    const mine = all.findIndex(([n]) => n === me);
    const row = ([n, s], i) => `<li class="${n === me ? "me" : ""}"><span class="r">${i + 1}.</span><span class="n">${esc(n)}</span><b>${fmt(s)}</b></li>`;
    // aktuálne nastavenia hry (režim, obtiažnosť…) – aby bolo jasné, čoho sa tabuľka týka
    const mode = [...document.querySelectorAll("#controls .seg button.active")].map(b => b.textContent).join(" · ");
    el.innerHTML = `
      <h3>🏆 ${t(S.board)}</h3>
      ${mode ? `<p class="muted">${esc(mode)}</p>` : ""}
      ${all.length ? `<ol class="lb">${all.slice(0, 10).map(row).join("")}${mine >= 10 ? `<li class="gap">…</li>${row(all[mine], mine)}` : ""}</ol>` : `<p class="muted">${t(S.boardEmpty)}</p>`}
      <p class="muted net">${t(net)}</p>`;
  }

  // ---- stránka ----
  function page({ key, title, footer }) {
    gameKey = key;
    const daily = inDaily();
    document.body.classList.add("brain");
    document.body.innerHTML = `
      <header><h1>${t(title)}</h1><div class="controls" id="controls"></div></header>
      <div class="layout"><main id="main"></main><aside class="board" id="board"></aside></div>
      <footer>${t(footer) || ""} <a href="${daily ? "../trening/" : "../"}">${t(daily ? S.backDaily : S.back)}</a></footer>`;
    ensureUser(document.querySelector("header"));
    if (daily) {
      const d = dailyPlan();
      const b = document.createElement("span");
      b.className = "daily-badge";
      b.textContent = `${t(S.daily)} ${d.games.indexOf(key) + 1}/${d.games.length}`;
      $("controls").appendChild(b);
    }
    I18N.attach();
    return { controls: $("controls"), main: $("main") };
  }
  // Počas hry sa nastavenia nedajú meniť.
  function playing(on) { document.body.classList.toggle("playing", !!on); }

  // Prepínač nastavenia (segmentované tlačidlá), voľba sa pamätá.
  function choice(parent, { key, label, options, onChange }) {
    let value = load("opt." + key, null);
    if (!options.some(o => o.v === value)) value = options[0].v;
    const box = document.createElement("div");
    box.className = "choice";
    if (label) { const s = document.createElement("span"); s.textContent = t(label); box.appendChild(s); }
    const seg = document.createElement("div");
    seg.className = "seg";
    const btns = options.map(o => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.v = String(o.v);
      b.textContent = t(o.label);
      b.addEventListener("click", () => {
        if (document.body.classList.contains("playing")) return;
        value = o.v; save("opt." + key, value); sync(); b.blur();
        if (onChange) onChange(value);
      });
      seg.appendChild(b);
      return b;
    });
    const sync = () => btns.forEach(b => b.classList.toggle("active", b.dataset.v === String(value)));
    box.appendChild(seg);
    parent.appendChild(box);
    sync();
    return { get value() { return value; } };
  }

  // Graf posledných výsledkov (SVG).
  function spark(hist, lower = false) {
    const v = hist.slice(-20).map(h => h.s);
    if (v.length < 2) return "";
    const W = 240, H = 44, min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
    const pts = v.map((s, i) => {
      const y = lower ? 4 + (s - min) / span * (H - 8) : H - 4 - (s - min) / span * (H - 8);
      return `${(i / (v.length - 1) * (W - 8) + 4).toFixed(1)},${y.toFixed(1)}`;
    });
    const last = pts[pts.length - 1].split(",");
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
      <polyline points="${pts.join(" ")}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="currentColor"/></svg>`;
  }

  // Úvodná obrazovka: popis, rekord, graf, Štart (aj Enter).
  function intro(main, { key, desc, extra = "", lower = false, fmt = String, onStart }) {
    playing(false);
    const b = best(key);
    main.innerHTML = `
      <div class="card intro">
        <p class="desc">${t(desc)}</p>
        ${extra}
        <p class="statline">${b === null ? t(S.noBest) : t(S.best) + " <b>" + fmt(b) + "</b>"}</p>
        ${spark(history(key), lower)}
        <div class="btnrow"><button type="button" class="primary" id="startBtn">${t(S.start)}</button></div>
      </div>`;
    $("startBtn").addEventListener("click", onStart);
    onKey(k => { if (k === "Enter") { onStart(); return true; } return false; });
    board(key, { lower, fmt });
  }

  // Výsledná obrazovka. noRecord = nezapisovať do rekordov (len aktívny deň).
  function result(main, { key, score, label, lower = false, fmt = String, lines = [], onAgain, extraBtn, noRecord = false }) {
    playing(false);
    let r;
    if (noRecord) { markDay(); r = { isBest: false, prev: null, best: best(key), hist: history(key) }; }
    else r = record(key, score, lower);
    board(key, { lower, fmt });
    const daily = inDaily();
    const next = daily ? dailyFinish() : null;
    const dailyHref = next ? `../${next}/?daily` : "../trening/";
    main.innerHTML = `
      <div class="card result">
        <div class="res-label">${t(label || S.result)}</div>
        <div class="big">${score === null ? "–" : fmt(score)}</div>
        ${r.isBest && r.prev !== null ? `<div class="newbest">${t(S.newBest)}</div>` : ""}
        <p class="statline">${r.best !== null ? t(S.best) + " <b>" + fmt(r.best) + "</b>" : ""}</p>
        ${lines.length ? `<ul class="lines">${lines.map(l => `<li>${t(l)}</li>`).join("")}</ul>` : ""}
        ${spark(r.hist, lower)}
        <div class="btnrow">
          <button type="button" id="againBtn">${t(S.again)}</button>
          ${extraBtn ? `<button type="button" id="extraBtn">${t(extraBtn.label)}</button>` : ""}
          ${daily ? `<a class="btn primary" id="dailyBtn" href="${dailyHref}">${t(next ? S.nextDaily : S.dailyDone)}</a>` : ""}
        </div>
      </div>`;
    $("againBtn").addEventListener("click", onAgain);
    if (extraBtn) $("extraBtn").addEventListener("click", extraBtn.onClick);
    onKey(k => {
      if (k !== "Enter") return false;
      if (daily) location.href = dailyHref; else onAgain();
      return true;
    });
    return r;
  }

  // Tlačidlo „Ďalej" + Enter; vráti Promise, ktorý sa splní po stlačení.
  function waitNext(parent, label = S.next) {
    return new Promise(res => {
      const row = document.createElement("div");
      row.className = "btnrow";
      const b = document.createElement("button");
      b.type = "button"; b.className = "primary"; b.textContent = t(label);
      let done = false;
      const go = () => { if (done) return; done = true; res(); };
      b.addEventListener("click", go);
      row.appendChild(b);
      parent.appendChild(row);
      onKey(k => { if (k === "Enter" || k === " ") { go(); return true; } return false; });
    });
  }

  // Číselná klávesnica (na obrazovke aj fyzická).
  //   onInput(value, text) – po každej zmene (napr. automatické prijatie správnej odpovede)
  //   onSubmit(value, text) – OK / Enter
  //   raw – rad číslic, nie číslo (nechá úvodné nuly)
  function numpad(parent, { neg = false, dec = false, raw = false, max = 9, onInput, onSubmit } = {}) {
    let s = "", enabled = true;
    const wrap = document.createElement("div");
    wrap.className = "numwrap";
    const disp = document.createElement("div");
    disp.className = "numdisp";
    disp.id = "numdisp";
    disp.textContent = " ";
    const pad = document.createElement("div");
    pad.className = "numpad";
    const keys = ["7", "8", "9", "⌫", "4", "5", "6", neg ? "−" : "", "1", "2", "3", dec ? "," : "", "0", "OK"];
    for (const k of keys) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = k || " ";
      b.dataset.k = k;
      if (!k) b.disabled = true;
      if (k === "0") b.className = "zero";
      if (k === "OK") b.className = "ok";
      b.addEventListener("click", () => { b.blur(); press(k); });
      pad.appendChild(b);
    }
    wrap.appendChild(disp);
    wrap.appendChild(pad);
    parent.appendChild(wrap);

    const value = () => (s === "" || s === "-" ? null : Number(s.replace(",", ".")));
    const render = () => { disp.textContent = s.replace("-", "−") || " "; };
    function press(k) {
      if (!enabled || !k) return;
      if (k === "OK") { if (value() !== null && onSubmit) onSubmit(value(), s); return; }
      if (k === "⌫") s = s.slice(0, -1);
      else if (k === "−") s = s.startsWith("-") ? s.slice(1) : "-" + s;
      else if (k === ",") { if (!s.includes(",")) s = (s === "" || s === "-" ? s + "0" : s) + ","; }
      else if (/^\d$/.test(k)) {
        if (s.replace(/[-,]/g, "").length >= max) return;
        s = raw ? s + k : s === "0" ? k : s === "-0" ? "-" + k : s + k;
      } else return;
      render();
      if (onInput) onInput(value(), s);
    }
    const KEYMAP = { Enter: "OK", Backspace: "⌫", "-": neg ? "−" : "", ",": dec ? "," : "", ".": dec ? "," : "" };
    onKey(k => {
      const kk = /^\d$/.test(k) ? k : KEYMAP[k];
      if (!kk) return false;
      press(kk);
      return true;
    });
    return {
      el: wrap, press,
      get text() { return s; },
      get value() { return value(); },
      clear() { s = ""; render(); },
      enable(on) { enabled = !!on; wrap.classList.toggle("off", !enabled); },
      flash(cls) { disp.classList.remove("right", "wrong"); disp.classList.add(cls); setTimeout(() => disp.classList.remove(cls), 350); },
      show(text, cls) { disp.textContent = text; disp.classList.remove("right", "wrong"); if (cls) disp.classList.add(cls); },
    };
  }

  // Odpočet: onTick(zostáva ms, podiel 1→0), onEnd(). Vráti funkciu na zastavenie.
  function countdown(ms, onTick, onEnd) {
    const end = Date.now() + ms;
    let id = null, over = false;
    function tick() {
      if (over) return;
      const left = Math.max(0, end - Date.now());
      if (onTick) onTick(left, left / ms);
      if (left === 0) { over = true; clearInterval(id); onEnd(); }
    }
    id = setInterval(tick, 100);
    tick();
    return () => { over = true; clearInterval(id); };
  }
  // Stopky: onTick(ms). Vráti funkciu, ktorá zastaví a vráti uplynulý čas.
  function stopwatch(onTick) {
    const t0 = Date.now();
    const id = setInterval(() => onTick && onTick(Date.now() - t0), 100);
    return () => { clearInterval(id); return Date.now() - t0; };
  }

  return {
    L, S, rnd, pick, shuffle, clamp, sleep, esc, load, save, gload, gsave, today, num, secs,
    user, users, setUser, askUser, ensureUser, board, cloud: CLOUD,
    history, best, record, markDay, dailyPlan, inDaily, dailyFinish,
    onKey, page, playing, choice, spark, intro, result, waitNext, numpad, countdown, stopwatch,
    get key() { return gameKey; },
  };
})();
