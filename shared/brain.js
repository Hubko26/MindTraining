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
//   brain.lbq                   – výsledky čakajúce na odoslanie: { kľúč: { meno: výsledok } }
//   brain.lbsynced              – hry, ktorých staré lokálne rekordy sa už nahrali (len raz)
//   brain.adminPass             – heslo správcu na mazanie riadkov (overujú ho pravidlá Firestore)
const Brain = (() => {
  // Firebase projekt pre spoločnú tabuľku (verejné údaje z firebaseConfig, nie tajomstvo).
  // Prázdne = tabuľka len v tomto prehliadači. Nastavenie: README → Spoločná tabuľka.
  // admin = meno hráča, ktorému sa v tabuľke ukážu tlačidlá 🗑. Meno samo nič nechráni –
  // mazanie povolia pravidlá Firestore len so správnym heslom (heslo je len v pravidlách).
  const CLOUD = { projectId: "mindtraining-8a94a", apiKey: "AIzaSyDuF1cY5_CKn2cn7IwnK16itdI4KaZ5hGc", admin: "Hubko" };
  const localized = (sk, cs, en) => ({ sk, cs, en });
  const TEXT = {
    start: localized("Štart ▶", "Start ▶", "Start ▶"),
    again: localized("Znova", "Znovu", "Again"),
    best: localized("Rekord:", "Rekord:", "Best:"),
    noBest: localized("Zatiaľ bez výsledku", "Zatím bez výsledku", "No results yet"),
    newBest: localized("🏆 Nový rekord!", "🏆 Nový rekord!", "🏆 New best!"),
    result: localized("Výsledok", "Výsledek", "Result"),
    back: localized("← Tréning mysle", "← Trénink mysli", "← Brain training"),
    backDaily: localized("← Denný tréning", "← Denní trénink", "← Daily workout"),
    home: localized("← Hry", "← Hry", "← Games"),
    homeDaily: localized("← Tréning", "← Trénink", "← Workout"),
    nextDaily: localized("Ďalšia hra ▶", "Další hra ▶", "Next game ▶"),
    dailyDone: localized("Denný tréning hotový ✅", "Denní trénink hotový ✅", "Daily workout done ✅"),
    daily: localized("Denný tréning", "Denní trénink", "Daily workout"),
    next: localized("Ďalej ▶", "Dále ▶", "Next ▶"),
    board: localized("Najlepšie výkony", "Nejlepší výkony", "Leaderboard"),
    boardEmpty: localized("Zatiaľ nikto. Buď prvý!", "Zatím nikdo. Buď první!", "No one yet. Be the first!"),
    who: localized("Kto hrá?", "Kdo hraje?", "Who's playing?"),
    nameHint: localized("Meno sa ukáže v tabuľke najlepších výkonov. Výsledky sa ukladajú v tomto prehliadači.", "Jméno se ukáže v tabulce nejlepších výkonů. Výsledky se ukládají v tomto prohlížeči.", "Your name appears on the leaderboard. Results are stored in this browser."),
    nameHintShared: localized("Meno sa ukáže v spoločnej tabuľke najlepších výkonov – vidia ju všetci hráči.", "Jméno se ukáže ve společné tabulce nejlepších výkonů – vidí ji všichni hráči.", "Your name appears on the shared leaderboard that all players see."),
    statusLocal: localized("📱 Len hráči z tohto zariadenia", "📱 Jen hráči z tohoto zařízení", "📱 Players on this device only"),
    statusLoading: localized("🌐 Načítavam…", "🌐 Načítám…", "🌐 Loading…"),
    statusOnline: localized("🌐 Spoločná tabuľka", "🌐 Společná tabulka", "🌐 Shared leaderboard"),
    statusOffline: localized("⚠️ Bez spojenia – len toto zariadenie", "⚠️ Bez připojení – jen toto zařízení", "⚠️ Offline – this device only"),
    namePlaceholder: localized("Tvoje meno", "Tvoje jméno", "Your name"),
    nameRequired: localized("Zadaj meno.", "Zadej jméno.", "Please enter a name."),
    play: localized("Hrať ▶", "Hrát ▶", "Play ▶"),
    cancel: localized("Zrušiť", "Zrušit", "Cancel"),
    deleteResult: localized("Zmazať výsledok", "Smazat výsledek", "Delete result"),
    deleteQuestion: localized("Zmazať z tabuľky výsledok hráča", "Smazat z tabulky výsledek hráče", "Delete the leaderboard result of"),
    deleteFailed: localized("⚠️ Mazanie sa nepodarilo", "⚠️ Smazání se nepodařilo", "⚠️ Delete failed"),
    adminPasswordTitle: localized("🔑 Heslo správcu", "🔑 Heslo správce", "🔑 Admin password"),
    adminPasswordHint: localized("Mazať výsledky smie len správca. Heslo sa zapamätá v tomto prehliadači.", "Mazat výsledky smí jen správce. Heslo se zapamatuje v tomto prohlížeči.", "Only the admin can delete results. The password is remembered in this browser."),
    passwordPlaceholder: localized("Heslo", "Heslo", "Password"),
    deleteButton: localized("Zmazať", "Smazat", "Delete"),
    wrongPassword: localized("Nesprávne heslo.", "Nesprávné heslo.", "Wrong password."),
  };
  const byId = id => document.getElementById(id);
  const randomInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // ---- úložisko: loadShared/saveShared = spoločné pre zariadenie, load/save = aktuálneho hráča ----
  function loadShared(k, def) {
    try { const v = localStorage.getItem("brain." + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; }
  }
  function saveShared(k, v) {
    try { localStorage.setItem("brain." + k, JSON.stringify(v)); } catch (e) { /* bez úložiska sa len nepamätá */ }
  }
  const loadPlayer = (k, def) => loadShared(`u.${user()}.${k}`, def);
  const savePlayer = (k, v) => saveShared(`u.${user()}.${k}`, v);

  // ---- hráč ----
  const cleanName = s => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, 20);
  function user() { return cleanName(loadShared("user", "")); }
  function users() { return loadShared("users", []); }
  function setUser(name) {
    name = cleanName(name);
    if (!name) return false;
    saveShared("user", name);
    if (!users().includes(name)) saveShared("users", [...users(), name]);
    return true;
  }

  function today(d = new Date()) {
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  const locale = () => ({ sk: "sk-SK", cs: "cs-CZ", en: "en-US" })[I18N.lang] || "sk-SK";
  // Číslo podľa jazyka (medzera/čiarka); fixed = vždy `dec` desatinných miest.
  function formatNumber(x, dec = 0, fixed = false) {
    return Number(x).toLocaleString(locale(), { maximumFractionDigits: dec, minimumFractionDigits: fixed ? dec : 0 });
  }
  const formatSeconds = ms => formatNumber(ms / 1000, 1, true) + " s";

  // Výsledok „počet správnych, pri zhode kratší čas“ ako jedno číslo (väčšie = lepšie), aby
  // fungovalo bežné triedenie aj pravidlá servera: správne × SCALE + (SCALE − čas v desatinách s).
  // Čas 0,1 s – 2,75 h; UNKNOWN_TIME = výsledok spred merania času (čas neznámy, najhorší).
  // total = počet úloh v kole; staré výsledky (len počet správnych) sú ≤ total.
  function scoreWithTime(total) {
    const SCALE = 100000, UNKNOWN_TIME = 99000;
    const tenthsOf = ms => clamp(Math.round(ms / 100), 1, UNKNOWN_TIME - 1);
    const encode = (correct, ms) => correct * SCALE + SCALE - tenthsOf(ms);
    function decode(score) {
      if (score <= total) return { correct: score, ms: null };
      const tenths = SCALE - (score % SCALE);
      return { correct: Math.floor(score / SCALE), ms: tenths >= UNKNOWN_TIME ? null : tenths * 100 };
    }
    function format(score) {
      const { correct, ms } = decode(score);
      return `${correct}/${total} · ${ms === null ? "–" : formatSeconds(ms)}`;
    }
    const isOldFormat = score => typeof score === "number" && score <= total;
    const upgradeOldFormat = score => (isOldFormat(score) ? score * SCALE + SCALE - UNKNOWN_TIME : score);
    return { encode, decode, format, upgradeOldFormat };
  }

  // ---- výsledky ----
  function history(key) { return loadPlayer("h." + key, []); }
  function best(key) { return loadPlayer("best." + key, null); }
  function markDay() {
    const days = loadPlayer("days", {});
    days[today()] = (days[today()] || 0) + 1;
    savePlayer("days", days);
  }
  const HISTORY_LENGTH = 60;
  // Uloží výsledok: história, osobný rekord, tabuľka zariadenia (a fronta na server), aktívny deň.
  function record(key, score, lower = false) {
    const hist = [...history(key), { d: today(), s: score }].slice(-HISTORY_LENGTH);
    savePlayer("h." + key, hist);
    const prev = best(key);
    const isBest = prev === null || isBetter(score, prev, lower);
    if (isBest) savePlayer("best." + key, score);
    // tabuľka: pre každého hráča len jeho najlepší výsledok
    const local = loadLocalBoard(key), player = user() || "?";
    if (!(player in local) || isBetter(score, local[player], lower)) {
      local[player] = score;
      saveLocalBoard(key, local);
      if (cloudOn()) queueUpload(key, player, score);
    }
    markDay();
    return { isBest, prev, best: isBest ? score : prev, hist };
  }

  // Prevedie uložené výsledky hry (rekord, história, tabuľka zariadenia, fronta) funkciou
  // convert, ktorá pre už prevedený výsledok vráti to isté číslo. Prevedené rekordy
  // zariadenia sa zaradia na odoslanie, aby na serveri prepísali starý formát.
  function convertScores(key, convert) {
    const oldBest = best(key);
    if (oldBest !== null && convert(oldBest) !== oldBest) savePlayer("best." + key, convert(oldBest));
    const hist = history(key);
    if (hist.some(entry => convert(entry.s) !== entry.s)) savePlayer("h." + key, hist.map(entry => ({ ...entry, s: convert(entry.s) })));
    const local = loadLocalBoard(key), queue = loadUploadQueue();
    const changed = Object.keys(local).filter(name => convert(local[name]) !== local[name]);
    for (const name of changed) {
      local[name] = convert(local[name]);
      (queue[key] = queue[key] || {})[name] = local[name];
    }
    if (changed.length) saveLocalBoard(key, local);
    if (queue[key]) for (const name in queue[key]) queue[key][name] = convert(queue[key][name]);
    saveUploadQueue(queue);
  }

  // ---- denný tréning (plán uložený z dospeli/trening/) ----
  let gameKey = "";
  function dailyPlan() { const d = loadPlayer("daily", null); return d && d.date === today() ? d : null; }
  function inDaily() {
    const d = dailyPlan();
    return /[?&]daily\b/.test(location.search || "") && !!d && d.games.includes(gameKey);
  }
  // Označí aktuálnu hru ako hotovú, vráti ďalšiu (alebo null, keď je všetko).
  function dailyFinish() {
    const d = dailyPlan();
    if (!d) return null;
    if (!d.done.includes(gameKey)) d.done.push(gameKey);
    savePlayer("daily", d);
    const next = d.games.find(g => !d.done.includes(g)) || null;
    if (!next) { const all = loadPlayer("dailyDone", {}); all[d.date] = true; savePlayer("dailyDone", all); }
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
        <h2>👤 ${translate(TEXT.who)}</h2>
        ${known.length ? `<div class="known">${known.map(n => `<button type="button" data-n="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join("")}</div>` : ""}
        <input id="userName" type="text" maxlength="20" placeholder="${translate(TEXT.namePlaceholder)}" autocomplete="nickname">
        <p class="err" id="userErr"></p>
        <p class="muted">${translate(cloudOn() ? TEXT.nameHintShared : TEXT.nameHint)}</p>
        <div class="btnrow">
          ${canCancel ? `<button type="button" id="userCancel">${translate(TEXT.cancel)}</button>` : ""}
          <button type="button" class="primary" id="userOk">${translate(TEXT.play)}</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const choose = name => {
      if (!setUser(name)) { byId("userErr").textContent = translate(TEXT.nameRequired); return; }
      gateOpen = false;
      location.reload();
    };
    ov.querySelectorAll(".known button").forEach(b => b.addEventListener("click", () => choose(b.dataset.n)));
    byId("userOk").addEventListener("click", () => choose(byId("userName").value));
    byId("userName").addEventListener("keydown", e => { if (e.key === "Enter") choose(byId("userName").value); });
    if (canCancel) byId("userCancel").addEventListener("click", () => { ov.remove(); gateOpen = false; });
    byId("userName").focus();
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
  // Kľúče v localStorage (s predponou „brain.“). Reťazce sa nemenia – sú v nich už uložené výsledky.
  const STORAGE = {
    localBoard: game => "lb." + game,  // najlepšie výsledky hráčov z tohto zariadenia { meno: výsledok }
    uploadQueue: "lbq",                // výsledky čakajúce na odoslanie { hra: { meno: výsledok } }
    syncedGames: "lbsynced",           // hry, ktorých staré lokálne rekordy sa už raz nahrali
    adminPassword: "adminPass",
  };
  const loadLocalBoard = game => loadShared(STORAGE.localBoard(game), {});
  const saveLocalBoard = (game, scores) => saveShared(STORAGE.localBoard(game), scores);
  const loadUploadQueue = () => loadShared(STORAGE.uploadQueue, {});
  const saveUploadQueue = queue => saveShared(STORAGE.uploadQueue, queue);
  const loadSyncedGames = () => loadShared(STORAGE.syncedGames, []);

  // lower = pri tejto hre je menej lepšie (čas)
  const isBetter = (score, than, lower) => (lower ? score < than : score > than);
  // Zapíše výsledok do tabuľky { meno: výsledok }, ak je to najlepší výsledok toho hráča.
  function keepBest(scores, name, score, lower) {
    if (!(name in scores) || isBetter(score, scores[name], lower)) scores[name] = score;
  }

  const cloudOn = () => !!(CLOUD.projectId && CLOUD.apiKey) && typeof fetch === "function";
  const FIRESTORE_URL = "https://firestore.googleapis.com/v1/";
  const REQUEST_TIMEOUT_MS = 8000;
  const SCORES_QUERY_LIMIT = 5000;
  const documentsPath = () => `projects/${CLOUD.projectId}/databases/(default)/documents`;

  // Požiadavka na Firestore; chyba nesie hlášku a stav zo servera (napr. PERMISSION_DENIED).
  async function firestore(path, { method = "POST", body } = {}) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);
    try {
      const url = `${FIRESTORE_URL}${documentsPath()}${path}?key=${encodeURIComponent(CLOUD.apiKey)}`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: abort.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error?.message || `HTTP ${response.status}`);
        error.status = data.error?.status;
        throw error;
      }
      return data;
    } finally { clearTimeout(timer); }
  }

  // Dokument v kolekcii scores. Krátke názvy polí používajú pravidlá Firestore, preto sa nemenia:
  //   g = kľúč hry, n = meno, s = výsledok, lower = menej je lepšie, t = čas zápisu
  function toScoreFields(game, name, score, lower) {
    return {
      g: { stringValue: game },
      n: { stringValue: name },
      s: Number.isInteger(score) ? { integerValue: String(score) } : { doubleValue: score },
      lower: { booleanValue: !!lower },
      t: { timestampValue: new Date().toISOString() },
    };
  }
  // Dokument zo servera → { id, game, name, score }, neúplný → null.
  function fromScoreDocument(doc) {
    const fields = doc && doc.fields;
    if (!fields || !fields.g || !fields.n || !fields.s) return null;
    const name = cleanName(fields.n.stringValue);
    const score = Number(fields.s.integerValue ?? fields.s.doubleValue);
    if (!name || !Number.isFinite(score)) return null;
    return { id: doc.name.slice(doc.name.lastIndexOf("/") + 1), game: fields.g.stringValue, name, score };
  }
  // Výsledky jednej hry, alebo bez game všetkých hier naraz.
  async function queryScores(game = null) {
    const query = { from: [{ collectionId: "scores" }], limit: SCORES_QUERY_LIMIT };
    if (game) query.where = { fieldFilter: { field: { fieldPath: "g" }, op: "EQUAL", value: { stringValue: game } } };
    const rows = await firestore(":runQuery", { body: { structuredQuery: query } });
    return rows.map(row => fromScoreDocument(row.document)).filter(Boolean);
  }
  // { scores: { meno: najlepší výsledok }, documentIds: { meno: [id dokumentov] } }
  async function loadCloudBoard(game, lower) {
    const scores = {}, documentIds = {};
    for (const row of await queryScores(game)) {
      (documentIds[row.name] = documentIds[row.name] || []).push(row.id);
      keepBest(scores, row.name, row.score, lower);
    }
    return { scores, documentIds };
  }

  // Tabuľky viacerých hier naraz (úvodná stránka): lowerByGame = { hra: lower } → { hra: { meno: výsledok } }.
  // online = jedna požiadavka na server + výsledky čakajúce na odoslanie. Staré lokálne rekordy
  // len pri hrách, ktoré sa ešte nesynchronizovali – inak by sa ukázali riadky zmazané správcom.
  // Bez online len údaje z tohto zariadenia.
  async function loadBoards(lowerByGame, { online = cloudOn() } = {}) {
    const synced = online ? loadSyncedGames() : [];
    const boards = {};
    for (const game in lowerByGame) boards[game] = synced.includes(game) ? {} : { ...loadLocalBoard(game) };
    if (online) {
      for (const row of await queryScores()) {
        if (row.game in boards) keepBest(boards[row.game], row.name, row.score, lowerByGame[row.game]);
      }
    }
    const queue = loadUploadQueue();
    for (const game in lowerByGame) {
      for (const [name, score] of Object.entries(queue[game] || {})) keepBest(boards[game], name, score, lowerByGame[game]);
    }
    return boards;
  }

  // id dokumentu hráča v danej hre (bez „/“, aby nerozbilo cestu)
  const documentId = (game, name) => encodeURIComponent(game + "|" + name);
  function uploadScore(game, name, score, lower) {
    return firestore("/scores/" + encodeURIComponent(documentId(game, name)),
      { method: "PATCH", body: { fields: toScoreFields(game, name, score, lower) } });
  }
  function queueUpload(game, name, score) {
    const queue = loadUploadQueue();
    (queue[game] = queue[game] || {})[name] = score;
    saveUploadQueue(queue);
  }
  // Odošle čakajúce výsledky a vráti tabuľku zo servera. Staré lokálne rekordy (spred spoločnej
  // tabuľky) sa nahrajú len pri prvej synchronizácii hry – inak by sa zmazané riadky vracali.
  async function syncBoard(game, lower) {
    const { scores, documentIds } = await loadCloudBoard(game, lower);
    const synced = loadSyncedGames();
    const firstSync = !synced.includes(game);
    const pending = { ...(firstSync ? loadLocalBoard(game) : {}), ...(loadUploadQueue()[game] || {}) };
    const done = [];
    await Promise.all(Object.entries(pending).map(async ([name, score]) => {
      if (name in scores && !isBetter(score, scores[name], lower)) { done.push(name); return; }
      scores[name] = score;  // vlastný výsledok sa ukáže, aj keď sa ho nepodarí odoslať
      try { await uploadScore(game, name, score, lower); done.push(name); } catch (error) { /* skúsi sa znova nabudúce */ }
    }));
    removeFromQueue(game, done, pending);
    if (firstSync && done.length === Object.keys(pending).length) saveShared(STORAGE.syncedGames, [...synced, game]);
    if (!firstSync) forgetDeletedRows(game, scores);
    return { scores, documentIds };
  }
  // Fronta sa číta znova – počas odosielania mohol pribudnúť novší výsledok, ten v nej ostane.
  function removeFromQueue(game, names, sentScores) {
    const queue = loadUploadQueue();
    if (!queue[game]) return;
    for (const name of names) if (queue[game][name] === sentScores[name]) delete queue[game][name];
    if (!Object.keys(queue[game]).length) delete queue[game];
    saveUploadQueue(queue);
  }
  // Riadok, ktorý na serveri chýba (zmazal ho správca), zmizne aj z lokálnej tabuľky –
  // inak by sa ďalší, horší výsledok toho hráča už nikdy neodoslal.
  function forgetDeletedRows(game, cloudScores) {
    const local = loadLocalBoard(game);
    const deleted = Object.keys(local).filter(name => !(name in cloudScores));
    if (!deleted.length) return;
    deleted.forEach(name => delete local[name]);
    saveLocalBoard(game, local);
  }

  // ---- správca: mazanie riadkov heslom ----
  // Jeden atomický zápis (commit): heslo do skrytého dokumentu admin/del s časom servera
  // + zmazanie riadkov. Pravidlá povolia zmazanie, len keď sa v tej istej požiadavke
  // zapísalo správne heslo (admin/del sa nedá čítať). Pravidlá: README → Mazanie riadkov.
  const ADMIN_DOCUMENT = "admin/del";
  const isAdmin = () => cloudOn() && !!CLOUD.admin && user() === CLOUD.admin;
  const isPermissionDenied = error => error.status === "PERMISSION_DENIED";
  // meno dokumentu v tele požiadavky (nie v URL, preto bez kódovania)
  const documentName = path => `${documentsPath()}/${path}`;
  function deleteDocuments(ids, password) {
    return firestore(":commit", { body: { writes: [
      { update: { name: documentName(ADMIN_DOCUMENT), fields: { p: { stringValue: password } } },
        updateTransforms: [{ fieldPath: "t", setToServerValue: "REQUEST_TIME" }] },
      ...ids.map(id => ({ delete: documentName("scores/" + id) })),
    ] } });
  }
  // Zmaže dokumenty s uloženým heslom; bez neho (alebo so zlým) sa naň spýta. false = zrušené.
  async function deleteWithPassword(ids) {
    const saved = loadShared(STORAGE.adminPassword, "");
    if (saved) {
      try { await deleteDocuments(ids, saved); return true; } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        saveShared(STORAGE.adminPassword, "");
      }
    }
    return askPasswordAndDelete(ids);
  }
  function askPasswordAndDelete(ids) {
    return new Promise(resolve => {
      gateOpen = true;
      const dialog = document.createElement("div");
      dialog.className = "usergate";
      dialog.innerHTML = `
        <div class="card gate">
          <h2>${translate(TEXT.adminPasswordTitle)}</h2>
          <input id="adminPass" type="password" placeholder="${translate(TEXT.passwordPlaceholder)}" autocomplete="current-password">
          <p class="err" id="adminErr"></p>
          <p class="muted">${translate(TEXT.adminPasswordHint)}</p>
          <div class="btnrow">
            <button type="button" id="adminCancel">${translate(TEXT.cancel)}</button>
            <button type="button" class="primary" id="adminOk">${translate(TEXT.deleteButton)}</button>
          </div>
        </div>`;
      document.body.appendChild(dialog);
      const close = deleted => { dialog.remove(); gateOpen = false; resolve(deleted); };
      const submit = async () => {
        const password = byId("adminPass").value;
        if (!password) return;
        byId("adminErr").textContent = "";
        try {
          await deleteDocuments(ids, password);
          saveShared(STORAGE.adminPassword, password);
          close(true);
        } catch (error) {
          byId("adminErr").textContent = isPermissionDenied(error)
            ? translate(TEXT.wrongPassword) : `${translate(TEXT.deleteFailed)} (${error.message})`;
        }
      };
      byId("adminOk").addEventListener("click", submit);
      byId("adminPass").addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
      byId("adminCancel").addEventListener("click", () => close(false));
      byId("adminPass").focus();
    });
  }
  // Zmaže riadok hráča zo servera aj z tohto zariadenia (tabuľka, fronta, rekord, história).
  async function deleteRow(game, name, ids) {
    if (!confirm(`${translate(TEXT.deleteQuestion)} „${name}“?`)) return false;
    // aj vlastné id – riadok mohol práve pribudnúť pri tejto synchronizácii
    if (!(await deleteWithPassword([...new Set([...ids, documentId(game, name)])]))) return false;
    const local = loadLocalBoard(game);
    if (name in local) { delete local[name]; saveLocalBoard(game, local); }
    const queue = loadUploadQueue();
    if (queue[game] && name in queue[game]) { delete queue[game][name]; saveUploadQueue(queue); }
    if (users().includes(name)) { saveShared(`u.${name}.best.${game}`, null); saveShared(`u.${name}.h.${game}`, []); }
    return true;
  }

  // ---- tabuľka najlepších (vpravo vedľa hry) ----
  let latestBoardRequest = 0;
  function board(key, { lower = false, fmt = String } = {}) {
    if (!byId("board")) return;
    const request = ++latestBoardRequest;
    const options = { key, lower, fmt };
    if (!cloudOn()) { drawBoard(loadLocalBoard(key), options, TEXT.statusLocal); return; }
    drawBoard(loadLocalBoard(key), options, TEXT.statusLoading);
    // kým príde odpoveď, mohla sa zobraziť iná tabuľka (zmena režimu) – staršia odpoveď sa zahodí
    const isLatest = () => request === latestBoardRequest;
    syncBoard(key, lower).then(
      ({ scores, documentIds }) => { if (isLatest()) drawBoard(scores, options, TEXT.statusOnline, documentIds); },
      () => { if (isLatest()) drawBoard(loadLocalBoard(key), options, TEXT.statusOffline); });
  }
  // documentIds = id dokumentov zo servera; keď sú a hrá správca, riadky majú 🗑
  function drawBoard(scores, { key, lower, fmt }, status, documentIds = null) {
    const container = byId("board");
    if (!container) return;
    const player = user(), canDelete = !!documentIds && isAdmin();
    const ranking = Object.entries(scores).sort((a, b) => (lower ? a[1] - b[1] : b[1] - a[1]));
    const myIndex = ranking.findIndex(([name]) => name === player);
    const deleteButton = name => (canDelete
      ? `<button type="button" class="del" data-n="${escapeHtml(name)}" title="${translate(TEXT.deleteResult)}">🗑</button>` : "");
    const rowHtml = ([name, score], index) => `<li class="${name === player ? "me" : ""}"><span class="r">${index + 1}.</span>` +
      `<span class="n" title="${escapeHtml(name)}">${escapeHtml(name)}</span><b>${fmt(score)}</b>${deleteButton(name)}</li>`;
    const top = ranking.slice(0, 10).map(rowHtml).join("");
    const myRowBelowTop = myIndex >= 10 ? `<li class="gap">…</li>${rowHtml(ranking[myIndex], myIndex)}` : "";
    // aktuálne nastavenia hry (režim, obtiažnosť…) – aby bolo jasné, čoho sa tabuľka týka
    const settings = [...document.querySelectorAll("#controls .seg button.active")].map(b => b.textContent).join(" · ");
    container.innerHTML = `
      <h3>🏆 ${translate(TEXT.board)}</h3>
      ${settings ? `<p class="muted">${escapeHtml(settings)}</p>` : ""}
      ${ranking.length ? `<ol class="lb">${top}${myRowBelowTop}</ol>` : `<p class="muted">${translate(TEXT.boardEmpty)}</p>`}
      <p class="muted net">${translate(status)}</p>`;
    if (!canDelete) return;
    container.querySelectorAll(".lb .del").forEach(button => button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const name = button.dataset.n;
        if (await deleteRow(key, name, documentIds[name] || [])) board(key, { lower, fmt });
        else button.disabled = false;
      } catch (error) {
        button.disabled = false;
        container.querySelector(".net").textContent = `${translate(TEXT.deleteFailed)} (${error.message})`;
      }
    }));
  }

  // ---- stránka ----
  function page({ key, title, footer }) {
    gameKey = key;
    const daily = inDaily();
    document.body.classList.add("brain");
    document.body.innerHTML = `
      <header><div class="titlebar"><a class="btn backbtn" id="backBtn" href="${daily ? "../trening/" : "../"}">${translate(daily ? TEXT.homeDaily : TEXT.home)}</a><h1>${translate(title)}</h1></div><div class="controls" id="controls"></div></header>
      <div class="layout"><main id="main"></main><aside class="board" id="board"></aside></div>
      <footer>${translate(footer) || ""} <a href="${daily ? "../trening/" : "../"}">${translate(daily ? TEXT.backDaily : TEXT.back)}</a></footer>`;
    ensureUser(document.querySelector("header"));
    if (daily) {
      const d = dailyPlan();
      const b = document.createElement("span");
      b.className = "daily-badge";
      b.textContent = `${translate(TEXT.daily)} ${d.games.indexOf(key) + 1}/${d.games.length}`;
      byId("controls").appendChild(b);
    }
    I18N.attach();
    return { controls: byId("controls"), main: byId("main") };
  }
  // Počas hry sa nastavenia nedajú meniť.
  function playing(on) { document.body.classList.toggle("playing", !!on); }

  // Prepínač nastavenia (segmentované tlačidlá), voľba sa pamätá.
  function choice(parent, { key, label, options, onChange }) {
    let value = loadPlayer("opt." + key, null);
    if (!options.some(o => o.v === value)) value = options[0].v;
    const box = document.createElement("div");
    box.className = "choice";
    if (label) { const s = document.createElement("span"); s.textContent = translate(label); box.appendChild(s); }
    const seg = document.createElement("div");
    seg.className = "seg";
    const btns = options.map(o => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.v = String(o.v);
      b.textContent = translate(o.label);
      b.addEventListener("click", () => {
        if (document.body.classList.contains("playing")) return;
        value = o.v; savePlayer("opt." + key, value); sync(); b.blur();
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
        <p class="desc">${translate(desc)}</p>
        ${extra}
        <p class="statline">${b === null ? translate(TEXT.noBest) : translate(TEXT.best) + " <b>" + fmt(b) + "</b>"}</p>
        ${spark(history(key), lower)}
        <div class="btnrow"><button type="button" class="primary" id="startBtn">${translate(TEXT.start)}</button></div>
      </div>`;
    byId("startBtn").addEventListener("click", onStart);
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
        <div class="res-label">${translate(label || TEXT.result)}</div>
        <div class="big">${score === null ? "–" : fmt(score)}</div>
        ${r.isBest && r.prev !== null ? `<div class="newbest">${translate(TEXT.newBest)}</div>` : ""}
        <p class="statline">${r.best !== null ? translate(TEXT.best) + " <b>" + fmt(r.best) + "</b>" : ""}</p>
        ${lines.length ? `<ul class="lines">${lines.map(l => `<li>${translate(l)}</li>`).join("")}</ul>` : ""}
        ${spark(r.hist, lower)}
        <div class="btnrow">
          <button type="button" id="againBtn">${translate(TEXT.again)}</button>
          ${extraBtn ? `<button type="button" id="extraBtn">${translate(extraBtn.label)}</button>` : ""}
          ${daily ? `<a class="btn primary" id="dailyBtn" href="${dailyHref}">${translate(next ? TEXT.nextDaily : TEXT.dailyDone)}</a>` : ""}
        </div>
      </div>`;
    byId("againBtn").addEventListener("click", onAgain);
    if (extraBtn) byId("extraBtn").addEventListener("click", extraBtn.onClick);
    onKey(k => {
      if (k !== "Enter") return false;
      if (daily) location.href = dailyHref; else onAgain();
      return true;
    });
    return r;
  }

  // Tlačidlo „Ďalej" + Enter; vráti Promise, ktorý sa splní po stlačení.
  function waitNext(parent, label = TEXT.next) {
    return new Promise(res => {
      const row = document.createElement("div");
      row.className = "btnrow";
      const b = document.createElement("button");
      b.type = "button"; b.className = "primary"; b.textContent = translate(label);
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
    localized, randomInt, pick, shuffle, clamp, sleep, escapeHtml,
    loadPlayer, savePlayer, loadShared, saveShared, today, formatNumber, formatSeconds,
    user, users, setUser, askUser, ensureUser, board, loadBoards, cloudOn, cloud: CLOUD,
    history, best, record, markDay, scoreWithTime, convertScores, dailyPlan, inDaily, dailyFinish,
    onKey, page, playing, choice, spark, intro, result, waitNext, numpad, countdown, stopwatch,
    get key() { return gameKey; },
  };
})();
