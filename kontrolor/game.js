// Kontrolór – hárok vypočítaných príkladov, niektoré obsahujú typickú
// chybu (o 1, o 10, prehodené číslice…). Označ chybné, nič navyše.
// Trénuje kontrolu hotovej práce – ako code review. Čas sa len meria.
const SHEETS = 5;
const ROWS = 10;
const MAX_ERRORS = 4;
const localized = Brain.localized;
const byId = id => document.getElementById(id);
const n = x => Brain.formatNumber(x);

const MAKE = {
  add2: () => { const a = Brain.randomInt(12, 99), b = Brain.randomInt(12, 99); return [`${a} + ${b}`, a + b]; },
  sub2: () => { const a = Brain.randomInt(30, 99), b = Brain.randomInt(11, a - 1); return [`${a} − ${b}`, a - b]; },
  add3: () => { const a = Brain.randomInt(102, 999), b = Brain.randomInt(102, 999); return [`${a} + ${b}`, a + b]; },
  sub3: () => { const a = Brain.randomInt(300, 999), b = Brain.randomInt(102, a - 1); return [`${a} − ${b}`, a - b]; },
  add4: () => { const a = Brain.randomInt(1002, 9999), b = Brain.randomInt(1002, 9999); return [`${n(a)} + ${n(b)}`, a + b]; },
  sub4: () => { const a = Brain.randomInt(3000, 9999), b = Brain.randomInt(1002, a - 1); return [`${n(a)} − ${n(b)}`, a - b]; },
  mul21: () => { const a = Brain.randomInt(12, 99), b = Brain.randomInt(3, 9); return [`${a} × ${b}`, a * b]; },
  mul22: () => { const a = Brain.randomInt(12, 99), b = Brain.randomInt(12, 99); return [`${a} × ${b}`, a * b]; },
  mul31: () => { const a = Brain.randomInt(102, 999), b = Brain.randomInt(3, 9); return [`${a} × ${b}`, a * b]; },
  div: () => { const b = Brain.randomInt(3, 9), q = Brain.randomInt(12, 99); return [`${b * q} ÷ ${b}`, q]; },
};
const DIFF = {
  easy: ["add2", "sub2", "mul21"],
  mid: ["add3", "sub3", "mul21", "div"],
  hard: ["add4", "sub4", "mul22", "mul31"],
};

// Typická chyba z nepozornosti: o 1, 2, 10, 100, alebo prehodené posledné dve číslice.
function corrupt(x) {
  const opts = [x + 1, x - 1, x + 2, x - 2, x + 10, x - 10];
  if (x >= 200) opts.push(x + 100, x - 100);
  const s = String(x);
  if (s.length >= 3 || (s.length === 2 && s[1] !== "0")) {
    if (s.at(-1) !== s.at(-2)) opts.push(Number(s.slice(0, -2) + s.at(-1) + s.at(-2)));
  }
  return Brain.pick(opts.filter(v => v > 0 && v !== x));
}

function makeSheet(kinds) {
  const errors = Brain.randomInt(0, MAX_ERRORS);
  const bad = new Set(Brain.shuffle([...Array(ROWS).keys()]).slice(0, errors));
  return Array.from({ length: ROWS }, (_, i) => {
    const [q, ans] = MAKE[Brain.pick(kinds)]();
    const wrong = bad.has(i);
    return { q, ans, shown: wrong ? corrupt(ans) : ans, wrong };
  });
}
// Vyhodnotenie hárku: marked = množina indexov, ktoré hráč označil.
function grade(rows, marked) {
  const r = { found: 0, missed: 0, falseAlarm: 0, right: 0 };
  rows.forEach((row, i) => {
    const m = marked.has(i);
    if (row.wrong && m) r.found++;
    else if (row.wrong) r.missed++;
    else if (m) r.falseAlarm++;
    if (row.wrong === m) r.right++;
  });
  return r;
}

const ui = Brain.page({
  key: "kontrolor",
  title: { sk: "🔍 Kontrolór", cs: "🔍 Kontrolor", en: "🔍 Checker" },
  footer: { sk: "Klávesy 1–9 a 0 označia riadok, Enter = hotovo. ·", cs: "Klávesy 1–9 a 0 označí řádek, Enter = hotovo. ·", en: "Keys 1–9 and 0 mark a row, Enter = done. ·" },
});
const diff = Brain.choice(ui.controls, {
  key: "kontrolor.diff", label: { sk: "Príklady:", cs: "Příklady:", en: "Problems:" }, onChange: showIntro,
  options: [
    { v: "easy", label: localized("ľahké", "lehké", "easy") },
    { v: "mid", label: localized("stredné", "střední", "medium") },
    { v: "hard", label: localized("ťažké", "těžké", "hard") },
  ],
});

