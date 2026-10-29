// Testovací harness: spustí hru v Node bez prehliadača.
// Hry sú obyčajné skripty s globálmi, takže ich načítame do vlastného vm kontextu
// spolu s minimálnym DOM-om (dom.mjs) a shared/ skriptmi.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { makeDocument } from "./dom.mjs";

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// `const X = ...` na najvyššej úrovni skriptu nie je viditeľné cez ctx.X,
// preto ho pre potreby testov prepíšeme na `var`. Deklarácie `function X()`
// sú v kontexte viditeľné samy od seba a musia ostať (hoisting – hra ich
// môže volať ešte pred definíciou, napr. bodky/game.js).
function toVar(src) {
  return src.replace(/^(?:const|let) (\w+)(?= *[=,;])/gm, "var $1");
}

// Zoznam <script src> a <link href> z index.html hry (bez ?v=hash).
export function scriptsOf(gameDir) {
  const html = read(path.join(gameDir, "index.html"));
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map(m => m[1].split("?")[0])
    // relatívne k priečinku hry (funguje aj pre vnorené, napr. dospeli/rychle → ../../shared/)
    .map(src => path.posix.normalize(path.posix.join(gameDir, src)))
    // knižnice tretích strán (vendor/) potrebujú skutočný prehliadač – v testoch sa preskočia
    .filter(src => !src.startsWith("vendor/"));
}

/**
 * Načíta hru do vlastného kontextu.
 * @param {string} gameDir     priečinok hry, napr. "rychle"
 * @param {object} opts
 *   lang       – jazyk ("sk" | "cs" | "en"), default "sk"
 *   random     – funkcia namiesto Math.random (deterministické testy)
 *   store      – počiatočný obsah localStorage, napr. { "brain.user": JSON.stringify("Ema") }
 * @returns {object} kontext s globálmi hry (document, window, a všetky var/function)
 */
export function loadGame(gameDir, opts = {}) {
  const { lang = "sk", random = null, store: preset = {} } = opts;
  const doc = makeDocument(read(path.join(gameDir, "index.html")));
  const store = new Map([["lang", lang], ...Object.entries(preset)]);
  const ctx = {
    console,
    setTimeout, clearTimeout, setInterval, clearInterval, AbortController,
    Promise, Math: random ? Object.create(Math, { random: { value: random } }) : Math,
    JSON, Object, Array, String, Number, Set, Map, Date, RegExp, Error,
    document: doc,
    navigator: { language: lang },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
    },
    location: { reload() { ctx.__reloaded = true; }, hostname: "localhost", pathname: "/" },
    speechSynthesis: { getVoices: () => [], speak() {}, cancel() {}, onvoiceschanged: null },
    SpeechSynthesisUtterance: function () {},
    requestAnimationFrame: cb => setTimeout(cb, 0),
  };
  ctx.window = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);

  for (const src of scriptsOf(gameDir)) {
    const file = path.join(ROOT, src);
    if (!fs.existsSync(file)) throw new Error(`chýba skript ${src} (hra ${gameDir})`);
    vm.runInContext(toVar(fs.readFileSync(file, "utf8")), ctx, { filename: src });
  }
  return ctx;
}

// Deterministický generátor pseudonáhodných čísel (mulberry32).
export function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Zoznam všetkých hier (priečinky s index.html a game.js/maze.js).
export function allGames() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith(".") && !["shared", "test", "tools", "vendor"].includes(d.name))
    .map(d => d.name)
    .filter(n => fs.existsSync(path.join(ROOT, n, "index.html")))
    .sort();
}

export { read };
