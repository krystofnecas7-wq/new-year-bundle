/**
 * map.js, NÁČRT mapy světa pro New Year Bundle.
 *
 * Schválně jen "jakoby": hrubé tvary kontinentů a body zón zhruba na správných
 * místech (souřadnice hlavních měst). Opravdová mapa přijde v další verzi.
 * Projekce je obyčejná rovnoplochá: x = délka + 180, y = 90 minus šířka.
 */

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

// Hrubé obrysy kontinentů jako [délka, šířka]. Náčrt, ne kartografie.
const LAND = [
  // Severní Amerika
  [[-165, 66], [-140, 70], [-95, 74], [-70, 62], [-55, 50], [-66, 44], [-80, 26], [-82, 30], [-97, 26], [-97, 18], [-88, 15], [-80, 8], [-85, 12], [-105, 20], [-112, 30], [-118, 33], [-124, 42], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
  // Grónsko
  [[-55, 82], [-25, 82], [-20, 72], [-42, 60], [-52, 66], [-58, 76]],
  // Jižní Amerika
  [[-80, 10], [-62, 11], [-50, 0], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-66, -55], [-75, -48], [-72, -30], [-71, -18], [-81, -5]],
  // Evropa
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [5, 58], [10, 63], [18, 70], [30, 71], [42, 67], [40, 46], [28, 41], [22, 36], [15, 38], [12, 44], [5, 43], [-2, 37]],
  // Velká Británie
  [[-5, 50], [1, 51], [0, 54], [-2, 58], [-6, 57], [-4, 54]],
  // Afrika
  [[-17, 15], [-10, 30], [-6, 36], [10, 37], [20, 32], [32, 31], [35, 24], [43, 12], [51, 11], [40, -10], [40, -16], [32, -27], [20, -35], [12, -17], [9, 4], [-8, 5], [-15, 10]],
  // Madagaskar
  [[44, -13], [50, -15], [47, -25], [43, -22]],
  // Asie (včetně Arábie a Indie, hodně zjednodušeně)
  [[28, 41], [40, 46], [42, 67], [60, 72], [80, 74], [100, 78], [130, 72], [160, 70], [180, 66], [175, 62], [160, 58], [142, 52], [140, 46], [130, 42], [122, 38], [122, 30], [115, 22], [108, 18], [106, 10], [100, 13], [98, 8], [95, 16], [90, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [59, 22], [52, 16], [43, 13], [35, 28], [35, 33], [36, 37]],
  // Japonsko
  [[130, 32], [135, 34], [141, 36], [142, 43], [140, 41], [136, 36]],
  // Indonésie a Filipíny, pár kousků
  [[95, 5], [105, -6], [100, 0]],
  [[110, -7], [120, -8], [114, -9]],
  [[109, 1], [118, 7], [117, -3], [111, -2]],
  [[131, -1], [150, -6], [142, -9]],
  [[120, 18], [124, 13], [122, 7], [126, 7], [124, 12]],
  // Austrálie
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [140, -38], [135, -34], [130, -32], [116, -35], [114, -28]],
  // Nový Zéland
  [[172, -34], [178, -38], [174, -42], [171, -45], [167, -46], [172, -40]],
];

const VB = { x: 0, y: 15, w: 360, h: 135 }; // ořízne póly

function project(lat, lon) {
  return [lon + 180, 90 - lat];
}

function polygonPath(points) {
  return (
    points
      .map(([lon, lat], i) => {
        const [x, y] = project(lat, lon);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

const LAND_PATHS = LAND.map(polygonPath).join(" ");

/** Pozice bodu zóny v souřadnicích SVG (nebo null). */
export function zonePoint(id) {
  const c = ZONE_COORDS[id];
  if (!c) return null;
  return project(c[0], c[1]);
}

export const MAP_VIEWBOX = VB;

/**
 * Vrátí SVG mapy jako string.
 * @param {object} o
 * @param {Array} o.zones ZONES
 * @param {string|null} o.activeId zóna, co slaví teď (růžová)
 * @param {Set} o.doneIds zóny s check-inem
 * @param {boolean} o.mini malá placka na obrazovce zóny
 */
export function mapSvg({ zones, activeId, doneIds, mini }) {
  const dots = zones
    .map((z) => {
      const p = zonePoint(z.id);
      if (!p) return "";
      const [x, y] = p;
      if (z.id === activeId) return "";
      const done = doneIds && doneIds.has(z.id);
      const r = mini ? 2.6 : 2.1;
      return `<circle class="map-dot${done ? " map-dot-done" : ""}" cx="${x}" cy="${y}" r="${r}"><title>${z.label}</title></circle>`;
    })
    .join("");

  let active = "";
  const ap = activeId ? zonePoint(activeId) : null;
  if (ap) {
    const [x, y] = ap;
    const zone = zones.find((z) => z.id === activeId);
    active = `
      <circle class="map-pulse" cx="${x}" cy="${y}" r="${mini ? 9 : 6}"></circle>
      <circle class="map-active" cx="${x}" cy="${y}" r="${mini ? 4.5 : 3.4}"></circle>
      ${mini ? "" : `<text class="map-label" x="${x}" y="${y - 6}" text-anchor="middle">${zone ? zone.label : ""}</text>`}`;
  }

  return `<svg class="map-svg${mini ? " map-svg-mini" : ""}" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect x="${VB.x}" y="${VB.y}" width="${VB.w}" height="${VB.h}" class="map-sea"></rect>
    ${mini ? "" : `<g class="map-grid">${[...Array(11)].map((_, i) => `<line x1="${i * 36}" y1="${VB.y}" x2="${i * 36}" y2="${VB.y + VB.h}"></line>`).join("")}</g>`}
    <path class="map-land" d="${LAND_PATHS}"></path>
    ${dots}
    ${active}
  </svg>`;
}
