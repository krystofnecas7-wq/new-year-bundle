/**
 * app.js, New Year Bundle PWA (fáze 1), přepsáno od základu podle
 * schválených návrhů (design/*.png).
 *
 * Mechanika noci:
 * - AKTIVNÍ ÚKOL je poslední zóna s akcí (celebrates a challenge). Info zóny
 *   (pauzy) úkol neposouvají, jen přidají kontext.
 * - Odpočet míří vždy na nejbližší další zónu.
 * - 5 minut předem náhled výzvy, posledních 10 vteřin velké odpočítávání přes
 *   celý displej, pak "TEĎ!".
 * - Check-in se zapíše všem účtům, které jsou na tomhle mobilu "u toho".
 *
 * Výkon: obrazovka se překreslí jen když se změní její klíč. Každý tik se
 * mění jen číslice odpočtu (s překlopením), takže nic nebliká.
 */

import ZONES from "./zones.js";
import FACTS from "./facts.js";
import { t, zf, getLang, setLang } from "./i18n.js";
import * as P from "./profiles.js";
import { mapSvg, zonePoint, MAP_VIEWBOX } from "./map.js";
import { shareCard } from "./share.js";
import { initFx, burst, setFxLevel } from "./fx.js";
import {
  getEffectiveTime,
  isDemoActive,
  setDemoActive,
  advanceDemo,
  setDemoToZone,
  setDemoClock,
  subscribe,
  resolveNight,
  initDemoFromQuery,
  computeStarts,
  formatCzDate,
} from "./time.js";

/* ================================================================== */
/* Konstanty                                                            */
/* ================================================================== */

const CHALLENGE_PREVIEW_MINUTES = 5;
const NOW_FLASH_SECONDS = 90;
const BIG_COUNTDOWN_SECONDS = 10;
const BIG_NOW_SECONDS = 4;
const INSTAGRAM_URL = "https://instagram.com/"; // reálný handle TBD

const ZONE_STARTS = computeStarts(ZONES);
const TOTAL = ZONES.length;

const LS = {
  entered: "nyb_entered_night",
  rules: "nyb_rules_seen",
  lastFact: "nyb_last_fact",
  email: "nyb_email",
};

/* ================================================================== */
/* Drobnosti                                                            */
/* ================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const pad = (n) => String(n).padStart(2, "0");

function flag(k) {
  try {
    return localStorage.getItem(k) === "1";
  } catch (e) {
    return false;
  }
}
function setFlag(k) {
  try {
    localStorage.setItem(k, "1");
  } catch (e) {
    /* ignore */
  }
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Texty ze zones.js můžou mít **tučné** úseky. */
function md(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

const isAction = (z) => !!(z && z.celebrates === true && z.challenge != null);
const nameOf = (p) => (p && p.name) || t("profile.defaultName");
const initialOf = (p) => nameOf(p).trim().charAt(0).toUpperCase() || "?";

let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3400);
}

/* ================================================================== */
/* Flip odpočet                                                         */
/* ================================================================== */

/** Nad hodinu dny / hodiny / minuty, pod hodinu minuty / vteřiny. */
function cdParts(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  if (total >= 3600) {
    const tm = Math.floor(total / 60);
    const d = Math.floor(tm / 1440);
    const h = Math.floor((tm % 1440) / 60);
    const m = tm % 60;
    return d > 0
      ? [[d, "cd.days"], [h, "cd.hours"], [m, "cd.min"]]
      : [[h, "cd.hours"], [m, "cd.min"]];
  }
  return [[Math.floor(total / 60), "cd.min"], [total % 60, "cd.sec"]];
}

function tilesHtml(ms) {
  return cdParts(ms)
    .map(
      ([v, l]) => `
      <div class="tile" data-label="${l}">
        <span class="tile-num">${pad(v)}</span>
        <span class="tile-label">${t(l)}</span>
      </div>`
    )
    .join("");
}

/** Aktualizuje dlaždice na místě. Změněné číslo se překlopí. */
function updateTiles(el, ms) {
  const parts = cdParts(ms);
  const tiles = $$(".tile", el);
  const sameShape =
    tiles.length === parts.length && tiles.every((tile, i) => tile.dataset.label === parts[i][1]);
  if (!sameShape) {
    el.innerHTML = tilesHtml(ms);
    return;
  }
  parts.forEach(([v], i) => {
    const num = $(".tile-num", tiles[i]);
    const text = pad(v);
    if (num.textContent !== text) {
      num.textContent = text;
      tiles[i].classList.remove("flip");
      void tiles[i].offsetWidth; // restart animace
      tiles[i].classList.add("flip");
    }
  });
}

function relTime(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h < 24) return r ? `${h} h ${r} min` : `${h} h`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

/* ================================================================== */
/* Mechanika noci                                                       */
/* ================================================================== */

function heldTask(st) {
  const ci = st.currentZoneIndex;
  let ti = -1;
  for (let i = ci; i >= 0; i--) {
    if (isAction(ZONES[i])) {
      ti = i;
      break;
    }
  }
  return { ci, cz: st.currentZone, ti, tz: ti >= 0 ? ZONES[ti] : null };
}

function nextIndex(st) {
  if (st.isAfterLastZone) return -1;
  if (st.isBeforeFirstZone) return 0;
  return st.currentZoneIndex + 1 < TOTAL ? st.currentZoneIndex + 1 : -1;
}

/* ================================================================== */
/* Náhodná kravina, jedna na načtení                                    */
/* ================================================================== */

