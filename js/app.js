/**
 * app.js, router, stav a vykreslování New Year Bundle PWA (fáze 1).
 *
 * Vanilla ES moduly, žádný framework, žádný build. Data jsou v zones.js,
 * čas a demo mód v time.js.
 *
 * Mechanika noci: AKTIVNÍ ÚKOL je poslední zóna, co nese akci (celebrates a
 * challenge). Info zóny (pauzy) úkol neposouvají, jen přidají kontext. Odpočet
 * vždy míří na nejbližší další zónu. 5 minut předem se ukáže náhled výzvy,
 * posledních 10 vteřin jede velké odpočítávání přes celý displej.
 *
 * Výkon: obrazovka se překreslí jen když se změní její "klíč" (jiná zóna,
 * jiný jazyk, nový check-in...). Každý tik se aktualizují jen čísla odpočtu,
 * takže tlačítka neblikají a kliky se neztrácí.
 */

import ZONES from "./zones.js";
import FACTS from "./facts.js";
import { t, zf, getLang, setLang } from "./i18n.js";
import * as P from "./profiles.js";
import { mapSvg, zonePoint, MAP_VIEWBOX } from "./map.js";
import { shareCard } from "./share.js";
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

/* ------------------------------------------------------------------ */
/* Laditelné konstanty                                                  */
/* ------------------------------------------------------------------ */

const CHALLENGE_PREVIEW_MINUTES = 5; // náhled výzvy předem
const NOW_FLASH_SECONDS = 90; // jak dlouho svítí štítek TEĎ u zóny
const BIG_COUNTDOWN_SECONDS = 10; // velké 10 9 8 přes celý displej
const BIG_NOW_SECONDS = 4; // jak dlouho po půlnoci svítí velké TEĎ!
const INSTAGRAM_URL = "https://instagram.com/"; // reálný handle TBD

const ZONE_STARTS = computeStarts(ZONES);
const TOTAL = ZONES.length;

const LS = {
  entered: "nyb_entered_night",
  rules: "nyb_rules_seen",
  lastFact: "nyb_last_fact",
  email: "nyb_email",
};

/* ------------------------------------------------------------------ */
/* Drobnosti                                                            */
/* ------------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const pad = (n) => String(n).padStart(2, "0");

function flag(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch (e) {
    return false;
  }
}
function setFlag(key) {
  try {
    localStorage.setItem(key, "1");
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

// Text ze zones.js může mít **tučné** úseky.
function md(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function isActionZone(zone) {
  return !!(zone && zone.celebrates === true && zone.challenge != null);
}

function displayName(p) {
  return (p && p.name) || t("profile.defaultName");
}

function initial(p) {
  return displayName(p).trim().charAt(0).toUpperCase() || "?";
}

let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}

/* ------------------------------------------------------------------ */
/* Odpočet: dlaždice                                                    */
/* ------------------------------------------------------------------ */

// Nad hodinu dny / hodiny / minuty, pod hodinu minuty / vteřiny.
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
      ([v, l]) =>
        `<div class="tile"><span class="tile-num">${pad(v)}</span><span class="tile-label">${t(l)}</span></div>`
    )
    .join("");
}

function relTime(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h < 24) return r ? `${h} h ${r} min` : `${h} h`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

/* ------------------------------------------------------------------ */
/* Mechanika noci: držení úkolu                                         */
/* ------------------------------------------------------------------ */

function computeHeldTask(state) {
  const contextIndex = state.currentZoneIndex;
  let taskIndex = -1;
  for (let i = contextIndex; i >= 0; i--) {
    if (isActionZone(ZONES[i])) {
      taskIndex = i;
      break;
    }
  }
  return {
    contextIndex,
    contextZone: state.currentZone,
    taskIndex,
    taskZone: taskIndex >= 0 ? ZONES[taskIndex] : null,
  };
}

function nextIndex(st) {
  if (st.isAfterLastZone) return -1;
  if (st.isBeforeFirstZone) return 0;
  return st.currentZoneIndex + 1 < TOTAL ? st.currentZoneIndex + 1 : -1;
}

/* ------------------------------------------------------------------ */
/* Náhodná kravina, jedna na načtení                                    */
/* ------------------------------------------------------------------ */

const FACT = (() => {
  let last = -1;
  try {
    last = parseInt(localStorage.getItem(LS.lastFact) || "-1", 10);
  } catch (e) {
    /* ignore */
  }
  let idx = Math.floor(Math.random() * FACTS.length);
  for (let g = 0; idx === last && FACTS.length > 1 && g < 20; g++) {
    idx = Math.floor(Math.random() * FACTS.length);
  }
  try {
    localStorage.setItem(LS.lastFact, String(idx));
  } catch (e) {
    /* ignore */
  }
  return FACTS[idx];
})();

