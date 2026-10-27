// Triky z hlavy – krátka lekcia postupu a 10 príkladov na precvičenie.
// Pri chybe sa ukáže postup krok za krokom. Mix = príklady zo všetkých trikov.
const DRILL = 10;
const L = Brain.L;
const $ = id => document.getElementById(id);
const n = x => Brain.num(x);
const digits = x => String(x).split("").map(Number);

const TRICKS = [
  {
    id: "x11", ico: "1️⃣", name: L("× 11", "× 11", "× 11"),
    lesson: L(
      "Dvojciferné číslo × 11: medzi jeho číslice napíš ich súčet. Keď je súčet 10 a viac, jednotku pripočítaj k prvej číslici.<br><b>43 × 11</b> → 4 | 4+3 | 3 = <b>473</b><br><b>78 × 11</b> → 7 | 15 | 8 → 8 | 5 | 8 = <b>858</b>",
      "Dvojciferné číslo × 11: mezi jeho číslice napiš jejich součet. Když je součet 10 a víc, jedničku přičti k první číslici.<br><b>43 × 11</b> → 4 | 4+3 | 3 = <b>473</b><br><b>78 × 11</b> → 7 | 15 | 8 → 8 | 5 | 8 = <b>858</b>",
      "Two-digit number × 11: put the sum of its digits between them. If the sum is 10 or more, carry the 1 to the first digit.<br><b>43 × 11</b> → 4 | 4+3 | 3 = <b>473</b><br><b>78 × 11</b> → 7 | 15 | 8 → 8 | 5 | 8 = <b>858</b>"),
    gen() {
      const x = Brain.rnd(12, 99), [a, b] = digits(x);
      const h = `${a} | ${a}+${b} | ${b} → ${n(x * 11)}`;
      return { q: `${x} × 11`, ans: x * 11, hint: h };
    },
  },
  {
    id: "x5", ico: "5️⃣", name: L("× 5", "× 5", "× 5"),
    lesson: L(
      "× 5 je to isté ako × 10 a potom ÷ 2. Delenie dvomi je v hlave ľahšie než násobenie piatimi.<br><b>68 × 5</b> → 680 ÷ 2 = <b>340</b><br><b>137 × 5</b> → 1370 ÷ 2 = <b>685</b>",
      "× 5 je totéž jako × 10 a potom ÷ 2. Dělení dvěma je v hlavě snazší než násobení pěti.<br><b>68 × 5</b> → 680 ÷ 2 = <b>340</b><br><b>137 × 5</b> → 1370 ÷ 2 = <b>685</b>",
      "× 5 is the same as × 10, then ÷ 2. Halving is easier in your head than multiplying by five.<br><b>68 × 5</b> → 680 ÷ 2 = <b>340</b><br><b>137 × 5</b> → 1370 ÷ 2 = <b>685</b>"),
    gen() { const x = Brain.rnd(12, 398); return { q: `${x} × 5`, ans: x * 5, hint: `${x} × 10 = ${n(x * 10)} → ÷ 2 = ${n(x * 5)}` }; },
  },
  {
    id: "x9", ico: "9️⃣", name: L("× 9", "× 9", "× 9"),
    lesson: L(
      "× 9 = × 10 mínus to číslo raz.<br><b>47 × 9</b> → 470 − 47 = <b>423</b><br>Rovnako × 99 = × 100 mínus raz.",
      "× 9 = × 10 minus to číslo jednou.<br><b>47 × 9</b> → 470 − 47 = <b>423</b><br>Stejně × 99 = × 100 minus jednou.",
      "× 9 = × 10 minus the number once.<br><b>47 × 9</b> → 470 − 47 = <b>423</b><br>Likewise × 99 = × 100 minus once."),
    gen() { const x = Brain.rnd(12, 199); return { q: `${x} × 9`, ans: x * 9, hint: `${n(x * 10)} − ${x} = ${n(x * 9)}` }; },
  },
  {
    id: "x25", ico: "💶", name: L("× 25", "× 25", "× 25"),
    lesson: L(
      "× 25 = × 100 a potom ÷ 4 (dvakrát polovica). Ako štvrťky eura.<br><b>36 × 25</b> → 3600 ÷ 4 = <b>900</b><br><b>18 × 25</b> → 1800 → 900 → <b>450</b>",
      "× 25 = × 100 a potom ÷ 4 (dvakrát polovina). Jako čtvrtky eura.<br><b>36 × 25</b> → 3600 ÷ 4 = <b>900</b><br><b>18 × 25</b> → 1800 → 900 → <b>450</b>",
      "× 25 = × 100, then ÷ 4 (halve twice). Think quarters.<br><b>36 × 25</b> → 3600 ÷ 4 = <b>900</b><br><b>18 × 25</b> → 1800 → 900 → <b>450</b>"),
    gen() { const x = Brain.rnd(4, 96); return { q: `${x} × 25`, ans: x * 25, hint: `${n(x * 100)} ÷ 4 = ${n(x * 25)}` }; },
  },
  {
    id: "sq5", ico: "²", name: L("Mocnina …5", "Mocnina …5", "Squares of …5"),
    lesson: L(
      "Druhá mocnina čísla končiaceho na 5: desiatky vynásob nasledujúcim číslom a pripíš 25.<br><b>65²</b> → 6 × 7 = 42 → <b>4225</b><br><b>115²</b> → 11 × 12 = 132 → <b>13225</b>",
      "Druhá mocnina čísla končícího na 5: desítky vynásob následujícím číslem a připiš 25.<br><b>65²</b> → 6 × 7 = 42 → <b>4225</b><br><b>115²</b> → 11 × 12 = 132 → <b>13225</b>",
      "Squaring a number ending in 5: multiply the tens by the next number up and append 25.<br><b>65²</b> → 6 × 7 = 42 → <b>4225</b><br><b>115²</b> → 11 × 12 = 132 → <b>13225</b>"),
    gen() { const d = Brain.rnd(1, 19), x = d * 10 + 5; return { q: `${x}²`, ans: x * x, hint: `${d} × ${d + 1} = ${d * (d + 1)} → ${d * (d + 1)}|25 = ${n(x * x)}` }; },
  },
  {
    id: "half", ico: "⚖️", name: L("Polovica × dvojnásobok", "Polovina × dvojnásobek", "Halve & double"),
    lesson: L(
      "Jeden činiteľ vydeľ dvomi, druhý vynásob dvomi – súčin sa nezmení. Hodí sa, keď jedno číslo končí na 5.<br><b>16 × 35</b> → 8 × 70 = <b>560</b><br><b>14 × 45</b> → 7 × 90 = <b>630</b>",
      "Jeden činitel vyděl dvěma, druhý vynásob dvěma – součin se nezmění. Hodí se, když jedno číslo končí na 5.<br><b>16 × 35</b> → 8 × 70 = <b>560</b><br><b>14 × 45</b> → 7 × 90 = <b>630</b>",
      "Halve one factor and double the other – the product stays the same. Handy when one number ends in 5.<br><b>16 × 35</b> → 8 × 70 = <b>560</b><br><b>14 × 45</b> → 7 × 90 = <b>630</b>"),
    gen() {
      const a = 2 * Brain.rnd(3, 24), b = Brain.rnd(1, 9) * 10 + 5;
      return { q: `${a} × ${b}`, ans: a * b, hint: `${a / 2} × ${b * 2} = ${n(a * b)}` };
    },
  },
  {
    id: "round", ico: "🔟", name: L("Zaokrúhli a oprav", "Zaokrouhli a oprav", "Round & fix"),
    lesson: L(
      "Číslo končiace na 7, 8, 9 zaokrúhli na desiatky, počítaj s ním a rozdiel oprav.<br><b>47 + 38</b> → 47 + 40 − 2 = <b>85</b><br><b>83 − 29</b> → 83 − 30 + 1 = <b>54</b>",
      "Číslo končící na 7, 8, 9 zaokrouhli na desítky, počítej s ním a rozdíl oprav.<br><b>47 + 38</b> → 47 + 40 − 2 = <b>85</b><br><b>83 − 29</b> → 83 − 30 + 1 = <b>54</b>",
      "Round a number ending in 7, 8 or 9 up to the ten, use that, then fix the difference.<br><b>47 + 38</b> → 47 + 40 − 2 = <b>85</b><br><b>83 − 29</b> → 83 − 30 + 1 = <b>54</b>"),
    gen() {
      const b = Brain.rnd(1, 8) * 10 + Brain.rnd(7, 9), up = Math.ceil(b / 10) * 10, d = up - b;
      if (Math.random() < 0.5) {
        const a = Brain.rnd(12, 99);
        return { q: `${a} + ${b}`, ans: a + b, hint: `${a} + ${up} − ${d} = ${a + b}` };
      }
      const a = Brain.rnd(b + 5, 199);
      return { q: `${a} − ${b}`, ans: a - b, hint: `${a} − ${up} + ${d} = ${a - b}` };
    },
  },
  {
    id: "k1000", ico: "💯", name: L("1000 − číslo", "1000 − číslo", "1000 − number"),
    lesson: L(
      "Od 1000 odčítaš tak, že každú číslicu doplníš do 9 a poslednú do 10. Takto sa rýchlo počíta výdavok.<br><b>1000 − 367</b> → 9−3 | 9−6 | 10−7 = <b>633</b>",
      "Od 1000 odečteš tak, že každou číslici doplníš do 9 a poslední do 10. Takhle se rychle počítá, kolik vrátit.<br><b>1000 − 367</b> → 9−3 | 9−6 | 10−7 = <b>633</b>",
      "To subtract from 1000, take each digit from 9 and the last one from 10. Great for working out change.<br><b>1000 − 367</b> → 9−3 | 9−6 | 10−7 = <b>633</b>"),
    gen() {
      let x;
      do { x = Brain.rnd(101, 999); } while (x % 10 === 0);
      const [a, b, c] = digits(x);
      return { q: `1000 − ${x}`, ans: 1000 - x, hint: `9−${a} | 9−${b} | 10−${c} = ${1000 - x}` };
    },
  },
  {
    id: "pct", ico: "％", name: L("Percentá cez 10 %", "Procenta přes 10 %", "Percent via 10%"),
    lesson: L(
      "10 % = posuň desatinnú čiarku o miesto doľava. 5 % = polovica z 10 %. 15 % = 10 % + 5 %, 20 % = 2 × 10 %, 30 % = 3 × 10 %.<br><b>15 % z 340</b> → 34 + 17 = <b>51</b>",
      "10 % = posuň desetinnou čárku o místo doleva. 5 % = polovina z 10 %. 15 % = 10 % + 5 %, 20 % = 2 × 10 %, 30 % = 3 × 10 %.<br><b>15 % z 340</b> → 34 + 17 = <b>51</b>",
      "10% = move the decimal point one place left. 5% = half of 10%. 15% = 10% + 5%, 20% = 2 × 10%, 30% = 3 × 10%.<br><b>15% of 340</b> → 34 + 17 = <b>51</b>"),
    gen() {
      const p = Brain.pick([5, 10, 15, 20, 30]), x = Brain.rnd(2, 50) * 20, ten = x / 10, ans = p * x / 100;
      const hint = p === 5 ? `10 % = ${ten} → ½ = ${ans}` : p === 10 ? `10 % = ${ans}` : p === 15 ? `10 % = ${ten}, 5 % = ${ten / 2} → ${ans}` : `10 % = ${ten} → × ${p / 10} = ${ans}`;
      return { q: t(L(`${p} % z ${n(x)}`, `${p} % z ${n(x)}`, `${p}% of ${n(x)}`)), ans, hint };
    },
  },
  {
    id: "near100", ico: "🎯", name: L("Čísla blízko 100", "Čísla blízko 100", "Near 100"),
    lesson: L(
      "Súčin dvoch čísel tesne pod 100: zisti, koľko každému chýba do 100. Od jedného čísla odčítaj chýbajúce druhého → prvé dvojčíslie. Súčin chýbajúcich → posledné dve číslice.<br><b>97 × 94</b> → chýba 3 a 6 → 97 − 6 = 91, 3 × 6 = 18 → <b>9118</b>",
      "Součin dvou čísel těsně pod 100: zjisti, kolik každému chybí do 100. Od jednoho čísla odečti, co chybí druhému → první dvojčíslí. Součin chybějících → poslední dvě číslice.<br><b>97 × 94</b> → chybí 3 a 6 → 97 − 6 = 91, 3 × 6 = 18 → <b>9118</b>",
      "Multiplying two numbers just below 100: find how far each is from 100. Subtract one's gap from the other number → first two digits. Multiply the gaps → last two digits.<br><b>97 × 94</b> → gaps 3 and 6 → 97 − 6 = 91, 3 × 6 = 18 → <b>9118</b>"),
    gen() {
      const da = Brain.rnd(1, 9), db = Brain.rnd(1, 9), a = 100 - da, b = 100 - db;
      return { q: `${a} × ${b}`, ans: a * b, hint: `${a} − ${db} = ${a - db} | ${da} × ${db} = ${String(da * db).padStart(2, "0")} → ${n(a * b)}` };
    },
  },
];
const MIX = { id: "mix", ico: "🎲", name: L("Mix všetkých", "Mix všech", "Mix of all") };