const FACT = (() => {
  let last = -1;
  try {
    last = parseInt(localStorage.getItem(LS.lastFact) || "-1", 10);
  } catch (e) {
    /* ignore */
  }
  let i = Math.floor(Math.random() * FACTS.length);
  for (let g = 0; i === last && FACTS.length > 1 && g < 20; g++) i = Math.floor(Math.random() * FACTS.length);
  try {
    localStorage.setItem(LS.lastFact, String(i));
  } catch (e) {
    /* ignore */
  }
  return FACTS[i];
})();

const factBlock = () => `
  <div class="fact">
    <p class="fact-kicker">${t("zone.random")}</p>
    <p class="fact-text">${esc(FACT)}</p>
  </div>`;

/* ================================================================== */
/* Router                                                               */
/* ================================================================== */

let route = "auto"; // auto = podle hodin (úvod, zóna, konec)
let shown = null;
let lastKey = "";
let rev = 0; // ruční překreslení (profil, záloha...)

function resolveRoute(st) {
  if (route !== "auto") return route;
  if (st.isAfterLastZone) return "end";
  if (!flag(LS.entered)) return "intro";
  return "zone";
}

function go(to) {
  closeMenu();
  if (to === "zone") {
    setFlag(LS.entered);
    route = "auto";
  } else {
    route = to;
  }
  tick();
}

function keyFor(r, st, now) {
  const base = `${r}|${getLang()}|${P.getActive().id}|${P.progressSet().size}|${rev}`;
  if (r === "intro") return `${base}|${st.isBeforeFirstZone ? "b" : st.isAfterLastZone ? "a" : "r"}`;
  if (r === "zone") {
    if (st.isBeforeFirstZone) return `${base}|before`;
    const ni = nextIndex(st);
    const prev = ni >= 0 && isAction(ZONES[ni]) && st.msUntilNextZone <= CHALLENGE_PREVIEW_MINUTES * 60000;
    const since = now - ZONE_STARTS[st.currentZoneIndex];
    return `${base}|${st.currentZoneIndex}|${prev}|${since >= 0 && since < NOW_FLASH_SECONDS * 1000}`;
  }
  if (r === "map") return `${base}|${st.currentZoneIndex}|${st.isBeforeFirstZone}|${Math.floor(st.msUntilNextZone / 60000)}`;
  return base;
}

const RENDER = {
  intro: renderIntro,
  rules: renderRules,
  zone: renderZone,
  map: renderMap,
  profile: renderProfile,
  about: renderAbout,
  end: renderEnd,
};

function tick() {
  const now = getEffectiveTime();
  const st = resolveNight(ZONES, now);

  renderTopbar();
  renderDemoBar();

  const r = resolveRoute(st);
  if (r !== shown) {
    $$(".screen").forEach((el) => (el.hidden = el.id !== `screen-${r}`));
    shown = r;
    lastKey = "";
    window.scrollTo(0, 0);
    setFxLevel(r === "intro" || r === "end" ? 0.55 : 0.18);
  }
  const key = keyFor(r, st, now);
  if (key !== lastKey) {
    RENDER[r](st, now);
    lastKey = key;
  }

  $$(".js-cd").forEach((el) => updateTiles(el, el.dataset.cd === "first" ? st.msUntilFirstZone : st.msUntilNextZone));
  updateBig(st, now);
}

/* ================================================================== */
/* Horní lišta, menu, demo                                              */
/* ================================================================== */

function setHtml(el, html) {
  if (el && el.innerHTML !== html) el.innerHTML = html;
}

const langPill = () => (getLang() === "cs" ? "<b>CZ</b><span>EN</span>" : "<span>CZ</span><b>EN</b>");

function renderTopbar() {
  setHtml($(".js-progress"), `${P.progressSet().size} / ${TOTAL}`);
  setHtml($(".js-lang"), langPill());
  setHtml($(".js-avatar"), esc(initialOf(P.getActive())));
  setHtml($(".js-by"), t("by"));
}

function openMenu() {
  const items = [
    ["intro", t("menu.intro")],
    ["zone", t("menu.zone")],
    ["map", t("menu.map")],
    ["rules", t("menu.rules")],
    ["profile", t("menu.profile")],
    ["about", t("menu.about")],
  ];
  $("#menu-sheet").innerHTML = `
    <p class="menu-title">${t("menu.title")}</p>
    ${items.map(([to, l]) => `<button class="menu-item${shown === to || (to === "zone" && shown === "zone") ? " is-on" : ""}" data-act="go" data-to="${to}">${l}</button>`).join("")}
    <div class="menu-row"><span>${t("menu.lang")}</span><button class="lang-pill" data-act="lang">${langPill()}</button></div>
    <button class="menu-item menu-demo" data-act="demo-toggle">${isDemoActive() ? t("demo.on") : t("demo.off")}</button>
    <p class="menu-by">${t("by")}</p>`;
  $("#menu").hidden = false;
}

function closeMenu() {
  $("#menu").hidden = true;
}

let demoKey = "";
function renderDemoBar() {
  const bar = $("#demo-bar");
  const key = `${isDemoActive()}|${getLang()}`;
  if (key === demoKey) return;
  demoKey = key;
  bar.hidden = !isDemoActive();
  if (!isDemoActive()) {
    bar.innerHTML = "";
    return;
  }
  const b = (a, l) => `<button class="demo-btn" data-act="${a}">${l}</button>`;
  bar.innerHTML = `
    <span class="demo-label">${t("demo.label")}</span>
    <div class="demo-btns">
      ${b("demo-first", t("demo.first"))}${b("demo-prev", t("demo.prev"))}${b("demo-next", t("demo.next"))}
      ${b("demo-plus1", t("demo.plus1"))}${b("demo-plus5", t("demo.plus5"))}${b("demo-before", t("demo.before"))}
      ${b("demo-end", t("demo.end"))}${b("demo-toggle", t("demo.on"))}
    </div>`;
}