function factBlock() {
  return `
    <div class="fact">
      <p class="fact-kicker">${t("zone.random")}</p>
      <p class="fact-text">${esc(FACT)}</p>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Router                                                               */
/* ------------------------------------------------------------------ */

// "auto" = obrazovka podle hodin (úvod, zóna, konec). Ostatní jsou ruční.
let route = "auto";
let shown = null;
let lastKey = "";
let profileRev = 0;

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

function showScreen(name) {
  $$(".screen").forEach((el) => {
    el.hidden = el.id !== `screen-${name}`;
  });
}

function keyFor(r, st, now) {
  const base = `${r}|${getLang()}|${P.getActive().id}|${P.progressSet().size}`;
  switch (r) {
    case "intro":
      return `${base}|${st.isBeforeFirstZone ? "b" : st.isAfterLastZone ? "a" : "r"}|${flag(LS.rules)}`;
    case "zone": {
      if (st.isBeforeFirstZone) return `${base}|before`;
      const ni = nextIndex(st);
      const previewOn =
        ni >= 0 &&
        isActionZone(ZONES[ni]) &&
        st.msUntilNextZone <= CHALLENGE_PREVIEW_MINUTES * 60000;
      const since = now - ZONE_STARTS[st.currentZoneIndex];
      const flashOn = since >= 0 && since < NOW_FLASH_SECONDS * 1000;
      return `${base}|${st.currentZoneIndex}|${previewOn}|${flashOn}`;
    }
    case "map":
      return `${base}|${st.currentZoneIndex}|${st.isBeforeFirstZone}|${Math.floor(st.msUntilNextZone / 60000)}`;
    case "profile":
      return `${base}|${profileRev}`;
    case "end":
      return base;
    default:
      return base;
  }
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
    showScreen(r);
    shown = r;
    lastKey = "";
    window.scrollTo(0, 0);
  }
  const key = keyFor(r, st, now);
  if (key !== lastKey) {
    RENDER[r](st, now);
    lastKey = key;
  }
  updateCountdowns(st);
  updateBig(st, now);
}

function updateCountdowns(st) {
  $$(".js-cd").forEach((el) => {
    const ms = el.dataset.cd === "first" ? st.msUntilFirstZone : st.msUntilNextZone;
    const html = tilesHtml(ms);
    if (el.dataset.last !== html) {
      el.innerHTML = html;
      el.dataset.last = html;
    }
  });
}

/* ------------------------------------------------------------------ */
/* Horní lišta, menu, demo                                              */
/* ------------------------------------------------------------------ */

function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

function renderTopbar() {
  setText($(".js-progress"), `${P.progressSet().size} / ${TOTAL}`);
  const lang = $(".js-lang");
  const html = getLang() === "cs" ? "<b>CZ</b><span>EN</span>" : "<span>CZ</span><b>EN</b>";
  if (lang && lang.innerHTML !== html) lang.innerHTML = html;
  setText($(".js-by"), t("by"));
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
    ${items.map(([to, label]) => `<button class="menu-item" data-act="go" data-to="${to}">${label}</button>`).join("")}
    <div class="menu-row">
      <span>${t("menu.lang")}</span>
      <button class="lang-pill" data-act="lang">${getLang() === "cs" ? "<b>CZ</b><span>EN</span>" : "<span>CZ</span><b>EN</b>"}</button>
    </div>
    <button class="menu-item menu-demo" data-act="demo-toggle">${isDemoActive() ? t("demo.on") : t("demo.off")}</button>
  `;
  $("#menu").hidden = false;
}

