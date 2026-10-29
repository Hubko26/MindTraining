import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGame, seeded } from "./harness.mjs";

const GAMES = ["rychle", "retaz", "odhad", "ciel", "triky", "nasobilka", "percenta", "nback", "cisla", "schulte", "stroop", "kalkudoku", "sart", "kontrolor", "trening"];
const asUser = name => ({ "brain.user": JSON.stringify(name), "brain.users": JSON.stringify([name]) });
const load = (g, opts = {}) => loadGame(g, { random: seeded(1), store: asUser("Tester"), ...opts });

test("meno: bez mena sa otvorí povinný výber, s menom nie; meno sa uloží a zapamätá", () => {
  const ctx = load("rychle", { store: {} });
  const doc = ctx.document;
  assert.ok(doc.querySelector(".usergate"), "výber mena sa má otvoriť");
  assert.equal(doc.getElementById("userCancel"), null, "pri prvom výbere sa nedá zrušiť");
  doc.getElementById("userName").value = "   ";
  doc.getElementById("userOk").click();
  assert.equal(doc.getElementById("userErr").textContent, "Zadaj meno.");
  assert.ok(!ctx.__reloaded);
  doc.getElementById("userName").value = "  Ema   Nová ";
  doc.getElementById("userOk").click();
  assert.equal(ctx.Brain.user(), "Ema Nová");
  assert.deepEqual([...ctx.Brain.users()], ["Ema Nová"]);
  assert.ok(ctx.__reloaded, "po voľbe sa stránka načíta znova");

  const ok = load("rychle");
  assert.equal(ok.document.querySelector(".usergate"), null);
  assert.equal(ok.document.querySelector("header .userchip").textContent, "👤 Tester");
  // zmena hráča: známe mená na ťuknutie, dá sa zrušiť
  ok.document.querySelector("header .userchip").click();
  assert.ok(ok.document.querySelector(".usergate .known button[data-n=\"Tester\"]"));
  ok.document.getElementById("userCancel").click();
  assert.equal(ok.document.querySelector(".usergate"), null);
});

test("tabuľka najlepších: pre každého hráča len jeho najlepší výsledok, poradie, menej = lepšie", () => {
  const ctx = load("schulte");
  const B = ctx.Brain, doc = ctx.document;
  const play = (name, score, lower = false, key = "k") => { B.setUser(name); B.record(key, score, lower); };
  play("Ema", 10); play("Ema", 25); play("Ema", 12);
  play("Jano", 18); play("Jano", 30);
  play("Mia", 5);
  assert.deepEqual({ ...B.gload("lb.k", {}) }, { Ema: 25, Jano: 30, Mia: 5 });
  B.setUser("Ema");
  B.board("k");
  const rows = doc.querySelectorAll("#board .lb li");
  assert.deepEqual(rows.map(r => r.querySelector(".n").textContent), ["Jano", "Ema", "Mia"]);
  assert.ok(rows[1].classList.contains("me"), "aktuálny hráč je zvýraznený");
  // čas: menej je lepšie
  play("Ema", 30000, true, "t"); play("Ema", 25000, true, "t"); play("Jano", 27000, true, "t");
  assert.deepEqual({ ...B.gload("lb.t", {}) }, { Ema: 25000, Jano: 27000 });
  B.board("t", { lower: true, fmt: B.secs });
  assert.match(doc.querySelector("#board .lb li").textContent, /Ema.*25,0 s/);
  // osobné údaje sú oddelené
  B.setUser("Mia");
  assert.equal(B.best("k"), 5);
  B.setUser("Jano");
  assert.equal(B.best("k"), 30);
  // meno sa v tabuľke escapuje
  play("<b>x</b>", 99);
  B.board("k");
  assert.match(doc.getElementById("board").innerHTML, /&lt;b&gt;x&lt;\/b&gt;/);
});

test("tabuľka najlepších: zobrazí sa vedľa hry na úvode aj po výsledku, s aktuálnym režimom", () => {
  const ctx = load("rychle", { store: { ...asUser("Ema"), "brain.lb.rychle.mix": JSON.stringify({ Jano: 31, Ema: 22 }) } });
  const doc = ctx.document;
  const board = doc.getElementById("board");
  assert.match(board.querySelector("h3").textContent, /Najlepšie výkony/);
  assert.match(board.querySelector(".muted").textContent, /rýchlosť · Mix/);
  assert.deepEqual(board.querySelectorAll(".lb .n").map(x => x.textContent), ["Jano", "Ema"]);
  // iný režim = iná tabuľka
  doc.querySelectorAll(".seg button").find(b => b.dataset.v === "mul").click();
  assert.match(doc.querySelector("#board .muted").textContent, /×/);
  assert.match(doc.getElementById("board").textContent, /Zatiaľ nikto/);
});