/* ================================================================== */
/* Společné kousky                                                      */
/* ================================================================== */

const emailForm = (k) => `
  <div class="email-block">
    <p class="email-kicker">${t(k)}</p>
    <form class="email-form" data-form="email">
      <input type="email" required placeholder="${t("email.placeholder")}" class="input" aria-label="email" />
      <button class="btn btn-ghost" type="submit">${t("email.btn")}</button>
    </form>
    <p class="email-ok" aria-live="polite"></p>
  </div>`;

const head = (title, sub) => `
  <div class="screen-head">
    <h1 class="h1">${title}</h1>
    ${sub ? `<p class="sub">${sub}</p>` : ""}
  </div>`;

/* ================================================================== */
/* Úvod / coming soon                                                   */
/* ================================================================== */

function renderIntro(st) {
  const phase = st.isBeforeFirstZone ? "before" : st.isAfterLastZone ? "over" : "running";
  const how = [1, 2, 3]
    .map(
      (i) => `
      <div class="how-card how-${i}">
        <span class="num-badge">${i}</span>
        <p class="how-title">${t(`intro.how${i}t`)}</p>
        <p class="how-desc">${t(`intro.how${i}d`)}</p>
      </div>`
    )
    .join("");

  $("#screen-intro").innerHTML = `
    <div class="intro-hero">
      <span class="sticker sticker-a">25 h</span>
      <span class="sticker sticker-b">0 % alkoholu letos</span>
      <h1 class="wordmark">
        <span class="w1">${t("intro.l1")}</span>
        <span class="w2">${t("intro.l2")}</span>
        <span class="w3">${t("intro.l3", { n: TOTAL })}</span>
      </h1>
      <p class="lead">${t("intro.sub")}</p>
    </div>

    ${
      phase === "before"
        ? `<p class="kicker">${t("intro.countKicker")}</p>
           <div class="tiles tiles-xl js-cd" data-cd="first">${tilesHtml(st.msUntilFirstZone)}</div>`
        : `<p class="phase-note">${phase === "running" ? t("intro.running") : t("intro.over")}</p>`
    }

    <button class="btn btn-primary btn-big btn-block" data-act="start">${phase === "before" ? t("intro.cta") : t("intro.ctaRunning")}</button>

    ${emailForm("email.kicker")}

    <p class="kicker">${t("intro.howTitle")}</p>
    <div class="how">${how}</div>

    <p class="foot-note">${t("intro.foot", { n: TOTAL })}</p>`;
}

/* ================================================================== */
/* Pravidla                                                             */
/* ================================================================== */

function renderRules() {
  const rules = [1, 2, 3, 4, 5]
    .map(
      (i) => `
      <div class="rule">
        <span class="num-badge">${i}</span>
        <div>
          <p class="rule-title">${t(`rules.${i}t`, { n: TOTAL })}</p>
          <p class="rule-desc">${t(`rules.${i}d`, { n: TOTAL, m: CHALLENGE_PREVIEW_MINUTES })}</p>
          ${i === 3 ? `<p class="rule-extra">${t("rules.3x")}</p>` : ""}
        </div>
      </div>`
    )
    .join("");

  $("#screen-rules").innerHTML = `
    ${head(t("rules.title"), t("rules.sub"))}
    ${rules}
    <div class="card card-green">
      <p class="card-kicker green">${t("rules.pauseT")}</p>
      <p>${t("rules.pauseD")}</p>
    </div>
    <button class="btn btn-primary btn-big btn-block" data-act="rules-done">${t("rules.cta")}</button>
    <p class="foot-note">${t("rules.foot")}</p>`;
}

/* ================================================================== */
/* Obrazovka zóny                                                       */
/* ================================================================== */

const LUPA = `<svg class="lupa" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"></circle><line x1="15" y1="15" x2="21" y2="21"></line></svg>`;

function topCountdown(st, activeId) {
  const ni = nextIndex(st);
  const chip = `
    <button class="map-chip" data-act="go" data-to="map" aria-label="${t("zone.mapChip")}">
      <span class="map-chip-label">${t("zone.mapChip")} ${LUPA}</span>
      ${mapSvg({ zones: ZONES, activeId, doneIds: P.progressSet(), mini: true })}
    </button>`;
  const main =
    ni < 0
      ? `<p class="kicker">${t("zone.last")}</p>`
      : `<p class="kicker">${st.isBeforeFirstZone ? t("zone.firstIn") : t("zone.nextIn")}</p>
         <div class="tiles js-cd" data-cd="next">${tilesHtml(st.msUntilNextZone)}</div>`;
  return `<div class="top-cd"><div class="top-cd-main">${main}</div>${chip}</div>`;
}

function nextPrep(st) {
  const ni = nextIndex(st);
  if (ni < 0) return "";
  const z = ZONES[ni];
  const prep = (zf(z, "prep") || "").trim() || t("zone.nothing");
  return `
    <div class="next-prep">
      <p class="next-prep-zone">${t("zone.nextZone")} <strong>${esc(z.label)}</strong> (${z.czTime}, ${formatCzDate(ZONE_STARTS[ni])})</p>
      <p class="next-prep-line">${esc(prep)}</p>
    </div>`;
}

function previewCard(st) {
  const ni = nextIndex(st);
  if (ni < 0) return "";
  const z = ZONES[ni];
  if (!isAction(z) || st.msUntilNextZone > CHALLENGE_PREVIEW_MINUTES * 60000) return "";
  return `
    <div class="card card-preview">
      <p class="card-kicker pink">${t("zone.preview")}</p>
      <p class="preview-zone">${esc(z.label)} <span class="dim">(${z.czTime})</span></p>
      <p>${md(zf(z, "challenge"))}</p>
    </div>`;
}

