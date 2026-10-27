// Pamäť čísel (digit span) – číslice sa ukazujú po jednej, potom ich zadáš
// (v režime „odzadu" v opačnom poradí). Správne → o číslicu viac.
// Dve chyby na rovnakej dĺžke → koniec. Skóre = najdlhší zvládnutý rad.
const SHOW = 800;
const GAP = 200;
const START = { fwd: 3, bwd: 2 };
const L = Brain.L;
const $ = id => document.getElementById(id);

// Náhodné číslice bez dvoch rovnakých za sebou.
function digitsOf(len) {
  const d = [];
  while (d.length < len) { const x = Brain.rnd(0, 9); if (x !== d[d.length - 1]) d.push(x); }
  return d;
}
const expected = (d, mode) => (mode === "bwd" ? d.slice().reverse() : d).join("");

const ui = Brain.page({
  key: "cisla",
  title: { sk: "🔢 Pamäť čísel", cs: "🔢 Paměť čísel", en: "🔢 Digit span" },
  footer: { sk: "Bežný dospelý: dopredu 7 ± 2, odzadu okolo 5. ·", cs: "Běžný dospělý: dopředu 7 ± 2, pozpátku kolem 5. ·", en: "Typical adult: forwards 7 ± 2, backwards about 5. ·" },
});
const mode = Brain.choice(ui.controls, {
  key: "cisla.mode", label: { sk: "Poradie:", cs: "Pořadí:", en: "Order:" }, onChange: showIntro,
  options: [
    { v: "fwd", label: L("dopredu", "dopředu", "forwards") },
    { v: "bwd", label: L("odzadu", "pozpátku", "backwards") },
  ],
});

function showIntro() {
  Brain.intro(ui.main, {
    key: "cisla." + mode.value,
    desc: mode.value === "fwd" ? L(
      "Číslice sa ukážu po jednej. Potom ich zadaj v rovnakom poradí. Každý správny rad je o číslicu dlhší; dve chyby na tej istej dĺžke končia hru.",
      "Číslice se ukážou po jedné. Potom je zadej ve stejném pořadí. Každá správná řada je o číslici delší; dvě chyby na stejné délce končí hru.",
      "Digits appear one at a time. Then type them in the same order. Each correct row adds a digit; two misses at the same length end the game.") : L(
      "Číslice sa ukážu po jednej. Zadaj ich <b>odzadu</b> (posledná prvá). Každý správny rad je o číslicu dlhší; dve chyby na tej istej dĺžke končia hru.",
      "Číslice se ukážou po jedné. Zadej je <b>pozpátku</b> (poslední první). Každá správná řada je o číslici delší; dvě chyby na stejné délce končí hru.",
      "Digits appear one at a time. Type them <b>backwards</b> (last one first). Each correct row adds a digit; two misses at the same length end the game."),
    onStart: play,
  });
}

async function play() {
  Brain.playing(true);
  const m = mode.value;
  let len = START[m], fails = 0, best = 0;
  for (;;) {
    const d = digitsOf(len);
    ui.main.innerHTML = `
      <div class="statline"><span>${t(L("Dĺžka", "Délka", "Length"))} <b>${len}</b></span><span>${t(L("Najlepšie", "Nejlépe", "Best"))} <b>${best}</b></span></div>
      <div class="card"><div class="big digit" id="show"></div></div>
      <div id="ans"></div>`;
    Brain.onKey(() => false);
    await Brain.sleep(600);
    for (const x of d) {
      $("show").textContent = x;
      await Brain.sleep(SHOW);
      $("show").textContent = "";
      await Brain.sleep(GAP);
    }
    $("show").textContent = m === "bwd" ? "← ?" : "?";
    const typed = await new Promise(res => {
      const pad = Brain.numpad($("ans"), {
        max: len, raw: true,
        onInput: (v, s) => { if (s.length === len) { pad.enable(false); res(s); } },
        onSubmit: (v, s) => { pad.enable(false); res(s); },
      });
    });
    const want = expected(d, m), ok = typed === want;
    if (ok) { best = len; len++; fails = 0; }
    else fails++;
    $("show").innerHTML = ok ? "✅" : `<span class="sm">${want}</span>`;
    await Brain.sleep(ok ? 700 : 1600);
    if (fails >= 2) break;
  }
  Brain.result(ui.main, {
    key: "cisla." + m, score: best,
    label: L("Najdlhší zvládnutý rad", "Nejdelší zvládnutá řada", "Longest correct row"),
    lines: [m === "fwd"
      ? L("Bežný dospelý zvládne dopredu 5 – 9 číslic.", "Běžný dospělý zvládne dopředu 5 – 9 číslic.", "Typical adults manage 5–9 digits forwards.")
      : L("Bežný dospelý zvládne odzadu 4 – 6 číslic.", "Běžný dospělý zvládne pozpátku 4 – 6 číslic.", "Typical adults manage 4–6 digits backwards.")],
    onAgain: play,
  });
}

showIntro();