function closeMenu() {
  const m = $("#menu");
  if (m) m.hidden = true;
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
  const btn = (act, label) => `<button class="demo-btn" data-act="${act}">${label}</button>`;
  bar.innerHTML = `
    <span class="demo-label">${t("demo.label")}</span>
    <div class="demo-btns">
      ${btn("demo-first", t("demo.first"))}
      ${btn("demo-prev", t("demo.prev"))}
      ${btn("demo-next", t("demo.next"))}
      ${btn("demo-plus1", t("demo.plus1"))}
      ${btn("demo-plus5", t("demo.plus5"))}
      ${btn("demo-before", t("demo.before"))}
      ${btn("demo-end", t("demo.end"))}
      ${btn("demo-toggle", t("demo.on"))}
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Úvod / coming soon                                                   */
/* ------------------------------------------------------------------ */

function emailForm(kickerKey) {
  return `
    <div class="email-block">
      <p class="email-kicker">${t(kickerKey)}</p>
      <form class="email-form" data-form="email">
        <input type="email" required placeholder="${t("email.placeholder")}" class="email-input" aria-label="email" />
        <button class="btn btn-ghost" type="submit">${t("email.btn")}</button>
      </form>
      <p class="email-ok" aria-live="polite"></p>
    </div>`;
}

function renderIntro(st) {
  const phase = st.isBeforeFirstZone ? "before" : st.isAfterLastZone ? "over" : "running";
  const cta = phase === "before" ? t("intro.cta") : t("intro.ctaRunning");
  $("#screen-intro").innerHTML = `
    <div class="intro-hero">
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

    <button class="btn btn-primary btn-big btn-block" data-act="start">${cta}</button>

    ${emailForm("email.kicker")}

    <p class="kicker">${t("intro.howTitle")}</p>
    <div class="how">
      ${[1, 2, 3]
        .map(
          (i) => `
        <div class="how-card">
          <span class="num-badge">${i}</span>
          <p class="how-title">${t(`intro.how${i}t`)}</p>
          <p class="how-desc">${t(`intro.how${i}d`)}</p>
        </div>`
        )
        .join("")}
    </div>

    <p class="foot-note">${t("intro.foot", { n: TOTAL })}</p>
  `;
}

/* ------------------------------------------------------------------ */
/* Pravidla                                                             */
/* ------------------------------------------------------------------ */

function renderRules() {
  const rules = [1, 2, 3, 4, 5]
    .map((i) => {
      const extra = i === 3 ? `<p class="rule-extra">${t("rules.3x")}</p>` : "";
      return `
      <div class="rule">
        <span class="num-badge">${i}</span>
        <div>
          <p class="rule-title">${t(`rules.${i}t`, { n: TOTAL })}</p>
          <p class="rule-desc">${t(`rules.${i}d`, { n: TOTAL, m: CHALLENGE_PREVIEW_MINUTES })}</p>
          ${extra}
        </div>
      </div>`;
    })
    .join("");

  $("#screen-rules").innerHTML = `
    <div class="screen-head">
      <h1 class="h1">${t("rules.title")}</h1>
      <p class="sub">${t("rules.sub")}</p>
    </div>
    ${rules}
    <div class="card card-green">
      <p class="card-kicker green">${t("rules.pauseT")}</p>
      <p>${t("rules.pauseD")}</p>
    </div>
    <button class="btn btn-primary btn-big btn-block" data-act="rules-done">${t("rules.cta")}</button>
    <p class="foot-note">${t("rules.foot")}</p>
  `;
}

/* ------------------------------------------------------------------ */
/* Obrazovka zóny                                                       */
/* ------------------------------------------------------------------ */

const LUPA = `<svg class="lupa" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"></circle><line x1="15" y1="15" x2="21" y2="21"></line></svg>`;

function topCountdown(st, activeId) {
  const ni = nextIndex(st);
  const chip = `
    <button class="map-chip" data-act="go" data-to="map" aria-label="${t("zone.mapChip")}">
      <span class="map-chip-label">${t("zone.mapChip")} ${LUPA}</span>
      ${mapSvg({ zones: ZONES, activeId, doneIds: P.progressSet(), mini: true })}
    </button>`;
  if (ni < 0) {
    return `<div class="top-cd"><div class="top-cd-main"><p class="kicker">${t("zone.last")}</p></div>${chip}</div>`;
  }
  const label = st.isBeforeFirstZone ? t("zone.firstIn") : t("zone.nextIn");
  return `
    <div class="top-cd">
      <div class="top-cd-main">
        <p class="kicker">${label}</p>
        <div class="tiles js-cd" data-cd="next">${tilesHtml(st.msUntilNextZone)}</div>
      </div>
      ${chip}
    </div>`;
}

function nextPrepCard(st) {
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
  if (!isActionZone(z) || st.msUntilNextZone > CHALLENGE_PREVIEW_MINUTES * 60000) return "";
  return `
    <div class="card card-preview">
      <p class="card-kicker pink">${t("zone.preview")}</p>
      <p class="preview-zone">${esc(z.label)} <span class="dim">(${z.czTime})</span></p>
      <p>${md(zf(z, "challenge"))}</p>
    </div>`;
}

function renderZone(st, now) {
  const host = $("#screen-zone");
  const done = P.progressSet();

  // Před začátkem noci: čekárna na Kiribati.
  if (st.isBeforeFirstZone) {
    host.innerHTML = `
      ${topCountdown(st, null)}
      <div class="zone-head">
        <p class="zone-time">${t("zone.waitTitle")}</p>
        <h1 class="zone-label">${esc(ZONES[0].label)}</h1>
        <p class="lead">${t("zone.waitSub")}</p>
      </div>
      ${nextPrepCard(st)}
      ${factBlock()}
    `;
    return;
  }

  const { contextZone, contextIndex, taskZone, taskIndex } = computeHeldTask(st);
  const start = ZONE_STARTS[contextIndex];
  const date = formatCzDate(start);
  const since = now - start;
  const isPause = contextZone.celebrates === false;

  const flash =
    isActionZone(contextZone) && contextIndex === taskIndex && since >= 0 && since < NOW_FLASH_SECONDS * 1000
      ? `<span class="now-flash">${t("zone.now.badge")}</span>`
      : "";
  const mega = contextZone.intensity === "MEGA" ? `<span class="badge-mega">MEGA</span>` : "";
  const merge = contextZone.merge ? `<p class="merge-note">${esc(contextZone.merge)}</p>` : "";
  const about = zf(contextZone, "about") || t("zone.aboutPh", { off: contextZone.utcOffset });

  const head = `
    <div class="zone-head">
      <p class="zone-time">${contextZone.czTime} <span class="dim">${t("zone.home")}, ${date}</span> ${flash}</p>
      <h1 class="zone-label">${esc(contextZone.label)}</h1>
      ${mega}
      ${isPause ? `<p class="pause-tag">${t("zone.pause")}</p>` : ""}
      ${merge}
    </div>
    <div class="card card-about">
      <p class="card-kicker blue">${t("zone.about")}</p>
      <p>${md(about)}</p>
    </div>
    <div class="card card-perl">
      <p class="card-kicker pink">${t("zone.perl")}</p>
      <p class="perl-text">${md(zf(contextZone, "perlicka"))}</p>
    </div>
    <div class="card card-soft">
      <p class="card-kicker">${t("zone.trad")}</p>
      <p>${md(zf(contextZone, "tradition"))}</p>
    </div>`;

  let action = "";
  if (isPause) {
    const already = done.has(contextZone.id);
    action = `
      ${
        taskZone
          ? `<div class="card card-held">
              <p class="card-kicker">${t("zone.heldPause", { t: taskZone.czTime, z: esc(taskZone.label) })}</p>
              <p>${md(zf(taskZone, "challenge"))}</p>
            </div>`
          : ""
      }
      <div class="checkin">
        <p class="checkin-micro">${t("zone.aliveMicro")}</p>
        <button class="btn btn-alive btn-block" data-act="checkin" data-zone="${contextZone.id}">
          ${already ? t("zone.aliveDone") : t("zone.alive")}
        </button>
        <p class="checkin-note">${t("zone.checkinNote")}</p>
      </div>`;
  } else {
    const active = isActionZone(contextZone) ? contextZone : taskZone;
    if (active) {
      const held = active.id !== contextZone.id;
      const already = done.has(active.id);
      const penalty = zf(active, "symbolicPenaltyNote");
      action = `
        ${held ? `<p class="held-hint">${t("zone.held", { t: active.czTime, z: esc(active.label) })}</p>` : ""}
        <div class="card card-challenge">
          <p class="card-kicker gold">${t("zone.now")}</p>
          <p class="challenge-text">${md(zf(active, "challenge"))}</p>
          ${penalty ? `<p class="penalty"><strong>${t("zone.penalty")}</strong> ${md(penalty)}</p>` : ""}
        </div>
        <div class="checkin">
          <button class="btn btn-primary btn-big btn-block" data-act="checkin" data-zone="${active.id}">
            ${already ? t("zone.checkinAgain") : t("zone.checkin")}
          </button>
          <p class="checkin-note">${t("zone.checkinNote")}</p>
        </div>`;
    }
  }

  host.innerHTML = `
    ${topCountdown(st, contextZone.id)}
    ${previewCard(st)}
    ${head}
    ${action}
    ${factBlock()}
    ${nextPrepCard(st)}
    <p class="counter-note">${t("zone.counter", { p: `<strong>${done.size} / ${TOTAL}</strong>` })}</p>
  `;
}

/* ------------------------------------------------------------------ */
/* Velké odpočítávání 10 9 8 přes celý displej                          */
/* ------------------------------------------------------------------ */

let bigDismissed = -1;

function updateBig(st, now) {
  const el = $("#big-countdown");
  let mode = null;
  let zone = null;
  let idx = -1;
  let secs = 0;

  const ni = nextIndex(st);
  if (ni >= 0) {
    const ms = st.msUntilNextZone;
    if (ms > 0 && ms <= BIG_COUNTDOWN_SECONDS * 1000 && ZONES[ni].celebrates) {
      mode = "count";
      zone = ZONES[ni];
      idx = ni;
      secs = Math.ceil(ms / 1000);
    }
  }
  if (!mode && !st.isBeforeFirstZone && !st.isAfterLastZone) {
    const ci = st.currentZoneIndex;
    const since = now - ZONE_STARTS[ci];
    if (since >= 0 && since < BIG_NOW_SECONDS * 1000 && isActionZone(ZONES[ci])) {
      mode = "now";
      zone = ZONES[ci];
      idx = ci;
    }
  }

  const visibleHere = shown === "zone" || shown === "map";
  if (!mode || idx === bigDismissed || !visibleHere) {
    if (!el.hidden) {
      el.hidden = true;
      el.innerHTML = "";
      el.dataset.key = "";
    }
    return;
  }

  const key = `${mode}|${idx}|${secs}|${getLang()}`;
  if (el.dataset.key === key) return;
  el.dataset.key = key;
  el.dataset.idx = String(idx);
  el.hidden = false;

  if (mode === "count") {
    const prep = (zf(zone, "prep") || "").trim() || t("zone.nothing");
    el.innerHTML = `
      <div class="big-inner">
        <p class="big-kicker">${t("big.celebrates", { z: esc(zone.label) })}</p>
        <div class="big-ring"><span class="big-num" key="${secs}">${secs}</span></div>
        <p class="big-prep">${esc(prep)}</p>
        ${
          isActionZone(zone)
            ? `<div class="big-card"><p class="card-kicker gold">${t("big.ready")}</p><p>${md(zf(zone, "challenge"))}</p></div>`
            : ""
        }
        <p class="big-tap">${t("big.tap")}</p>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="big-inner big-now">
        <div class="big-ring"><span class="big-num big-num-now">${t("big.now")}</span></div>
        <p class="big-prep">${t("big.go", { z: esc(zone.label) })}</p>
        <p class="big-tap">${t("big.tap")}</p>
      </div>`;
  }
}

/* ------------------------------------------------------------------ */
/* Mapa (náčrt)                                                         */
/* ------------------------------------------------------------------ */

const mapState = { s: 1, tx: 0, ty: 0, init: false };

function mapDims() {
  const stage = $("#map-stage");
  if (!stage) return null;
  const W = stage.clientWidth;
  const Hs = stage.clientHeight;
  const Hm = (W * MAP_VIEWBOX.h) / MAP_VIEWBOX.w;
  return { stage, W, Hs, Hm };
}

function clampMap() {
  const d = mapDims();
  if (!d) return;
  const { W, Hs, Hm } = d;
  const s = mapState.s;
  const minTx = W - W * s - W * 0.25;
  const maxTx = W * 0.25;
  const minTy = Math.min(Hs - Hm * s - Hs * 0.25, (Hs - Hm * s) / 2);
  const maxTy = Math.max(Hs * 0.25, (Hs - Hm * s) / 2);
  mapState.tx = Math.min(maxTx, Math.max(minTx, mapState.tx));
  mapState.ty = Math.min(maxTy, Math.max(minTy, mapState.ty));
}

function applyMap() {
  const inner = $("#map-inner");
  if (!inner) return;
  clampMap();
  inner.style.transform = `translate(${mapState.tx}px, ${mapState.ty}px) scale(${mapState.s})`;
}

function zoomMap(factor, cx, cy) {
  const d = mapDims();
  if (!d) return;
  const ox = cx == null ? d.W / 2 : cx;
  const oy = cy == null ? d.Hs / 2 : cy;
  const ns = Math.min(6, Math.max(1, mapState.s * factor));
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
    mapState.s = 1;
    mapState.tx = 0;
    mapState.ty = (d.Hs - d.Hm) / 2;
    applyMap();
    return;
  }
  const px = ((p[0] - MAP_VIEWBOX.x) / MAP_VIEWBOX.w) * d.W;
  const py = ((p[1] - MAP_VIEWBOX.y) / MAP_VIEWBOX.h) * d.Hm;
  mapState.s = scale;
  mapState.tx = d.W / 2 - px * scale;
  mapState.ty = d.Hs / 2 - py * scale;
  applyMap();
}