function checkinFor() {
  const n = P.presentProfiles().length;
  return n > 1 ? `<p class="checkin-for">${t("zone.checkinFor", { n })}</p>` : "";
}

function renderZone(st, now) {
  const host = $("#screen-zone");
  const done = P.progressSet();

  if (st.isBeforeFirstZone) {
    host.innerHTML = `
      ${topCountdown(st, null)}
      <div class="zone-head">
        <p class="zone-time">${t("zone.waitTitle")}</p>
        <h1 class="zone-label">${esc(ZONES[0].label)}</h1>
        <p class="lead">${t("zone.waitSub")}</p>
      </div>
      ${nextPrep(st)}
      ${factBlock()}`;
    return;
  }

  const { ci, cz, ti, tz } = heldTask(st);
  const start = ZONE_STARTS[ci];
  const since = now - start;
  const pause = cz.celebrates === false;
  const flash =
    isAction(cz) && ci === ti && since >= 0 && since < NOW_FLASH_SECONDS * 1000
      ? `<span class="now-flash">${t("zone.now.badge")}</span>`
      : "";
  const about = zf(cz, "about") || t("zone.aboutPh", { off: cz.utcOffset });

  const headHtml = `
    <div class="zone-head">
      <p class="zone-time">${cz.czTime} <span class="dim">${t("zone.home")}, ${formatCzDate(start)}</span> ${flash}</p>
      <h1 class="zone-label">${esc(cz.label)}</h1>
      <div class="zone-tags">
        ${cz.intensity === "MEGA" ? `<span class="badge-mega">MEGA</span>` : ""}
        <span class="badge-step">${ci + 1} / ${TOTAL}</span>
      </div>
      ${pause ? `<p class="pause-tag">${t("zone.pause")}</p>` : ""}
      ${cz.merge ? `<p class="merge-note">${esc(cz.merge)}</p>` : ""}
    </div>
    <div class="card card-about">
      <p class="card-kicker blue">${t("zone.about")}</p>
      <p>${md(about)}</p>
    </div>
    <div class="card card-perl">
      <p class="card-kicker pink">${t("zone.perl")}</p>
      <p class="perl-text">${md(zf(cz, "perlicka"))}</p>
    </div>
    <div class="card card-soft">
      <p class="card-kicker">${t("zone.trad")}</p>
      <p>${md(zf(cz, "tradition"))}</p>
    </div>`;

  let action = "";
  if (pause) {
    action = `
      ${
        tz
          ? `<div class="card card-held">
               <p class="card-kicker">${t("zone.heldPause", { t: tz.czTime, z: esc(tz.label) })}</p>
               <p>${md(zf(tz, "challenge"))}</p>
             </div>`
          : ""
      }
      <div class="checkin">
        <p class="checkin-micro">${t("zone.aliveMicro")}</p>
        <button class="btn btn-alive btn-big btn-block" data-act="checkin" data-zone="${cz.id}">
          ${done.has(cz.id) ? t("zone.aliveDone") : t("zone.alive")}
        </button>
        ${checkinFor()}
        <p class="checkin-note">${t("zone.checkinNote")}</p>
      </div>`;
  } else {
    const a = isAction(cz) ? cz : tz;
    if (a) {
      const penalty = zf(a, "symbolicPenaltyNote");
      action = `
        ${a.id !== cz.id ? `<p class="held-hint">${t("zone.held", { t: a.czTime, z: esc(a.label) })}</p>` : ""}
        <div class="card card-challenge">
          <p class="card-kicker gold">${t("zone.now")}</p>
          <p class="challenge-text">${md(zf(a, "challenge"))}</p>
          ${penalty ? `<p class="penalty"><strong>${t("zone.penalty")}</strong> ${md(penalty)}</p>` : ""}
        </div>
        <div class="checkin">
          <button class="btn btn-primary btn-big btn-block" data-act="checkin" data-zone="${a.id}">
            ${done.has(a.id) ? t("zone.checkinAgain") : t("zone.checkin")}
          </button>
          ${checkinFor()}
          <p class="checkin-note">${t("zone.checkinNote")}</p>
        </div>`;
    }
  }

  host.innerHTML = `
    ${topCountdown(st, cz.id)}
    ${previewCard(st)}
    ${headHtml}
    ${action}
    ${factBlock()}
    ${nextPrep(st)}
    <p class="counter-note">${t("zone.counter", { p: `<strong>${done.size} / ${TOTAL}</strong>` })}</p>`;
}

/* ================================================================== */
/* Velké odpočítávání přes celý displej                                 */
/* ================================================================== */

let bigDismissed = -1;
let bigBurstFor = -1;