const ui = Brain.page({
  key: "triky",
  title: { sk: "🪄 Triky z hlavy", cs: "🪄 Triky z hlavy", en: "🪄 Mental math tricks" },
  footer: { sk: "Najprv postup, potom precvičenie. ·", cs: "Nejdřív postup, potom procvičení. ·", en: "Learn the method, then practise. ·" },
});

function menu() {
  Brain.playing(false);
  ui.main.innerHTML = `
    <div class="card"><p class="desc">${t(L(
      "Vyber si trik. Ukáže sa krátky postup s príkladom a potom 10 príkladov. Pri chybe uvidíš postup krok za krokom. Skóre = správne na prvý pokus.",
      "Vyber si trik. Ukáže se krátký postup s příkladem a potom 10 příkladů. Při chybě uvidíš postup krok za krokem. Skóre = správně na první pokus.",
      "Pick a trick. You'll see a short method with an example, then 10 problems. When you slip, the steps are shown. Score = right on the first try."))}</p></div>
    <div class="tricks" id="tricks"></div>`;
  for (const tr of [...TRICKS, MIX]) {
    const b = Brain.best("triky." + tr.id);
    const el = document.createElement("button");
    el.type = "button";
    el.className = "trick";
    el.innerHTML = `<span class="ico">${tr.ico}</span><span class="t">${t(tr.name)}</span><span class="b">${b === null ? "" : b + "/" + DRILL}</span>`;
    el.addEventListener("click", () => (tr === MIX ? drill(MIX) : lesson(tr)));
    $("tricks").appendChild(el);
  }
  Brain.onKey(() => false);
  Brain.board("triky.mix", { fmt: s => `${s}/${DRILL}` });
}

