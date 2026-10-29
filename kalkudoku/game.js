// Kalkudoku – mriežka n×n, v každom riadku a stĺpci každé číslo 1…n raz.
// Hrubo ohraničené klietky majú výsledok a operáciu (napr. „12×" = súčin 12).
// Generátor hľadá zadanie s jediným riešením; prijme sa ale každé platné.
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const localized = Brain.localized;
const byId = id => document.getElementById(id);
const range = n => Array.from({ length: n }, (_, i) => i);

// Latinský štvorec: cyklický, s náhodne zamiešanými riadkami, stĺpcami a symbolmi.
function latin(n) {
  const rows = Brain.shuffle(range(n)), cols = Brain.shuffle(range(n)), sym = Brain.shuffle(range(n).map(x => x + 1));
  return rows.map(r => cols.map(c => sym[(r + c) % n]));
}

function makeCages(n) {
  const id = range(n).map(() => Array(n).fill(-1));
  const cages = [];
  const sizes = n <= 4 ? [1, 2, 2, 2, 3, 3] : [1, 2, 2, 2, 2, 3, 3, 3, 4];
  for (const cell of Brain.shuffle(range(n * n))) {
    const r0 = Math.floor(cell / n), c0 = cell % n;
    if (id[r0][c0] >= 0) continue;
    const size = Brain.pick(sizes), cells = [[r0, c0]];
    id[r0][c0] = cages.length;
    while (cells.length < size) {
      const nb = [];
      for (const [r, c] of cells) for (const [dr, dc] of DIRS) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n && id[rr][cc] < 0) nb.push([rr, cc]);
      }
      if (!nb.length) break;
      const [r, c] = Brain.pick(nb);
      id[r][c] = cages.length;
      cells.push([r, c]);
    }
    cages.push({ cells });
  }
  return { id, cages };
}

function assignOps(cages, sol) {
  for (const cg of cages) {
    const v = cg.cells.map(([r, c]) => sol[r][c]);
    if (v.length === 1) { cg.op = ""; cg.target = v[0]; continue; }
    if (v.length === 2) {
      const a = Math.max(...v), b = Math.min(...v), x = Math.random();
      if (a % b === 0 && x < 0.4) { cg.op = "÷"; cg.target = a / b; }
      else if (x < 0.65) { cg.op = "−"; cg.target = a - b; }
      else if (x < 0.85) { cg.op = "+"; cg.target = a + b; }
      else { cg.op = "×"; cg.target = a * b; }
      continue;
    }
    const prod = v.reduce((p, x) => p * x, 1);
    if (Math.random() < 0.5 && prod <= 500) { cg.op = "×"; cg.target = prod; }
    else { cg.op = "+"; cg.target = v.reduce((s, x) => s + x, 0); }
  }
}

// Je klietka v poriadku? vals = hodnoty buniek (0 = prázdna). partial = dovoliť nedoplnené.
function cageOk(cg, vals, n, partial) {
  const f = vals.filter(Boolean);
  if (f.length < vals.length) {
    if (!partial) return false;
    const left = vals.length - f.length;
    if (cg.op === "+") { const s = f.reduce((a, x) => a + x, 0); return s + left <= cg.target && s + left * n >= cg.target; }
    if (cg.op === "×") return cg.target % f.reduce((p, x) => p * x, 1) === 0;
    return true;
  }
  if (cg.op === "") return f[0] === cg.target;
  if (cg.op === "+") return f.reduce((a, x) => a + x, 0) === cg.target;
  if (cg.op === "×") return f.reduce((p, x) => p * x, 1) === cg.target;
  const a = Math.max(...f), b = Math.min(...f);
  if (cg.op === "−") return a - b === cg.target;
  if (cg.op === "÷") return a === b * cg.target;
  return false;
}
const cageVals = (cg, grid) => cg.cells.map(([r, c]) => grid[r][c]);