test("tréning mysle: každá stránka sa načíta s nadpisom, prepínačom jazyka a odkazom späť", () => {
  for (const g of GAMES) {
    for (const lang of ["sk", "cs", "en"]) {
      const ctx = load(g, { lang });
      const doc = ctx.document;
      assert.ok(doc.querySelector("h1").textContent.length > 2, `${g}: nadpis`);
      assert.ok(doc.querySelector("header .langsw"), `${g}: prepínač jazyka`);
      assert.equal(doc.querySelector("footer a").getAttribute("href"), "../", `${g}: odkaz späť`);
      assert.ok(doc.body.classList.contains("brain"));
    }
  }
});

test("brain: numpad – číslice, ⌫, mínus, čiarka, OK; úvodné nuly", () => {
  const ctx = load("rychle");
  const host = ctx.document.createElement("div");
  ctx.document.body.appendChild(host);
  const inputs = [], submits = [];
  const pad = ctx.Brain.numpad(host, { neg: true, dec: true, onInput: v => inputs.push(v), onSubmit: v => submits.push(v) });
  // (selektor s "," testovací DOM nevie – hľadáme cez dataset)
  const key = k => host.querySelectorAll(".numpad button").find(b => b.dataset.k === k).click();
  key("OK");
  assert.equal(submits.length, 0, "prázdne OK nič neodošle");
  key("0"); key("4"); key("2");
  assert.equal(pad.text, "42", "úvodná nula zmizne");
  key("−"); key(","); key("5");
  assert.equal(pad.value, -42.5);
  assert.equal(host.querySelector("#numdisp").textContent, "−42,5");
  key("⌫");
  assert.equal(pad.value, -42);
  key("OK");
  assert.deepEqual(submits, [-42]);
  assert.equal(inputs[inputs.length - 1], -42);
  // fyzická klávesnica
  pad.clear();
  for (const k of ["7", "Backspace", "9", "Enter"]) ctx.document.dispatchEvent({ type: "keydown", key: k, preventDefault() {} });
  assert.deepEqual(submits, [-42, 9]);
  // raw = rad číslic s nulou na začiatku
  const raw = ctx.Brain.numpad(host, { raw: true });
  for (const k of ["0", "0", "7"]) host.querySelectorAll(`.numpad button[data-k="${k}"]`).at(-1).click();
  assert.equal(raw.text, "007");
});

test("brain: record – história, rekord (aj menej = lepšie), denný tréning", () => {
  const ctx = load("rychle");
  const B = ctx.Brain;
  assert.equal(B.best("x"), null);
  assert.equal(B.record("x", 10).isBest, true);
  assert.equal(B.record("x", 8).isBest, false);
  const r = B.record("x", 12);
  assert.equal(r.isBest, true);
  assert.equal(r.prev, 10);
  assert.equal(B.best("x"), 12);
  assert.deepEqual(B.history("x").map(h => h.s), [10, 8, 12]);
  B.record("t", 5000, true);
  assert.equal(B.record("t", 6000, true).isBest, false);
  assert.equal(B.record("t", 4000, true).isBest, true);
  assert.equal(B.load("days", {})[B.today()], 6);
  // denný plán: posledná hra zapíše splnený deň
  B.save("daily", { date: B.today(), games: ["rychle"], done: [] });
  assert.equal(B.dailyFinish(), null);
  assert.equal(B.load("dailyDone", {})[B.today()], true);
});

test("rýchle počty: príklady pre všetky operácie a úrovne sú správne a v rozsahu", () => {
  const ctx = load("rychle", { random: seeded(2) });
  for (const op of ["add", "sub", "mul", "div"]) {
    for (let lv = 1; lv <= 10; lv++) {
      for (let i = 0; i < 30; i++) {
        const q = ctx.gen(op, lv);
        const exp = { add: q.a + q.b, sub: q.a - q.b, mul: q.a * q.b, div: q.a / q.b }[op];
        assert.equal(q.ans, exp, `${op} L${lv}`);
        assert.ok(Number.isInteger(q.ans) && q.ans >= 0, `${op} L${lv}: ${q.ans}`);
        if (op === "add" || op === "sub") assert.ok(q.a <= ctx.ADD_MAX[lv - 1] && q.b <= ctx.ADD_MAX[lv - 1]);
      }
    }
  }
});

