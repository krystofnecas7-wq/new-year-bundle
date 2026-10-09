/**
 * time.js — Time engine for the New Year Bundle PWA (Phase 1 MVP).
 *
 * Two jobs:
 *   1. Give the rest of the app a single "current effective time" source. In
 *      normal mode this is just Date.now(). In demo mode it is a freely movable
 *      simulated clock so you can click through the whole 25 hour night in
 *      seconds.
 *   2. Resolve, for any effective time, which zone is currently celebrating,
 *      which is next, and the millisecond countdowns the UI renders.
 *
 * The night is anchored to a fixed reference New Year's Eve date so the zone
 * czTime strings ('HH:MM') map onto real timestamps. The night spans 25 hours:
 * it starts on REFERENCE_NYE at the first zone's czTime (11:00) and runs past
 * local midnight into the next day, ending at the last zone (12:00 the next
 * day).
 *
 * ANCHORING: the clock wraps across a 25 hour night, so a bare clock time like
 * 11:00 or 12:00 happens BOTH at the very start (Kiribati 11:00, Tonga 12:00)
 * and near the very end (Havaj 11:00, Americka Samoa 12:00). A clock-only
 * comparison cannot tell those apart. Instead we anchor by SEQUENCE POSITION:
 * the ZONES array is already in strict chronological order of real midnight, so
 * we walk it once and bump a running day offset every time a zone's clock time
 * is <= the previous zone's clock time (the clock wrapped). That yields a
 * strictly increasing timestamp per zone. computeStarts(zones) is the single
 * source of truth for those timestamps; resolveNight and setDemoToZone both use
 * it.
 *
 * ---- Demo-mode contract (for FEAT-002 / UI) ----
 *   getEffectiveTime(): number
 *       Returns ms since epoch. Real Date.now() unless demo is active.
 *
 *   isDemoActive(): boolean
 *   setDemoActive(bool): void
 *       Turn the simulated clock on/off. Enabling it without a clock set seeds
 *       the demo clock to just before the first zone so onboarding shows.
 *
 *   setDemoClock(dateOrOffset): void
 *       Set the simulated clock. Accepts a Date, a ms timestamp (number), or a
 *       string. Also accepts a zone index shortcut via setDemoToZone().
 *
 *   advanceDemo(minutes): void
 *       Move the simulated clock forward (or back, with a negative value) by
 *       the given number of minutes. Fires subscribers.
 *
 *   setDemoToZone(zones, index): void
 *       Jump the simulated clock onto a given zone's midnight. Handy for the
 *       demo controls so you can teleport to any check-in point.
 *
 *   subscribe(callback): () => void
 *       Register a tick callback fired roughly every 400ms (and immediately on
 *       any demo clock change). Returns an unsubscribe function. The ticker only
 *       runs while there is at least one subscriber.
 *
 *   resolveNight(zones, effectiveMs): object
 *       Given the ZONES array and an effective time, returns:
 *         {
 *           currentZoneIndex: number,   // -1 before the first zone starts
 *           currentZone: object|null,
 *           nextZone: object|null,      // null once past the last zone
 *           msUntilNextZone: number,    // ms to the next zone's midnight (0 if none)
 *           isBeforeFirstZone: boolean,
 *           msUntilFirstZone: number,   // ms to the first zone (0 once started)
 *           isAfterLastZone: boolean
 *         }
 *       A zone is "current" from its own midnight until the next zone's midnight
 *       (the last zone stays current for ZONE_TAIL_MS after its midnight, after
 *       which isAfterLastZone becomes true).
 */

// Fixed reference night. The first zone (Kiribati, 11:00 CZ) celebrates on this
// date; later zones with earlier clock times roll over to the next day.
export const REFERENCE_NYE = "2026-12-31";

// How long the final zone stays "current" after its midnight before the night
// is considered over (30 min, matching the check-in window).
export const ZONE_TAIL_MS = 30 * 60 * 1000;

// Tick cadence for subscribers.
const TICK_MS = 400;

// ---- internal demo state ----
let demoActive = false;

const subscribers = new Set();
let tickTimer = null;

/**
 * Parse 'HH:MM' into { h, m }.
 * @param {string} hhmm
 */
function parseHHMM(hhmm) {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return { h, m };
}

/**
 * Build an absolute timestamp on the reference night from a clock time and a
 * day offset (0 = REFERENCE_NYE, 1 = the next day).
 * @param {string} czTime 'HH:MM'
 * @param {number} dayOffset whole days past REFERENCE_NYE
 * @returns {number} ms since epoch (local time)
 */