// Počet riešení (zastaví sa na `limit`, alebo po príliš veľa krokoch → limit).
function countSolutions(pz, limit = 2) {
  const { n, cages, id } = pz;
  const grid = range(n).map(() => Array(n).fill(0));
  let count = 0, nodes = 0;
  function rec(i) {
    if (++nodes > 300000) { count = limit; return true; }
    if (i === n * n) return ++count >= limit;
    const r = Math.floor(i / n), c = i % n, cg = cages[id[r][c]];
    for (let v = 1; v <= n; v++) {
      if (grid[r].includes(v) || grid.some(row => row[c] === v)) continue;
      grid[r][c] = v;
      if (cageOk(cg, cageVals(cg, grid), n, true) && rec(i + 1)) return true;
      grid[r][c] = 0;
    }
    return false;
  }
  rec(0);
  return count;
}

function generate(n) {
  let pz = null;
  for (let tries = 0; tries < 60; tries++) {
    const sol = latin(n), { id, cages } = makeCages(n);
    assignOps(cages, sol);
    pz = { n, sol, id, cages };
    if (countSolutions(pz) === 1) return pz;
  }
  return pz;  // viac riešení – prijme sa každé platné
}

// Je mriežka hráča úplne a správne vyplnená?
function solved(pz, grid) {
  const { n, cages } = pz;
  for (let i = 0; i < n; i++) {
    const row = new Set(grid[i]), col = new Set(grid.map(r => r[i]));
    if (row.size !== n || col.size !== n || row.has(0) || col.has(0)) return false;
  }
  return cages.every(cg => cageOk(cg, cageVals(cg, grid), n, false));
}

const ui = Brain.page({
  key: "kalkudoku",
  title: { sk: "🧮 Kalkudoku", cs: "🧮 Kalkudoku", en: "🧮 Calcudoku" },
  footer: { sk: "Klávesy: číslice, šípky, Backspace, P = poznámky. ·", cs: "Klávesy: číslice, šipky, Backspace, P = poznámky. ·", en: "Keys: digits, arrows, Backspace, P = notes. ·" },
});
const size = Brain.choice(ui.controls, {
  key: "kalkudoku.size", label: { sk: "Veľkosť:", cs: "Velikost:", en: "Size:" }, onChange: showIntro,
  options: [4, 5, 6].map(v => ({ v, label: `${v}×${v}` })),
});

function showIntro() {
  Brain.intro(ui.main, {
    key: "kalkudoku." + size.value, lower: true, fmt: Brain.formatSeconds,
    desc: localized(
      `Vyplň mriežku ${size.value}×${size.value} číslami 1–${size.value}: v každom riadku a stĺpci každé raz. Čísla v ohraničenej klietke musia dať jej výsledok danou operáciou (pri − a ÷ v ľubovoľnom poradí). Rekord = najkratší čas.`,
      `Vyplň mřížku ${size.value}×${size.value} čísly 1–${size.value}: v každém řádku a sloupci každé jednou. Čísla v ohraničené kleci musí dát její výsledek danou operací (u − a ÷ v libovolném pořadí). Rekord = nejkratší čas.`,
      `Fill the ${size.value}×${size.value} grid with 1–${size.value}: each once per row and column. Numbers in an outlined cage must give its target using its operation (− and ÷ in any order). Best = fastest time.`),
    onStart: play,
  });
}

