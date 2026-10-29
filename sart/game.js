// SART (Sustained Attention to Response Task) – číslice 1–9 rýchlo za sebou,
// stlač pri každej OKREM 3. Úloha je nudná zámerne: chyby na trojke vznikajú
// práve vtedy, keď myseľ prejde na autopilota. Meria aj zrýchľovanie pred chybami.
const TARGET = 3;
const SHOW = 250;
const MASK = 900;
const LENGTHS = { short: 90, full: 225 };
const SIZES = [2.6, 3.4, 4.2, 5, 5.8];  // rem – rôzna veľkosť, aby sa nedalo reagovať na tvar
const localized = Brain.localized;
const byId = id => document.getElementById(id);

// Každá číslica rovnako často (trojka ≈ 11 %), náhodné poradie.
function makeSeq(len) {
  const seq = [];
  for (let d = 1; d <= 9; d++) for (let k = 0; k < Math.floor(len / 9); k++) seq.push(d);
  while (seq.length < len) seq.push(Brain.randomInt(1, 9));
  return Brain.shuffle(seq);
}
// Vyhodnotenie z pokusov [{ d, pressed, rt }].
function evaluate(trials) {
  const go = trials.filter(x => x.d !== TARGET), nogo = trials.filter(x => x.d === TARGET);
  const commissions = nogo.filter(x => x.pressed).length;
  const omissions = go.filter(x => !x.pressed).length;
  const goHit = go.length ? (go.length - omissions) / go.length : 1;
  const withheld = nogo.length ? (nogo.length - commissions) / nogo.length : 1;
  const rts = go.filter(x => x.pressed).map(x => x.rt);
  const mean = rts.length ? rts.reduce((s, x) => s + x, 0) / rts.length : 0;
  const sd = rts.length ? Math.sqrt(rts.reduce((s, x) => s + (x - mean) ** 2, 0) / rts.length) : 0;
  // priemerný čas 4 stlačení tesne pred každou chybou na trojke
  const before = [];
  trials.forEach((x, i) => {
    if (x.d !== TARGET || !x.pressed) return;
    trials.slice(Math.max(0, i - 4), i).filter(y => y.d !== TARGET && y.pressed).forEach(y => before.push(y.rt));
  });
  const preErr = before.length ? before.reduce((s, x) => s + x, 0) / before.length : null;
  return {
    commissions, omissions, nogo: nogo.length, go: go.length, mean, cv: mean ? sd / mean : 0, preErr,
    // vyvážená presnosť: nikdy nestlačiť aj stále stláčať dá 50
    score: Math.round(50 * (goHit + withheld)),
  };
}

const ui = Brain.page({
  key: "sart",
  title: { sk: "🛑 Nestlač trojku", cs: "🛑 Nemačkej trojku", en: "🛑 Don't press 3" },
  footer: { sk: "Medzerník alebo ťuknutie kamkoľvek do poľa. ·", cs: "Mezerník nebo ťuknutí kamkoli do pole. ·", en: "Space bar or tap anywhere in the box. ·" },
});
const len = Brain.choice(ui.controls, {
  key: "sart.len", label: { sk: "Dĺžka:", cs: "Délka:", en: "Length:" }, onChange: showIntro,
  options: [
    { v: "short", label: localized("krátka (~2 min)", "krátká (~2 min)", "short (~2 min)") },
    { v: "full", label: localized("plná (~4 min)", "plná (~4 min)", "full (~4 min)") },
  ],
});

function showIntro() {
  Brain.intro(ui.main, {
    key: "sart." + len.value,
    fmt: s => s + " %",
    desc: localized(
      "Číslice 1–9 idú rýchlo za sebou. Pri každej stlač medzerník (alebo ťukni) – <b>okrem trojky</b>. Je to schválne nudné: chyby vznikajú, keď sa ruka rozbehne skôr, než myseľ skontroluje číslo. Rovnaký mechanizmus ako preklep v kóde. Netlač sa do rýchlosti, presnosť je dôležitejšia.",
      "Číslice 1–9 jdou rychle za sebou. U každé stiskni mezerník (nebo ťukni) – <b>kromě trojky</b>. Je to schválně nudné: chyby vznikají, když se ruka rozběhne dřív, než mysl zkontroluje číslo. Stejný mechanismus jako překlep v kódu. Netlač se do rychlosti, přesnost je důležitější.",
      "Digits 1–9 flash in quick succession. Press space (or tap) for every one – <b>except 3</b>. It's boring on purpose: errors happen when your hand fires before your mind checks the digit. Same mechanism as a slip in code. Don't rush – accuracy matters more."),
    onStart: play,
  });
}

