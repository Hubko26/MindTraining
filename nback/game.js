// N-back – v mriežke 3×3 sa rozsvieti políčko (v duálnom režime aj s písmenom).
// Stlač „Pozícia" (A), keď je na rovnakom mieste ako pred N krokmi,
// „Písmeno" (L), keď je rovnaké písmeno. Úspešnosť ≥ 80 % → N + 1, < 50 % → N − 1.
const TRIAL = 2500;
const SHOW = 600;
const BASE_TRIALS = 20;
const MATCH_P = 0.3;
const LETTERS = "CHKLQRST".split("");
const L = Brain.L;
const $ = id => document.getElementById(id);

// Postupnosť so zhruba 30 % zhôd v každom kanáli; ostatné zámerne bez zhody.
function makeSeq(nb, len, dual) {
  const seq = [];
  for (let i = 0; i < len; i++) {
    let pos = Brain.rnd(0, 8), letter = Brain.pick(LETTERS);
    if (i >= nb) {
      const prev = seq[i - nb];
      if (Math.random() < MATCH_P) pos = prev.pos; else while (pos === prev.pos) pos = Brain.rnd(0, 8);
      if (dual) { if (Math.random() < MATCH_P) letter = prev.letter; else while (letter === prev.letter) letter = Brain.pick(LETTERS); }
    }
    seq.push({ pos, letter });
  }
  return seq;
}
// Úspešnosť kanála = zásahy / (zásahy + minuté + falošné poplachy).
function accuracy(s) { const d = s.hit + s.miss + s.fa; return d ? s.hit / d : 1; }

const ui = Brain.page({
  key: "nback",
  title: { sk: "🔲 N-back", cs: "🔲 N-back", en: "🔲 N-back" },
  footer: { sk: "Klávesy: A = pozícia, L = písmeno. ·", cs: "Klávesy: A = pozice, L = písmeno. ·", en: "Keys: A = position, L = letter. ·" },
});
const mode = Brain.choice(ui.controls, {
  key: "nback.mode", label: { sk: "Režim:", cs: "Režim:", en: "Mode:" }, onChange: showIntro,
  options: [
    { v: "single", label: L("pozícia", "pozice", "position") },
    { v: "dual", label: L("pozícia + písmeno", "pozice + písmeno", "position + letter") },
  ],
});
const nKey = () => "nback.n." + mode.value;

function showIntro() {
  const nb = Brain.load(nKey(), 2);
  Brain.intro(ui.main, {
    key: "nback." + mode.value,
    fmt: s => "N = " + s,
    desc: L(
      `Každých 2,5 s sa rozsvieti políčko${mode.value === "dual" ? " s písmenom" : ""}. Stlač tlačidlo, keď sa zhoduje s tým spred <b>N</b> krokov. ${BASE_TRIALS} + N krokov. Pri úspešnosti aspoň 80 % ideš na vyššie N. Rekord = najvyššie zvládnuté N.`,
      `Každé 2,5 s se rozsvítí políčko${mode.value === "dual" ? " s písmenem" : ""}. Stiskni tlačítko, když se shoduje s tím před <b>N</b> kroky. ${BASE_TRIALS} + N kroků. Při úspěšnosti aspoň 80 % jdeš na vyšší N. Rekord = nejvyšší zvládnuté N.`,
      `Every 2.5 s a square lights up${mode.value === "dual" ? " with a letter" : ""}. Press when it matches the one <b>N</b> steps back. ${BASE_TRIALS} + N steps. Score 80%+ to move up a level. Best = highest N passed.`),
    extra: `<div class="nsel"><button type="button" id="nDown">−</button><b>N = <span id="nVal">${nb}</span></b><button type="button" id="nUp">+</button></div>`,
    onStart: play,
  });
  const setN = d => { const v = Brain.clamp(Brain.load(nKey(), 2) + d, 1, 9); Brain.save(nKey(), v); $("nVal").textContent = v; };
  $("nDown").addEventListener("click", () => setN(-1));
  $("nUp").addEventListener("click", () => setN(1));
}

