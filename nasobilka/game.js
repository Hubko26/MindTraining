// Násobilka do 20 – opakovanie podľa Leitnera: každý príklad je v krabičke 1–5.
// Rýchla správna odpoveď ho posunie vyššie (zriedkavejšie), chyba späť do 1
// (častejšie, a zopakuje sa ešte v tomto kole). Mapa ukazuje, čo už vieš.
const SESSION = 20;
const RANGES = [10, 12, 15, 20];
const WEIGHT = [6, 16, 8, 4, 2, 1];  // index = krabička, 0 = ešte nevidené
const FAST = 4000;
const localized = Brain.localized;
const byId = id => document.getElementById(id);

const factKey = (a, b) => `${Math.min(a, b)}x${Math.max(a, b)}`;
function facts(max) {
  const f = [];
  for (let a = 2; a <= max; a++) for (let b = a; b <= max; b++) f.push(factKey(a, b));
  return f;
}
// Vážený výber podľa krabičky, bez opakovania predchádzajúceho príkladu.
function chooseFact(list, boxes, avoid) {
  const pool = list.filter(k => k !== avoid);
  const w = pool.map(k => WEIGHT[boxes[k] || 0]);
  let r = Math.random() * w.reduce((s, x) => s + x, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r < 0) return pool[i]; }
  return pool[pool.length - 1];
}
// Nová krabička po odpovedi.
function nextBox(box, correct, ms) {
  if (!correct) return 1;
  if (ms < FAST) return Math.min(5, (box || 1) + 1);
  return box || 1;
}

const ui = Brain.page({
  key: "nasobilka",
  title: { sk: "✖️ Násobilka do 20", cs: "✖️ Násobilka do 20", en: "✖️ Times tables to 20" },
  footer: { sk: "Rýchla správna odpoveď = do 4 sekúnd. ·", cs: "Rychlá správná odpověď = do 4 sekund. ·", en: "Fast = under 4 seconds. ·" },
});
const range = Brain.choice(ui.controls, {
  key: "nasobilka.max", label: { sk: "Do:", cs: "Do:", en: "Up to:" }, onChange: showIntro,
  options: RANGES.map(v => ({ v, label: String(v) })),
});

function heatmap(max, boxes) {
  let h = `<div class="heat" style="grid-template-columns: repeat(${max - 1}, 1fr)">`;
  for (let a = 2; a <= max; a++) for (let b = 2; b <= max; b++) {
    const bx = boxes[factKey(a, b)] || 0;
    h += `<i class="b${bx}" title="${a} × ${b} = ${a * b}"></i>`;
  }
  h += `</div><div class="legend muted"><i class="b0"></i>${translate(localized("nové", "nové", "new"))} <i class="b1"></i>${translate(localized("neviem", "nevím", "unknown"))} <i class="b3"></i>${translate(localized("učím sa", "učím se", "learning"))} <i class="b5"></i>${translate(localized("viem", "umím", "known"))}</div>`;
  return h;
}
const mastered = (list, boxes) => list.filter(k => (boxes[k] || 0) >= 4).length;

// Výsledok do tabuľky: najprv počet správnych, pri zhode kratší celkový čas kola
// (jedno číslo, viď Brain.scoreWithTime – vie ho zobraziť aj úvodná stránka).
const SCORE = Brain.scoreWithTime(SESSION);
const encode = SCORE.encode;
const decode = SCORE.decode;
const formatScore = SCORE.format;
// Staré výsledky (len počet správnych) prevedie na nový formát s neznámym časom.
function upgradeOldScores() {
  for (const max of RANGES) Brain.convertScores("nasobilka." + max, SCORE.upgradeOldFormat);
}