function showIntro() {
  Brain.intro(ui.main, {
    key: "kontrolor." + diff.value, fmt: s => s + " %",
    desc: localized(
      `${SHEETS} hárkov po ${ROWS} vypočítaných príkladoch. Na každom je 0 až ${MAX_ERRORS} chýb – také, aké vznikajú z nepozornosti (o 1, o 10, prehodené číslice). Ťukni na chybné a daj „Hotovo". Za prehliadnutú chybu aj za falošný poplach prichádzaš o bod. Čas sa meria, ale nerozhoduje.`,
      `${SHEETS} listů po ${ROWS} vypočítaných příkladech. Na každém je 0 až ${MAX_ERRORS} chyb – takové, jaké vznikají z nepozornosti (o 1, o 10, prohozené číslice). Ťukni na chybné a dej „Hotovo". Za přehlédnutou chybu i za planý poplach přicházíš o bod. Čas se měří, ale nerozhoduje.`,
      `${SHEETS} sheets of ${ROWS} worked problems. Each has 0 to ${MAX_ERRORS} mistakes – the careless kind (off by 1, off by 10, swapped digits). Tap the wrong ones, then "Done". A missed mistake and a false alarm both cost a point. Time is measured but doesn't count.`),
    onStart: play,
  });
}

async function play() {
  Brain.playing(true);
  const tot = { found: 0, missed: 0, falseAlarm: 0, right: 0, errors: 0 };
  const t0 = Date.now();
  for (let s = 0; s < SHEETS; s++) {
    const rows = makeSheet(DIFF[diff.value]);
    const marked = new Set();
    ui.main.innerHTML = `
      <div class="statline"><span>${translate(localized("Hárok", "List", "Sheet"))} <b>${s + 1}/${SHEETS}</b></span></div>
      <div class="sheet" id="sheet"></div>
      <div id="after"><div class="btnrow"><button type="button" class="primary" id="done">${translate(localized("Hotovo", "Hotovo", "Done"))}</button></div></div>`;
    const els = rows.map((row, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "row";
      b.innerHTML = `<span class="k">${(i + 1) % 10}</span><span class="eq">${row.q} = <b>${n(row.shown)}</b></span><span class="mk"></span>`;
      b.addEventListener("click", () => toggle(i));
      byId("sheet").appendChild(b);
      return b;
    });
    let over = false;
    function toggle(i) {
      if (over) return;
      if (marked.has(i)) marked.delete(i); else marked.add(i);
      els[i].classList.toggle("marked", marked.has(i));
    }
    await new Promise(res => {
      byId("done").addEventListener("click", res);
      Brain.onKey(k => {
        if (/^\d$/.test(k)) { toggle((Number(k) + 9) % 10); return true; }
        if (k === "Enter") { res(); return true; }
        return false;
      });
    });
    over = true;
    const g = grade(rows, marked);
    for (const k of ["found", "missed", "falseAlarm", "right"]) tot[k] += g[k];
    tot.errors += rows.filter(r => r.wrong).length;
    rows.forEach((row, i) => {
      const m = marked.has(i);
      const cls = row.wrong && m ? "found" : row.wrong ? "missed" : m ? "fa" : "";
      if (cls) els[i].classList.add(cls);
      if (row.wrong) els[i].querySelector(".mk").textContent = `→ ${n(row.ans)}`;
    });
    byId("after").innerHTML = `<div class="fb ${g.right === ROWS ? "ok" : "bad"}"><b>${g.right === ROWS
      ? translate(localized("✅ Bez chyby", "✅ Bez chyby", "✅ Spotless"))
      : translate(localized(`Nájdené ${g.found}, prehliadnuté ${g.missed}, falošný poplach ${g.falseAlarm}`, `Nalezeno ${g.found}, přehlédnuto ${g.missed}, planý poplach ${g.falseAlarm}`, `Found ${g.found}, missed ${g.missed}, false alarms ${g.falseAlarm}`))}</b></div>`;
    await Brain.waitNext(byId("after"));
  }
  const pct = Math.round(tot.right / (SHEETS * ROWS) * 100);
  Brain.result(ui.main, {
    key: "kontrolor." + diff.value, score: pct, fmt: x => x + " %",
    label: localized("Správne posúdené riadky", "Správně posouzené řádky", "Rows judged correctly"),
    lines: [
      localized(`Nájdené chyby: ${tot.found}/${tot.errors}`, `Nalezené chyby: ${tot.found}/${tot.errors}`, `Mistakes found: ${tot.found}/${tot.errors}`),
      localized(`Falošné poplachy: ${tot.falseAlarm}`, `Plané poplachy: ${tot.falseAlarm}`, `False alarms: ${tot.falseAlarm}`),
      localized(`Čas: ${Brain.formatSeconds(Date.now() - t0)}`, `Čas: ${Brain.formatSeconds(Date.now() - t0)}`, `Time: ${Brain.formatSeconds(Date.now() - t0)}`),
      tot.missed > tot.falseAlarm
        ? localized("Viac chýb ti ušlo, než si videl navyše – skús každý riadok naozaj prepočítať, nie len „preletieť“.", "Víc chyb ti uteklo, než jsi viděl navíc – zkus každý řádek opravdu přepočítat, ne jen „přeletět“.", "You missed more than you over-flagged – actually recompute each row instead of skimming.")
        : localized("Dobrá rovnováha – kontroluješ, nie hádaš.", "Dobrá rovnováha – kontroluješ, nehádáš.", "Good balance – you're checking, not guessing."),
    ],
    onAgain: play,
  });
}

showIntro();
