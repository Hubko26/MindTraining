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
- Osobné údaje sa ukladajú do `localStorage` prehliadača:
  - `brain.user`, `brain.users` – aktuálny hráč a zoznam mien,
  - `brain.u.<meno>.*` – história, rekordy, nastavenia a denný tréning hráča,
  - `brain.lb.<kľúč>` – najlepšie výsledky hráčov z tohto zariadenia `{ meno: výsledok }`.
- **Spoločná tabuľka** (viac zariadení) ide cez Firebase Firestore – stačí vyplniť `CLOUD`
  na začiatku `shared/brain.js`. Bez toho tabuľka ukazuje len hráčov z jedného zariadenia
  (pod tabuľkou je 📱 / 🌐). Hráči s rovnakým menom zdieľajú jeden riadok.

### Spoločná tabuľka – nastavenie Firebase

1. Na <https://console.firebase.google.com> vytvor projekt (Google Analytics netreba).
2. *Build → Firestore Database → Create database* (ľubovoľná lokalita, „production mode“).
3. V záložke *Rules* vlož pravidlá nižšie a daj *Publish*.
4. *Project settings → General → Your apps → Web (`</>`)* – zaregistruj appku a z `firebaseConfig`
   skopíruj `projectId` a `apiKey` do `CLOUD` v `shared/brain.js`. Tieto údaje sú verejné,
   prístup obmedzujú pravidlá.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    // heslo správcu: nedá sa čítať, zapísať len správne a s časom tejto požiadavky
    match /admin/{id} {
      allow read: if false;
      allow create, update: if id == 'del' && request.resource.data.keys().hasOnly(['p', 't'])
        && request.resource.data.p == 'HESLO' && request.resource.data.t == request.time;
    }
    match /scores/{id} {
      function valid() {
        let d = request.resource.data;
        return d.keys().hasOnly(['g', 'n', 's', 'lower', 't'])
          && d.g is string && d.g.size() <= 60
          && d.n is string && d.n.size() > 0 && d.n.size() <= 20
          && d.s is number && d.lower is bool;
      }
      allow read: if true;
      allow create: if valid();
      // prepísať sa dá len lepším výsledkom
      allow update: if valid() && request.resource.data.lower == resource.data.lower
        && (resource.data.lower ? request.resource.data.s < resource.data.s
                                : request.resource.data.s > resource.data.s);
      // mazať len v tej istej požiadavke, ktorá zapísala správne heslo do admin/del
      allow delete: if getAfter(/databases/$(db)/documents/admin/del).data.t == request.time;
    }
  }
}
```

### Mazanie riadkov (správca)

Hráčovi s menom `CLOUD.admin` (v `shared/brain.js`, teraz „Hubko“) sa pri každom riadku tabuľky
ukáže 🗑. Meno samo nič nechráni – mazanie povolia len pravidlá so správnym heslom.
Heslo je **len v pravidlách vo Firebase konzole** (namiesto `HESLO` vyššie), nie v kóde.

Aplikácia pošle jeden atomický zápis (`documents:commit`): heslo do dokumentu `admin/del`
s časom servera a zmazanie riadkov. Pravidlá pustia zmazanie, len keď sa v tej istej
požiadavke zapísalo správne heslo; `admin/del` sa čítať nedá. Pri prvom mazaní sa
aplikácia spýta na heslo a zapamätá si ho v prehliadači (`brain.adminPass`).

Zmazaný riadok zmizne zo servera aj z prehliadača, kde sa mazalo (rekord a história tej hry),
a zariadenia ho znova nenahrajú: staré lokálne rekordy sa posielajú len raz a nové výsledky
idú cez frontu `brain.lbq`.

Každý výsledok je dokument `scores/<hra|meno>` s poľami `g` (kľúč hry), `n` (meno), `s` (výsledok),
`lower` (menej = lepšie) a `t` (čas). Rekordy spred zapnutia spoločnej tabuľky sa pri prvom
zobrazení tabuľky danej hry nahrajú raz.

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
  brain.js            kostra hier: meno hráča, nastavenia, úvod/výsledok, tabuľka najlepších
                      (lokálna alebo spoločná cez Firestore),
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