test("rýchle počty: hra – správna odpoveď sa prijme sama, po 60 s výsledok", async () => {
  const ctx = load("rychle", { random: seeded(3) });
  const doc = ctx.document;
  const realNow = Date.now;
  let now = realNow();
  ctx.Date = class extends Date { static now() { return now; } };
  doc.getElementById("startBtn").click();
  const q = () => doc.getElementById("q").textContent;
  const solve = () => {
    const [a, op, b] = q().replace(/\s(?=\d{3}\b)/g, "").split(" ");
    const x = Number(a), y = Number(b);
    return String({ "+": x + y, "−": x - y, "×": x * y, "÷": x / y }[op]);
  };
  for (let i = 0; i < 5; i++) {
    const before = q();
    for (const ch of solve()) doc.querySelectorAll('.numpad button[data-k="' + ch + '"]')[0].click();
    assert.notEqual(q(), before, "po správnej odpovedi príde nový príklad");
  }
  assert.equal(doc.getElementById("ok").textContent, "5");
  now += 61000;
  await new Promise(r => setTimeout(r, 150));
  assert.match(doc.querySelector(".res-label").textContent, /Správnych/);
  assert.equal(doc.querySelector(".result .big").textContent, "5");
  assert.equal(ctx.Brain.best("rychle.mix"), 5);
});

test("rýchle počty – presnosť: potvrdzuje sa OK, prvá chyba končí, rekord = séria", async () => {
  const ctx = load("rychle", { random: seeded(13) });
  const doc = ctx.document;
  doc.querySelectorAll(".seg button").find(b => b.dataset.v === "acc").click();
  assert.match(doc.querySelector(".desc").textContent, /Prvá chyba hru končí/);
  doc.getElementById("startBtn").click();
  const key = k => doc.querySelectorAll(".numpad button").find(b => b.dataset.k === k).click();
  const ans = () => {
    const [a, op, b] = doc.getElementById("q").textContent.split(" ").map(x => (/^\d+$/.test(x) ? Number(x) : x));
    return { "+": a + b, "−": a - b, "×": a * b, "÷": a / b }[op];
  };
  for (let i = 0; i < 4; i++) {
    const before = doc.getElementById("q").textContent;
    for (const ch of String(ans())) key(ch);
    assert.equal(doc.getElementById("q").textContent, before, "bez OK sa správna odpoveď neprijme");
    key("OK");
  }
  assert.equal(doc.getElementById("ok").textContent, "4");
  for (const ch of String(ans() + 1)) key(ch);
  key("OK");
  await new Promise(r => setTimeout(r, 1700));
  assert.equal(doc.querySelector(".result .big").textContent, "4");
  assert.equal(ctx.Brain.best("rychle.acc.mix"), 4);
  assert.equal(ctx.Brain.best("rychle.mix"), null, "rekord rýchlosti sa nemení");
});

test("SART: trojka ~11 %, vyhodnotenie chýb, vyvážená presnosť a zrýchlenie pred chybou", () => {
  const ctx = load("sart", { random: seeded(14) });
  for (const len of [90, 225]) {
    const seq = ctx.makeSeq(len);
    assert.equal(seq.length, len);
    assert.equal(seq.filter(d => d === 3).length, len / 9 | 0);
    assert.ok(seq.every(d => d >= 1 && d <= 9));
  }
  const tr = (d, pressed, rt = 400) => ({ d, pressed, rt: pressed ? rt : null });
  // nikdy nestlačiť = 50, stále stláčať = 50, perfektne = 100
  const seq = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  assert.equal(ctx.evaluate(seq.map(d => tr(d, false))).score, 50);
  assert.equal(ctx.evaluate(seq.map(d => tr(d, true))).score, 50);
  assert.equal(ctx.evaluate(seq.map(d => tr(d, d !== 3))).score, 100);
  const r = ctx.evaluate([tr(1, true, 500), tr(2, true, 500), tr(4, true, 250), tr(5, true, 250), tr(3, true, 200), tr(6, false), tr(3, false)]);
  assert.equal(r.commissions, 1);
  assert.equal(r.omissions, 1);
  assert.equal(r.nogo, 2);
  assert.equal(r.mean, 375);
  assert.equal(r.preErr, 375, "4 stlačenia pred chybou");
});