async function play() {
  Brain.playing(true);
  const dual = mode.value === "dual", nb = Brain.load(nKey(), 2);
  const seq = makeSeq(nb, BASE_TRIALS + nb, dual);
  const st = { pos: { hit: 0, miss: 0, fa: 0 }, letter: { hit: 0, miss: 0, fa: 0 } };
  ui.main.innerHTML = `
    <div class="statline"><span>N = <b>${nb}</b></span><span><b id="i">0</b>/${seq.length}</span></div>
    <div class="grid9" id="grid">${Array.from({ length: 9 }, (_, i) => `<div class="c" data-i="${i}"></div>`).join("")}</div>
    <div class="btnrow">
      <button type="button" class="nb" id="bPos">${t(L("Pozícia", "Pozice", "Position"))} <kbd>A</kbd></button>
      ${dual ? `<button type="button" class="nb" id="bLet">${t(L("Písmeno", "Písmeno", "Letter"))} <kbd>L</kbd></button>` : ""}
    </div>`;
  const cells = document.querySelectorAll("#grid .c");
  let i = -1, pressed = { pos: false, letter: false };

  function press(ch) {
    if (i < 0 || pressed[ch]) return;
    pressed[ch] = true;
    const target = i >= nb && seq[i][ch] === seq[i - nb][ch];
    const btn = $(ch === "pos" ? "bPos" : "bLet");
    if (target) st[ch].hit++; else st[ch].fa++;
    btn.classList.add(target ? "right" : "wrong");
    setTimeout(() => btn.classList.remove("right", "wrong"), 400);
  }
  $("bPos").addEventListener("click", () => press("pos"));
  if (dual) $("bLet").addEventListener("click", () => press("letter"));
  Brain.onKey(k => {
    if (k === "a" || k === "A") { press("pos"); return true; }
    if (dual && (k === "l" || k === "L")) { press("letter"); return true; }
    return false;
  });

  for (i = 0; i < seq.length; i++) {
    pressed = { pos: false, letter: false };
    $("i").textContent = i + 1;
    const c = cells[seq[i].pos];
    c.classList.add("on");
    if (dual) c.textContent = seq[i].letter;
    await Brain.sleep(SHOW);
    c.classList.remove("on");
    c.textContent = "";
    await Brain.sleep(TRIAL - SHOW);
    if (i >= nb) {
      if (!pressed.pos && seq[i].pos === seq[i - nb].pos) st.pos.miss++;
      if (dual && !pressed.letter && seq[i].letter === seq[i - nb].letter) st.letter.miss++;
    }
  }

  const accPos = accuracy(st.pos), accLet = accuracy(st.letter);
  const acc = dual ? (accPos + accLet) / 2 : accPos;
  const passed = acc >= 0.8;
  const newN = passed ? nb + 1 : acc < 0.5 ? Math.max(1, nb - 1) : nb;
  Brain.save(nKey(), newN);
  const pct = x => Math.round(x * 100) + " %";
  const lines = [
    L(`Pozícia: ${pct(accPos)} (zásahy ${st.pos.hit}, minuté ${st.pos.miss}, navyše ${st.pos.fa})`, `Pozice: ${pct(accPos)} (zásahy ${st.pos.hit}, minuté ${st.pos.miss}, navíc ${st.pos.fa})`, `Position: ${pct(accPos)} (hits ${st.pos.hit}, missed ${st.pos.miss}, false ${st.pos.fa})`),
  ];
  if (dual) lines.push(L(`Písmeno: ${pct(accLet)} (zásahy ${st.letter.hit}, minuté ${st.letter.miss}, navyše ${st.letter.fa})`, `Písmeno: ${pct(accLet)} (zásahy ${st.letter.hit}, minuté ${st.letter.miss}, navíc ${st.letter.fa})`, `Letter: ${pct(accLet)} (hits ${st.letter.hit}, missed ${st.letter.miss}, false ${st.letter.fa})`));
  lines.push(newN > nb ? L(`Postup na N = ${newN}`, `Postup na N = ${newN}`, `Moving up to N = ${newN}`)
    : newN < nb ? L(`Späť na N = ${newN}`, `Zpět na N = ${newN}`, `Back to N = ${newN}`)
    : L(`Zostávaš na N = ${nb} (na postup treba 80 %)`, `Zůstáváš na N = ${nb} (na postup je třeba 80 %)`, `Staying at N = ${nb} (80% needed to move up)`));
  Brain.result(ui.main, {
    key: "nback." + mode.value, score: passed ? nb : null, noRecord: !passed,
    fmt: s => "N = " + s,
    label: passed ? L(`Zvládnuté N = ${nb} · ${pct(acc)}`, `Zvládnuté N = ${nb} · ${pct(acc)}`, `Passed N = ${nb} · ${pct(acc)}`) : L(`Úspešnosť ${pct(acc)}`, `Úspěšnost ${pct(acc)}`, `Accuracy ${pct(acc)}`),
    lines, onAgain: play,
  });
}

showIntro();
