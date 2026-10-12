// Jednorázový generátor tvarů pevniny pro mapu (js/land.js).
// Zdroj: Natural Earth 1:110m přes balíček world-atlas (public domain).
// Použití: node scripts/build_land.mjs /cesta/k/node_modules
// Projekce je rovnoplochá jako v map.js: x = délka + 180, y = 90 minus šířka.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const nm = process.argv[2];
if (!nm) throw new Error("zadej cestu k node_modules s topojson-client a world-atlas");
const require = createRequire(join(nm, "..", "noop.js"));
const { feature } = require("topojson-client");
const topo = JSON.parse(readFileSync(join(nm, "world-atlas/land-110m.json"), "utf8"));
const land = feature(topo, topo.objects.land);

const r = (n) => Math.round(n * 10) / 10;
let d = "";
let rings = 0;

function addRing(ring) {
  let prevX = null;
  let first = true;
  for (const [lon, lat] of ring) {
    const x = r(lon + 180);
    const y = r(90 - lat);
    // skok přes datovou hranici = nový kus, ať se nekreslí čára přes celý svět
    if (prevX !== null && Math.abs(x - prevX) > 180) first = true;
    d += `${first ? "M" : "L"}${x} ${y}`;
    first = false;
    prevX = x;
  }
  d += "Z";
  rings++;
}

const geoms = land.features ? land.features.map((f) => f.geometry) : [land.geometry];
for (const g of geoms) {
  const polys = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
  for (const poly of polys) for (const ring of poly) addRing(ring);
}

const out = `/**
 * land.js, tvary pevniny pro mapu noci. VYGENEROVÁNO scripts/build_land.mjs,
 * neupravovat ručně. Zdroj: Natural Earth 1:110m (public domain).
 * Projekce: x = délka + 180, y = 90 minus šířka.
 */
export const LAND_PATH = "${d}";
`;
writeFileSync(new URL("../js/land.js", import.meta.url), out);
console.log(`hotovo: ${rings} obrysů, ${(out.length / 1024).toFixed(1)} kB`);
