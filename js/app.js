/**
 * app.js, router, state, and rendering for the New Year Bundle PWA (Phase 1).
 *
 * Everything is vanilla ES modules, no framework, no build step. We consume
 * zones.js (data) and time.js (clock + demo mode) as-is.
 *
 * Night mechanic in one breath: the ACTIVE TASK is the most recent zone that
 * actually carries an action (celebrates === true AND challenge != null). Info
 * only zones (a pauza like Afghanistan or Iran, or any future info only entry)
 * do NOT move the task, they only layer their context and perlicka on top. The
 * countdown always ticks to the nearest next zone in time, action or not.
 *
 * All user-facing copy follows the Style Guide. NO dashes as punctuation.
 */

import ZONES from "./zones.js";
import ANIMAL_FACTS from "./animals.js";
import {
  getEffectiveTime,
  isDemoActive,
  setDemoActive,
  advanceDemo,
  setDemoToZone,
  subscribe,
  resolveNight,
  initDemoFromQuery,
  computeStarts,
  formatCzDate,
} from "./time.js";

/* -------------------------------------------------------------------------- */
/* Tunable constants                                                           */
/* -------------------------------------------------------------------------- */

// How many minutes before a zone's midnight we tease its challenge so people
// can get ready. Change this one number and both the logic and the copy follow.
const CHALLENGE_PREVIEW_MINUTES = 5;

// How many seconds after a zone's own midnight the "TEĎ" badge stays lit. It is
// a flash, a moment, not a permanent label. Change this one number to tune it.
const NOW_FLASH_SECONDS = 90;

// Zone start timestamps by position, computed once from the real engine. Used
// read only to tell how long we have been inside the current zone's midnight.
const ZONE_STARTS = computeStarts(ZONES);

// localStorage keys.
const LS = {
  deviceId: "nyb_device_id",
  loginName: "nyb_login_name",
  progress: "nyb_progress", // JSON array of checked-in zone ids
  email: "nyb_email",
  lastAnimal: "nyb_last_animal",
  entered: "nyb_entered_night",
};

// Instagram check-in target. Real handle is TBD, this is a placeholder.
const INSTAGRAM_URL = "https://instagram.com/";

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function readProgress() {
  try {
    const raw = localStorage.getItem(LS.progress);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}

function writeProgress(set) {
  try {
    localStorage.setItem(LS.progress, JSON.stringify(Array.from(set)));
  } catch (e) {
    /* storage might be blocked, ignore for the prototype */
  }
}

function ensureDeviceId() {
  let id = null;
  try {
    id = localStorage.getItem(LS.deviceId);
    if (!id) {
      id = "dev_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(LS.deviceId, id);
    }
  } catch (e) {
    id = "dev_temp";
  }
  return id;
}

function getLoginName() {
  try {
    return localStorage.getItem(LS.loginName) || "";
  } catch (e) {
    return "";
  }
}

// Format ms into a big human countdown. No dashes.
function formatCountdown(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function isActionZone(zone) {
  return !!(zone && zone.celebrates === true && zone.challenge != null);
}

/* -------------------------------------------------------------------------- */
/* Night mechanic: hold the task                                               */
/* -------------------------------------------------------------------------- */

/**
 * Given the resolved night state, figure out which zone is the HELD action task
 * and which zone is the current context layer.
 *
 * contextZone  = the zone whose midnight we are currently in (may be info only).
 * taskZone     = most recent zone with an actual challenge, scanning backwards.
 */
function computeHeldTask(state) {
  const contextIndex = state.currentZoneIndex;
  const contextZone = state.currentZone;

  let taskIndex = -1;
  let taskZone = null;
  for (let i = contextIndex; i >= 0; i--) {
    if (isActionZone(ZONES[i])) {
      taskIndex = i;
      taskZone = ZONES[i];
      break;
    }
  }
  return { contextIndex, contextZone, taskIndex, taskZone };
}

/* -------------------------------------------------------------------------- */
/* Rendering                                                                   */
/* -------------------------------------------------------------------------- */

const screens = {};
let unsubTick = null;

function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (!el) return;
    el.hidden = key !== name;
  });
}

function renderProgressBadge() {
  const set = readProgress();
  const total = ZONES.length;
  $$(".js-progress-count").forEach((el) => {
    el.textContent = `${set.size} / ${total}`;
  });
  const name = getLoginName();
  $$(".js-login-state").forEach((el) => {
    el.textContent = name ? `Přihlášen jako ${name}` : "Nepřihlášen, jedeš jako host";
  });
}