test("kontrolór: chybné riadky sú naozaj zle, ostatné dobre; hodnotenie", () => {
  const ctx = load("kontrolor", { random: seeded(15) });
  for (const [name, fn] of Object.entries(ctx.MAKE)) {
    for (let i = 0; i < 30; i++) {
      const [q, ans] = fn();
      const expr = q.replace(/\s/g, "").replace(/×/g, "*").replace(/−/g, "-").replace(/÷/g, "/");
      assert.equal(eval(expr), ans, `${name}: ${q}`);
      const bad = ctx.corrupt(ans);
      assert.ok(bad > 0 && bad !== ans && Number.isInteger(bad), `${name}: ${ans} → ${bad}`);
    }
  }
  const counts = new Set();
  for (const kinds of Object.values(ctx.DIFF)) {
    for (let i = 0; i < 40; i++) {
      const rows = ctx.makeSheet(kinds);
      assert.equal(rows.length, ctx.ROWS);
      for (const r of rows) assert.equal(r.shown !== r.ans, r.wrong);
      counts.add(rows.filter(r => r.wrong).length);
    }
  }
  assert.deepEqual([...counts].sort(), [0, 1, 2, 3, 4], "počet chýb na hárku je 0 až 4");
  const rows = [{ wrong: true }, { wrong: true }, { wrong: false }, { wrong: false }];
  assert.deepEqual({ ...ctx.grade(rows, new Set([0, 2])) }, { found: 1, missed: 1, falseAlarm: 1, right: 2 });
});

test("reťazové počty: medzivýsledky v rozsahu, delenie bezo zvyšku, výsledok sedí", () => {
  const ctx = load("retaz", { random: seeded(4) });
  for (const d of Object.values(ctx.DIFF)) {
    for (let i = 0; i < 200; i++) {
      const len = 3 + (i % 12);
      const c = ctx.chain(len, d);
      assert.equal(c.steps.length, len);
      let v = c.start;
      for (const s of c.steps) {
        v = { "+": v + s.n, "−": v - s.n, "×": v * s.n, "÷": v / s.n }[s.op];
        assert.equal(v, s.v);
        assert.ok(Number.isInteger(v) && v >= 1 && v <= d.max, `medzivýsledok ${v} mimo 1..${d.max}`);
      }
      assert.equal(v, c.ans);
    }
  }
});

test("odhad: úlohy majú kladný výsledok, bodovanie podľa odchýlky", () => {
  const ctx = load("odhad", { random: seeded(5) });
  for (const [name, fn] of Object.entries(ctx.TYPES)) {
    for (let i = 0; i < 30; i++) {
      const q = fn();
      assert.ok(q.ans > 0 && Number.isFinite(q.ans), name);
      assert.ok(q.q.length > 0);
    }
  }
  assert.equal(ctx.points(100, 100), 10);
  assert.equal(ctx.points(102, 100), 8);
  assert.equal(ctx.points(95, 100), 6);
  assert.equal(ctx.points(91, 100), 4);
  assert.equal(ctx.points(120, 100), 2);
  assert.equal(ctx.points(130, 100), 0);
  assert.equal(ctx.points(null, 100), 0);
});

test("dosiahni cieľ: zadanie je riešiteľné z daných čísel a v rozsahu úrovne", () => {
  const ctx = load("ciel", { random: seeded(6) });
  for (const [lv, cfg] of Object.entries(ctx.LEVELS)) {
    for (let i = 0; i < 40; i++) {
      const pz = ctx.makePuzzle(cfg);
      assert.equal(pz.nums.length, cfg.small + cfg.large);
      assert.ok(pz.target >= cfg.min && pz.target <= cfg.max, `${lv}: cieľ ${pz.target}`);
      // prehraj riešenie: každý krok používa dostupné čísla
      const pool = pz.nums.slice();
      let last = null;
      for (const s of pz.steps) {
        const [, a, op, b, r] = /^(\d+) (\S) (\d+) = (\d+)$/.exec(s).map((x, j) => (j === 2 ? x : Number(x)));
        for (const x of [a, b]) {
          const k = pool.indexOf(x);
          assert.ok(k >= 0, `${s}: číslo ${x} nie je k dispozícii`);
          pool.splice(k, 1);
        }
        assert.equal(ctx.apply(a, op, b), r);
        pool.push(r);
        last = r;
      }
      assert.equal(last, pz.target);
    }
  }
  assert.equal(ctx.apply(3, "−", 5), null);
  assert.equal(ctx.apply(7, "÷", 2), null);
  assert.deepEqual([0, 3, 5, 10, 11].map(ctx.scoreFor), [10, 7, 7, 5, 0]);
});