function updateBig(st, now) {
  const el = $("#big-countdown");
  let mode = null;
  let zone = null;
  let idx = -1;
  let secs = 0;

  const ni = nextIndex(st);
  if (ni >= 0 && st.msUntilNextZone > 0 && st.msUntilNextZone <= BIG_COUNTDOWN_SECONDS * 1000 && ZONES[ni].celebrates) {
    mode = "count";
    zone = ZONES[ni];
    idx = ni;
    secs = Math.ceil(st.msUntilNextZone / 1000);
  }
  if (!mode && !st.isBeforeFirstZone && !st.isAfterLastZone) {
    const ci = st.currentZoneIndex;
    const since = now - ZONE_STARTS[ci];
    if (since >= 0 && since < BIG_NOW_SECONDS * 1000 && isAction(ZONES[ci])) {
      mode = "now";
      zone = ZONES[ci];
      idx = ci;
    }
  }

  const here = shown === "zone" || shown === "map";
  if (!mode || idx === bigDismissed || !here) {
    if (!el.hidden) {
      el.hidden = true;
      el.innerHTML = "";
      el.dataset.key = "";
      document.body.classList.remove("no-scroll");
    }
    return;
  }

  const key = `${mode}|${idx}|${secs}|${getLang()}`;
  if (el.dataset.key === key) return;
  el.dataset.key = key;
  el.dataset.idx = String(idx);
  el.hidden = false;
  document.body.classList.add("no-scroll");

  if (mode === "count") {
    const prep = (zf(zone, "prep") || "").trim() || t("zone.nothing");
    el.innerHTML = `
      <div class="big-inner">
        <p class="big-kicker">${t("big.celebrates", { z: esc(zone.label) })}</p>
        <div class="big-ring"><span class="big-num">${secs}</span></div>
        <p class="big-prep">${esc(prep)}</p>
        ${isAction(zone) ? `<div class="big-card"><p class="card-kicker gold">${t("big.ready")}</p><p>${md(zf(zone, "challenge"))}</p></div>` : ""}
        <p class="big-tap">${t("big.tap")}</p>
      </div>`;
  } else {
    if (bigBurstFor !== idx) {
      bigBurstFor = idx;
      burst(zone.intensity === "MEGA" ? 6 : 3);
    }
    el.innerHTML = `
      <div class="big-inner">
        <p class="big-kicker">${esc(zone.label)}</p>
        <div class="big-ring big-ring-now"><span class="big-num big-num-now">${t("big.now")}</span></div>
        <p class="big-prep">${t("big.go", { z: esc(zone.label) })}</p>
        <p class="big-tap">${t("big.tap")}</p>
      </div>`;
  }
}

/* ================================================================== */
/* Mapa (náčrt)                                                         */
/* ================================================================== */

const mapState = { s: 1, tx: 0, ty: 0, init: false };

function mapDims() {
  const stage = $("#map-stage");
  if (!stage) return null;
  const W = stage.clientWidth;
  return { W, Hs: stage.clientHeight, Hm: (W * MAP_VIEWBOX.h) / MAP_VIEWBOX.w };
}

function applyMap() {
  const inner = $("#map-inner");
  const d = mapDims();
  if (!inner || !d) return;
  const { W, Hs, Hm } = d;
  const s = mapState.s;
  mapState.tx = Math.min(W * 0.25, Math.max(W - W * s - W * 0.25, mapState.tx));
  mapState.ty = Math.min(Math.max(Hs * 0.25, (Hs - Hm * s) / 2), Math.max(Math.min(Hs - Hm * s - Hs * 0.25, (Hs - Hm * s) / 2), mapState.ty));
  inner.style.transform = `translate(${mapState.tx}px, ${mapState.ty}px) scale(${s})`;
}

function zoomMap(f, cx, cy) {
  const d = mapDims();
  if (!d) return;
  const ox = cx == null ? d.W / 2 : cx;
  const oy = cy == null ? d.Hs / 2 : cy;
  const ns = Math.min(6, Math.max(1, mapState.s * f));
  mapState.tx = ox - (ox - mapState.tx) * (ns / mapState.s);
  mapState.ty = oy - (oy - mapState.ty) * (ns / mapState.s);
  mapState.s = ns;
  applyMap();
}

function centerMap(id, scale) {
  const d = mapDims();
  if (!d) return;
  const p = id ? zonePoint(id) : null;
  if (!p) {
    Object.assign(mapState, { s: 1, tx: 0, ty: (d.Hs - d.Hm) / 2 });
  } else {
    const px = ((p[0] - MAP_VIEWBOX.x) / MAP_VIEWBOX.w) * d.W;
    const py = ((p[1] - MAP_VIEWBOX.y) / MAP_VIEWBOX.h) * d.Hm;
    Object.assign(mapState, { s: scale, tx: d.W / 2 - px * scale, ty: d.Hs / 2 - py * scale });
  }
  applyMap();
}

function wireMap() {
  const stage = $("#map-stage");
  if (!stage) return;
  const pts = new Map();
  let start = null;

  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    start = { tx: mapState.tx, ty: mapState.ty, pts: new Map(pts), s: mapState.s };
    stage.classList.add("dragging");
  });
  stage.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId) || !start) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const now = [...pts.values()];
    const was = [...start.pts.values()];
    if (now.length >= 2 && was.length >= 2) {
      // dva prsty: přiblížení
      const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const f = dist(now[0], now[1]) / Math.max(1, dist(was[0], was[1]));
      const r = stage.getBoundingClientRect();
      const cx = (now[0].x + now[1].x) / 2 - r.left;
      const cy = (now[0].y + now[1].y) / 2 - r.top;
      const target = Math.min(6, Math.max(1, start.s * f));
      zoomMap(target / mapState.s, cx, cy);
    } else if (now.length === 1) {
      const a = now[0];
      const b = was[0];
      mapState.tx = start.tx + (a.x - b.x);
      mapState.ty = start.ty + (a.y - b.y);
      applyMap();
    }
  });
  const up = (e) => {
    pts.delete(e.pointerId);
    start = pts.size ? { tx: mapState.tx, ty: mapState.ty, pts: new Map(pts), s: mapState.s } : null;
    if (!pts.size) stage.classList.remove("dragging");
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomMap(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top);
    },
    { passive: false }
  );
}

const activeZoneId = (st) => (!st.isBeforeFirstZone && !st.isAfterLastZone ? st.currentZone.id : null);

