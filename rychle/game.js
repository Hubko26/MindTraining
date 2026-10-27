// Rýchle počty – za 60 sekúnd čo najviac príkladov. Obtiažnosť každej
// operácie sa prispôsobuje: 3 rýchle správne za sebou = ťažšie, chyba = ľahšie.
const DURATION = 60000;
const MAX_LV = 10;
const OPS = { add: "+", sub: "−", mul: "×", div: "÷" };
// sčítanie/odčítanie: horná hranica čísel podľa úrovne
const ADD_MAX = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
// násobenie/delenie: [[od, do] prvého činiteľa, [od, do] druhého]
const MUL_RANGES = [
  [[2, 5], [2, 10]], [[2, 10], [2, 10]], [[2, 12], [2, 12]], [[6, 15], [3, 9]], [[11, 25], [3, 9]],
  [[12, 20], [11, 15]], [[20, 99], [3, 9]], [[13, 30], [11, 19]], [[100, 999], [3, 9]], [[21, 99], [21, 99]],
];
const MODES = [
  { v: "mix", label: { sk: "Mix", cs: "Mix", en: "Mix" }, ops: ["add", "sub", "mul", "div"] },
  { v: "add", label: "+", ops: ["add"] },
  { v: "sub", label: "−", ops: ["sub"] },
  { v: "mul", label: "×", ops: ["mul"] },
  { v: "div", label: "÷", ops: ["div"] },
];
const L = Brain.L;
const $ = id => document.getElementById(id);

function gen(op, lv) {
  lv = Brain.clamp(lv, 1, MAX_LV);
  if (op === "add" || op === "sub") {
    const max = ADD_MAX[lv - 1], min = Math.max(2, Math.floor(max / 10));
    let a = Brain.rnd(min, max), b = Brain.rnd(min, max);
    if (op === "sub" && b > a) [a, b] = [b, a];
    return { op, a, b, ans: op === "add" ? a + b : a - b };
  }
  const [[a1, a2], [b1, b2]] = MUL_RANGES[lv - 1];
  const x = Brain.rnd(a1, a2), y = Brain.rnd(b1, b2);
  // delenie = obrátené násobenie, výsledok je vždy celé číslo
  return op === "mul" ? { op, a: x, b: y, ans: x * y } : { op, a: x * y, b: y, ans: x };
}
const label = q => `${Brain.num(q.a)} ${OPS[q.op]} ${Brain.num(q.b)}`;

const ui = Brain.page({
  key: "rychle",
  title: { sk: "⚡ Rýchle počty", cs: "⚡ Rychlé počty", en: "⚡ Speed arithmetic" },
  footer: { sk: "Rýchlosť: správna odpoveď sa prijme sama. Presnosť: potvrď OK, prvá chyba končí. ·", cs: "Rychlost: správná odpověď se přijme sama. Přesnost: potvrď OK, první chyba končí. ·", en: "Speed: correct answers are accepted automatically. Accuracy: confirm with OK, the first mistake ends it. ·" },
});
const style = Brain.choice(ui.controls, {
  key: "rychle.style", label: { sk: "Režim:", cs: "Režim:", en: "Mode:" }, onChange: showIntro,
  options: [
    { v: "speed", label: L("rýchlosť", "rychlost", "speed") },
    { v: "acc", label: L("presnosť", "přesnost", "accuracy") },
  ],
});
const mode = Brain.choice(ui.controls, {
  key: "rychle.mode", label: { sk: "Príklady:", cs: "Příklady:", en: "Problems:" }, options: MODES, onChange: showIntro,
});

const levels = () => ({ add: 1, sub: 1, mul: 1, div: 1, ...Brain.load("lv.rychle", {}) });
// rekordy: rychle.<príklady> (rýchlosť), rychle.acc.<príklady> (presnosť)
const recKey = () => (style.value === "acc" ? "rychle.acc." : "rychle.") + mode.value;

