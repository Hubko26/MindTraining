// Reťazové počty – štart a operácie sa ukazujú postupne, počítaš v hlave
// a na konci zadáš len výsledok. Dĺžka reťaze sa prispôsobuje (3–15).
const ROUNDS = 8;
const DIFF = {
  easy: { max: 50, add: 9, mul: 3 },
  mid: { max: 100, add: 20, mul: 5 },
  hard: { max: 300, add: 50, mul: 9 },
};
const SPEEDS = { slow: 2000, mid: 1400, fast: 900 };
const L = Brain.L;
const $ = id => document.getElementById(id);

// Reťaz s medzivýsledkami vždy v rozsahu 1..max a delením bezo zvyšku.
function chain(len, d) {
  const start = Brain.rnd(2, Math.min(20, d.max));
  let v = start;
  const steps = [];
  for (let i = 0; i < len; i++) {
    const opts = [];
    if (v < d.max) opts.push(() => { const n = Brain.rnd(1, Math.min(d.add, d.max - v)); return { op: "+", n, v: v + n }; });
    if (v > 1) opts.push(() => { const n = Brain.rnd(1, Math.min(d.add, v - 1)); return { op: "−", n, v: v - n }; });
    if (v >= 2 && v * 2 <= d.max) opts.push(() => { const n = Brain.rnd(2, Math.min(d.mul, Math.floor(d.max / v))); return { op: "×", n, v: v * n }; });
    const divs = [];
    for (let k = 2; k <= 9; k++) if (v % k === 0 && v / k >= 2) divs.push(k);
    if (divs.length) opts.push(() => { const n = Brain.pick(divs); return { op: "÷", n, v: v / n }; });
    const s = Brain.pick(opts)();
    steps.push(s);
    v = s.v;
  }
  return { start, steps, ans: v };
}

const ui = Brain.page({
  key: "retaz",
  title: { sk: "🔗 Reťazové počty", cs: "🔗 Řetězové počty", en: "🔗 Chain arithmetic" },
  footer: { sk: "Počítaj priebežne, výsledok zadaj na konci. ·", cs: "Počítej průběžně, výsledek zadej na konci. ·", en: "Keep a running total, enter it at the end. ·" },
});
const diff = Brain.choice(ui.controls, {
  key: "retaz.diff", label: { sk: "Čísla:", cs: "Čísla:", en: "Numbers:" }, onChange: showIntro,
  options: [
    { v: "easy", label: L("do 50", "do 50", "to 50") },
    { v: "mid", label: L("do 100", "do 100", "to 100") },
    { v: "hard", label: L("do 300", "do 300", "to 300") },
  ],
});
const speed = Brain.choice(ui.controls, {
  key: "retaz.speed", label: { sk: "Tempo:", cs: "Tempo:", en: "Pace:" }, onChange: showIntro,
  options: [
    { v: "slow", label: L("pomaly", "pomalu", "slow") },
    { v: "mid", label: L("stredne", "středně", "medium") },
    { v: "fast", label: L("rýchlo", "rychle", "fast") },
  ],
});
const recKey = () => `retaz.${diff.value}.${speed.value}`;

function showIntro() {
  Brain.intro(ui.main, {
    key: recKey(),
    desc: L(
      `Ukáže sa číslo a za ním postupne operácie (napr. + 7, × 3, ÷ 2). Výsledok drž v hlave. Na konci zadáš len konečné číslo. ${ROUNDS} reťazí; správna = dlhšia, chyba = kratšia. Skóre = súčet dĺžok správnych reťazí.`,
      `Ukáže se číslo a za ním postupně operace (např. + 7, × 3, ÷ 2). Výsledek drž v hlavě. Na konci zadáš jen konečné číslo. ${ROUNDS} řetězů; správný = delší, chyba = kratší. Skóre = součet délek správných řetězů.`,
      `A number appears, then operations one by one (e.g. + 7, × 3, ÷ 2). Keep the result in your head and enter only the final number. ${ROUNDS} chains; correct = longer, wrong = shorter. Score = total length of correct chains.`),
    extra: `<p class="muted">${t(L("Aktuálna dĺžka reťaze", "Aktuální délka řetězu", "Current chain length"))}: ${Brain.load("retaz.len", 4)}</p>`,
    onStart: play,
  });
}

function ask(parent) {
  return new Promise(res => {
    const pad = Brain.numpad(parent, { onSubmit: v => { pad.enable(false); res(v); } });
  });
}

async function play() {
  Brain.playing(true);
  let len = Brain.load("retaz.len", 4), score = 0, okCount = 0, longest = 0;
  const sp = SPEEDS[speed.value];
  for (let round = 0; round < ROUNDS; round++) {
    const c = chain(len, DIFF[diff.value]);
    ui.main.innerHTML = `
      <div class="statline"><span>${t(L("Reťaz", "Řetěz", "Chain"))} <b>${round + 1}/${ROUNDS}</b></span>
        <span>${t(L("Dĺžka", "Délka", "Length"))} <b>${len}</b></span><span>${t(L("Skóre", "Skóre", "Score"))} <b>${score}</b></span></div>
      <div class="card"><div class="big" id="show"></div></div>
      <div id="ans"></div>`;
    Brain.onKey(() => false);
    const show = $("show");
    show.textContent = c.start;
    await Brain.sleep(sp);
    for (const s of c.steps) {
      show.textContent = "";
      await Brain.sleep(150);
      show.textContent = `${s.op} ${s.n}`;
      await Brain.sleep(sp);
    }
    show.textContent = "= ?";
    const v = await ask($("ans"));
    const ok = v === c.ans;
    if (ok) { score += len; okCount++; longest = Math.max(longest, len); len = Math.min(15, len + 1); }
    else len = Math.max(3, len - 1);
    const path = c.start + c.steps.map(s => ` ${s.op} ${s.n} <span class="muted" style="display:inline">(${s.v})</span>`).join("");
    $("ans").innerHTML = `<div class="fb ${ok ? "ok" : "bad"}">
      <b>${ok ? t(L("✅ Správne", "✅ Správně", "✅ Correct")) : t(L(`❌ Správne je ${c.ans}, ty ${v}`, `❌ Správně je ${c.ans}, ty ${v}`, `❌ It's ${c.ans}, you said ${v}`))}</b><br>${path}</div>`;
    await Brain.waitNext($("ans"));
  }
  Brain.save("retaz.len", len);
  Brain.result(ui.main, {
    key: recKey(), score,
    label: L("Skóre (súčet dĺžok)", "Skóre (součet délek)", "Score (total length)"),
    lines: [
      L(`Správne reťaze: ${okCount}/${ROUNDS}`, `Správné řetězy: ${okCount}/${ROUNDS}`, `Correct chains: ${okCount}/${ROUNDS}`),
      L(`Najdlhšia správna: ${longest}`, `Nejdelší správný: ${longest}`, `Longest correct: ${longest}`),
      L(`Ďalej začneš s dĺžkou ${len}`, `Příště začneš s délkou ${len}`, `Next time you start at length ${len}`),
    ],
    onAgain: play,
  });
}

showIntro();
