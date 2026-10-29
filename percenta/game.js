// Percentá a úroky – 10 úloh zo života: percento z čísla, zľava, DPH,
// zmena v %, spätný výpočet ceny, pravidlo 72, zložené úročenie.
// Po každej odpovedi sa ukáže postup.
const ROUNDS = 10;
const localized = Brain.localized;
const byId = id => document.getElementById(id);
const n = (x, d = 2) => Brain.formatNumber(x, d);

// Generátor opakuje voľbu čísel, kým nevyjde celé číslo (alebo pekné na 2 miesta).
function until(fn) { for (;;) { const r = fn(); if (r) return r; } }
const int = x => Math.abs(x - Math.round(x)) < 1e-9;

const GEN = {
  pctOf: () => until(() => {
    const p = Brain.pick([5, 10, 12, 15, 20, 25, 30, 35, 40, 60, 75]), x = Brain.randomInt(2, 60) * 20, ans = p * x / 100;
    if (!int(ans)) return null;
    return { q: localized(`Koľko je ${p} % z ${n(x)}?`, `Kolik je ${p} % z ${n(x)}?`, `What is ${p}% of ${n(x)}?`), ans,
      why: `${n(x)} × ${p} / 100 = ${n(ans)}` };
  }),
  discount: () => until(() => {
    const p = Brain.randomInt(3, 80) * 10, d = Brain.pick([10, 15, 20, 25, 30, 40, 50]), ans = p * (100 - d) / 100;
    if (!int(ans)) return null;
    return { q: localized(`Bunda stojí ${n(p)} €, zľava ${d} %. Koľko zaplatíš?`, `Bunda stojí ${n(p)} €, sleva ${d} %. Kolik zaplatíš?`, `A jacket costs €${n(p)}, ${d}% off. What do you pay?`), ans,
      why: `${n(p)} × ${n((100 - d) / 100)} = ${n(ans)} €` };
  }),
  vat: () => {
    const base = Brain.randomInt(1, 40) * 100, r = Brain.pick([20, 21]), ans = base * (100 + r) / 100;
    return { q: localized(`Cena bez DPH ${n(base)} €, DPH ${r} %. Koľko je s DPH?`, `Cena bez DPH ${n(base)} €, DPH ${r} %. Kolik je s DPH?`, `Price before VAT €${n(base)}, VAT ${r}%. Price with VAT?`), ans,
      why: `${n(base)} × ${n(1 + r / 100)} = ${n(ans)} €` };
  },
  change: () => {
    const a = Brain.randomInt(2, 40) * 20, p = Brain.pick([-50, -40, -30, -25, -20, -15, -10, -5, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75]), b = a * (100 + p) / 100;
    return { q: localized(`Akcia mala ${n(a)} €, teraz má ${n(b)} €. O koľko %? (pokles so znamienkom −)`, `Akcie měla ${n(a)} €, teď má ${n(b)} €. O kolik %? (pokles se znaménkem −)`, `A share went from €${n(a)} to €${n(b)}. Change in %? (use − for a drop)`), ans: p, neg: true,
      why: `(${n(b)} − ${n(a)}) / ${n(a)} × 100 = ${p} %` };
  },
  reverse: () => until(() => {
    const orig = Brain.randomInt(2, 40) * 20, d = Brain.pick([10, 20, 25, 30, 40, 50]), sale = orig * (100 - d) / 100;
    if (!int(sale)) return null;
    return { q: localized(`Po zľave ${d} % stojí tovar ${n(sale)} €. Aká bola pôvodná cena?`, `Po slevě ${d} % stojí zboží ${n(sale)} €. Jaká byla původní cena?`, `After ${d}% off it costs €${n(sale)}. What was the original price?`), ans: orig,
      why: `${n(sale)} / ${n((100 - d) / 100)} = ${n(orig)} €` };
  }),
  share: () => until(() => {
    const whole = Brain.pick([20, 25, 40, 50, 80, 120, 200, 250, 400, 500]), p = Brain.randomInt(1, 19) * 5, part = whole * p / 100;
    if (!int(part)) return null;
    return { q: localized(`Koľko percent je ${n(part)} z ${n(whole)}?`, `Kolik procent je ${n(part)} z ${n(whole)}?`, `What percent of ${n(whole)} is ${n(part)}?`), ans: p,
      why: `${n(part)} / ${n(whole)} × 100 = ${p} %` };
  }),
  rule72: () => {
    const r = Brain.pick([2, 3, 4, 6, 8, 9, 12]);
    return { q: localized(`Pri výnose ${r} % ročne sa peniaze zdvojnásobia približne za koľko rokov?`, `Při výnosu ${r} % ročně se peníze zdvojnásobí přibližně za kolik let?`, `At ${r}% a year, roughly how many years until money doubles?`), ans: 72 / r,
      why: translate(localized(`Pravidlo 72: 72 ÷ ${r} = ${72 / r}`, `Pravidlo 72: 72 ÷ ${r} = ${72 / r}`, `Rule of 72: 72 ÷ ${r} = ${72 / r}`)) };
  },
  compound: () => {
    const p = Brain.pick([1000, 2000, 5000, 10000]), r = Brain.pick([5, 10, 20]), y = Brain.pick([2, 3]);
    const ans = Math.round(p * Math.pow(1 + r / 100, y) * 100) / 100;
    return { q: localized(`Vložíš ${n(p)} € na ${r} % ročne (zložené úročenie). Koľko budeš mať o ${y} roky?`, `Vložíš ${n(p)} € na ${r} % ročně (složené úročení). Kolik budeš mít za ${y} roky?`, `You invest €${n(p)} at ${r}% a year, compounded. How much after ${y} years?`), ans, tol: 1,
      why: `${n(p)} × ${n(1 + r / 100)}${y === 2 ? "²" : "³"} = ${n(ans)} € <span class="muted">(${translate(localized("tolerancia ±1 €", "tolerance ±1 €", "±€1 accepted"))})</span>` };
  },
};

