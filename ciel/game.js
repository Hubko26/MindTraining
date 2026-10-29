// Dosiahni cieľ – z daných čísel a operácií +−×÷ poskladaj cieľové číslo.
// Ťukni číslo, operáciu, druhé číslo → vznikne nové číslo. Každé číslo
// použiješ najviac raz. Zadanie je vždy riešiteľné (vzniká z náhodného výpočtu).
const PUZZLES = 5;
const LEVELS = {
  easy: { small: 4, large: 0, min: 10, max: 99, ops: [2, 3], time: 60000 },
  mid: { small: 5, large: 1, min: 100, max: 499, ops: [3, 4], time: 90000 },
  hard: { small: 4, large: 2, min: 101, max: 999, ops: [3, 5], time: 120000 },
};
const OPS = ["+", "−", "×", "÷"];
const localized = Brain.localized;
const byId = id => document.getElementById(id);

// Výsledok a op b, alebo null, ak nevznikne kladné celé číslo.
function apply(a, op, b) {
  if (op === "+") return a + b;
  if (op === "−") return a > b ? a - b : null;
  if (op === "×") return a * b;
  if (op === "÷") return b > 0 && a % b === 0 ? a / b : null;
  return null;
}

function makePuzzle(cfg) {
  let last = null;
  for (let tries = 0; tries < 2000; tries++) {
    const small = Brain.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, cfg.small);
    const nums = small.concat(Brain.shuffle([25, 50, 75, 100]).slice(0, cfg.large));
    let tiles = nums.slice();
    const steps = [];
    const k = Brain.randomInt(cfg.ops[0], Math.min(cfg.ops[1], nums.length - 1));
    for (let i = 0; i < k; i++) {
      const [x, y] = Brain.shuffle(tiles.map((_, j) => j)).slice(0, 2);
      let a = tiles[x], b = tiles[y];
      if (b > a) [a, b] = [b, a];
      // bez zbytočných krokov (×1, ÷1, a − b = b) a bez obrích medzivýsledkov
      const ok = OPS.filter(op => {
        const r = apply(a, op, b);
        if (r === null) return false;
        if ((op === "×" || op === "÷") && b === 1) return false;
        if (op === "×" && r > 1000) return false;
        if (op === "−" && r === b) return false;
        return true;
      });
      if (!ok.length) break;
      const op = Brain.pick(ok), r = apply(a, op, b);
      steps.push(`${a} ${op} ${b} = ${r}`);
      tiles = tiles.filter((_, j) => j !== x && j !== y).concat(r);
    }
    if (steps.length < cfg.ops[0]) continue;
    const target = tiles[tiles.length - 1];
    last = { nums, target, steps };
    if (target >= cfg.min && target <= cfg.max && !nums.includes(target)) return last;
  }
  return last;
}

function scoreFor(diff) { return diff === 0 ? 10 : diff <= 5 ? 7 : diff <= 10 ? 5 : 0; }

const ui = Brain.page({
  key: "ciel",
  title: { sk: "🏁 Dosiahni cieľ", cs: "🏁 Dosáhni cíle", en: "🏁 Hit the target" },
  footer: { sk: "Číslo → operácia → číslo. ⌫ vráti krok. ·", cs: "Číslo → operace → číslo. ⌫ vrátí krok. ·", en: "Number → operation → number. ⌫ undoes a step. ·" },
});
const level = Brain.choice(ui.controls, {
  key: "ciel.level", label: { sk: "Obtiažnosť:", cs: "Obtížnost:", en: "Difficulty:" }, onChange: showIntro,
  options: [
    { v: "easy", label: localized("ľahké", "lehké", "easy") },
    { v: "mid", label: localized("stredné", "střední", "medium") },
    { v: "hard", label: localized("ťažké", "těžké", "hard") },
  ],
});

function showIntro() {
  const cfg = LEVELS[level.value];
  Brain.intro(ui.main, {
    key: "ciel." + level.value,
    desc: localized(
      `${PUZZLES} zadaní, na každé ${cfg.time / 1000} s. Ťukni číslo, operáciu a druhé číslo – vznikne nové číslo, s ktorým môžeš počítať ďalej. Presne = 10 b, do 5 = 7 b, do 10 = 5 b. „Hotovo" odovzdá najbližšie číslo.`,
      `${PUZZLES} zadání, na každé ${cfg.time / 1000} s. Ťukni číslo, operaci a druhé číslo – vznikne nové číslo, se kterým můžeš počítat dál. Přesně = 10 b, do 5 = 7 b, do 10 = 5 b. „Hotovo" odevzdá nejbližší číslo.`,
      `${PUZZLES} puzzles, ${cfg.time / 1000} s each. Tap a number, an operation and another number – the result becomes a new number you can keep using. Exact = 10 pts, within 5 = 7, within 10 = 5. "Done" submits your closest number.`),
    onStart: play,
  });
}