test("triky z hlavy: každý trik dáva správny výsledok aj nápovedu s výsledkom", () => {
  const ctx = load("triky", { random: seeded(7) });
  for (const tr of ctx.TRICKS) {
    for (let i = 0; i < 40; i++) {
      const q = tr.gen();
      const expr = q.q.replace("²", "**2").replace(/ z /, "/100*").replace(/%/, "").replace(/×/g, "*").replace(/−/g, "-").replace(/\s/g, "");
      assert.equal(q.ans, eval(expr), `${tr.id}: ${q.q}`);
      assert.ok(String(q.hint).replace(/\s/g, "").includes(String(q.ans)), `${tr.id}: nápoveda ${q.hint} neobsahuje ${q.ans}`);
    }
    for (const l of ["sk", "cs", "en"]) assert.ok(tr.lesson[l].length > 40 && tr.name[l], `${tr.id}.${l}`);
  }
});

test("násobilka: fakty, Leitnerove krabičky, vážený výber preferuje neznáme", () => {
  const ctx = load("nasobilka", { random: seeded(8) });
  assert.equal(ctx.facts(10).length, 45);
  assert.equal(ctx.facts(20).length, 190);
  assert.equal(ctx.nextBox(3, false, 1000), 1);
  assert.equal(ctx.nextBox(3, true, 1000), 4);
  assert.equal(ctx.nextBox(5, true, 1000), 5);
  assert.equal(ctx.nextBox(3, true, 9000), 3);
  assert.equal(ctx.nextBox(undefined, true, 1000), 2);
  const list = ["2x2", "2x3"], boxes = { "2x2": 1, "2x3": 5 };
  let hard = 0;
  for (let i = 0; i < 400; i++) if (ctx.chooseFact(list, boxes, null) === "2x2") hard++;
  assert.ok(hard > 330, `krabička 1 má byť ~16× častejšie (${hard}/400)`);
  assert.equal(ctx.chooseFact(list, boxes, "2x2"), "2x3", "predchádzajúci sa neopakuje");
});

test("percentá: všetky typy úloh majú konzistentný výsledok", () => {
  const ctx = load("percenta", { random: seeded(9) });
  for (const [name, fn] of Object.entries(ctx.GEN)) {
    for (let i = 0; i < 50; i++) {
      const q = fn();
      assert.ok(Number.isFinite(q.ans), name);
      if (!q.tol) assert.ok(Number.isInteger(q.ans), `${name}: ${q.ans} nie je celé`);
      for (const l of ["sk", "cs", "en"]) assert.ok(q.q[l].length > 10);
      assert.ok(ctx.correct(q, q.ans));
      assert.ok(!ctx.correct(q, q.ans + 2));
    }
  }
});

test("n-back: postupnosť má zhody len tam, kde majú byť, a ~30 %", () => {
  const ctx = load("nback", { random: seeded(10) });
  let matches = 0, total = 0;
  for (let k = 0; k < 30; k++) {
    const nb = 1 + (k % 4), seq = ctx.makeSeq(nb, 40, true);
    assert.equal(seq.length, 40);
    for (let i = nb; i < seq.length; i++) { total++; if (seq[i].pos === seq[i - nb].pos) matches++; }
    assert.ok(seq.every(s => s.pos >= 0 && s.pos <= 8 && ctx.LETTERS.includes(s.letter)));
  }
  const p = matches / total;
  assert.ok(p > 0.22 && p < 0.38, `podiel zhôd ${p}`);
  assert.equal(ctx.accuracy({ hit: 8, miss: 1, fa: 1 }), 0.8);
  assert.equal(ctx.accuracy({ hit: 0, miss: 0, fa: 0 }), 1);
});

test("pamäť čísel: bez dvoch rovnakých za sebou, odzadu = obrátene", () => {
  const ctx = load("cisla", { random: seeded(11) });
  for (let len = 2; len < 12; len++) {
    const d = ctx.digitsOf(len);
    assert.equal(d.length, len);
    for (let i = 1; i < len; i++) assert.notEqual(d[i], d[i - 1]);
  }
  assert.equal(ctx.expected([1, 2, 3], "fwd"), "123");
  assert.equal(ctx.expected([1, 2, 3], "bwd"), "321");
});

test("kalkudoku: riešenie je latinský štvorec, sedí na klietky a väčšinou je jediné", () => {
  const ctx = load("kalkudoku", { random: seeded(12) });
  let unique = 0;
  for (const n of [4, 5, 6]) {
    for (let k = 0; k < 4; k++) {
      const pz = ctx.generate(n);
      assert.ok(ctx.solved(pz, pz.sol), `${n}×${n}: riešenie nesedí`);
      const cells = pz.cages.flatMap(c => c.cells);
      assert.equal(cells.length, n * n, "klietky pokrývajú celú mriežku");
      assert.equal(new Set(cells.map(([r, c]) => r * n + c)).size, n * n);
      if (ctx.countSolutions(pz) === 1) unique++;
      // pokazená mriežka neprejde
      const bad = pz.sol.map(r => r.slice());
      [bad[0][0], bad[0][1]] = [bad[0][1], bad[0][0]];
      assert.equal(ctx.solved(pz, bad), false);
    }
  }
  assert.ok(unique >= 10, `jediné riešenie len v ${unique}/12`);
});