function doCheckIn(zoneId) {
  // The real check-in happens on Instagram. We only open the tab and bump the
  // local soft counter. Real evaluation is via IG, not this number.
  // Real handle is TBD, placeholder URL for now.
  try {
    window.open(INSTAGRAM_URL, "_blank", "noopener");
  } catch (e) {
    /* popup blocked, counter still bumps */
  }
  const set = readProgress();
  set.add(zoneId);
  writeProgress(set);
  renderProgressBadge();
}

// Build the HTML for the current zone screen based on held-task mechanic.
function renderZoneScreen(state) {
  const host = $("#zone-content");
  if (!host) return;

  // End of night takes over.
  if (state.isAfterLastZone) {
    renderEndScreen();
    showScreen("end");
    return;
  }

  // Still before the first zone. Shouldn't usually land here if onboarding is
  // showing, but guard anyway: push them back to onboarding countdown.
  if (state.isBeforeFirstZone) {
    showScreen("onboarding");
    return;
  }

  const { contextZone, taskZone, taskIndex, contextIndex } = computeHeldTask(state);
  const set = readProgress();

  // Countdown always ticks to the nearest next zone in time.
  const nextZone = state.nextZone;
  const msToNext = state.msUntilNextZone;

  // Are we within the lead time before the next zone's midnight?
  const leadMs = CHALLENGE_PREVIEW_MINUTES * 60 * 1000;
  const nextIsWithinLead = nextZone != null && msToNext <= leadMs;
  const nextIsAction = nextZone != null && isActionZone(nextZone);

  // Dole: upozornění na další zónu. Žádná omáčka, jen co si nachystat. Ukazuje
  // se po celou dobu aktuální zóny, aby byl čas sehnat věci (hrozny, kufr...).
  // Prázdný prep znamená "teď není potřeba nic".
  let nextHeadsUpHtml = "";
  if (nextZone) {
    const prep = (nextZone.prep || "").trim();
    const prepLine = prep.length > 0 ? prep : "Teď není potřeba nic.";
    nextHeadsUpHtml = `
      <div class="next-prep">
        <p class="next-prep-zone">Další zóna: <strong>${nextZone.label}</strong> (${nextZone.czTime}, ${nextDate})</p>
        <p class="next-prep-line">${prepLine}</p>
      </div>`;
  }

  // 5 min před půlnocí další akční zóny vytáhneme plnou výzvu dopředu, ať se
  // věci na odbití (odpočet, 12 hroznů do úderů) dají stihnout.
  let previewHtml = "";
  if (nextIsAction && nextIsWithinLead) {
    previewHtml = `
      <div class="preview card">
        <p class="preview-kicker">Za chvíli TEĎ, naposled se nachystej</p>
        <p class="preview-zone">${nextZone.label} <span class="dim">(${nextZone.czTime})</span></p>
        <p class="preview-text">${nextZone.challenge}</p>
      </div>`;
  }

  // The context zone is info only (a pauza) when it does not carry an action.
  const contextIsInfoOnly = !isActionZone(contextZone);
  const contextIsPauza = contextZone && contextZone.celebrates === false;

  // Date of this zone and the next, in Czech time, so late zones read clearly
  // as the next day (1. 1. 2027).
  const contextStart = ZONE_STARTS[contextIndex];
  const contextDate =
    typeof contextStart === "number" ? formatCzDate(contextStart) : "";
  const nextDate =
    nextZone && typeof ZONE_STARTS[contextIndex + 1] === "number"
      ? formatCzDate(ZONE_STARTS[contextIndex + 1])
      : "";

  // Merge note if the context zone is a merge group.
  const mergeHtml = contextZone && contextZone.merge
    ? `<p class="merge-note">${contextZone.merge}</p>`
    : "";

  // "TEĎ" flash only right after the context zone's own midnight flips. It is a
  // moment, not a permanent label: it lights up when the clock hits the zone's
  // start and goes dark once we are past NOW_FLASH_SECONDS into the zone. Pauza
  // zones are not action zones, so they never flash (handled by isActionZone).
  const zoneStart = contextStart;
  const msSinceZoneStart =
    typeof zoneStart === "number" ? getEffectiveTime() - zoneStart : Infinity;
  const inNowWindow =
    msSinceZoneStart >= 0 && msSinceZoneStart < NOW_FLASH_SECONDS * 1000;
  const nowFlash =
    isActionZone(contextZone) && contextIndex === taskIndex && inNowWindow
      ? `<span class="now-flash">TEĎ</span>`
      : "";

  let bodyHtml = "";

  if (contextIsPauza) {
    // Afghanistan / Iran style pause. No challenge. Nowruz explanation.
    const alreadyIn = set.has(contextZone.id);
    bodyHtml = `
      <div class="zone-head">
        <p class="zone-time">${contextZone.czTime} <span class="dim">u tebe doma, ${contextDate}</span></p>
        <h1 class="zone-label">${contextZone.label}</h1>
        <p class="pauza-tag">Pauza. Tady se dneska schválně neslaví.</p>
      </div>

      <div class="card perlicka">
        <p class="perlicka-kicker">Perlička</p>
        <p>${contextZone.perlicka}</p>
      </div>

      <div class="card">
        <p class="tradition">${contextZone.tradition}</p>
      </div>

      ${taskZone ? `
      <div class="card held-task dim-card">
        <p class="held-kicker">Tvůj úkol pořád běží od ${taskZone.czTime}, ${taskZone.label}</p>
        <p class="held-text">${taskZone.challenge}</p>
      </div>` : ""}

      <div class="checkin-block">
        <p class="checkin-micro">Žádná výzva, jen klid. Když chceš, ťukni že žiješ.</p>
        <button class="btn btn-alive js-checkin" data-zone="${contextZone.id}">
          ${alreadyIn ? "Jsem vzhůru (zapsáno)" : "Jsem vzhůru"}
        </button>
        <p class="checkin-note">Check-in jede na Instagramu (DM nebo Story s tagem), ne nahráváním tady v appce.</p>
      </div>
    `;
  } else {
    // Normal action zone, or context zone that is info but task held from
    // earlier. Here contextZone carries the action (we are standing in it) or we
    // show the held task if the context somehow lacks one.
    const activeZone = isActionZone(contextZone) ? contextZone : taskZone;
    const showingHeld = activeZone && activeZone.id !== contextZone.id;
    const alreadyIn = activeZone ? set.has(activeZone.id) : false;

    bodyHtml = `
      <div class="zone-head">
        <p class="zone-time">${contextZone.czTime} <span class="dim">u tebe doma, ${contextDate}</span> ${nowFlash}</p>
        <h1 class="zone-label">${contextZone.label}</h1>
        ${mergeHtml}
      </div>

      <div class="card perlicka">
        <p class="perlicka-kicker">Perlička</p>
        <p>${contextZone.perlicka}</p>
      </div>

      <div class="card">
        <p class="tradition-kicker">Co se tam děje</p>
        <p class="tradition">${contextZone.tradition}</p>
      </div>

      ${showingHeld ? `<p class="held-hint">Nová info, ale tvůj úkol pořád běží od ${activeZone.czTime}, ${activeZone.label}.</p>` : ""}

      ${activeZone ? `
      <div class="card challenge">
        <p class="challenge-kicker">Teď je čas na tohle</p>
        <p class="challenge-text">${activeZone.challenge}</p>
        ${activeZone.symbolicPenaltyNote ? `<p class="penalty"><strong>Trest za lajnou verzi:</strong> ${activeZone.symbolicPenaltyNote}</p>` : ""}
      </div>

      <div class="checkin-block">
        <button class="btn btn-primary js-checkin" data-zone="${activeZone.id}">
          ${alreadyIn ? "Check-in zapsán, můžeš znovu" : "Hotovo, pošli check-in"}
        </button>
        <p class="checkin-note">Check-in jede na Instagramu (DM nebo Story s tagem), ne nahráváním tady v appce. Tlačítko ti otevře IG v novém panelu.</p>
      </div>` : ""}
    `;
  }

  // Odpočet úplně nahoře, sticky, hned viditelný. Dole jen heads-up na další
  // zónu s tím, co si nachystat (plus plná výzva 5 min předem).
  const topCountdownHtml = nextZone
    ? `
      <div class="top-countdown">
        <p class="top-countdown-kicker">Další zóna za</p>
        <p class="top-countdown-big js-countdown">${formatCountdown(msToNext)}</p>
      </div>`
    : `
      <div class="top-countdown top-countdown-last">
        <p class="top-countdown-kicker">Poslední zóna noci. Dojel jsi až na konec.</p>
      </div>`;

  host.innerHTML = `
    ${topCountdownHtml}

    ${bodyHtml}

    ${previewHtml}

    ${nextHeadsUpHtml}
  `;

  renderProgressBadge();
}