function renderMap(st, now) {
  const activeId = activeZoneId(st);
  const from = st.isBeforeFirstZone ? 0 : st.currentZoneIndex;
  const rows = ZONES.slice(from, from + 6)
    .map((z, k) => {
      const i = from + k;
      const isNow = z.id === activeId;
      return `
        <div class="up-row${isNow ? " up-row-now" : ""}">
          <span>${z.czTime}&nbsp;&nbsp;${esc(z.label)}</span>
          ${isNow ? `<span class="up-now">${t("map.nowTag")}</span>` : `<span class="up-in">${t("map.in", { t: relTime(ZONE_STARTS[i] - now) })}</span>`}
        </div>`;
    })
    .join("");

  $("#screen-map").innerHTML = `
    ${head(t("map.title"), activeId ? t("map.sub") : t("map.before"))}
    <div class="map-stage" id="map-stage">
      <div class="map-inner" id="map-inner">${mapSvg({ zones: ZONES, activeId, doneIds: P.progressSet() })}</div>
      <div class="map-ctrls">
        <button data-act="zoom" data-f="1.4" aria-label="+">+</button>
        <button data-act="zoom" data-f="0.71" aria-label="-">&minus;</button>
        <button data-act="center">${t("map.center")}</button>
      </div>
    </div>
    <div class="legend">
      <span><i class="lg lg-now"></i>${t("map.legendNow")}</span>
      <span><i class="lg lg-done"></i>${t("map.legendDone")}</span>
      <span><i class="lg lg-other"></i>${t("map.legendOther")}</span>
    </div>
    <p class="map-note">${t("map.note")}</p>
    <p class="kicker">${t("map.upcoming")}</p>
    <div class="upcoming">${rows}</div>
    <div class="btn-row">
      <button class="btn btn-primary" data-act="share-zone">${t("map.share")}</button>
      <button class="btn btn-ghost" data-act="go" data-to="zone">${t("map.back")}</button>
    </div>`;

  wireMap();
  if (!mapState.init) {
    mapState.init = true;
    requestAnimationFrame(() => centerMap(activeId, activeId ? 2.2 : 1));
  } else {
    applyMap();
  }
}

/* ================================================================== */
/* Ty a tvoje parta                                                     */
/* ================================================================== */

let backupMode = null;
let backupMsg = "";
let editId = null; // účet, kterému se právě píše jméno ("new" = nový účet)
let delId = null; // účet čekající na potvrzení smazání

function nameForm(id, value) {
  return `
    <form class="name-form" data-form="name" data-id="${id}">
      <input class="input" name="n" maxlength="30" value="${esc(value)}" placeholder="${t("profile.namePrompt")}" autocomplete="off" />
      <button class="btn btn-primary btn-small" type="submit">OK</button>
    </form>`;
}

function renderProfile() {
  const me = P.getActive();
  const group = P.getGroup();

  const crew = P.getProfiles()
    .map((p) => {
      const holder = p.id === me.id;
      const here = holder || p.present;
      if (editId === p.id) return `<div class="crew-row is-here">${nameForm(p.id, p.name)}</div>`;
      const confirmDel = delId === p.id;
      return `
        <div class="crew-row${here ? " is-here" : ""}">
          <span class="avatar avatar-sm${holder ? " avatar-holder" : ""}">${esc(initialOf(p))}</span>
          <div class="crew-main">
            <p class="crew-name">${esc(nameOf(p))}</p>
            <p class="crew-sub">${holder ? t("profile.holder") : here ? t("profile.present") : t("profile.away")}, ${p.progress.length} / ${TOTAL}</p>
          </div>
          ${
            confirmDel
              ? `<button class="btn btn-danger btn-small" data-act="delete" data-id="${p.id}">${t("profile.deleteSure")}</button>
                 <button class="btn btn-ghost btn-small" data-act="delete-cancel">${t("profile.no")}</button>`
              : `${
                  holder
                    ? `<button class="btn btn-ghost btn-small" data-act="rename" data-id="${p.id}">${t("profile.rename")}</button>`
                    : `<button class="chip-toggle${here ? " on" : ""}" data-act="present" data-id="${p.id}" aria-pressed="${here}">${here ? t("profile.present") : t("profile.away")}</button>
                       <button class="btn btn-ghost btn-small" data-act="switch" data-id="${p.id}">${t("profile.makeHolder")}</button>`
                }
                <button class="icon-del" data-act="delete-ask" data-id="${p.id}" aria-label="${t("profile.delete")}" title="${t("profile.delete")}">&times;</button>`
          }
        </div>`;
    })
    .join("");

  let backupArea = "";
  if (backupMode === "export") {
    backupArea = `
      <p class="small">${t("profile.backupCode")}</p>
      <textarea class="code-area" id="backup-out" readonly>${esc(P.exportCode())}</textarea>
      <button class="btn btn-ghost btn-small" data-act="copy-backup">${t("profile.copy")}</button>`;
  } else if (backupMode === "import") {
    backupArea = `
      <textarea class="code-area" id="backup-in" placeholder="${t("profile.restorePh")}"></textarea>
      <button class="btn btn-primary btn-small" data-act="do-restore">${t("profile.restoreBtn")}</button>`;
  }

  $("#screen-profile").innerHTML = `
    ${head(t("profile.title"), t("profile.sub"))}

    <div class="card acc-card">
      <span class="avatar">${esc(initialOf(me))}</span>
      <div class="acc-main">
        <p class="acc-title">${esc(nameOf(me))}</p>
        <p class="dim">${t("profile.zones", { p: `${me.progress.length} / ${TOTAL}` })}</p>
      </div>
    </div>

    <p class="kicker">${t("profile.crewPhone")}</p>
    <div class="crew-list">${crew}</div>
    ${
      editId === "new"
        ? `<div class="crew-row is-here crew-new">${nameForm("new", "")}</div>`
        : `<button class="btn btn-ghost btn-block" data-act="add-account">${t("profile.add")}</button>`
    }
    <p class="small dim hint">${t("profile.crewHint")}</p>

    <div class="card card-invite">
      <p class="card-kicker pink">${t("profile.inviteT")}</p>
      ${group ? `<p class="small">${t("profile.group", { g: esc(group.name) })}</p>` : ""}
      <p>${t("profile.inviteD")}</p>
      <div class="invite-row">
        <input class="input input-code" id="invite-link" readonly value="${esc(P.inviteLink())}" />
        <button class="btn btn-primary btn-small" data-act="copy-invite">${t("profile.copy")}</button>
      </div>
      <p class="small dim">${t("profile.inviteNote")}</p>
    </div>

    <div class="card">
      <p class="card-kicker gold">${t("profile.backupT")}</p>
      <p>${t("profile.backupD")}</p>
      <div class="btn-row">
        <button class="btn btn-ghost" data-act="backup">${t("profile.backup")}</button>
        <button class="btn btn-ghost" data-act="restore">${t("profile.restore")}</button>
      </div>
      ${backupArea}
      ${backupMsg ? `<p class="small backup-msg">${backupMsg}</p>` : ""}
    </div>

    <p class="foot-note">${t("profile.foot")}</p>`;
}

