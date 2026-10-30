// Rýchle počty – za 60 sekúnd čo najviac príkladov (alebo v režime presnosť čo najdlhšia
// séria bez chyby). Obtiažnosť rastie s dĺžkou série správnych odpovedí: každá hra začína
// ľahko, každé 3 správne za sebou = o úroveň ťažšie, chyba sériu preruší a vráti úroveň 1.
// Všetci tak hrajú za rovnakých podmienok, čo je dôležité pre spoločnú tabuľku.
const DURATION_MS = 60000;
const MAX_LEVEL = 10;
const CORRECT_PER_LEVEL = 3;
const WRONG_ANSWER_PAUSE_MS = 900;
const RESULT_DELAY_MS = 1600;
const SLOWEST_SHOWN = 3;
const OPERATION_SYMBOLS = { add: "+", sub: "−", mul: "×", div: "÷" };
// sčítanie/odčítanie: horná hranica čísel podľa úrovne
const ADDITION_MAX = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
// násobenie/delenie: [[od, do] prvého činiteľa, [od, do] druhého]
const MULTIPLICATION_RANGES = [
  [[2, 5], [2, 10]], [[2, 10], [2, 10]], [[2, 12], [2, 12]], [[6, 15], [3, 9]], [[11, 25], [3, 9]],
  [[12, 20], [11, 15]], [[20, 99], [3, 9]], [[13, 30], [11, 19]], [[100, 999], [3, 9]], [[21, 99], [21, 99]],
];
const MODES = [
  { v: "mix", label: { sk: "Mix", cs: "Mix", en: "Mix" }, operations: ["add", "sub", "mul", "div"] },
  { v: "add", label: "+", operations: ["add"] },
  { v: "sub", label: "−", operations: ["sub"] },
  { v: "mul", label: "×", operations: ["mul"] },
  { v: "div", label: "÷", operations: ["div"] },
];
const localized = Brain.localized;
const byId = id => document.getElementById(id);

const levelForStreak = streak => Math.min(MAX_LEVEL, 1 + Math.floor(streak / CORRECT_PER_LEVEL));

function generateProblem(operation, level) {
  level = Brain.clamp(level, 1, MAX_LEVEL);
  if (operation === "add" || operation === "sub") {
    const max = ADDITION_MAX[level - 1], min = Math.max(2, Math.floor(max / 10));
    let a = Brain.randomInt(min, max), b = Brain.randomInt(min, max);
    if (operation === "sub" && b > a) [a, b] = [b, a];
    return { operation, a, b, answer: operation === "add" ? a + b : a - b };
  }
  const [[firstMin, firstMax], [secondMin, secondMax]] = MULTIPLICATION_RANGES[level - 1];
  const x = Brain.randomInt(firstMin, firstMax), y = Brain.randomInt(secondMin, secondMax);
  // delenie = obrátené násobenie, výsledok je vždy celé číslo
  return operation === "mul" ? { operation, a: x, b: y, answer: x * y } : { operation, a: x * y, b: y, answer: x };
}
// Ďalší príklad zadanej úrovne – nie rovnaký ako predchádzajúci.
function nextProblem(operations, level, previous) {
  let problem;
  do { problem = generateProblem(Brain.pick(operations), level); }
  while (previous && problem.a === previous.a && problem.b === previous.b);
  return problem;
}
const problemText = problem => `${Brain.formatNumber(problem.a)} ${OPERATION_SYMBOLS[problem.operation]} ${Brain.formatNumber(problem.b)}`;
const solvedText = problem => problemText(problem) + " = " + Brain.formatNumber(problem.answer);

const ui = Brain.page({
  key: "rychle",
  title: { sk: "⚡ Rýchle počty", cs: "⚡ Rychlé počty", en: "⚡ Speed arithmetic" },
  footer: { sk: "Rýchlosť: správna odpoveď sa prijme sama. Presnosť: potvrď OK, prvá chyba končí. ·", cs: "Rychlost: správná odpověď se přijme sama. Přesnost: potvrď OK, první chyba končí. ·", en: "Speed: correct answers are accepted automatically. Accuracy: confirm with OK, the first mistake ends it. ·" },
});
const style = Brain.choice(ui.controls, {
  key: "rychle.style", label: { sk: "Režim:", cs: "Režim:", en: "Mode:" }, onChange: showIntro,
  options: [
    { v: "speed", label: localized("rýchlosť", "rychlost", "speed") },
    { v: "acc", label: localized("presnosť", "přesnost", "accuracy") },
  ],
});
const mode = Brain.choice(ui.controls, {
  key: "rychle.mode", label: { sk: "Príklady:", cs: "Příklady:", en: "Problems:" }, options: MODES, onChange: showIntro,
});
const selectedOperations = () => MODES.find(m => m.v === mode.value).operations;

