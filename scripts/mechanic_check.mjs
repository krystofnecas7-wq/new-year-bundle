// Verify the night mechanic against the real time.js + zones.js.
// Mirrors the held-task logic in app.js so we can assert behavior headlessly.
import ZONES from "../js/zones.js";
import { resolveNight, computeStarts, ZONE_TAIL_MS } from "../js/time.js";

const CHALLENGE_PREVIEW_MINUTES = 5;
const isAction = (z) => !!(z && z.celebrates === true && z.challenge != null);

// Monotonic-by-position timestamps: the single source of truth. The night wraps
// the clock across 25 hours, so we anchor probes by the zone's real position in
// the ordered list, not by a bare clock-time guess.
const STARTS = computeStarts(ZONES);
const indexOfId = (id) => ZONES.findIndex((z) => z.id === id);

function heldTask(state) {
  let ti = -1;
  for (let i = state.currentZoneIndex; i >= 0; i--) {
    if (isAction(ZONES[i])) { ti = i; break; }
  }
  return ti;
}

// Probe the night at a given zone's real start (by zone id), optionally offset
// by plusMin minutes. This resolves the start/end clock-wrap ambiguity: e.g.
// kiribati 11:00 and havaj 11:00 share a clock time but sit on different days.
function at(zoneId, plusMin = 0) {
  const i = indexOfId(zoneId);
  if (i < 0) throw new Error(`unknown zone id in test probe: ${zoneId}`);
  return STARTS[i] + plusMin * 60000;
}

let fail = 0;
function assert(cond, msg) {
  console.log((cond ? "PASS " : "FAIL ") + msg);
  if (!cond) fail++;
}

// Before first zone.
let s = resolveNight(ZONES, at("kiribati-chatham", -10));
assert(s.isBeforeFirstZone, "before first zone flagged");

// At 11:00 Kiribati (action). Next is Tonga 12:00.
s = resolveNight(ZONES, at("kiribati-chatham"));
assert(s.currentZone.id === "kiribati-chatham", "11:00 current is kiribati");
assert(heldTask(s) === 0, "held task is kiribati at 11:00");
assert(s.nextZone.id === "tonga-nz", "next is tonga");

// Afghanistan 20:00 is a pauza (info only). Task must hold from Uzbekistan 19:30.
s = resolveNight(ZONES, at("afghanistan", 5));
assert(s.currentZone.id === "afghanistan", "20:05 context is afghanistan");
assert(!isAction(s.currentZone), "afghanistan is not an action zone");
const htAfg = heldTask(s);
assert(ZONES[htAfg].id === "uzbekistan", "held task scans back to uzbekistan during afghanistan pauza");

// Iran 21:00 pauza, held task should be Azerbajdzan 20:30.
s = resolveNight(ZONES, at("iran", 5));
assert(s.currentZone.id === "iran", "21:05 context is iran");
const htIran = heldTask(s);
assert(ZONES[htIran].id === "azerbajdzan", "held task holds azerbajdzan during iran pauza");

// Preview lead-in: 4 minutes before Rusko 22:00 (an action zone) while in Iran.
s = resolveNight(ZONES, at("rusko", -4));
const leadMs = CHALLENGE_PREVIEW_MINUTES * 60000;
assert(s.nextZone.id === "rusko", "next zone is rusko near 22:00");
assert(isAction(s.nextZone) && s.msUntilNextZone <= leadMs, "preview should show for rusko within lead time");

// 6 minutes before Rusko: no preview yet.
s = resolveNight(ZONES, at("rusko", -6));
assert(s.msUntilNextZone > leadMs, "no preview 6 min before rusko");

// End of night: past Americka Samoa 12:00 + tail.
s = resolveNight(ZONES, at("americka-samoa") + ZONE_TAIL_MS + 1000);
assert(s.isAfterLastZone, "after last zone flagged at end of night");

// Last zone itself.
s = resolveNight(ZONES, at("americka-samoa"));
assert(s.currentZone.id === "americka-samoa", "12:00 is americka samoa");
assert(s.nextZone === null, "no next zone after samoa");

console.log(fail === 0 ? "\nALL GOOD" : `\n${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