function renderEndScreen() {
  const set = readProgress();
  const total = ZONES.length;
  const n = set.size;
  const host = $("#end-content");
  if (!host) return;

  let line;
  if (n === 0) {
    line = "Nula zón. Buď jsi prospal celou planetu, nebo jsi check-in nedal. Klídek, příští rok je další pokus.";
  } else if (n < 10) {
    line = "Pár zón v kapse. Social battery došla dřív, chápeme. Pořád lepší než gauč a jedna televizní půlnoc.";
  } else if (n < total) {
    line = "To je slušná jízda. Většinu planety jsi protáhl, zbytek necháme na příští rok.";
  } else {
    line = "Celá planeta. Všech " + total + " zastávek. Ty vole, ty jsi fakt nespal. Respekt.";
  }

  host.innerHTML = `
    <h1 class="end-title">A je po noci.</h1>
    <p class="end-big">Zvládl jsi <span class="end-number">${n}</span> z ${total} pásem.</p>
    <p class="end-line">${line}</p>
    <p class="end-disclaimer">Tohle číslo je jen tvoje osobní shrnutí z appky, soft signál. Reálné vyhodnocení běží podle Instagram check-inů, ne podle téhle appky.</p>
    <div class="end-signup">
      <p class="signup-kicker">Nech si říct, až to pojedeme příště.</p>
      <form id="end-email-form" class="email-form">
        <input type="email" required placeholder="tvuj@email.cz" class="email-input" />
        <button class="btn btn-primary" type="submit">Dej vědět příště</button>
      </form>
      <p class="email-confirm js-email-confirm" aria-live="polite"></p>
    </div>
  `;

  wireEmailForm($("#end-email-form"));
  renderProgressBadge();
}