function showIntro() {
  const lv = levels();
  Brain.intro(ui.main, {
    key: recKey(),
    desc: style.value === "acc" ? L(
      "Režim presnosť: čas nebeží, každý výsledok potvrdíš OK (Enter). <b>Prvá chyba hru končí.</b> Rekord = najdlhšia séria bez chyby. Skontroluj si výsledok skôr, než ho potvrdíš – presne to je tréning.",
      "Režim přesnost: čas neběží, každý výsledek potvrdíš OK (Enter). <b>První chyba hru končí.</b> Rekord = nejdelší série bez chyby. Zkontroluj si výsledek dřív, než ho potvrdíš – přesně to je trénink.",
      "Accuracy mode: no clock, confirm each answer with OK (Enter). <b>The first mistake ends the game.</b> Best = longest error-free streak. Check your answer before confirming – that habit is the training.") : L(
      "60 sekúnd, čo najviac príkladov. Výsledok píš rovno – keď je správny, hneď ide ďalší. Každá operácia má vlastnú úroveň 1–10, ktorá sa ti prispôsobuje.",
      "60 sekund, co nejvíc příkladů. Výsledek piš rovnou – když je správný, hned jde další. Každá operace má vlastní úroveň 1–10, která se ti přizpůsobuje.",
      "60 seconds, as many problems as you can. Just type the answer – when it's right, the next one appears. Each operation has its own level 1–10 that adapts to you."),
    extra: `<p class="muted">${t(L("Úrovne", "Úrovně", "Levels"))}: + ${lv.add} · − ${lv.sub} · × ${lv.mul} · ÷ ${lv.div}</p>`,
    onStart: () => (style.value === "acc" ? playAccuracy() : play()),
  });
}

// Presnosť: bez času, potvrdenie OK, náhla smrť pri prvej chybe.
function playAccuracy() {
  Brain.playing(true);
  const ops = MODES.find(m => m.v === mode.value).ops;
  const lv = levels();
  const streak = { add: 0, sub: 0, mul: 0, div: 0 };
  let cur = null, series = 0, totalMs = 0, shownAt = 0;
  ui.main.innerHTML = `
    <div class="statline"><span>${t(L("Séria bez chyby", "Série bez chyby", "Error-free streak"))} <b id="ok">0</b></span></div>
    <div class="big" id="q"></div>`;
  const pad = Brain.numpad(ui.main, { onSubmit: v => (v === cur.ans ? right() : wrong(v)) });
  function nextQ() {
    const op = Brain.pick(ops);
    let q;
    do { q = gen(op, lv[op]); } while (cur && q.a === cur.a && q.b === cur.b);
    cur = q; shownAt = Date.now();
    $("q").textContent = label(q);
    pad.clear();
  }
  function right() {
    series++;
    totalMs += Date.now() - shownAt;
    // bez časovej podmienky – v tomto režime sa za pomalosť netrestá
    if (++streak[cur.op] >= 3) { lv[cur.op] = Math.min(MAX_LV, lv[cur.op] + 1); streak[cur.op] = 0; }
    $("ok").textContent = series;
    pad.flash("right");
    nextQ();
  }
  function wrong(v) {
    pad.enable(false);
    pad.show(`${Brain.num(v)} ✗`, "wrong");
    $("q").textContent = label(cur) + " = " + Brain.num(cur.ans);
    setTimeout(() => {
      Brain.result(ui.main, {
        key: recKey(), score: series,
        label: L("Séria bez chyby", "Série bez chyby", "Error-free streak"),
        lines: [
          L(`Chyba: ${label(cur)} = ${Brain.num(cur.ans)}, ty ${Brain.num(v)}`, `Chyba: ${label(cur)} = ${Brain.num(cur.ans)}, ty ${Brain.num(v)}`, `Mistake: ${label(cur)} = ${Brain.num(cur.ans)}, you ${Brain.num(v)}`),
          L(`Priemerne ${Brain.secs(series ? totalMs / series : 0)} na príklad`, `Průměrně ${Brain.secs(series ? totalMs / series : 0)} na příklad`, `Average ${Brain.secs(series ? totalMs / series : 0)} per problem`),
          L("Tip: pred OK sa na sekundu zastav a over aspoň poslednú číslicu.", "Tip: před OK se na vteřinu zastav a ověř aspoň poslední číslici.", "Tip: pause for a second before OK and check at least the last digit."),
        ],
        onAgain: playAccuracy,
      });
    }, 1600);
  }
  nextQ();
}