function lesson(tr) {
  ui.main.innerHTML = `
    <div class="card"><h2 class="lt">${tr.ico} ${t(tr.name)}</h2><p class="desc lesson">${t(tr.lesson)}</p>
      <div class="btnrow"><button type="button" id="back">${t(L("← Triky", "← Triky", "← Tricks"))}</button>
      <button type="button" class="primary" id="go">${t(L("Precvičiť ▶", "Procvičit ▶", "Practise ▶"))}</button></div></div>`;
  $("back").addEventListener("click", menu);
  $("go").addEventListener("click", () => drill(tr));
  Brain.onKey(k => { if (k === "Enter") { drill(tr); return true; } return false; });
  Brain.board("triky." + tr.id, { fmt: s => `${s}/${DRILL}` });
}

function drill(tr) {
  Brain.playing(true);
  let i = 0, score = 0, cur = null, miss = false, prevQ = "";
  const t0 = Date.now();
  ui.main.innerHTML = `
    <div class="statline"><span>${tr.ico} ${t(tr.name)}</span><span><b id="i">1</b>/${DRILL}</span><span>✔ <b id="sc">0</b></span></div>
    <div class="card"><div class="big" id="q"></div><div class="fb" id="hint"></div></div>`;
  const pad = Brain.numpad(ui.main, {
    onInput: v => { if (v === cur.ans) right(); },
    onSubmit: () => {
      miss = true;
      pad.flash("wrong"); pad.clear();
      $("hint").innerHTML = `💡 ${cur.hint}`;
    },
  });
  function next() {
    if (i >= DRILL) return finish();
    const src = tr === MIX ? Brain.pick(TRICKS) : tr;
    do { cur = src.gen(); } while (cur.q === prevQ);
    prevQ = cur.q; miss = false;
    $("i").textContent = i + 1;
    $("q").textContent = cur.q;
    $("hint").textContent = "";
    pad.clear();
  }
  function right() {
    if (!miss) score++;
    i++;
    $("sc").textContent = score;
    pad.flash("right");
    pad.enable(false);
    $("hint").innerHTML = miss ? `💡 ${cur.hint}` : "✅";
    setTimeout(() => { pad.enable(true); next(); }, miss ? 1500 : 400);
  }
  function finish() {
    const ms = Date.now() - t0;
    Brain.result(ui.main, {
      key: "triky." + tr.id, score,
      fmt: s => `${s}/${DRILL}`,
      label: L("Správne na prvý pokus", "Správně na první pokus", "Right on the first try"),
      lines: [L(`Čas: ${Brain.secs(ms)}`, `Čas: ${Brain.secs(ms)}`, `Time: ${Brain.secs(ms)}`)],
      onAgain: () => drill(tr),
      extraBtn: { label: L("← Triky", "← Triky", "← Tricks"), onClick: menu },
    });
  }
  next();
}

menu();
