/**
 * map.js, mapa noci pro New Year Bundle.
 *
 * Skutečné tvary pevniny (Natural Earth 1:110m, js/land.js), body zón na
 * místech hlavních měst a zvýrazněný pruh pásma, kde zrovna bije půlnoc.
 * Projekce je obyčejná rovnoplochá: x = délka + 180, y = 90 minus šířka.
 */

import { LAND_PATH } from "./land.js";

// [zeměpisná šířka, délka] reprezentativního místa každé zastávky.
export const ZONE_COORDS = {
  "kiribati-chatham": [1.9, -157.4],
  "tonga-nz": [-36.8, 174.8],
  "sydney": [-33.9, 151.2],
  "adelaide": [-34.9, 138.6],
  "brisbane": [-27.5, 153.0],
  "darwin": [-12.5, 130.8],
  "japonsko-eucla": [35.7, 139.7],
  "filipiny": [14.6, 121.0],
  "thajsko": [13.8, 100.5],
  "myanmar": [16.8, 96.2],
  "banglades-nepal-indie": [28.6, 77.2],
  "uzbekistan": [41.3, 69.3],
  "afghanistan": [34.5, 69.2],
  "azerbajdzan": [40.4, 49.9],
  "iran": [35.7, 51.4],
  "rusko": [55.8, 37.6],
  "recko": [38.0, 23.7],
  "cesko": [50.1, 14.4],
  "skotsko": [55.9, -3.2],
  "kapverdy": [14.9, -23.5],
  "brazilie": [-22.9, -43.2],
  "argentina": [-34.6, -58.4],
  "newfoundland": [47.6, -52.7],
  "venezuela": [10.5, -66.9],
  "usa-newyork": [40.7, -74.0],
  "mexiko": [19.4, -99.1],
  "usa-colorado": [39.7, -105.0],
  "usa-pacifik": [34.0, -118.2],
  "aljaska-marquesas": [61.2, -149.9],
  "havaj": [21.3, -157.9],
  "americka-samoa": [-14.3, -170.7],
};

const VB = { x: 0, y: 12, w: 360, h: 138 }; // ořízne póly (cca 78 S až 60 J)
const BAND_W = 15; // jedno časové pásmo = 15 stupňů délky

function project(lat, lon) {
  return [lon + 180, 90 - lat];
}

/** Pozice bodu zóny v souřadnicích SVG (nebo null). */
export function zonePoint(id) {
  const c = ZONE_COORDS[id];
  return c ? project(c[0], c[1]) : null;
}

export const MAP_VIEWBOX = VB;

/** Pruh pásma kolem dané délky, s přetečením přes datovou hranici. */
function bandRects(x) {
  const left = x - BAND_W / 2;
  const rects = [[left, BAND_W]];
  if (left < 0) rects.push([left + 360, BAND_W]);
  if (left + BAND_W > 360) rects.push([left - 360, BAND_W]);
  return rects
    .map(
      ([bx, bw]) =>
        `<rect class="map-band" x="${bx}" y="${VB.y}" width="${bw}" height="${VB.h}"></rect>` +
        `<line class="map-band-line" x1="${bx + bw / 2}" y1="${VB.y}" x2="${bx + bw / 2}" y2="${VB.y + VB.h}"></line>`
    )
    .join("");
}

/**
 * Vrátí SVG mapy jako string.
 * @param {object} o
 * @param {Array} o.zones ZONES
 * @param {string|null} o.activeId zóna, co slaví teď (růžová)
 * @param {Set} o.doneIds zóny s check-inem (zelené)
 * @param {boolean} o.mini malá placka na obrazovce zóny
 */
export function mapSvg({ zones, activeId, doneIds, mini }) {
  const ap = activeId ? zonePoint(activeId) : null;

  const dots = zones
    .map((z) => {
      if (z.id === activeId) return "";
      const p = zonePoint(z.id);
      if (!p) return "";
      const done = doneIds && doneIds.has(z.id);
      return `<circle class="map-dot${done ? " map-dot-done" : ""}" cx="${p[0]}" cy="${p[1]}" r="${mini ? 2.8 : 2}"><title>${z.label}</title></circle>`;
    })
    .join("");

  let active = "";
  if (ap) {
    const zone = zones.find((z) => z.id === activeId);
    const [x, y] = ap;
    active = `
      <circle class="map-pulse" cx="${x}" cy="${y}" r="${mini ? 10 : 6}"></circle>
      <circle class="map-active" cx="${x}" cy="${y}" r="${mini ? 4.6 : 3.2}"></circle>
      ${mini ? "" : `<text class="map-label" x="${x}" y="${y - 6}" text-anchor="middle">${zone ? zone.label : ""}</text>`}`;
  }

  const grid = mini
    ? ""
    : `<g class="map-grid">${[...Array(25)].map((_, i) => `<line x1="${i * 15}" y1="${VB.y}" x2="${i * 15}" y2="${VB.y + VB.h}"></line>`).join("")}</g>`;

  return `<svg class="map-svg${mini ? " map-svg-mini" : ""}" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <linearGradient id="bandGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ff5d8f" stop-opacity="0"></stop>
        <stop offset="0.5" stop-color="#ff5d8f" stop-opacity="0.55"></stop>
        <stop offset="1" stop-color="#ff5d8f" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    <rect x="${VB.x}" y="${VB.y}" width="${VB.w}" height="${VB.h}" class="map-sea"></rect>
    ${grid}
    ${ap ? bandRects(ap[0]) : ""}
    <path class="map-land" d="${LAND_PATH}"></path>
    ${dots}
    ${active}
  </svg>`;
}
