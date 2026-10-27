// Lokalizácia: slovenčina, čeština, angličtina.
//
// Použitie v hrách:
//   t({ sk: "Ahoj", cs: "Ahoj", en: "Hi" })   – preloží podľa zvoleného jazyka
//   T("difficulty")                            – spoločný reťazec zo zoznamu UI nižšie
//
// Prepínač jazyka sa sám pridá do <header> (vpravo hore).
const I18N = (() => {
  const LANGS = { sk: "SK", cs: "CZ", en: "EN" };
  const KEY = "lang";

  function detect() {
    const saved = localStorage.getItem(KEY);
    if (LANGS[saved]) return saved;
    const nav = (navigator.language || "sk").toLowerCase();
    if (nav.startsWith("cs")) return "cs";
    if (nav.startsWith("en")) return "en";
    return "sk";
  }

  let lang = detect();
  document.documentElement.lang = lang;

  // Preloží objekt { sk, cs, en }. Obyčajný reťazec vráti nezmenený.
  function t(o) {
    if (o === null || o === undefined) return "";
    if (typeof o !== "object") return o;
    return o[lang] ?? o.sk ?? Object.values(o)[0];
  }

  function set(l) {
    if (!LANGS[l] || l === lang) return;
    localStorage.setItem(KEY, l);
    location.reload();
  }

  // Prepínač vpravo hore. Volá sa automaticky aj po vykreslení hlavičky.
  function attach() {
    const header = document.querySelector("header");
    if (!header || header.querySelector(".langsw")) return;
    const box = document.createElement("div");
    box.className = "langsw";
    for (const [code, label] of Object.entries(LANGS)) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.className = code === lang ? "active" : "";
      b.addEventListener("click", () => set(code));
      box.appendChild(b);
    }
    header.appendChild(box);
  }

  document.addEventListener("DOMContentLoaded", attach);

  return { get lang() { return lang; }, t, set, attach, LANGS };
})();

const t = I18N.t;

// Spoločné reťazce, ktoré používa viac hier.
const UI = {
  difficulty: { sk: "Obtiažnosť:", cs: "Obtížnost:", en: "Difficulty:" },
  speed: { sk: "Rýchlosť:", cs: "Rychlost:", en: "Speed:" },
  mode: { sk: "Režim:", cs: "Režim:", en: "Mode:" },
  backToGames: { sk: "← Hry", cs: "← Hry", en: "← Games" },
  backToHub: { sk: "← Rozcestník", cs: "← Rozcestník", en: "← Home" },
  correct: { sk: "✅ Správne!", cs: "✅ Správně!", en: "✅ Correct!" },
  tryAgain: { sk: "Skús ešte raz.", cs: "Zkus to znovu.", en: "Try again." },
  wellDone: { sk: "Výborne!", cs: "Výborně!", en: "Well done!" },
  done: { sk: "Hotovo!", cs: "Hotovo!", en: "Done!" },
  itIsA: { sk: "Je to", cs: "Je to", en: "It's a" },
  next: { sk: "Ďalej ▶", cs: "Další ▶", en: "Next ▶" },
  newGame: { sk: "Nové", cs: "Nová", en: "New" },
  nextPicture: { sk: "Ďalší obrázok", cs: "Další obrázek", en: "Next picture" },
  newPicture: { sk: "Nový obrázok", cs: "Nový obrázek", en: "New picture" },
  print: { sk: "🖨 Tlač", cs: "🖨 Tisk", en: "🖨 Print" },
  steps: { sk: "Kroky:", cs: "Kroky:", en: "Steps:" },
};

function T(k) { return t(UI[k]); }
