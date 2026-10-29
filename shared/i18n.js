// Lokalizácia: slovenčina, čeština, angličtina.
//
// Použitie v hrách:
//   translate({ sk: "Ahoj", cs: "Ahoj", en: "Hi" })   – preloží podľa zvoleného jazyka
//   Brain.localized("Ahoj", "Ahoj", "Hi")             – skratka na vytvorenie takého objektu
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
  function translate(o) {
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

  return { get lang() { return lang; }, translate, set, attach, LANGS };
})();

const translate = I18N.translate;
