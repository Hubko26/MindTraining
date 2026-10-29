# Pravidlá pre prácu na MindTraining

## Clean code – vždy
- **Zrozumiteľné názvy.** Žiadne skratky a jednopísmenové názvy (`t`, `L`, `lb`, `q`, `fmt`, `r`, `d`…).
  Názov hovorí, čo vec je alebo robí: `translate`, `loadLocalBoard`, `uploadQueue`, `formatScore`.
  Výnimka: krátke indexy v cykle (`i`) a parametre triedenia `(a, b)`.
- **Identifikátory po anglicky, komentáre a texty v UI po slovensky** (ako zvyšok kódu).
- **Malé funkcie s jednou úlohou.** Keď funkcia robí viac vecí, rozdeľ ju a časti pomenuj.
- **Konštanty namiesto magických čísel a reťazcov** (`REQUEST_TIMEOUT_MS`, `STORAGE.uploadQueue`).
- **Žiadny mŕtvy kód.** Nepoužívané funkcie, parametre a zakomentovaný kód zmaž.
- **Komentár vysvetľuje prečo**, nie čo – to má povedať názov.
- **Hra nesiaha do vnútorností `shared/brain.js`** (kľúče localStorage, Firestore). Na to má Brain funkciu.

## Spoločné funkcie (`shared/`)
- `translate(text)` – text `{ sk, cs, en }` v zvolenom jazyku; `Brain.localized(sk, cs, en)` ho vytvorí.
- `byId(id)` – `document.getElementById`.
- `Brain.loadPlayer/savePlayer` – údaje aktuálneho hráča; `Brain.loadShared/saveShared` – údaje zariadenia.

## Pred commitom
- `npm test` a `node --check` všetkých skriptov.
- Otvor zmenené stránky v prehliadači (Playwright) a skontroluj chyby – unit testy menia `const` na `var`,
  takže neodhalia konflikt globálnych názvov medzi skriptmi.
- Po zmene JS/CSS `python tools/bump-version.py` (cache-busting).
- Do živej Firestore tabuľky pri testoch nezapisuj (zablokuj alebo simuluj `firestore.googleapis.com`).

## Bezpečnosť
- Heslo správcu je **len v pravidlách Firestore** v konzole. Nikdy ho nedávaj do kódu, testov ani README
  (repozitár je verejný) – v testoch použi vymyslené heslo.
