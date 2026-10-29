// Schulteho tabuľka – nájdi čísla 1 … N² po poradí čo najrýchlejšie.
// Pohľad drž v strede tabuľky a čísla hľadaj periférnym videním.
const localized = Brain.localized;
const byId = id => document.getElementById(id);

const ui = Brain.page({
  key: "schulte",
  title: { sk: "👁️ Schulteho tabuľka", cs: "👁️ Schulteho tabulka", en: "👁️ Schulte table" },
  footer: { sk: "Oči drž na strednej bodke. ·", cs: "Oči drž na prostřední tečce. ·", en: "Keep your eyes on the centre dot. ·" },
});
// predvolená 5×5
if (Brain.loadPlayer("opt.schulte.size", null) === null) Brain.savePlayer("opt.schulte.size", 5);
const size = Brain.choice(ui.controls, {
  key: "schulte.size", label: { sk: "Veľkosť:", cs: "Velikost:", en: "Size:" }, onChange: showIntro,
  options: [3, 4, 5, 6].map(v => ({ v, label: `${v}×${v}` })),
});

function showIntro() {
  const s = size.value;
  Brain.intro(ui.main, {
    key: "schulte." + s, lower: true, fmt: Brain.formatSeconds,
    desc: localized(
      `Ťukaj čísla od 1 po ${s * s} po poradí. Pohľad drž na bodke v strede a čísla hľadaj „kútikom oka" – trénuje to pozornosť a periférne videnie. Rekord = najkratší čas.`,
      `Ťukej čísla od 1 do ${s * s} popořadě. Pohled drž na tečce uprostřed a čísla hledej „koutkem oka" – trénuje to pozornost a periferní vidění. Rekord = nejkratší čas.`,
      `Tap the numbers 1 to ${s * s} in order. Keep your gaze on the centre dot and find numbers "out of the corner of your eye" – it trains attention and peripheral vision. Best = fastest time.`),
    onStart: play,
  });
}

function play() {
  Brain.playing(true);
  const s = size.value, total = s * s;
  const nums = Brain.shuffle(Array.from({ length: total }, (_, i) => i + 1));
  let next = 1, errors = 0;
  ui.main.innerHTML = `
    <div class="statline"><span>${translate(localized("Hľadaj", "Hledej", "Find"))}: <b id="next">1</b></span><span>⏱ <b id="time">0,0 s</b></span></div>
    <div class="schulte" id="grid" style="grid-template-columns: repeat(${s}, 1fr)"></div>`;
  for (const v of nums) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sc";
    b.textContent = v;
    b.addEventListener("click", () => tap(b, v));
    byId("grid").appendChild(b);
  }
  const dot = document.createElement("i");
  dot.className = "dot";
  byId("grid").appendChild(dot);
  Brain.onKey(() => false);
  const stop = Brain.stopwatch(ms => { byId("time").textContent = Brain.formatSeconds(ms); });

  function tap(b, v) {
    if (v !== next) {
      errors++;
      b.classList.add("wrong");
      setTimeout(() => b.classList.remove("wrong"), 300);
      return;
    }
    b.classList.add("right");
    setTimeout(() => b.classList.remove("right"), 250);
    next++;
    if (next > total) return finish();
    byId("next").textContent = next;
  }
  function finish() {
    const ms = stop();
    Brain.result(ui.main, {
      key: "schulte." + s, score: ms, lower: true, fmt: Brain.formatSeconds,
      label: localized(`Čas ${s}×${s}`, `Čas ${s}×${s}`, `Time ${s}×${s}`),
      lines: [
        localized(`Chybné ťuknutia: ${errors}`, `Chybná ťuknutí: ${errors}`, `Wrong taps: ${errors}`),
        localized(`Priemerne ${Brain.formatSeconds(ms / total)} na číslo`, `Průměrně ${Brain.formatSeconds(ms / total)} na číslo`, `Average ${Brain.formatSeconds(ms / total)} per number`),
      ],
      onAgain: play,
    });
  }
}

showIntro();