// Jedno zadanie; vráti { best, diff } po trafení, „Hotovo" alebo vypršaní času.
function solve(pz, cfg) {
  return new Promise(res => {
    let tiles = pz.nums.map((v, i) => ({ id: i, v, used: false }));
    let nextId = tiles.length, sel = null, op = null, over = false;
    const undo = [], log = [];
    const box = byId("play");
    box.innerHTML = `
      <div class="tbar"><i id="tbar"></i></div>
      <div class="card"><div class="target">${translate(localized("Cieľ", "Cíl", "Target"))} <b>${pz.target}</b></div>
        <div class="tiles" id="tiles"></div>
        <div class="ops" id="ops">${OPS.map(o => `<button type="button" data-op="${o}">${o}</button>`).join("")}</div>
        <div class="log muted" id="log"></div>
        <div class="btnrow"><button type="button" id="undo">⌫ ${translate(localized("Späť", "Zpět", "Undo"))}</button><button type="button" class="primary" id="done">${translate(localized("Hotovo", "Hotovo", "Done"))}</button></div>
      </div>`;
    const stop = Brain.countdown(cfg.time, (left, f) => { byId("tbar").style.width = (f * 100).toFixed(1) + "%"; }, () => finish());

    function render() {
      byId("tiles").innerHTML = "";
      for (const tl of tiles) {
        if (tl.used) continue;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "tile" + (tl.id === sel ? " sel" : "") + (tl.id >= pz.nums.length ? " made" : "");
        b.textContent = tl.v;
        b.dataset.id = tl.id;
        b.addEventListener("click", () => tap(tl.id));
        byId("tiles").appendChild(b);
      }
      document.querySelectorAll("#ops button").forEach(b => b.classList.toggle("active", b.dataset.op === op));
      byId("log").textContent = log.join(" · ");
    }
    function tap(id) {
      if (over) return;
      if (sel === null || op === null || id === sel) { sel = id === sel && op === null ? null : id; op = null; render(); return; }
      const a = tiles.find(x => x.id === sel), b = tiles.find(x => x.id === id);
      const r = apply(a.v, op, b.v);
      if (r === null) {
        const el = document.querySelector(`.tile[data-id="${id}"]`);
        if (el) { el.classList.add("shake"); setTimeout(() => el.classList.remove("shake"), 300); }
        return;
      }
      undo.push({ tiles: tiles.map(x => ({ ...x })), log: log.slice() });
      a.used = true; b.used = true;
      tiles.push({ id: nextId, v: r, used: false });
      log.push(`${a.v} ${op} ${b.v} = ${r}`);
      sel = nextId++; op = null;
      render();
      if (r === pz.target) finish();
    }
    document.querySelectorAll("#ops button").forEach(b => b.addEventListener("click", () => {
      if (over || sel === null) return;
      op = op === b.dataset.op ? null : b.dataset.op;
      render();
    }));
    function back() {
      if (over || !undo.length) return;
      const u = undo.pop();
      tiles = u.tiles; log.splice(0, log.length, ...u.log); sel = null; op = null;
      render();
    }
    byId("undo").addEventListener("click", back);
    byId("done").addEventListener("click", () => finish());
    Brain.onKey(k => { if (k === "Backspace") { back(); return true; } if (k === "Enter") { finish(); return true; } return false; });
    function finish() {
      if (over) return;
      over = true; stop();
      const best = tiles.filter(x => !x.used).map(x => x.v).sort((x, y) => Math.abs(x - pz.target) - Math.abs(y - pz.target))[0];
      res({ best, diff: Math.abs(best - pz.target), mine: log.slice() });
    }
    render();
  });
}

async function play() {
  Brain.playing(true);
  const cfg = LEVELS[level.value];
  let total = 0, exact = 0;
  for (let i = 0; i < PUZZLES; i++) {
    const pz = makePuzzle(cfg);
    ui.main.innerHTML = `
      <div class="statline"><span>${translate(localized("Zadanie", "Zadání", "Puzzle"))} <b>${i + 1}/${PUZZLES}</b></span><span>${translate(localized("Body", "Body", "Points"))} <b>${total}</b></span></div>
      <div id="play" class="play"></div>`;
    const r = await solve(pz, cfg);
    const p = scoreFor(r.diff);
    total += p;
    if (r.diff === 0) exact++;
    const fb = document.createElement("div");
    fb.className = "card fb " + (r.diff === 0 ? "ok" : p ? "" : "bad");
    fb.innerHTML = `<b>${r.diff === 0 ? translate(localized("🎯 Presne!", "🎯 Přesně!", "🎯 Exact!")) : translate(localized(`Najbližšie: ${r.best} (o ${r.diff} vedľa)`, `Nejblíž: ${r.best} (o ${r.diff} vedle)`, `Closest: ${r.best} (off by ${r.diff})`))} · +${p}</b>
      ${r.diff === 0 ? "" : `<span class="muted">${translate(localized("Jedno riešenie", "Jedno řešení", "One solution"))}: ${pz.steps.join(" · ")}</span>`}`;
    byId("play").appendChild(fb);
    await Brain.waitNext(byId("play"));
  }
  Brain.result(ui.main, {
    key: "ciel." + level.value, score: total,
    label: localized(`Body (max ${PUZZLES * 10})`, `Body (max ${PUZZLES * 10})`, `Points (max ${PUZZLES * 10})`),
    lines: [localized(`Presne trafené: ${exact}/${PUZZLES}`, `Přesně trefené: ${exact}/${PUZZLES}`, `Exact hits: ${exact}/${PUZZLES}`)],
    onAgain: play,
  });
}

showIntro();