function play() {
  Brain.playing(true);
  const n = size.value, pz = generate(n);
  const grid = range(n).map(() => Array(n).fill(0));
  const notes = range(n).map(() => range(n).map(() => new Set()));
  let sel = [0, 0], noteMode = false, over = false;

  ui.main.innerHTML = `
    <div class="statline"><span>⏱ <b id="time">0,0 s</b></span></div>
    <div class="kk" id="kk" style="grid-template-columns: repeat(${n}, 1fr)"></div>
    <div class="kpad" id="kpad"></div>
    <div class="btnrow"><button type="button" id="reveal">${translate(localized("Ukáž riešenie", "Ukaž řešení", "Show solution"))}</button></div>`;
  const cellEl = [];
  for (let r = 0; r < n; r++) {
    cellEl.push([]);
    for (let c = 0; c < n; c++) {
      const id = pz.id[r][c], cg = pz.cages[id];
      const d = document.createElement("div");
      let cls = "cell";
      if (r === 0 || pz.id[r - 1][c] !== id) cls += " bt";
      if (r === n - 1 || pz.id[r + 1][c] !== id) cls += " bb";
      if (c === 0 || pz.id[r][c - 1] !== id) cls += " bl";
      if (c === n - 1 || pz.id[r][c + 1] !== id) cls += " br";
      d.className = cls;
      const [r0, c0] = cg.cells.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
      d.innerHTML = (r === r0 && c === c0 ? `<span class="lbl">${cg.target}${cg.op}</span>` : "") + `<span class="val"></span><span class="notes"></span>`;
      d.addEventListener("click", () => { sel = [r, c]; render(); });
      byId("kk").appendChild(d);
      cellEl[r].push(d);
    }
  }
  const keys = [...range(n).map(i => String(i + 1)), "⌫", "✏️"];
  for (const k of keys) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = k;
    b.dataset.k = k;
    b.addEventListener("click", () => { b.blur(); input(k); });
    byId("kpad").appendChild(b);
  }
  const stop = Brain.stopwatch(ms => { byId("time").textContent = Brain.formatSeconds(ms); });

  function input(k) {
    if (over) return;
    const [r, c] = sel;
    if (k === "✏️") { noteMode = !noteMode; render(); return; }
    if (k === "⌫") { grid[r][c] = 0; notes[r][c].clear(); }
    else {
      const v = Number(k);
      if (!(v >= 1 && v <= n)) return;
      if (noteMode) { if (notes[r][c].has(v)) notes[r][c].delete(v); else notes[r][c].add(v); }
      else grid[r][c] = grid[r][c] === v ? 0 : v;
    }
    render();
    if (solved(pz, grid)) finish(false);
  }
  function render() {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const d = cellEl[r][c], v = grid[r][c];
      const dup = v && (grid[r].filter(x => x === v).length > 1 || grid.filter(row => row[c] === v).length > 1);
      d.classList.toggle("sel", r === sel[0] && c === sel[1]);
      d.classList.toggle("bad", !!dup);
      d.querySelector(".val").textContent = v || "";
      d.querySelector(".notes").textContent = v ? "" : [...notes[r][c]].sort().join(" ");
    }
    // plná klietka, ktorá nesedí, sa zvýrazní
    for (const cg of pz.cages) {
      const vals = cageVals(cg, grid), wrong = vals.every(Boolean) && !cageOk(cg, vals, n, false);
      for (const [r, c] of cg.cells) cellEl[r][c].classList.toggle("cagebad", wrong);
    }
    document.querySelectorAll("#kpad button").forEach(b => b.classList.toggle("active", b.dataset.k === "✏️" && noteMode));
  }
  Brain.onKey(k => {
    const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
    if (mv) { sel = [Brain.clamp(sel[0] + mv[0], 0, n - 1), Brain.clamp(sel[1] + mv[1], 0, n - 1)]; render(); return true; }
    if (/^[1-9]$/.test(k)) { input(k); return true; }
    if (k === "Backspace" || k === "Delete" || k === "0") { input("⌫"); return true; }
    if (k === "p" || k === "P") { input("✏️"); return true; }
    return false;
  });
  byId("reveal").addEventListener("click", () => {
    if (over) return;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) grid[r][c] = pz.sol[r][c];
    render();
    finish(true);
  });
  function finish(gaveUp) {
    over = true;
    const ms = stop();
    setTimeout(() => Brain.result(ui.main, {
      key: "kalkudoku." + n, score: gaveUp ? null : ms, lower: true, fmt: Brain.formatSeconds, noRecord: gaveUp,
      label: gaveUp ? localized("Riešenie zobrazené", "Řešení zobrazeno", "Solution shown") : localized(`Vyriešené ${n}×${n}`, `Vyřešeno ${n}×${n}`, `Solved ${n}×${n}`),
      onAgain: play,
    }), gaveUp ? 2500 : 800);
  }
  render();
}

showIntro();
