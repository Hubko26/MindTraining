// Odhad – 10 úloh, na každú 10 sekúnd. Nejde o presný výsledok, ale
// o rozumný odhad: body podľa odchýlky (≤1 % = 10 b … ≤20 % = 2 b).
const TASKS = 10;
const TIME = 10000;
const SCORING = [[0.01, 10], [0.03, 8], [0.05, 6], [0.1, 4], [0.2, 2]];
const L = Brain.L;
const $ = id => document.getElementById(id);
const n = (x, d = 0) => Brain.num(x, d);
const money = x => Brain.num(x, 2, true);

const TYPES = {
  mul() { const a = Brain.rnd(12, 99), b = Brain.rnd(12, 99); return { q: `${a} × ${b}`, ans: a * b }; },
  mul3() { const a = Brain.rnd(105, 999), b = Brain.rnd(12, 99); return { q: `${n(a)} × ${b}`, ans: a * b }; },
  div() { const a = Brain.rnd(1000, 9999), b = Brain.rnd(7, 89); return { q: `${n(a)} ÷ ${b}`, ans: a / b }; },
  sqrt() { const a = Brain.rnd(50, 9999); return { q: `√${n(a)}`, ans: Math.sqrt(a) }; },
  pct() {
    const p = Brain.pick([3, 7, 12, 15, 18, 23, 35, 45, 65, 85]), a = Brain.rnd(150, 9999);
    return { q: t(L(`${p} % z ${n(a)}`, `${p} % z ${n(a)}`, `${p}% of ${n(a)}`)), ans: p * a / 100 };
  },
  sum() {
    const prices = Array.from({ length: Brain.rnd(4, 6) }, () => Brain.rnd(49, 2999) / 100);
    return { q: `<span class="sm">${prices.map(p => money(p) + " €").join(" + ")}</span>`, ans: prices.reduce((s, p) => s + p, 0), unit: "€" };
  },
  fx() {
    const rate = Brain.rnd(241, 256) / 10;
    const kurz = t(L("kurz", "kurz", "rate"));
    if (Math.random() < 0.5) {
      const e = Brain.rnd(15, 900);
      return { q: `${n(e)} € → Kč <span class="muted">(${kurz} ${n(rate, 1)})</span>`, ans: e * rate, unit: "Kč" };
    }
    const k = Brain.rnd(300, 25000);
    return { q: `${n(k)} Kč → € <span class="muted">(${kurz} ${n(rate, 1)})</span>`, ans: k / rate, unit: "€" };
  },
  avg() {
    const v = Array.from({ length: 5 }, () => Brain.rnd(40, 400));
    return { q: `<span class="sm">${t(L("Priemer", "Průměr", "Average"))}: ${v.join(", ")}</span>`, ans: v.reduce((s, x) => s + x, 0) / 5 };
  },
};
const GROUPS = {
  all: Object.keys(TYPES),
  calc: ["mul", "mul3", "div", "sqrt"],
  life: ["pct", "sum", "fx", "avg"],
};

function points(guess, ans) {
  if (guess === null) return 0;
  const err = Math.abs(guess - ans) / Math.abs(ans);
  for (const [lim, p] of SCORING) if (err <= lim) return p;
  return 0;
}

const ui = Brain.page({
  key: "odhad",
  title: { sk: "🎯 Odhad", cs: "🎯 Odhad", en: "🎯 Estimation" },
  footer: { sk: "Zaokrúhli, zjednoduš, odhadni. ·", cs: "Zaokrouhli, zjednoduš, odhadni. ·", en: "Round, simplify, estimate. ·" },
});
const group = Brain.choice(ui.controls, {
  key: "odhad.group", label: { sk: "Úlohy:", cs: "Úlohy:", en: "Tasks:" }, onChange: showIntro,
  options: [
    { v: "all", label: L("všetko", "vše", "all") },
    { v: "calc", label: L("počty", "počty", "calculations") },
    { v: "life", label: L("zo života", "ze života", "everyday") },
  ],
});

function showIntro() {
  Brain.intro(ui.main, {
    key: "odhad." + group.value,
    desc: L(
      `${TASKS} úloh, na každú 10 sekúnd. Zadaj odhad (môže byť aj s čiarkou). Body podľa odchýlky: do 1 % = 10, do 3 % = 8, do 5 % = 6, do 10 % = 4, do 20 % = 2. Maximum 100.`,
      `${TASKS} úloh, na každou 10 sekund. Zadej odhad (může být i s čárkou). Body podle odchylky: do 1 % = 10, do 3 % = 8, do 5 % = 6, do 10 % = 4, do 20 % = 2. Maximum 100.`,
      `${TASKS} tasks, 10 seconds each. Enter your estimate (decimals allowed). Points by error: within 1% = 10, 3% = 8, 5% = 6, 10% = 4, 20% = 2. Maximum 100.`),
    onStart: play,
  });
}

function task(timeMs) {
  return new Promise(res => {
    let stop = null;
    const pad = Brain.numpad($("ans"), { dec: true, onSubmit: v => end(v) });
    function end(v) { if (stop) stop(); pad.enable(false); res(v); }
    stop = Brain.countdown(timeMs, (left, f) => { $("tbar").style.width = (f * 100).toFixed(1) + "%"; }, () => end(pad.value));
  });
}

async function play() {
  Brain.playing(true);
  let total = 0, exact = 0;
  const types = GROUPS[group.value];
  for (let i = 0; i < TASKS; i++) {
    const q = TYPES[Brain.pick(types)]();
    ui.main.innerHTML = `
      <div class="statline"><span>${t(L("Úloha", "Úloha", "Task"))} <b>${i + 1}/${TASKS}</b></span><span>${t(L("Body", "Body", "Points"))} <b>${total}</b></span></div>
      <div class="tbar"><i id="tbar"></i></div>
      <div class="card"><div class="big est">≈ ${q.q}</div></div>
      <div id="ans"></div>`;
    const v = await task(TIME);
    const p = points(v, q.ans);
    total += p;
    if (p === 10) exact++;
    const err = v === null ? null : Math.abs(v - q.ans) / Math.abs(q.ans) * 100;
    const unit = q.unit ? " " + q.unit : "";
    $("ans").innerHTML = `<div class="fb ${p >= 6 ? "ok" : p ? "" : "bad"}">
      <b>+${p} ${t(L("b.", "b.", "pts"))}</b><br>
      ${t(L("Presne", "Přesně", "Exact"))}: <b>${n(q.ans, 2)}${unit}</b> ·
      ${t(L("ty", "ty", "you"))}: ${v === null ? "–" : n(v, 2) + unit}
      ${err === null ? "" : `<span class="muted">${t(L("odchýlka", "odchylka", "error"))} ${n(err, 1)} %</span>`}</div>`;
    await Brain.waitNext($("ans"));
  }
  Brain.result(ui.main, {
    key: "odhad." + group.value, score: total,
    label: L("Body (max 100)", "Body (max 100)", "Points (max 100)"),
    lines: [L(`Odhady do 1 %: ${exact}/${TASKS}`, `Odhady do 1 %: ${exact}/${TASKS}`, `Within 1%: ${exact}/${TASKS}`)],
    onAgain: play,
  });
}

showIntro();