async function copyText(text, input) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    if (!input) return false;
    input.select();
    try {
      return document.execCommand("copy");
    } catch (err) {
      return false;
    }
  }
}

/* ================================================================== */
/* O projektu, konec noci                                               */
/* ================================================================== */

function renderAbout() {
  $("#screen-about").innerHTML = `
    ${head(t("about.title"))}
    <div class="card"><p>${t("about.p1", { n: TOTAL })}</p></div>
    <div class="card card-soft"><p>${t("about.p2")}</p></div>
    <div class="card card-perl"><p>${t("about.p3")}</p></div>
    <button class="btn btn-ghost btn-block" data-act="go" data-to="intro">${t("about.back")}</button>`;
}

function renderEnd() {
  const n = P.progressSet().size;
  const line = n === 0 ? t("end.l0") : n < 10 ? t("end.l1") : n < TOTAL ? t("end.l2") : t("end.l3", { n: TOTAL });
  $("#screen-end").innerHTML = `
    <div class="end">
      <p class="kicker center">${t("end.kicker")}</p>
      <p class="end-done">${t("end.done")}</p>
      <p class="end-num">${n}</p>
      <p class="end-of">${t("end.of", { n: TOTAL })}</p>
      <p class="end-line">${line}</p>
      <div class="card card-share">
        <p class="card-kicker pink">${t("end.shareKicker")}</p>
        <p class="share-line">${t("end.shareLine", { x: n })}</p>
        <p class="small dim">${t("end.shareSub")}</p>
      </div>
      <button class="btn btn-primary btn-big btn-block" data-act="share-end">${t("end.shareBtn")}</button>
      <p class="disclaimer">${t("end.disc")}</p>
      ${emailForm("email.kickerEnd")}
      <p class="foot-note">${t("end.noBoxes")}</p>
    </div>`;
}

async function doShare(opts) {
  try {
    const res = await shareCard({ ...opts, brand: t("brand"), by: t("by") });
    if (res === "downloaded") toast(t("share.saved"));
  } catch (e) {
    console.error(e);
    toast(t("share.fail"));
  }
}

/* ================================================================== */
/* Události                                                             */
/* ================================================================== */

function demoJump(delta) {
  const st = resolveNight(ZONES, getEffectiveTime());
  const base = st.isBeforeFirstZone ? (delta > 0 ? -1 : 0) : st.currentZoneIndex;
  setDemoToZone(ZONES, Math.max(0, Math.min(TOTAL - 1, base + delta)));
  setFlag(LS.entered);
  route = "auto";
}

function rerender() {
  rev++;
  tick();
}

function focusName() {
  const input = $('[data-form="name"] input');
  if (input) {
    input.focus();
    input.select();
  }
}