// rekordy: rychle.<príklady> (rýchlosť), rychle.acc.<príklady> (presnosť)
const recordKey = () => (style.value === "acc" ? "rychle.acc." : "rychle.") + mode.value;
const levelText = level => translate(localized(`Úroveň ${level}`, `Úroveň ${level}`, `Level ${level}`));

function showIntro() {
  Brain.intro(ui.main, {
    key: recordKey(),
    desc: style.value === "acc" ? localized(
      "Režim presnosť: čas nebeží, každý výsledok potvrdíš OK (Enter). <b>Prvá chyba hru končí.</b> Rekord = najdlhšia séria bez chyby. Každé 3 správne sú príklady ťažšie. Skontroluj si výsledok skôr, než ho potvrdíš – presne to je tréning.",
      "Režim přesnost: čas neběží, každý výsledek potvrdíš OK (Enter). <b>První chyba hru končí.</b> Rekord = nejdelší série bez chyby. Každé 3 správné jsou příklady těžší. Zkontroluj si výsledek dřív, než ho potvrdíš – přesně to je trénink.",
      "Accuracy mode: no clock, confirm each answer with OK (Enter). <b>The first mistake ends the game.</b> Best = longest error-free streak. Every 3 correct answers the problems get harder. Check your answer before confirming – that habit is the training.") : localized(
      "60 sekúnd, čo najviac príkladov. Výsledok píš rovno – keď je správny, hneď ide ďalší. Začína sa ľahko a každé 3 správne za sebou sú príklady ťažšie (úroveň 1–10). Chyba sériu preruší a vráti ťa na úroveň 1.",
      "60 sekund, co nejvíc příkladů. Výsledek piš rovnou – když je správný, hned jde další. Začíná se lehce a každé 3 správné za sebou jsou příklady těžší (úroveň 1–10). Chyba sérii přeruší a vrátí tě na úroveň 1.",
      "60 seconds, as many problems as you can. Just type the answer – when it's right, the next one appears. It starts easy and every 3 correct in a row make it harder (level 1–10). A mistake breaks the streak and takes you back to level 1."),
    onStart: () => (style.value === "acc" ? playAccuracy() : playSpeed()),
  });
}

// Presnosť: bez času, potvrdenie OK, náhla smrť pri prvej chybe.
function playAccuracy() {
  Brain.playing(true);
  const operations = selectedOperations();
  let current = null, streak = 0, totalMs = 0, shownAt = 0;
  ui.main.innerHTML = `
    <div class="statline"><span>${translate(localized("Séria bez chyby", "Série bez chyby", "Error-free streak"))} <b id="ok">0</b></span><span id="level"></span></div>
    <div class="big" id="q"></div>`;
  const pad = Brain.numpad(ui.main, { onSubmit: value => (value === current.answer ? right() : wrong(value)) });
  function showNext() {
    const level = levelForStreak(streak);
    current = nextProblem(operations, level, current);
    shownAt = Date.now();
    byId("q").textContent = problemText(current);
    byId("level").textContent = levelText(level);
    pad.clear();
  }
  function right() {
    streak++;
    totalMs += Date.now() - shownAt;
    byId("ok").textContent = streak;
    pad.flash("right");
    showNext();
  }
  function wrong(value) {
    pad.enable(false);
    pad.show(`${Brain.formatNumber(value)} ✗`, "wrong");
    byId("q").textContent = solvedText(current);
    setTimeout(() => showAccuracyResult(current, value), RESULT_DELAY_MS);
  }
  function showAccuracyResult(missed, value) {
    const average = Brain.formatSeconds(streak ? totalMs / streak : 0);
    Brain.result(ui.main, {
      key: recordKey(), score: streak,
      label: localized("Séria bez chyby", "Série bez chyby", "Error-free streak"),
      lines: [
        localized(`Chyba: ${solvedText(missed)}, ty ${Brain.formatNumber(value)}`, `Chyba: ${solvedText(missed)}, ty ${Brain.formatNumber(value)}`, `Mistake: ${solvedText(missed)}, you ${Brain.formatNumber(value)}`),
        localized(`Priemerne ${average} na príklad · dosiahnutá úroveň ${levelForStreak(streak)}`, `Průměrně ${average} na příklad · dosažená úroveň ${levelForStreak(streak)}`, `Average ${average} per problem · reached level ${levelForStreak(streak)}`),
        localized("Tip: pred OK sa na sekundu zastav a over aspoň poslednú číslicu.", "Tip: před OK se na vteřinu zastav a ověř aspoň poslední číslici.", "Tip: pause for a second before OK and check at least the last digit."),
      ],
      onAgain: playAccuracy,
    });
  }
  showNext();
}