function correct(q, v) { return v !== null && Math.abs(v - q.ans) <= (q.tol || 0.005); }

const ui = Brain.page({
  key: "percenta",
  title: { sk: "％ Percentá a úroky", cs: "％ Procenta a úroky", en: "％ Percentages & interest" },
  footer: { sk: "Desatinné čísla píš s čiarkou. ·", cs: "Desetinná čísla piš s čárkou. ·", en: "Use the comma key for decimals. ·" },
});

function showIntro() {
  Brain.intro(ui.main, {
    key: "percenta",
    desc: localized(
      `${ROUNDS} úloh: percento z čísla, zľava, DPH, zmena v %, pôvodná cena pred zľavou, pravidlo 72 a zložené úročenie. Po každej uvidíš postup.`,
      `${ROUNDS} úloh: procento z čísla, sleva, DPH, změna v %, původní cena před slevou, pravidlo 72 a složené úročení. Po každé uvidíš postup.`,
      `${ROUNDS} tasks: percent of a number, discounts, VAT, % change, price before discount, rule of 72 and compound interest. Each answer shows the method.`),
    onStart: play,
  });
}

async function play() {
  Brain.playing(true);
  const kinds = Brain.shuffle(Object.keys(GEN).concat(Brain.shuffle(Object.keys(GEN)))).slice(0, ROUNDS);
  let score = 0;
  const t0 = Date.now();
  for (let i = 0; i < ROUNDS; i++) {
    const q = GEN[kinds[i]]();
    ui.main.innerHTML = `
      <div class="statline"><span>${translate(localized("Úloha", "Úloha", "Task"))} <b>${i + 1}/${ROUNDS}</b></span><span>✔ <b>${score}</b></span></div>
      <div class="card"><p class="pq">${translate(q.q)}</p></div>
      <div id="ans"></div>`;
    const v = await new Promise(res => {
      const pad = Brain.numpad(byId("ans"), { dec: true, neg: !!q.neg, onSubmit: x => { pad.enable(false); res(x); } });
    });
    const ok = correct(q, v);
    if (ok) score++;
    byId("ans").innerHTML = `<div class="fb ${ok ? "ok" : "bad"}"><b>${ok ? translate(localized("✅ Správne", "✅ Správně", "✅ Correct")) : translate(localized(`❌ Správne: ${n(q.ans)} (ty: ${n(v)})`, `❌ Správně: ${n(q.ans)} (ty: ${n(v)})`, `❌ Answer: ${n(q.ans)} (you: ${n(v)})`))}</b><br>${q.why}</div>`;
    await Brain.waitNext(byId("ans"));
  }
  Brain.result(ui.main, {
    key: "percenta", score, fmt: s => `${s}/${ROUNDS}`,
    label: localized("Správne odpovede", "Správné odpovědi", "Correct answers"),
    lines: [localized(`Čas: ${Brain.formatSeconds(Date.now() - t0)}`, `Čas: ${Brain.formatSeconds(Date.now() - t0)}`, `Time: ${Brain.formatSeconds(Date.now() - t0)}`)],
    onAgain: play,
  });
}

showIntro();