test("denný tréning: plán je deterministický, jedna hra z každej skupiny", () => {
  const ctx = load("trening");
  for (const date of ["2026-10-27", "2026-10-28", "2027-01-01"]) {
    const p = ctx.planFor(date);
    assert.deepEqual(p, ctx.planFor(date));
    assert.equal(p.length, 3);
    p.forEach((g, i) => assert.ok(ctx.GROUPS[i].includes(g)));
  }
  const plans = new Set(Array.from({ length: 30 }, (_, i) => ctx.planFor(`2026-11-${String(i + 1).padStart(2, "0")}`).join()));
  assert.ok(plans.size > 5, "plány sa majú meniť");
  // stránka vytvorí dnešný plán s odkazmi ?daily
  const links = ctx.document.querySelectorAll(".plan a");
  assert.equal(links.length, 3);
  assert.ok(links.every(a => /^\.\.\/\w+\/\?daily$/.test(a.getAttribute("href"))));
  const d = new Date(2026, 9, 27);
  assert.equal(ctx.streak({ "2026-10-27": true, "2026-10-26": true, "2026-10-24": true }, d), 2);
  assert.equal(ctx.streak({ "2026-10-26": true, "2026-10-25": true }, d), 2, "dnešok ešte nie je hotový");
  assert.equal(ctx.streak({}, d), 0);
});

// Falošný Firestore: runQuery (filter g == kľúč) a PATCH dokumentu v kolekcii scores.
function fakeFirestore() {
  const docs = new Map();
  const log = [];
  const fetch = async (url, { method, body }) => {
    log.push(`${method} ${url.split("?")[0].split("/").pop()}`);
    // :commit = heslo do admin/del + zmazania; pravidlá: zmazať len so správnym heslom
    if (url.includes(":commit")) {
      const [admin, ...dels] = JSON.parse(body).writes;
      assert.match(admin.update.name, /^projects\/p\/databases\/\(default\)\/documents\/admin\/del$/);
      assert.equal(admin.updateTransforms[0].setToServerValue, "REQUEST_TIME");
      if (admin.update.fields.p.stringValue !== "test-heslo")
        return { ok: false, status: 403, json: async () => ({ error: { message: "Missing or insufficient permissions.", status: "PERMISSION_DENIED" } }) };
      for (const d of dels) docs.delete(d.delete.split("/scores/")[1]);
      return { ok: true, json: async () => ({}) };
    }
    const req = JSON.parse(body);
    if (url.includes(":runQuery")) {
      const g = req.structuredQuery.where.fieldFilter.value.stringValue;
      const rows = [...docs.entries()].filter(([, d]) => d.fields.g.stringValue === g)
        .map(([id, d]) => ({ document: { name: "projects/p/databases/(default)/documents/scores/" + id, fields: d.fields } }));
      return { ok: true, json: async () => (rows.length ? rows : [{ readTime: "x" }]) };
    }
    assert.equal(method, "PATCH");
    const id = decodeURIComponent(url.split("/scores/")[1].split("?")[0]);
    docs.set(id, { fields: req.fields });
    return { ok: true, json: async () => ({}) };
  };
  return { docs, fetch, log };
}
const settle = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };

test("spoločná tabuľka: výsledky z dvoch zariadení sa spoja cez Firestore", async () => {
  const fs = fakeFirestore();
  const device = (name, store = {}) => {
    const ctx = load("schulte", { store: { ...asUser(name), ...store } });
    ctx.fetch = fs.fetch;
    Object.assign(ctx.Brain.cloud, { projectId: "p", apiKey: "k" });
    return ctx;
  };
  // Ema má starší rekord len v prehliadači – po zapnutí sa nahrá
  const ema = device("Ema", { "brain.lb.k": JSON.stringify({ Ema: 20 }) });
  const jano = device("Jano");
  jano.Brain.record("k", 30);
  jano.Brain.board("k");
  assert.match(jano.document.getElementById("board").textContent, /Načítavam/);
  await settle(); await settle();
  ema.Brain.board("k");
  await settle(); await settle();
  const names = ctx => ctx.document.querySelectorAll("#board .lb .n").map(x => x.textContent);
  assert.deepEqual(names(ema), ["Jano", "Ema"]);
  assert.match(ema.document.getElementById("board").textContent, /Spoločná tabuľka/);
  // horší výsledok sa nenahrá, lepší áno
  ema.Brain.record("k", 10);
  ema.Brain.record("k", 40);
  ema.Brain.board("k");
  await settle(); await settle();
  jano.Brain.board("k");
  await settle(); await settle();
  assert.deepEqual(names(jano), ["Ema", "Jano"]);
  assert.equal(fs.docs.size, 2);
  assert.equal(fs.docs.get("k%7CEma").fields.s.integerValue, "40");
});