/* -------------------------------------------------------------------------- */
/* Onboarding                                                                  */
/* -------------------------------------------------------------------------- */

function renderOnboardingCountdown(state) {
  const el = $(".js-onboarding-countdown");
  if (!el) return;
  if (state.isBeforeFirstZone) {
    el.textContent = formatCountdown(state.msUntilFirstZone);
  } else {
    el.textContent = "00:00";
  }
}

/* -------------------------------------------------------------------------- */
/* Email signup                                                                */
/* -------------------------------------------------------------------------- */

function wireEmailForm(form) {
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $(".email-input", form);
    const email = input ? input.value.trim() : "";
    if (!email) return;
    try {
      localStorage.setItem(LS.email, email);
    } catch (err) {
      /* ignore */
    }
    const confirm = form.parentElement
      ? $(".js-email-confirm", form.parentElement)
      : null;
    if (confirm) {
      confirm.textContent = "Máme to. Žádný spam, slibujeme. Max jedna zpráva, až to zase rozjedeme.";
    }
    if (input) input.value = "";
  });
}

/* -------------------------------------------------------------------------- */
/* Easter egg                                                                  */
/* -------------------------------------------------------------------------- */

function renderAnimalFact() {
  const el = $("#animal-fact");
  if (!el) return;
  let last = -1;
  try {
    last = parseInt(localStorage.getItem(LS.lastAnimal) || "-1", 10);
  } catch (e) {
    last = -1;
  }
  let idx = Math.floor(Math.random() * ANIMAL_FACTS.length);
  if (ANIMAL_FACTS.length > 1) {
    let guard = 0;
    while (idx === last && guard < 20) {
      idx = Math.floor(Math.random() * ANIMAL_FACTS.length);
      guard++;
    }
  }
  try {
    localStorage.setItem(LS.lastAnimal, String(idx));
  } catch (e) {
    /* ignore */
  }
  el.textContent = ANIMAL_FACTS[idx];
}

/* -------------------------------------------------------------------------- */
/* Demo bar                                                                    */
/* -------------------------------------------------------------------------- */

function renderDemoBar() {
  const bar = $("#demo-bar");
  if (!bar) return;
  bar.hidden = !isDemoActive();
  const toggle = $("#demo-toggle");
  if (toggle) {
    toggle.textContent = isDemoActive() ? "Demo mód: ZAP" : "Demo mód: VYP";
  }
}

function jumpToEnd() {
  // Put the demo clock past the last zone's tail so the night reads as over.
  setDemoToZone(ZONES, ZONES.length - 1);
  advanceDemo(31); // past the 30 min tail
}

/* -------------------------------------------------------------------------- */
/* Main tick + routing                                                         */
/* -------------------------------------------------------------------------- */

let hasEnteredNight = false;

