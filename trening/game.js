// Denný tréning – každý deň 3 hry (počty, pamäť, pozornosť), výber je daný
// dátumom, takže je celý deň rovnaký. Hry po skončení pošlú na ďalšiu.
// Séria = počet dní za sebou so splneným tréningom.
const GROUPS = [
  ["rychle", "retaz", "odhad", "nasobilka", "percenta", "kontrolor"],
  ["nback", "cisla"],
  ["schulte", "stroop", "sart"],
];
const GAMES = {
  rychle: { ico: "⚡", name: { sk: "Rýchle počty", cs: "Rychlé počty", en: "Speed arithmetic" }, best: "rychle.mix" },
  retaz: { ico: "🔗", name: { sk: "Reťazové počty", cs: "Řetězové počty", en: "Chain arithmetic" } },
  odhad: { ico: "🎯", name: { sk: "Odhad", cs: "Odhad", en: "Estimation" }, best: "odhad.all" },
  nasobilka: { ico: "✖️", name: { sk: "Násobilka do 20", cs: "Násobilka do 20", en: "Times tables to 20" } },
  percenta: { ico: "％", name: { sk: "Percentá a úroky", cs: "Procenta a úroky", en: "Percentages & interest" }, best: "percenta" },
  ciel: { ico: "🏁", name: { sk: "Dosiahni cieľ", cs: "Dosáhni cíle", en: "Hit the target" } },
  triky: { ico: "🪄", name: { sk: "Triky z hlavy", cs: "Triky z hlavy", en: "Mental math tricks" } },
  nback: { ico: "🔲", name: { sk: "N-back", cs: "N-back", en: "N-back" } },
  cisla: { ico: "🔢", name: { sk: "Pamäť čísel", cs: "Paměť čísel", en: "Digit span" }, best: "cisla.fwd" },
  schulte: { ico: "👁️", name: { sk: "Schulteho tabuľka", cs: "Schulteho tabulka", en: "Schulte table" }, best: "schulte.5", lower: true },
  stroop: { ico: "🎨", name: { sk: "Stroop", cs: "Stroop", en: "Stroop" }, best: "stroop.ink" },
  kalkudoku: { ico: "🧮", name: { sk: "Kalkudoku", cs: "Kalkudoku", en: "Calcudoku" } },
  sart: { ico: "🛑", name: { sk: "Nestlač trojku", cs: "Nemačkej trojku", en: "Don't press 3" }, best: "sart.short", pct: true },
  kontrolor: { ico: "🔍", name: { sk: "Kontrolór", cs: "Kontrolor", en: "Checker" }, best: "kontrolor.mid", pct: true },
  rychleAcc: { ico: "🎯", name: { sk: "Rýchle počty: presnosť", cs: "Rychlé počty: přesnost", en: "Arithmetic: accuracy" }, best: "rychle.acc.mix" },
};
const L = Brain.L;
const $ = id => document.getElementById(id);

// Deterministický výber podľa dátumu (rovnaký celý deň).
function planFor(date) {
  let h = 2166136261;
  for (const ch of date) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return GROUPS.map((g, i) => g[(h >>> (i * 5)) % g.length]);
}
function streak(done, from = new Date()) {
  const d = new Date(from);
  if (!done[Brain.today(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (done[Brain.today(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
// Dnešný plán (založí sa pri prvej návšteve dňa).
function todayPlan() {
  let d = Brain.dailyPlan();
  if (!d) { d = { date: Brain.today(), games: planFor(Brain.today()), done: [] }; Brain.save("daily", d); }
  return d;
}

const ui = Brain.page({
  key: "trening",
  title: { sk: "🔥 Denný tréning", cs: "🔥 Denní trénink", en: "🔥 Daily workout" },
  footer: { sk: "Pravidelnosť robí viac než dĺžka. ·", cs: "Pravidelnost dělá víc než délka. ·", en: "Consistency beats duration. ·" },
});

function render() {
  const plan = todayPlan();
  const doneDays = Brain.load("dailyDone", {}), active = Brain.load("days", {});
  const next = plan.games.find(g => !plan.done.includes(g));
  const all = !next;

  // posledných 28 dní
  let cal = "";
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = Brain.today(d);
    cal += `<i class="${doneDays[k] ? "full" : active[k] ? "some" : ""}${i === 0 ? " now" : ""}" title="${k}"></i>`;
  }
  const bests = Object.entries(GAMES).filter(([, g]) => g.best && Brain.best(g.best) !== null)
    .map(([, g]) => `<li>${g.ico} ${t(g.name)}: <b>${g.lower ? Brain.secs(Brain.best(g.best)) : Brain.num(Brain.best(g.best)) + (g.pct ? " %" : "")}</b></li>`).join("");

  ui.main.innerHTML = `
    <div class="card">
      <div class="streak"><b>${streak(doneDays)}</b> ${t(L("dní v rade", "dní v řadě", "day streak"))}</div>
      <ol class="plan">${plan.games.map(g => `
        <li class="${plan.done.includes(g) ? "done" : ""}"><a href="../${g}/?daily">
          <span class="ico">${GAMES[g].ico}</span><span class="t">${t(GAMES[g].name)}</span>
          <span class="st">${plan.done.includes(g) ? "✅" : "→"}</span></a></li>`).join("")}</ol>
      <div class="btnrow">${all
        ? `<p class="fb ok"><b>${t(L("Dnes hotovo! Zajtra nový mix.", "Dnes hotovo! Zítra nový mix.", "Done for today! New mix tomorrow."))}</b></p>`
        : `<a class="btn primary" id="go" href="../${next}/?daily">${t(plan.done.length ? L("Pokračovať ▶", "Pokračovat ▶", "Continue ▶") : L("Začať ▶", "Začít ▶", "Start ▶"))}</a>`}</div>
    </div>
    <div class="card">
      <p class="muted">${t(L("Posledné 4 týždne", "Poslední 4 týdny", "Last 4 weeks"))}</p>
      <div class="cal">${cal}</div>
      <p class="legend muted"><i class="full"></i> ${t(L("tréning splnený", "trénink splněn", "workout done"))} <i class="some"></i> ${t(L("aspoň jedna hra", "aspoň jedna hra", "at least one game"))}</p>
    </div>
    ${bests ? `<div class="card"><p class="muted">${t(L("Osobné rekordy", "Osobní rekordy", "Personal bests"))}</p><ul class="lines">${bests}</ul></div>` : ""}`;
  Brain.onKey(k => { if (k === "Enter" && !all) { location.href = `../${next}/?daily`; return true; } return false; });
}

render();
