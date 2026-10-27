// Stroop – slovo s názvom farby je napísané inou farbou. Odpovedz farbou
// písma, nie slovom. Režim „prepínanie": úloha sa strieda (FARBA / SLOVO).
const DURATION = 45000;
const INCONGRUENT = 0.75;
const L = Brain.L;
const $ = id => document.getElementById(id);
const COLORS = [
  { id: "red", css: "#e03131", name: L("ČERVENÁ", "ČERVENÁ", "RED") },
  { id: "blue", css: "#1971c2", name: L("MODRÁ", "MODRÁ", "BLUE") },
  { id: "green", css: "#2f9e44", name: L("ZELENÁ", "ZELENÁ", "GREEN") },
  { id: "purple", css: "#9c36b5", name: L("FIALOVÁ", "FIALOVÁ", "PURPLE") },
];
const TASK = { ink: L("FARBA PÍSMA", "BARVA PÍSMA", "INK COLOUR"), word: L("SLOVO", "SLOVO", "WORD") };

// Jedno kolo: slovo, farba písma, čo sa pýta, správna odpoveď.
function trial(switching) {
  const word = Brain.pick(COLORS);
  const ink = Math.random() < INCONGRUENT ? Brain.pick(COLORS.filter(c => c !== word)) : word;
  const task = switching && Math.random() < 0.5 ? "word" : "ink";
  return { word, ink, task, ans: task === "ink" ? ink.id : word.id, congruent: word === ink };
}

const ui = Brain.page({
  key: "stroop",
  title: { sk: "🎨 Stroop", cs: "🎨 Stroop", en: "🎨 Stroop" },
  footer: { sk: "Klávesy 1–4 podľa poradia tlačidiel. ·", cs: "Klávesy 1–4 podle pořadí tlačítek. ·", en: "Keys 1–4 match the buttons. ·" },
});
const mode = Brain.choice(ui.controls, {
  key: "stroop.mode", label: { sk: "Režim:", cs: "Režim:", en: "Mode:" }, onChange: showIntro,
  options: [
    { v: "ink", label: L("farba písma", "barva písma", "ink colour") },
    { v: "switch", label: L("prepínanie", "přepínání", "switching") },
  ],
});

function showIntro() {
  Brain.intro(ui.main, {
    key: "stroop." + mode.value,
    desc: mode.value === "ink" ? L(
      "Uvidíš názov farby napísaný inou farbou. Ťukni na <b>farbu písma</b>, nie na to, čo je napísané. 45 sekúnd; skóre = správne − chybné.",
      "Uvidíš název barvy napsaný jinou barvou. Ťukni na <b>barvu písma</b>, ne na to, co je napsané. 45 sekund; skóre = správně − chybně.",
      "You'll see a colour name printed in another colour. Tap the <b>ink colour</b>, not the word. 45 seconds; score = correct − wrong.") : L(
      "Nad slovom je pokyn: <b>FARBA PÍSMA</b> alebo <b>SLOVO</b>. Odpovedaj podľa pokynu – striedanie úloh je ťažšie. 45 sekúnd; skóre = správne − chybné.",
      "Nad slovem je pokyn: <b>BARVA PÍSMA</b> nebo <b>SLOVO</b>. Odpovídej podle pokynu – střídání úloh je těžší. 45 sekund; skóre = správně − chybně.",
      "Above the word is a cue: <b>INK COLOUR</b> or <b>WORD</b>. Answer by the cue – switching tasks is harder. 45 seconds; score = correct − wrong."),
    onStart: play,
  });
}

function play() {
  Brain.playing(true);
  const switching = mode.value === "switch";
  let cur = null, shownAt = 0, ok = 0, bad = 0, over = false;
  const rt = { con: [], inc: [] };
  ui.main.innerHTML = `
    <div class="tbar"><i id="tbar"></i></div>
    <div class="statline"><span>✔ <b id="ok">0</b></span><span>✘ <b id="bad">0</b></span></div>
    <div class="card stroop"><div class="cue" id="cue"></div><div class="word" id="word"></div></div>
    <div class="cbtns" id="btns"></div>`;
  COLORS.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cb";
    b.dataset.c = c.id;
    b.innerHTML = `<i style="background:${c.css}"></i>${t(c.name)} <kbd>${i + 1}</kbd>`;
    b.addEventListener("click", () => answer(c.id, b));
    $("btns").appendChild(b);
  });
  Brain.onKey(k => {
    const i = Number(k) - 1;
    if (!(i >= 0 && i < COLORS.length)) return false;
    answer(COLORS[i].id, document.querySelectorAll("#btns .cb")[i]);
    return true;
  });

  function next() {
    let q;
    do { q = trial(switching); } while (cur && q.word === cur.word && q.ink === cur.ink);
    cur = q; shownAt = Date.now();
    $("cue").textContent = switching ? t(TASK[q.task]) : "";
    $("word").textContent = t(q.word.name);
    $("word").style.color = q.ink.css;
  }
  function answer(id, btn) {
    if (over) return;
    const right = id === cur.ans;
    if (right) { ok++; (cur.congruent ? rt.con : rt.inc).push(Date.now() - shownAt); } else bad++;
    $("ok").textContent = ok;
    $("bad").textContent = bad;
    if (btn) { btn.classList.add(right ? "right" : "wrong"); setTimeout(() => btn.classList.remove("right", "wrong"), 200); }
    next();
  }
  const avg = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  function finish() {
    over = true;
    const lines = [
      L(`Správne ${ok}, chybne ${bad}`, `Správně ${ok}, chybně ${bad}`, `Correct ${ok}, wrong ${bad}`),
      L(`Reakcia – zhodná farba: ${Math.round(avg(rt.con))} ms, nezhodná: ${Math.round(avg(rt.inc))} ms`, `Reakce – shodná barva: ${Math.round(avg(rt.con))} ms, neshodná: ${Math.round(avg(rt.inc))} ms`, `Reaction – matching: ${Math.round(avg(rt.con))} ms, mismatching: ${Math.round(avg(rt.inc))} ms`),
    ];
    if (rt.con.length && rt.inc.length) lines.push(L(`Stroopov efekt: ${Math.round(avg(rt.inc) - avg(rt.con))} ms (menej = lepšie)`, `Stroopův efekt: ${Math.round(avg(rt.inc) - avg(rt.con))} ms (méně = lépe)`, `Stroop effect: ${Math.round(avg(rt.inc) - avg(rt.con))} ms (lower = better)`));
    Brain.result(ui.main, {
      key: "stroop." + mode.value, score: ok - bad,
      label: L("Skóre (správne − chybné)", "Skóre (správně − chybně)", "Score (correct − wrong)"),
      lines, onAgain: play,
    });
  }
  next();
  Brain.countdown(DURATION, (left, f) => { $("tbar").style.width = (f * 100).toFixed(1) + "%"; }, finish);
}

showIntro();