function tick() {
  const now = getEffectiveTime();
  const state = resolveNight(ZONES, now);

  renderDemoBar();

  // Onboarding stays until the user enters the night OR the night is already
  // running and they came back. If they are before the first zone, keep
  // onboarding and update its countdown.
  if (!hasEnteredNight && state.isBeforeFirstZone) {
    showScreen("onboarding");
    renderOnboardingCountdown(state);
    renderProgressBadge();
    return;
  }

  if (state.isAfterLastZone) {
    renderEndScreen();
    showScreen("end");
    return;
  }

  // Night in progress.
  showScreen("zone");
  renderZoneScreen(state);
}

function enterNight() {
  hasEnteredNight = true;
  try {
    localStorage.setItem(LS.entered, "1");
  } catch (e) {
    /* ignore */
  }
  tick();
}

/* -------------------------------------------------------------------------- */
/* Event wiring                                                                */
/* -------------------------------------------------------------------------- */

function wireGlobalClicks() {
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const checkinBtn = target.closest(".js-checkin");
    if (checkinBtn) {
      const zoneId = checkinBtn.getAttribute("data-zone");
      if (zoneId) doCheckIn(zoneId);
      return;
    }

    if (target.closest("#enter-night")) {
      enterNight();
      return;
    }

    if (target.closest("#demo-toggle")) {
      setDemoActive(!isDemoActive());
      hasEnteredNight = isDemoActive() ? false : hasEnteredNight;
      renderDemoBar();
      tick();
      return;
    }

    if (target.closest("#demo-first")) {
      setDemoToZone(ZONES, 0);
      hasEnteredNight = true;
      tick();
      return;
    }
    if (target.closest("#demo-prev")) {
      const now = getEffectiveTime();
      const st = resolveNight(ZONES, now);
      const idx = Math.max(0, (st.currentZoneIndex < 0 ? 0 : st.currentZoneIndex) - 1);
      setDemoToZone(ZONES, idx);
      hasEnteredNight = true;
      tick();
      return;
    }
    if (target.closest("#demo-next")) {
      const now = getEffectiveTime();
      const st = resolveNight(ZONES, now);
      const idx = Math.min(ZONES.length - 1, (st.currentZoneIndex < 0 ? -1 : st.currentZoneIndex) + 1);
      setDemoToZone(ZONES, idx);
      hasEnteredNight = true;
      tick();
      return;
    }
    if (target.closest("#demo-plus5")) {
      advanceDemo(5);
      hasEnteredNight = true;
      tick();
      return;
    }
    if (target.closest("#demo-plus1")) {
      advanceDemo(1);
      hasEnteredNight = true;
      tick();
      return;
    }
    if (target.closest("#demo-end")) {
      jumpToEnd();
      hasEnteredNight = true;
      tick();
      return;
    }

    if (target.closest(".js-mock-login")) {
      const current = getLoginName();
      const name = window.prompt(
        "Jméno nebo přezdívka (jen naoko, žádné heslo, nic se nikam neposílá):",
        current || ""
      );
      if (name && name.trim()) {
        try {
          localStorage.setItem(LS.loginName, name.trim());
        } catch (err) {
          /* ignore */
        }
        renderProgressBadge();
      }
      return;
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Service worker                                                              */
/* -------------------------------------------------------------------------- */

function registerServiceWorker() {
  // Only on http/https (localhost counts). Guard so file:// does not throw.
  const proto = window.location.protocol;
  const okProto = proto === "http:" || proto === "https:";
  if (!okProto) {
    console.log("New Year Bundle: běžíš z file://, service worker přeskočen. Pusť to přes server.");
    return;
  }
  if (!("serviceWorker" in navigator)) {
    console.log("New Year Bundle: tenhle prohlížeč neumí service worker, nevadí, appka jede dál.");
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => console.log("New Year Bundle: service worker běží, appka pojede i offline."))
      .catch((err) => console.log("New Year Bundle: service worker se nechytil, nevadí.", err));
  });
}

/* -------------------------------------------------------------------------- */
/* Boot                                                                        */
/* -------------------------------------------------------------------------- */

function boot() {
  screens.onboarding = $("#screen-onboarding");
  screens.zone = $("#screen-zone");
  screens.end = $("#screen-end");

  ensureDeviceId();

  // Demo from query string.
  initDemoFromQuery(window.location.search);

  // If demo got switched on via query, do not auto skip onboarding.
  hasEnteredNight = false;

  wireGlobalClicks();
  wireEmailForm($("#onboarding-email-form"));
  renderAnimalFact();
  renderProgressBadge();
  renderDemoBar();

  if (unsubTick) unsubTick();
  unsubTick = subscribe(tick);

  // First paint.
  tick();

  registerServiceWorker();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
