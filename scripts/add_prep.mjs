/**
 * Jednorázový skript: doplní pole `prep` (co si nachystat na další zónu) ke
 * každé zóně v js/zones.js. Krátká, holá instrukce bez omáčky. U pauz a zón,
 * co nic nevyžadují, je prep prázdný řetězec a UI pak píše "Teď není potřeba nic".
 */
import { readFileSync, writeFileSync } from "node:fs";

const PREP = {
  "kiribati-chatham": "Připrav si skleničku a najdi, kde je východ.",
  "tonga-nz": "Rozmysli si vibe: ticho jako v kostele, nebo ohňostroj naplno.",
  "sydney": "Nachystej si telefon nebo počítač na live stream.",
  "adelaide": "Měj po ruce deníček nebo poznámky v telefonu.",
  "brisbane": "Nalij si do skleničky, budou dva loky.",
  "darwin": "Vyber jeden song, co pustíš jako soundtrack noci.",
  "japonsko-eucla": "Najdi si klidný kout, kde tě pět minut nikdo nevyruší.",
  "filipiny": "Zkontroluj, jak nahlas si můžeš dovolit randál. Pak buď připravený skákat.",
  "thajsko": "Rozmysli si, komu dávno nenapsanému pošleš zprávu.",
  "myanmar": "Měj po ruce svíčku nebo appku se svíčkou.",
  "banglades-nepal-indie": "Napiš na papír jednu věc ze starého roku, co má skončit. Měj po ruce dřez nebo popelník.",
  "uzbekistan": "Nalij si do skleničky a buďte pohromadě.",
  "afghanistan": "",
  "azerbajdzan": "Připrav si svíčku na zem, budeš ji překračovat.",
  "iran": "",
  "rusko": "Nalij si do skleničky a buďte pohromadě na odpočet.",
  "recko": "Rozmysli si jedno trapné tajemství z letoška.",
  "cesko": "Nachystej jablko, nůž a skleničku. Buďte pohromadě.",
  "skotsko": "Najdi si Auld Lang Syne, ať ji máš připravenou.",
  "kapverdy": "Vyber svižnou písničku na třicet vteřin tance.",
  "brazilie": "Udělej si místo na sedm skoků.",
  "argentina": "Připrav si 12 hroznů (nebo 12 lupínků) a buďte pohromadě.",
  "newfoundland": "Sežeň rybu, konzervu, mraženou, nebo aspoň fotku ryby.",
  "venezuela": "Měj po ruce kufr nebo batoh.",
  "usa-newyork": "Najdi ponožku na vlastní ball drop.",
  "mexiko": "Nachystej si něco teplého k jídlu.",
  "usa-colorado": "Buď blízko umyvadla nebo studené vody.",
  "usa-pacifik": "Připrav se na studenou sprchu nebo ledovou vodu.",
  "aljaska-marquesas": "Nachystej deku a něco teplého k pití.",
  "havaj": "Vyber letní banger na šedesát vteřin tance.",
  "americka-samoa": "Nalij si poslední skleničku a vymysli jedno slovo za celou noc.",
};

const path = "/projects/sandbox/js/zones.js";
let src = readFileSync(path, "utf8");

// Pro každou zónu vlož `prep:` hned za řádek `celebrates: ...,` v jejím bloku.
// Zóny poznáme podle `id: "..."`. Projdeme bloky a doplníme.
for (const [id, prep] of Object.entries(PREP)) {
  const idMarker = `id: "${id}",`;
  const idPos = src.indexOf(idMarker);
  if (idPos === -1) {
    console.error("NENALEZENO id:", id);
    continue;
  }
  // najdi první "celebrates:" po tomto id
  const celPos = src.indexOf("celebrates:", idPos);
  if (celPos === -1) {
    console.error("NENALEZENO celebrates pro:", id);
    continue;
  }
  const lineEnd = src.indexOf("\n", celPos);
  const indentMatch = src.slice(0, celPos).match(/\n(\s*)$/);
  const indent = indentMatch ? indentMatch[1] : "    ";
  // escape uvozovek a zpětných lomítek v prep
  const safe = prep.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const insert = `\n${indent}prep: "${safe}",`;
  src = src.slice(0, lineEnd) + insert + src.slice(lineEnd);
}

// doplň i do hlavičkové dokumentace shape
src = src.replace(
  '*     challenge: string | null,   // instructions to the reader; null when the zone does not celebrate',
  '*     challenge: string | null,   // instructions to the reader; null when the zone does not celebrate\n *     prep: string,               // short "co si nachystat" note; "" means nothing needed'
);

writeFileSync(path, src, "utf8");
console.log("Hotovo, prep doplněno.");