test("spoločná tabuľka: bez spojenia ukáže lokálne výsledky", async () => {
  const ctx = load("schulte", { store: { ...asUser("Ema"), "brain.lb.k": JSON.stringify({ Ema: 7 }) } });
  ctx.fetch = async () => { throw new Error("offline"); };
  Object.assign(ctx.Brain.cloud, { projectId: "p", apiKey: "k" });
  ctx.Brain.board("k");
  await settle(); await settle();
  const board = ctx.document.getElementById("board");
  assert.match(board.textContent, /Bez spojenia/);
  assert.deepEqual(board.querySelectorAll(".lb .n").map(x => x.textContent), ["Ema"]);
});

test("tlačidlo späť v hlavičke: na zoznam hier, v dennom tréningu na tréning", () => {
  const ctx = load("nasobilka");
  const b = ctx.document.getElementById("backBtn");
  assert.equal(b.getAttribute("href"), "../");
  assert.match(b.textContent, /Hry/);
});

test("spoločná tabuľka: správca (Hubko) maže riadky heslom, zmazané sa nevrátia", async () => {
  const fs = fakeFirestore();
  const device = (name, store = {}) => {
    const ctx = load("schulte", { store: { ...asUser(name), ...store } });
    ctx.fetch = fs.fetch;
    ctx.confirm = () => true;
    Object.assign(ctx.Brain.cloud, { projectId: "p", apiKey: "k", admin: "Hubko" });
    return ctx;
  };
  const names = ctx => ctx.document.querySelectorAll("#board .lb .n").map(x => x.textContent);
  const jano = device("Jano");
  jano.Brain.record("k", 30); jano.Brain.board("k"); await settle();
  // bežný hráč tlačidlá na mazanie nemá
  assert.equal(jano.document.querySelectorAll("#board .del").length, 0);
  // Hubko má starý vývojový rekord len v prehliadači – nahrá sa
  const hub = device("Hubko", { "brain.lb.k": JSON.stringify({ Hubko: 99 }), "brain.u.Hubko.best.k": "99" });
  hub.Brain.board("k"); await settle();
  assert.deepEqual(names(hub), ["Hubko", "Jano"]);
  const doc = hub.document, delBtn = n => doc.querySelectorAll("#board .del").find(b => b.dataset.n === n);
  // zlé heslo → chyba, zrušenie → nič sa nezmaže
  delBtn("Hubko").click(); await settle();
  doc.getElementById("adminPass").value = "zle";
  doc.getElementById("adminOk").click(); await settle();
  assert.equal(doc.getElementById("adminErr").textContent, "Nesprávne heslo.");
  doc.getElementById("adminCancel").click(); await settle();
  assert.equal(fs.docs.size, 2);
  assert.equal(hub.Brain.gload("adminPass", ""), "");
  // správne heslo → riadok zmizne zo servera aj z prehliadača
  delBtn("Hubko").click(); await settle();
  doc.getElementById("adminPass").value = "test-heslo";
  doc.getElementById("adminOk").click(); await settle();
  assert.equal(doc.querySelector(".usergate"), null);
  assert.deepEqual([...fs.docs.keys()], ["k%7CJano"]);
  assert.deepEqual(names(hub), ["Jano"]);
  assert.equal(hub.Brain.best("k"), null);
  assert.deepEqual({ ...hub.Brain.gload("lb.k", {}) }, {});
  // druhé mazanie už heslo nepýta; Jano svoj zmazaný výsledok znova nenahrá
  delBtn("Jano").click(); await settle();
  assert.equal(doc.querySelector(".usergate"), null);
  assert.equal(fs.docs.size, 0);
  jano.Brain.board("k"); await settle();
  assert.equal(fs.docs.size, 0);
  assert.deepEqual(names(jano), []);
  // nový výsledok sa normálne nahrá
  jano.Brain.record("k", 12); jano.Brain.board("k"); await settle();
  assert.deepEqual(names(jano), ["Jano"]);
  assert.equal(fs.docs.get("k%7CJano").fields.s.integerValue, "12");
});