async function play() {
  Brain.playing(true);
  const seq = makeSeq(LENGTHS[len.value]);
  const trials = [];
  ui.main.innerHTML = `
    <div class="statline"><span><b id="i">0</b>/${seq.length}</span><span>${translate(localized("Chyby na 3", "Chyby na 3", "Errors on 3"))}: <b id="err">0</b></span></div>
    <button type="button" class="sart" id="box"><span id="digit"></span></button>`;
  const box = byId("box"), digit = byId("digit");
  let cur = null, start = 0, errs = 0;
  function press() {
    if (!cur || cur.pressed) return;
    cur.pressed = true;
    cur.rt = Date.now() - start;
    if (cur.d === TARGET) {
      errs++;
      byId("err").textContent = errs;
      box.classList.add("bad");
      setTimeout(() => box.classList.remove("bad"), 300);
    }
  }
  box.addEventListener("pointerdown", e => { e.preventDefault(); press(); });
  Brain.onKey(k => { if (k === " " || k === "Enter") { press(); return true; } return false; });

  await Brain.sleep(800);
  for (let i = 0; i < seq.length; i++) {
    cur = { d: seq[i], pressed: false, rt: null };
    trials.push(cur);
    byId("i").textContent = i + 1;
    start = Date.now();
    digit.textContent = seq[i];
    digit.style.fontSize = Brain.pick(SIZES) + "rem";
    digit.className = "";
    await Brain.sleep(SHOW);
    digit.textContent = "⊗";
    digit.style.fontSize = "4rem";
    digit.className = "mask";
    await Brain.sleep(MASK);
    if (cur.d !== TARGET && !cur.pressed) { box.classList.add("miss"); setTimeout(() => box.classList.remove("miss"), 200); }
  }
  cur = null;

  const r = evaluate(trials);
  const lines = [
    localized(`Stlačené na trojke: ${r.commissions}/${r.nogo}`, `Zmáčknuto na trojce: ${r.commissions}/${r.nogo}`, `Pressed on 3: ${r.commissions}/${r.nogo}`),
    localized(`Vynechané ostatné: ${r.omissions}/${r.go}`, `Vynechané ostatní: ${r.omissions}/${r.go}`, `Missed others: ${r.omissions}/${r.go}`),
    localized(`Priemerná reakcia ${Math.round(r.mean)} ms, rozptyl ${Math.round(r.cv * 100)} % (menej = stabilnejšia pozornosť)`, `Průměrná reakce ${Math.round(r.mean)} ms, rozptyl ${Math.round(r.cv * 100)} % (méně = stabilnější pozornost)`, `Mean reaction ${Math.round(r.mean)} ms, variability ${Math.round(r.cv * 100)}% (lower = steadier attention)`),
  ];
  if (r.preErr !== null) {
    const faster = r.preErr < r.mean - 15;
    lines.push(faster
      ? localized(`Pred chybami si zrýchlil: ${Math.round(r.preErr)} ms oproti priemeru ${Math.round(r.mean)} ms – typický znak autopilota. Keď cítiš „rytmus", spomaľ.`,
          `Před chybami jsi zrychlil: ${Math.round(r.preErr)} ms oproti průměru ${Math.round(r.mean)} ms – typický znak autopilota. Když cítíš „rytmus", zpomal.`,
          `You sped up before mistakes: ${Math.round(r.preErr)} ms vs. ${Math.round(r.mean)} ms average – a classic autopilot sign. When you feel the rhythm, slow down.`)
      : localized(`Pred chybami: ${Math.round(r.preErr)} ms (priemer ${Math.round(r.mean)} ms)`, `Před chybami: ${Math.round(r.preErr)} ms (průměr ${Math.round(r.mean)} ms)`, `Before mistakes: ${Math.round(r.preErr)} ms (average ${Math.round(r.mean)} ms)`));
  }
  Brain.result(ui.main, {
    key: "sart." + len.value, score: r.score, fmt: s => s + " %",
    label: localized("Vyvážená presnosť", "Vyvážená přesnost", "Balanced accuracy"),
    lines, onAgain: play,
  });
}

showIntro();
