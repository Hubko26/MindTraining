# MindTraining – Tréning mysle

Krátke hry pre dospelých na počty z hlavy, presnosť, pamäť a pozornosť.
Čisté HTML/CSS/JavaScript bez frameworkov a bez build kroku – beží priamo z GitHub Pages.
Slovensky, česky a anglicky (prepínač vpravo hore).

## Spustenie

Otvor `index.html`, alebo spusti lokálny server:

```bash
python -m http.server 5180
```

a otvor http://localhost:5180

## Hráči a tabuľka najlepších

- Pri prvom otvorení je povinné zadať **meno**. Na tom istom zariadení sa dá prepínať medzi hráčmi
  (tlačidlo 👤 v hlavičke).
- Vedľa každej hry (na mobile pod ňou) je **tabuľka najlepších výkonov** pre aktuálne nastavenie hry.
  Každý hráč je v nej len raz – so svojím najlepším výsledkom.
- Všetko sa ukladá do `localStorage` prehliadača, takže tabuľka spája hráčov **na jednom zariadení**:
  - `brain.user`, `brain.users` – aktuálny hráč a zoznam mien,
  - `brain.u.<meno>.*` – história, rekordy, nastavenia a denný tréning hráča,
  - `brain.lb.<kľúč>` – tabuľka najlepších `{ meno: výsledok }`.

## Hry

| Hra | Priečinok | Popis |
|---|---|---|
| 🔥 Denný tréning | `trening/` | 3 hry denne (počty, pamäť, pozornosť) podľa dátumu, séria dní, kalendár |
| ⚡ Rýchle počty | `rychle/` | 60 s, +−×÷, adaptívna úroveň 1–10 pre každú operáciu; režim Presnosť = bez času, OK, prvá chyba končí |
| 🔗 Reťazové počty | `retaz/` | Operácie sa ukazujú postupne, zadáš len výsledok; dĺžka 3–15 sa prispôsobuje |
| 🎯 Odhad | `odhad/` | 10 úloh po 10 s, body podľa odchýlky (súčiny, √, %, kurz, súčet cien) |
| 🏁 Dosiahni cieľ | `ciel/` | Z čísel a +−×÷ poskladaj cieľ; zadanie je vždy riešiteľné |
| 🪄 Triky z hlavy | `triky/` | 10 trikov (×11, ×5, ×25, …5², blízko 100…), lekcia + 10 príkladov s nápovedou |
| ✖️ Násobilka do 20 | `nasobilka/` | Leitnerove krabičky, mapa zvládnutých príkladov |
| ％ Percentá a úroky | `percenta/` | Zľava, DPH, zmena v %, spätná cena, pravidlo 72, zložené úročenie |
| 🛑 Nestlač trojku | `sart/` | SART: chyby z autopilota, rozptyl reakcií, zrýchlenie pred chybou |
| 🔍 Kontrolór | `kontrolor/` | Hárky výpočtov s 0–4 typickými chybami – nájdi ich |
| 🔲 N-back | `nback/` | Pozícia (+ písmeno), adaptívne N |
| 🔢 Pamäť čísel | `cisla/` | Digit span dopredu / odzadu |
| 👁️ Schulteho tabuľka | `schulte/` | 3×3 až 6×6, rekord = čas |
| 🎨 Stroop | `stroop/` | Farba písma / prepínanie úloh, meria Stroopov efekt |
| 🧮 Kalkudoku | `kalkudoku/` | 4×4 až 6×6, generátor overuje jediné riešenie, poznámky |

## Štruktúra

```
index.html            úvodná stránka
shared/
  brain.js            kostra hier: meno hráča, nastavenia, úvod/výsledok, tabuľka najlepších,
                      číselná klávesnica, časovač, denný tréning
  brain.css, common.css
  i18n.js             lokalizácia SK/CZ/EN
<hra>/index.html, game.js, [style.css]
test/                 unit testy (node --test) s minimálnym DOM-om
tools/bump-version.py cache-busting ?v=<hash> pri skriptoch a štýloch
```

## Vývoj

```bash
npm test
python tools/bump-version.py
```

Po zmene JS/CSS spusti `bump-version.py`, aby prehliadače nebrali staré súbory z cache.