// Rýchlosť: 60 s, správna odpoveď sa prijme sama, OK so zlou odpoveďou = vzdať príklad.
function playSpeed() {
  Brain.playing(true);
  const operations = selectedOperations();
  const solved = [];  // { text, ms }
  let current = null, shownAt = 0, streak = 0, longestStreak = 0, highestLevel = 1, givenUp = 0;

  ui.main.innerHTML = `
    <div class="tbar"><i id="tbar"></i></div>
    <div class="statline"><span>✔ <b id="ok">0</b></span><span id="level"></span><span>⏱ <b id="left">60</b> s</span></div>
    <div class="big" id="q"></div>`;
  const pad = Brain.numpad(ui.main, {
    onInput: value => { if (value === current.answer) right(); },
    onSubmit: giveUp,
  });

  function showNext() {
    const level = levelForStreak(streak);
    highestLevel = Math.max(highestLevel, level);
    current = nextProblem(operations, level, current);
    shownAt = Date.now();
    byId("q").textContent = problemText(current);
    byId("level").textContent = levelText(level);
    pad.clear();
  }
  function right() {
    solved.push({ text: solvedText(current), ms: Date.now() - shownAt });
    streak++;
    longestStreak = Math.max(longestStreak, streak);
    byId("ok").textContent = solved.length;
    pad.flash("right");
    showNext();
  }
  // OK s nesprávnym výsledkom: ukáž správny, séria sa preruší, pokračuj ďalším
  function giveUp() {
    givenUp++;
    streak = 0;
    pad.flash("wrong");
    byId("q").textContent = solvedText(current);
    pad.enable(false);
    setTimeout(() => { pad.enable(true); showNext(); }, WRONG_ANSWER_PAUSE_MS);
  }
  function summaryLines() {
    const attempts = solved.length + givenUp;
    const accuracy = attempts ? Math.round(solved.length / attempts * 100) : 0;
    const average = Brain.formatSeconds(solved.length ? solved.reduce((sum, s) => sum + s.ms, 0) / solved.length : 0);
    const lines = [
      localized(`Presnosť: ${accuracy} % (${givenUp} vzdaných)`, `Přesnost: ${accuracy} % (${givenUp} vzdaných)`, `Accuracy: ${accuracy}% (${givenUp} given up)`),
      localized(`Priemerne ${average} na príklad`, `Průměrně ${average} na příklad`, `Average ${average} per problem`),
      localized(`Najdlhšia séria: ${longestStreak} · najvyššia úroveň: ${highestLevel}`, `Nejdelší série: ${longestStreak} · nejvyšší úroveň: ${highestLevel}`, `Longest streak: ${longestStreak} · highest level: ${highestLevel}`),
    ];
    const slowest = solved.slice().sort((a, b) => b.ms - a.ms).slice(0, SLOWEST_SHOWN);
    if (slowest.length) {
      lines.push(translate(localized("Najdlhšie trvali: ", "Nejdéle trvaly: ", "Slowest: ")) + slowest.map(s => `${s.text} (${Brain.formatSeconds(s.ms)})`).join(", "));
    }
    return lines;
  }
  function finish() {
    pad.enable(false);
    Brain.result(ui.main, {
      key: recordKey(), score: solved.length,
      label: localized("Správnych príkladov za 60 s", "Správných příkladů za 60 s", "Correct in 60 s"),
      lines: summaryLines(), onAgain: playSpeed,
    });
  }

  showNext();
  Brain.countdown(DURATION_MS, (leftMs, fractionLeft) => {
    byId("tbar").style.width = (fractionLeft * 100).toFixed(1) + "%";
    byId("left").textContent = Math.ceil(leftMs / 1000);
  }, finish);
}

showIntro();