function wireMapDrag() {
  const stage = $("#map-stage");
  if (!stage) return;
  let drag = null;
  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    drag = { x: e.clientX, y: e.clientY, tx: mapState.tx, ty: mapState.ty };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add("dragging");
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    mapState.tx = drag.tx + (e.clientX - drag.x);
    mapState.ty = drag.ty + (e.clientY - drag.y);
    applyMap();
  });
  const end = () => {
    drag = null;
    stage.classList.remove("dragging");
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
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

function activeZoneId(st) {
  return !st.isBeforeFirstZone && !st.isAfterLastZone ? st.currentZone.id : null;
}

function renderMap(st, now) {
  const activeId = activeZoneId(st);
  const startIdx = st.isBeforeFirstZone ? 0 : st.currentZoneIndex;
  const rows = ZONES.slice(startIdx, startIdx + 6)
    .map((z, k) => {
      const i = startIdx + k;
      const isNow = z.id === activeId;
      const right = isNow
        ? `<span class="up-now">${t("map.nowTag")}</span>`
        : `<span class="up-in">${t("map.in", { t: relTime(ZONE_STARTS[i] - now) })}</span>`;
      return `<div class="up-row${isNow ? " up-row-now" : ""}"><span>${z.czTime}&nbsp;&nbsp;${esc(z.label)}</span>${right}</div>`;
    })
    .join("");

  $("#screen-map").innerHTML = `
    <div class="screen-head">
      <h1 class="h1">${t("map.title")}</h1>
      <p class="sub">${activeId ? t("map.sub") : t("map.before")}</p>
    </div>
    <div class="map-stage" id="map-stage">
      <div class="map-inner" id="map-inner">${mapSvg({ zones: ZONES, activeId, doneIds: P.progressSet() })}</div>
      <div class="map-ctrls">
        <button data-act="zoom" data-f="1.4" aria-label="+">+</button>
        <button data-act="zoom" data-f="0.71" aria-label="-">&minus;</button>
        <button data-act="center" aria-label="${t("map.center")}">${t("map.center")}</button>
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
    </div>
  `;

  wireMapDrag();
  if (!mapState.init) {
    mapState.init = true;
    requestAnimationFrame(() => centerMap(activeId, activeId ? 2.2 : 1));
  } else {
    applyMap();
  }
}

/* ------------------------------------------------------------------ */
/* Profil, parta, záloha                                                */
/* ------------------------------------------------------------------ */

let backupMode = null; // null | "export" | "import"
let backupMsg = "";

function renderProfile() {
  const me = P.getActive();
  const profiles = P.getProfiles();
  const group = P.getGroup();
  const link = P.inviteLink();

  const accounts = profiles
    .map((p) => {
      const isMe = p.id === me.id;
      return `
      <div class="acc-row${isMe ? " acc-me" : ""}">
        <span class="avatar avatar-sm">${esc(initial(p))}</span>
        <span class="acc-name">${esc(displayName(p))}${isMe ? ` <span class="dim">(${t("profile.you")})</span>` : ""}</span>
        <span class="acc-count">${p.progress.length} / ${TOTAL}</span>
        ${isMe ? "" : `<button class="btn btn-ghost btn-small" data-act="switch" data-id="${p.id}">${t("profile.use")}</button>`}
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
    <div class="screen-head">
      <h1 class="h1">${t("profile.title")}</h1>
      <p class="sub">${t("profile.sub")}</p>
    </div>

    <div class="card acc-card">
      <span class="avatar">${esc(initial(me))}</span>
      <div class="acc-main">
        <p class="acc-title">${esc(displayName(me))}</p>
        <p class="dim">${t("profile.zones", { p: `${me.progress.length} / ${TOTAL}` })}</p>
      </div>
      <button class="btn btn-ghost btn-small" data-act="rename">${t("profile.rename")}</button>
    </div>

    <p class="kicker">${t("profile.accounts")}</p>
    <div class="acc-list">${accounts}</div>
    <button class="btn btn-ghost btn-block" data-act="add-account">${t("profile.add")}</button>
    <p class="small dim">${t("profile.accountsHint")}</p>

    <div class="card card-invite">
      <p class="card-kicker pink">${t("profile.inviteT")}</p>
      ${group ? `<p class="small">${t("profile.group", { g: esc(group.name) })}</p>` : ""}
      <p>${t("profile.inviteD")}</p>
      <div class="invite-row">
        <input class="code-input" id="invite-link" readonly value="${esc(link)}" />
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

    <p class="foot-note">${t("profile.foot")}</p>
  `;
}

async function copyText(text, inputEl) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    if (inputEl) {
      inputEl.select();
      try {
        return document.execCommand("copy");
      } catch (err) {
        return false;
      }
    }
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* O projektu                                                           */
/* ------------------------------------------------------------------ */

function renderAbout() {
  $("#screen-about").innerHTML = `
    <div class="screen-head">
      <h1 class="h1">${t("about.title")}</h1>
    </div>
    <div class="card"><p>${t("about.p1", { n: TOTAL })}</p></div>
    <div class="card card-soft"><p>${t("about.p2")}</p></div>
    <div class="card card-perl"><p>${t("about.p3")}</p></div>
    <button class="btn btn-ghost btn-block" data-act="go" data-to="intro">${t("about.back")}</button>
  `;
}

/* ------------------------------------------------------------------ */
/* Konec noci                                                           */
/* ------------------------------------------------------------------ */

function renderEnd() {
  const n = P.progressSet().size;
  let line;
  if (n === 0) line = t("end.l0");
  else if (n < 10) line = t("end.l1");
  else if (n < TOTAL) line = t("end.l2");
  else line = t("end.l3", { n: TOTAL });

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
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/* Sdílení                                                              */
/* ------------------------------------------------------------------ */

async function doShare(opts) {
  try {
    const res = await shareCard({ ...opts, brand: t("brand"), by: t("by") });
    if (res === "downloaded") toast(t("share.saved"));
  } catch (e) {
    console.error(e);
    toast(t("share.fail"));
  }
}

/* ------------------------------------------------------------------ */
/* Události                                                             */
/* ------------------------------------------------------------------ */

function demoJumpZone(delta) {
  const st = resolveNight(ZONES, getEffectiveTime());
  let base = st.isBeforeFirstZone ? (delta > 0 ? -1 : 0) : st.currentZoneIndex;
  const idx = Math.max(0, Math.min(TOTAL - 1, base + delta));
  setDemoToZone(ZONES, idx);
}

function wireEvents() {
  document.addEventListener("click", async (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    // Klik mimo menu ho zavře.
    const menu = $("#menu");
    if (!menu.hidden && target === menu) {
      closeMenu();
      return;
    }

    // Klik na velké odpočítávání ho zavře.
    const big = target.closest("#big-countdown");
    if (big) {
      bigDismissed = parseInt(big.dataset.idx || "-1", 10);
      big.hidden = true;
      big.dataset.key = "";
      return;
    }

    const el = target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;

    switch (act) {
      case "go":
        go(el.dataset.to);
        break;
      case "menu":
        if ($("#menu").hidden) openMenu();
        else closeMenu();
        break;
      case "lang":
        setLang(getLang() === "cs" ? "en" : "cs");
        demoKey = "";
        lastKey = "";
        if (!$("#menu").hidden) openMenu();
        tick();
        break;
      case "start":
        if (flag(LS.rules)) go("zone");
        else go("rules");
        break;
      case "rules-done":
        setFlag(LS.rules);
        go("zone");
        break;
      case "checkin": {
        const id = el.dataset.zone;
        try {
          window.open(INSTAGRAM_URL, "_blank", "noopener");
        } catch (err) {
          /* popup zablokovaný, počítadlo se zvedne stejně */
        }
        if (id) P.addCheckin(id);
        lastKey = "";
        tick();
        break;
      }
      case "zoom":
        zoomMap(parseFloat(el.dataset.f));
        break;
      case "center": {
        const st = resolveNight(ZONES, getEffectiveTime());
        const id = activeZoneId(st);
        centerMap(id, id ? 2.6 : 1);
        break;
      }
      case "share-zone": {
        const st = resolveNight(ZONES, getEffectiveTime());
        if (st.isBeforeFirstZone || st.isAfterLastZone) {
          toast(t("map.before"));
          break;
        }
        await doShare({
          kicker: st.currentZone.label,
          big: `${st.currentZoneIndex + 1}/${TOTAL}`,
          line: t("share.zoneLine", { i: st.currentZoneIndex + 1, n: TOTAL }),
          sub: t("share.zoneSub", { z: st.currentZone.label }),
        });
        break;
      }
      case "share-end": {
        const n = P.progressSet().size;
        await doShare({
          kicker: t("share.endKicker"),
          big: String(n),
          line: t("share.endLine", { x: n }),
          sub: t("share.endSub"),
        });
        break;
      }
      case "rename": {
        const name = window.prompt(t("profile.namePrompt"), P.getActive().name || "");
        if (name && name.trim()) {
          P.renameActive(name);
          profileRev++;
          tick();
        }
        break;
      }
      case "add-account": {
        const name = window.prompt(t("profile.namePrompt"), "");
        if (name && name.trim()) {
          P.addProfile(name);
          profileRev++;
          tick();
        }
        break;
      }
      case "switch":
        P.setActive(el.dataset.id);
        profileRev++;
        tick();
        break;
      case "copy-invite": {
        const ok = await copyText(P.inviteLink(), $("#invite-link"));
        toast(ok ? t("profile.copied") : P.inviteLink());
        break;
      }
      case "backup":
        backupMode = backupMode === "export" ? null : "export";
        backupMsg = "";
        profileRev++;
        tick();
        break;
      case "restore":
        backupMode = backupMode === "import" ? null : "import";
        backupMsg = "";
        profileRev++;
        tick();
        break;
      case "copy-backup": {
        const ok = await copyText(P.exportCode(), $("#backup-out"));
        toast(ok ? t("profile.copied") : t("share.fail"));
        break;
      }
      case "do-restore": {
        const code = ($("#backup-in") || {}).value || "";
        if (P.importCode(code)) {
          backupMode = null;
          backupMsg = t("profile.restoreOk");
        } else {
          backupMsg = t("profile.restoreBad");
        }
        profileRev++;
        tick();
        break;
      }
      case "demo-toggle":
        setDemoActive(!isDemoActive());
        demoKey = "";
        closeMenu();
        tick();
        break;
      case "demo-first":
        setDemoToZone(ZONES, 0);
        setFlag(LS.entered);
        route = "auto";
        tick();
        break;
      case "demo-prev":
        demoJumpZone(-1);
        setFlag(LS.entered);
        tick();
        break;
      case "demo-next":
        demoJumpZone(1);
        setFlag(LS.entered);
        tick();
        break;
      case "demo-plus1":
        advanceDemo(1);
        tick();
        break;
      case "demo-plus5":
        advanceDemo(5);
        tick();
        break;
      case "demo-before": {
        const st = resolveNight(ZONES, getEffectiveTime());
        const ni = nextIndex(st);
        if (ni >= 0) {
          setDemoClock(ZONE_STARTS[ni] - 15000);
          setFlag(LS.entered);
          bigDismissed = -1;
        }
        tick();
        break;
      }
      case "demo-end":
        setDemoToZone(ZONES, TOTAL - 1);
        advanceDemo(31);
        route = "auto";
        tick();
        break;
      default:
        break;
    }
  });

  document.addEventListener("submit", (e) => {
    const form = e.target instanceof Element ? e.target.closest('[data-form="email"]') : null;
    if (!form) return;
    e.preventDefault();
    const input = $(".email-input", form);
    const email = input ? input.value.trim() : "";
    if (!email) return;
    try {
      const list = JSON.parse(localStorage.getItem(LS.email) || "[]");
      const arr = Array.isArray(list) ? list : [];
      if (!arr.includes(email)) arr.push(email);
      localStorage.setItem(LS.email, JSON.stringify(arr));
    } catch (err) {
      /* ignore */
    }
    const ok = form.parentElement ? $(".email-ok", form.parentElement) : null;
    if (ok) ok.textContent = t("email.ok");
    if (input) input.value = "";
  });

  window.addEventListener("resize", () => {
    if (shown === "map") applyMap();
  });
}

/* ------------------------------------------------------------------ */
/* Pozvánka z odkazu                                                    */
/* ------------------------------------------------------------------ */

function handleInviteQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("parta");
    if (code) {
      const g = P.joinGroup(code, params.get("jmeno") || "parta");
      if (g) setTimeout(() => toast(t("profile.joined", { g: g.name })), 400);
    }
  } catch (e) {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Service worker                                                       */
/* ------------------------------------------------------------------ */

function registerServiceWorker() {
  const okProto = location.protocol === "http:" || location.protocol === "https:";
  if (!okProto || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* bez service workeru appka jede dál */
    });
  });
}

/* ------------------------------------------------------------------ */
/* Start                                                                */
/* ------------------------------------------------------------------ */

function boot() {
  document.documentElement.lang = getLang();
  initDemoFromQuery(window.location.search);
  handleInviteQuery();
  wireEvents();
  subscribe(tick);
  tick();
  registerServiceWorker();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