function showIntro() {
  const boxes = Brain.loadPlayer("leitner", {}), list = facts(range.value);
  Brain.intro(ui.main, {
    key: "nasobilka." + range.value,
    desc: localized(
      `${SESSION} príkladov z násobilky do ${range.value}. Častejšie prídu tie, ktoré nevieš alebo dlho trváš. Zvládnuté: ${mastered(list, boxes)}/${list.length}.`,
      `${SESSION} příkladů z násobilky do ${range.value}. Častěji přijdou ty, které nevíš nebo ti trvají. Zvládnuté: ${mastered(list, boxes)}/${list.length}.`,
      `${SESSION} problems from the tables up to ${range.value}. The ones you miss or are slow on come up more often. Mastered: ${mastered(list, boxes)}/${list.length}.`),
    extra: heatmap(range.value, boxes),
    fmt: formatScore,
    onStart: play,
  });
}

function play() {
  Brain.playing(true);
  const boxes = Brain.loadPlayer("leitner", {}), list = facts(range.value);
  const requeue = [];  // [index otázky, kľúč] – chybné príklady sa vrátia o 3 otázky
  let i = 0, score = 0, cur = null, shownAt = 0, miss = false, totalMs = 0;
  ui.main.innerHTML = `
    <div class="statline"><span><b id="i">1</b>/${SESSION}</span><span>✔ <b id="sc">0</b></span><span>⏱ <b id="tm">${Brain.formatSeconds(0)}</b></span></div>
    <div class="big" id="q"></div>`;
  const pad = Brain.numpad(ui.main, {
    onInput: v => { if (v === cur.ans) answer(true); },
    onSubmit: () => answer(false),
  });
  function next() {
    if (i >= SESSION) return finish();
    const due = requeue.findIndex(r => r[0] <= i);
    const key = due >= 0 ? requeue.splice(due, 1)[0][1] : chooseFact(list, boxes, cur && cur.key);
    const [a, b] = key.split("x").map(Number);
    const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a];
    cur = { key, ans: a * b, text: `${x} × ${y}` };
    miss = false; shownAt = Date.now();
    byId("i").textContent = i + 1;
    byId("q").textContent = cur.text;
    pad.clear();
  }
  function answer(ok) {
    const ms = Date.now() - shownAt;
    if (!ok) {
      if (!miss) { miss = true; boxes[cur.key] = 1; requeue.push([i + 3, cur.key]); }
      pad.flash("wrong");
      pad.show(`${cur.text} = ${cur.ans}`, "wrong");
      pad.enable(false);
      setTimeout(() => { pad.enable(true); pad.clear(); i++; next(); }, 1500);
      return;
    }
    if (!miss) { score++; boxes[cur.key] = nextBox(boxes[cur.key], true, ms); totalMs += ms; }
    byId("sc").textContent = score;
    pad.flash("right");
    i++;
    next();
  }
  // celkový čas kola od prvého príkladu po poslednú odpoveď (aj s chybami)
  const stopRoundClock = Brain.stopwatch(ms => { byId("tm").textContent = Brain.formatSeconds(ms); });
  function finish() {
    const roundMs = stopRoundClock();
    Brain.savePlayer("leitner", boxes);
    Brain.result(ui.main, {
      key: "nasobilka." + range.value, score: encode(score, roundMs),
      fmt: formatScore,
      label: localized("Správne na prvý pokus · celkový čas", "Správně na první pokus · celkový čas", "Right on the first try · total time"),
      lines: [
        localized(`Zvládnuté príklady: ${mastered(list, boxes)}/${list.length}`, `Zvládnuté příklady: ${mastered(list, boxes)}/${list.length}`, `Mastered facts: ${mastered(list, boxes)}/${list.length}`),
        localized(`Priemerný čas správnej odpovede: ${Brain.formatSeconds(score ? totalMs / score : 0)}`, `Průměrný čas správné odpovědi: ${Brain.formatSeconds(score ? totalMs / score : 0)}`, `Average time per correct answer: ${Brain.formatSeconds(score ? totalMs / score : 0)}`),
        heatmap(range.value, boxes),
      ],
      onAgain: play,
    });
  }
  next();
}

upgradeOldScores();
showIntro();