function play() {
  Brain.playing(true);
  const ops = MODES.find(m => m.v === mode.value).ops;
  const lv = levels();
  const streak = { add: 0, sub: 0, mul: 0, div: 0 };
  const solved = [];  // { text, ms }
  let cur = null, shownAt = 0, missed = false, wrong = 0;

  ui.main.innerHTML = `
    <div class="tbar"><i id="tbar"></i></div>
    <div class="statline"><span>✔ <b id="ok">0</b></span><span>⏱ <b id="left">60</b> s</span></div>
    <div class="big" id="q"></div>`;
  const pad = Brain.numpad(ui.main, {
    onInput: v => { if (v === cur.ans) hit(); },
    onSubmit: giveUp,
  });

  function nextQ() {
    const op = Brain.pick(ops);
    let q;
    do { q = gen(op, lv[op]); } while (cur && q.a === cur.a && q.b === cur.b);
    cur = q; shownAt = Date.now(); missed = false;
    $("q").textContent = label(q);
    pad.clear();
  }
  function hit() {
    const ms = Date.now() - shownAt;
    solved.push({ text: label(cur) + " = " + Brain.num(cur.ans), ms });
    if (!missed && ++streak[cur.op] >= 3 && ms < 6000) { lv[cur.op] = Math.min(MAX_LV, lv[cur.op] + 1); streak[cur.op] = 0; }
    $("ok").textContent = solved.length;
    pad.flash("right");
    nextQ();
  }
  // OK s nesprávnym výsledkom: ukáž správny, zníž úroveň, pokračuj ďalším
  function giveUp() {
    wrong++;
    streak[cur.op] = 0;
    lv[cur.op] = Math.max(1, lv[cur.op] - 1);
    pad.flash("wrong");
    $("q").textContent = label(cur) + " = " + Brain.num(cur.ans);
    pad.enable(false);
    setTimeout(() => { pad.enable(true); nextQ(); }, 900);
  }
  function finish() {
    pad.enable(false);
    Brain.save("lv.rychle", lv);
    const avg = solved.length ? solved.reduce((s, d) => s + d.ms, 0) / solved.length : 0;
    const total = solved.length + wrong;
    const slow = solved.slice().sort((a, b) => b.ms - a.ms).slice(0, 3);
    const lines = [
      L(`Presnosť: ${total ? Math.round(solved.length / total * 100) : 0} % (${wrong} vzdaných)`,
        `Přesnost: ${total ? Math.round(solved.length / total * 100) : 0} % (${wrong} vzdaných)`,
        `Accuracy: ${total ? Math.round(solved.length / total * 100) : 0}% (${wrong} given up)`),
      L(`Priemerne ${Brain.secs(avg)} na príklad`, `Průměrně ${Brain.secs(avg)} na příklad`, `Average ${Brain.secs(avg)} per problem`),
      L(`Úrovne teraz: + ${lv.add} · − ${lv.sub} · × ${lv.mul} · ÷ ${lv.div}`, `Úrovně teď: + ${lv.add} · − ${lv.sub} · × ${lv.mul} · ÷ ${lv.div}`, `Levels now: + ${lv.add} · − ${lv.sub} · × ${lv.mul} · ÷ ${lv.div}`),
    ];
    if (slow.length) lines.push(t(L("Najdlhšie trvali: ", "Nejdéle trvaly: ", "Slowest: ")) + slow.map(s => `${s.text} (${Brain.secs(s.ms)})`).join(", "));
    Brain.result(ui.main, {
      key: recKey(), score: solved.length,
      label: L("Správnych príkladov za 60 s", "Správných příkladů za 60 s", "Correct in 60 s"),
      lines, onAgain: play,
    });
  }

  nextQ();
  Brain.countdown(DURATION, (left, f) => {
    $("tbar").style.width = (f * 100).toFixed(1) + "%";
    $("left").textContent = Math.ceil(left / 1000);
  }, finish);
}

showIntro();