test("násobilka: tabuľka podľa správnych, pri zhode podľa času; staré výsledky sa prevedú", () => {
  const ctx = load("nasobilka", { store: {
    ...asUser("Ema"),
    "brain.u.Ema.best.nasobilka.10": "20",
    "brain.u.Ema.h.nasobilka.10": JSON.stringify([{ d: "2026-10-28", s: 18 }, { d: "2026-10-28", s: 20 }]),
    "brain.lb.nasobilka.10": JSON.stringify({ Ema: 20 }),
  } });
  const { encode, decode, fmtScore, Brain: B } = ctx;
  // viac správnych vyhráva aj s horším časom, pri zhode rozhoduje kratší čas
  assert.ok(encode(19, 300000) > encode(18, 20000));
  assert.ok(encode(18, 40000) > encode(18, 41000));
  assert.deepEqual({ ...decode(encode(17, 52340)) }, { ok: 17, ms: 52300 });
  assert.equal(fmtScore(encode(17, 52340)), "17/20 · 52,3 s");
  // starý formát (len počet správnych) – čas neznámy, horší než akýkoľvek nameraný
  assert.equal(B.best("nasobilka.10"), encode(20, 1e9) - 1);
  assert.equal(fmtScore(B.best("nasobilka.10")), "20/20 · –");
  assert.ok(encode(20, 600000) > B.best("nasobilka.10"));
  assert.ok(encode(19, 1000) < B.best("nasobilka.10"));
  assert.deepEqual(B.history("nasobilka.10").map(h => decode(h.s).ok), [18, 20]);
  // prevedený rekord zariadenia čaká na odoslanie na server
  assert.equal(B.gload("lb.nasobilka.10", {}).Ema, B.best("nasobilka.10"));
  assert.equal(B.gload("lbq", {})["nasobilka.10"].Ema, B.best("nasobilka.10"));
  B.setUser("Jano"); B.record("nasobilka.10", encode(18, 30000));
  B.setUser("Mia"); B.record("nasobilka.10", encode(18, 25000));
  B.setUser("Ema"); B.record("nasobilka.10", encode(20, 61000));
  B.board("nasobilka.10", { fmt: fmtScore });
  const rows = ctx.document.querySelectorAll("#board .lb li").map(li => li.querySelector(".n").textContent + " " + li.querySelector("b").textContent);
  assert.deepEqual(rows, ["Ema 20/20 · 61,0 s", "Mia 18/20 · 25,0 s", "Jano 18/20 · 30,0 s"]);
});

test("spoločná tabuľka: všetky tabuľky naraz pre úvodnú stránku", async () => {
  const fs = fakeFirestore();
  const ctx = load("schulte", { store: {
    ...asUser("Ema"),
    "brain.lb.a": JSON.stringify({ Ema: 5, Stary: 99 }),   // a je zosynchronizovaná – Stary bol zmazaný
    "brain.lb.b": JSON.stringify({ Ema: 7 }),              // b ešte nie – lokálny rekord sa ukáže
    "brain.lbsynced": JSON.stringify(["a"]),
    "brain.lbq": JSON.stringify({ a: { Ema: 6 } }),
  } });
  ctx.fetch = fs.fetch;
  Object.assign(ctx.Brain.cloud, { projectId: "p", apiKey: "k" });
  const put = (g, n, s) => fs.docs.set(encodeURIComponent(g + "|" + n), { fields: { g: { stringValue: g }, n: { stringValue: n }, s: { integerValue: String(s) } } });
  put("a", "Ema", 5); put("a", "Jano", 8); put("b", "Jano", 3); put("c", "Jano", 1);
  // runQuery vo falošnom serveri filtruje podľa g – pre dotaz bez filtra vráti všetko
  const orig = fs.fetch;
  ctx.fetch = async (url, o) => {
    const body = o.body && JSON.parse(o.body);
    if (url.includes(":runQuery") && !body.structuredQuery.where)
      return { ok: true, json: async () => [...fs.docs.values()].map(d => ({ document: { name: "x/scores/y", fields: d.fields } })) };
    return orig(url, o);
  };
  const on = await ctx.Brain.allBoards({ a: false, b: false });
  assert.deepEqual(JSON.parse(JSON.stringify(on)), { a: { Ema: 6, Jano: 8 }, b: { Ema: 7, Jano: 3 } });
  const off = await ctx.Brain.allBoards({ a: false, b: false }, { online: false });
  assert.deepEqual(JSON.parse(JSON.stringify(off)), { a: { Ema: 6, Stary: 99 }, b: { Ema: 7 } });
});