const ACTIONS = {
  go: (el) => go(el.dataset.to),
  menu: () => ($("#menu").hidden ? openMenu() : closeMenu()),
  lang: () => {
    setLang(getLang() === "cs" ? "en" : "cs");
    demoKey = "";
    if (!$("#menu").hidden) openMenu();
    rerender();
  },
  start: () => go(flag(LS.rules) ? "zone" : "rules"),
  "rules-done": () => {
    setFlag(LS.rules);
    go("zone");
  },
  checkin: (el) => {
    try {
      window.open(INSTAGRAM_URL, "_blank", "noopener");
    } catch (e) {
      /* popup zablokovaný, zapíše se stejně */
    }
    const who = P.addCheckin(el.dataset.zone);
    if (who.length > 1) toast(t("zone.savedFor", { names: who.map(nameOf).join(", ") }));
    rerender();
  },
  zoom: (el) => zoomMap(parseFloat(el.dataset.f)),
  center: () => {
    const id = activeZoneId(resolveNight(ZONES, getEffectiveTime()));
    centerMap(id, id ? 2.6 : 1);
  },
  "share-zone": async () => {
    const st = resolveNight(ZONES, getEffectiveTime());
    if (st.isBeforeFirstZone || st.isAfterLastZone) return toast(t("map.before"));
    await doShare({
      kicker: st.currentZone.label,
      big: `${st.currentZoneIndex + 1}/${TOTAL}`,
      line: t("share.zoneLine", { i: st.currentZoneIndex + 1, n: TOTAL }),
      sub: t("share.zoneSub", { z: st.currentZone.label }),
    });
  },
  "share-end": async () => {
    const n = P.progressSet().size;
    await doShare({ kicker: t("share.endKicker"), big: String(n), line: t("share.endLine", { x: n }), sub: t("share.endSub") });
  },
  rename: (el) => {
    editId = el.dataset.id;
    delId = null;
    rerender();
    focusName();
  },
  "add-account": () => {
    editId = "new";
    delId = null;
    rerender();
    focusName();
  },
  switch: (el) => {
    P.setActive(el.dataset.id);
    rerender();
  },
  present: (el) => {
    P.togglePresent(el.dataset.id);
    rerender();
  },
  "delete-ask": (el) => {
    delId = el.dataset.id;
    editId = null;
    rerender();
  },
  "delete-cancel": () => {
    delId = null;
    rerender();
  },
  delete: (el) => {
    const p = P.getProfiles().find((x) => x.id === el.dataset.id);
    delId = null;
    if (!p) return rerender();
    P.deleteProfile(p.id);
    toast(t("profile.deleted"));
    rerender();
  },
  "copy-invite": async () => {
    const ok = await copyText(P.inviteLink(), $("#invite-link"));
    toast(ok ? t("profile.copied") : P.inviteLink());
  },
  backup: () => {
    backupMode = backupMode === "export" ? null : "export";
    backupMsg = "";
    rerender();
  },
  restore: () => {
    backupMode = backupMode === "import" ? null : "import";
    backupMsg = "";
    rerender();
  },
  "copy-backup": async () => {
    const ok = await copyText(P.exportCode(), $("#backup-out"));
    toast(ok ? t("profile.copied") : t("share.fail"));
  },
  "do-restore": () => {
    const ok = P.importCode(($("#backup-in") || {}).value || "");
    backupMode = ok ? null : backupMode;
    backupMsg = ok ? t("profile.restoreOk") : t("profile.restoreBad");
    rerender();
  },
  "demo-toggle": () => {
    setDemoActive(!isDemoActive());
    demoKey = "";
    closeMenu();
    tick();
  },
  "demo-first": () => {
    setDemoToZone(ZONES, 0);
    setFlag(LS.entered);
    route = "auto";
    tick();
  },
  "demo-prev": () => {
    demoJump(-1);
    tick();
  },
  "demo-next": () => {
    demoJump(1);
    tick();
  },
  "demo-plus1": () => {
    advanceDemo(1);
    tick();
  },
  "demo-plus5": () => {
    advanceDemo(5);
    tick();
  },
  "demo-before": () => {
    const ni = nextIndex(resolveNight(ZONES, getEffectiveTime()));
    if (ni >= 0) {
      setDemoClock(ZONE_STARTS[ni] - 15000);
      setFlag(LS.entered);
      bigDismissed = -1;
      if (route !== "map") route = "auto";
    }
    tick();
  },
  "demo-end": () => {
    setDemoToZone(ZONES, TOTAL - 1);
    advanceDemo(31);
    route = "auto";
    tick();
  },
};

function wireEvents() {
  document.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    if (target === $("#menu")) return closeMenu();

    const big = target.closest("#big-countdown");
    if (big) {
      bigDismissed = parseInt(big.dataset.idx || "-1", 10);
      big.hidden = true;
      big.dataset.key = "";
      document.body.classList.remove("no-scroll");
      return;
    }

    const el = target.closest("[data-act]");
    if (el && ACTIONS[el.dataset.act]) ACTIONS[el.dataset.act](el);
  });

  document.addEventListener("submit", (e) => {
    const nameF = e.target instanceof Element ? e.target.closest('[data-form="name"]') : null;
    if (nameF) {
      e.preventDefault();
      const val = ($("input", nameF).value || "").trim();
      const id = nameF.dataset.id;
      if (val) {
        if (id === "new") P.addProfile(val);
        else P.renameProfile(id, val);
      }
      editId = null;
      rerender();
      return;
    }
    const form = e.target instanceof Element ? e.target.closest('[data-form="email"]') : null;
    if (!form) return;
    e.preventDefault();
    const input = $("input", form);
    const email = input ? input.value.trim() : "";
    if (!email) return;
    try {
      const arr = JSON.parse(localStorage.getItem(LS.email) || "[]");
      const list = Array.isArray(arr) ? arr : [];
      if (!list.includes(email)) list.push(email);
      localStorage.setItem(LS.email, JSON.stringify(list));
    } catch (err) {
      /* ignore */
    }
    const ok = $(".email-ok", form.parentElement);
    if (ok) ok.textContent = t("email.ok");
    input.value = "";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", () => shown === "map" && applyMap());
}

/* ================================================================== */
/* Pozvánka, service worker, start                                      */
/* ================================================================== */

function handleInvite() {
  try {
    const q = new URLSearchParams(window.location.search);
    const code = q.get("parta");
    if (!code) return;
    const g = P.joinGroup(code, q.get("jmeno") || "parta");
    if (g) setTimeout(() => toast(t("profile.joined", { g: g.name })), 400);
  } catch (e) {
    /* ignore */
  }
}

function registerSW() {
  const ok = location.protocol === "http:" || location.protocol === "https:";
  if (!ok || !("serviceWorker" in navigator)) return;
  // Když se nainstaluje nová verze, jednou obnov stránku, ať nikdo nevisí na staré.
  let reloaded = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* bez service workeru appka jede dál */
    });
  });
}

function boot() {
  document.documentElement.lang = getLang();
  initFx($("#fx"));
  initDemoFromQuery(window.location.search);
  handleInvite();
  wireEvents();
  subscribe(tick);
  tick();
  registerSW();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