function timestampForDay(czTime, dayOffset) {
  // czTime is Czech time. On Dec 31 / Jan 1 Czechia runs CET = UTC+1 (no DST),
  // so we build the instant in UTC. This makes the night correct no matter in
  // which timezone the browser sits.
  const { h, m } = parseHHMM(czTime);
  const [y, mo, d] = REFERENCE_NYE.split("-").map((n) => parseInt(n, 10));
  return Date.UTC(y, mo - 1, d + dayOffset, h - CZ_UTC_OFFSET_HOURS, m, 0, 0);
}

// Czech winter time offset from UTC (CET).
const CZ_UTC_OFFSET_HOURS = 1;

/**
 * Human date label for a zone start, in Czech time, e.g. "31. 12. 2026" or
 * "1. 1. 2027". Lets the UI show that late zones are already the next day.
 * @param {number} ms
 * @returns {string}
 */
export function formatCzDate(ms) {
  const d = new Date(ms + CZ_UTC_OFFSET_HOURS * 3600 * 1000);
  return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}`;
}

/**
 * Single source of truth for the night's absolute timestamps.
 *
 * The ZONES array is already in strict chronological order of real midnight.
 * Walk it once and anchor each zone by SEQUENCE POSITION: start zone 0 on
 * REFERENCE_NYE (day offset 0) and bump the day offset by 1 whenever a zone's
 * clock time is <= the previous zone's clock time (the clock wrapped across the
 * 25 hour night). The result is a strictly increasing timestamp per zone, so a
 * repeated clock time like 11:00 (Kiribati at the start, Havaj near the end)
 * lands on different days without any ambiguity.
 *
 * @param {Array} zones ordered ZONES array
 * @returns {number[]} absolute ms timestamp for each zone, by position
 */
export function computeStarts(zones) {
  const starts = new Array(zones.length);
  let dayOffset = 0;
  let prevMinutes = -1;
  for (let i = 0; i < zones.length; i++) {
    const { h, m } = parseHHMM(zones[i].czTime);
    const minutes = h * 60 + m;
    // Clock wrapped (or repeated): this zone belongs to the next day.
    if (i > 0 && minutes <= prevMinutes) dayOffset += 1;
    starts[i] = timestampForDay(zones[i].czTime, dayOffset);
    prevMinutes = minutes;
  }
  return starts;
}

/**
 * Turn a zone's czTime into an absolute timestamp on the reference night.
 *
 * Kept for backward compatibility (two-arg clock-based guess). Times earlier
 * than the first zone's time are treated as the following day. This is only a
 * best-effort single-value helper. For the real night mechanic use
 * computeStarts(zones), which anchors by sequence position and is unambiguous
 * across the 25 hour wrap.
 *
 * @param {string} czTime 'HH:MM'
 * @param {string} firstCzTime first zone czTime, used to detect day rollover
 * @returns {number} ms since epoch (local time)
 */
export function zoneTimestamp(czTime, firstCzTime) {
  const first = parseHHMM(firstCzTime);
  const { h, m } = parseHHMM(czTime);
  const firstMinutes = first.h * 60 + first.m;
  const thisMinutes = h * 60 + m;
  const dayOffset = thisMinutes < firstMinutes ? 1 : 0;
  return timestampForDay(czTime, dayOffset);
}

/**
 * Current effective time in ms. Real clock unless demo mode is on.
 * @returns {number}
 */
export function getEffectiveTime() {
  if (demoActive && demoOffsetMs != null) return Date.now() + demoOffsetMs;
  return Date.now();
}

// Demo hodiny BĚŽÍ: drží se jen posun oproti reálnému času, takže po skoku na
// zónu odpočty tikají dál a velké TEĎ po pár vteřinách samo zmizí.
let demoOffsetMs = null;
function setDemoNow(ms) {
  demoOffsetMs = ms - Date.now();
}

/** @returns {boolean} */
export function isDemoActive() {
  return demoActive;
}

/**
 * Enable or disable demo mode. Enabling without a clock seeds it to just before
 * the first zone so the onboarding countdown is visible.
 * @param {boolean} active
 */
export function setDemoActive(active) {
  demoActive = !!active;
  if (demoActive && demoOffsetMs == null) {
    const firstStart = timestampForDay("11:00", 0);
    setDemoNow(firstStart - 60 * 60 * 1000); // hodinu před první zónou
  }
  notify();
}

/**
 * Set the simulated clock.
 * @param {Date|number|string} dateOrOffset Date, ms timestamp, or parseable string
 */
export function setDemoClock(dateOrOffset) {
  if (dateOrOffset instanceof Date) {
    setDemoNow(dateOrOffset.getTime());
  } else if (typeof dateOrOffset === "number") {
    setDemoNow(dateOrOffset);
  } else if (typeof dateOrOffset === "string") {
    setDemoNow(new Date(dateOrOffset).getTime());
  }
  notify();
}

/**
 * Move the simulated clock by a number of minutes (negative moves back).
 * No-op if demo mode is off.
 * @param {number} minutes
 */
export function advanceDemo(minutes) {
  if (!demoActive) return;
  if (demoOffsetMs == null) demoOffsetMs = 0;
  demoOffsetMs += minutes * 60 * 1000;
  notify();
}

/**
 * Jump the simulated clock to a given zone's midnight.
 * @param {Array} zones
 * @param {number} index
 */
export function setDemoToZone(zones, index) {
  if (!zones || !zones.length) return;
  const i = Math.max(0, Math.min(index, zones.length - 1));
  const starts = computeStarts(zones);
  setDemoNow(starts[i]);
  if (!demoActive) demoActive = true;
  notify();
}

/**
 * Register a tick callback. Returns an unsubscribe function.
 * @param {Function} callback
 * @returns {Function}
 */
export function subscribe(callback) {
  subscribers.add(callback);
  ensureTicker();
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0 && tickTimer != null) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  };
}

function ensureTicker() {
  if (tickTimer == null && typeof setInterval === "function") {
    tickTimer = setInterval(notify, TICK_MS);
  }
}

function notify() {
  const now = getEffectiveTime();
  subscribers.forEach((cb) => {
    try {
      cb(now);
    } catch (e) {
      // A broken subscriber must not take down the ticker.
      console.error("time.js subscriber error", e);
    }
  });
}

/**
 * Resolve the state of the night for a given effective time.
 * @param {Array} zones ZONES array
 * @param {number} effectiveMs ms since epoch
 * @returns {{currentZoneIndex:number,currentZone:object|null,nextZone:object|null,msUntilNextZone:number,isBeforeFirstZone:boolean,msUntilFirstZone:number,isAfterLastZone:boolean}}
 */
export function resolveNight(zones, effectiveMs) {
  const starts = computeStarts(zones);
  const firstStart = starts[0];
  const lastStart = starts[starts.length - 1];
  const nightEnd = lastStart + ZONE_TAIL_MS;

  // Before the night begins.
  if (effectiveMs < firstStart) {
    return {
      currentZoneIndex: -1,
      currentZone: null,
      nextZone: zones[0],
      msUntilNextZone: firstStart - effectiveMs,
      isBeforeFirstZone: true,
      msUntilFirstZone: firstStart - effectiveMs,
      isAfterLastZone: false,
    };
  }

  // After the night is over.
  if (effectiveMs >= nightEnd) {
    return {
      currentZoneIndex: zones.length - 1,
      currentZone: zones[zones.length - 1],
      nextZone: null,
      msUntilNextZone: 0,
      isBeforeFirstZone: false,
      msUntilFirstZone: 0,
      isAfterLastZone: true,
    };
  }

  // Somewhere inside the night: find the last zone whose start <= now.
  let idx = 0;
  for (let i = 0; i < starts.length; i++) {
    if (effectiveMs >= starts[i]) idx = i;
    else break;
  }

  const isLast = idx === zones.length - 1;
  const nextZone = isLast ? null : zones[idx + 1];
  const msUntilNextZone = isLast ? 0 : starts[idx + 1] - effectiveMs;

  return {
    currentZoneIndex: idx,
    currentZone: zones[idx],
    nextZone,
    msUntilNextZone,
    isBeforeFirstZone: false,
    msUntilFirstZone: 0,
    isAfterLastZone: false,
  };
}

/**
 * Convenience: read ?demo=1 (or ?demo) from a URL search string and enable demo
 * mode accordingly. Safe to call with window.location.search.
 * @param {string} search e.g. '?demo=1'
 * @returns {boolean} whether demo mode got enabled
 */
export function initDemoFromQuery(search) {
  try {
    const params = new URLSearchParams(search || "");
    const has = params.has("demo");
    const val = params.get("demo");
    const on = has && val !== "0" && val !== "false";
    if (on) setDemoActive(true);
    return on;
  } catch (e) {
    return false;
  }
}
