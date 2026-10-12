/**
 * profiles.js, lokální účty, parta a záloha (varianta A, bez backendu).
 *
 * Všechno žije v localStorage tohohle prohlížeče.
 * - Víc účtů na jednom mobilu (parta s jedním telefonem).
 * - Každý účet má příznak "je u toho". Check-in se zapíše VŠEM, kdo jsou
 *   u toho, ne jen tomu, kdo drží mobil.
 * - Účet jde smazat.
 * - Pozvánka odkazem a ruční záloha kódem (pojistka proti vybitému mobilu).
 */

const KEY = "nyb_profiles";
const BACKUP_PREFIX = "NYB1.";

function newId() {
  return "p_" + Math.random().toString(36).slice(2, 10);
}

function freshProfile(name) {
  return { id: newId(), name: (name || "").trim(), progress: [], present: true };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* ignore */
  }
  return null;
}

function write(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    /* úložiště může být zablokované, v prototypu to nevadí */
  }
}

function isValidStore(s) {
  return (
    s &&
    Array.isArray(s.profiles) &&
    s.profiles.length > 0 &&
    s.profiles.every((p) => p && typeof p.id === "string" && Array.isArray(p.progress))
  );
}

function normalize(s) {
  s.profiles.forEach((p) => {
    if (typeof p.present !== "boolean") p.present = true;
    if (typeof p.name !== "string") p.name = "";
  });
  if (!s.profiles.find((p) => p.id === s.activeId)) s.activeId = s.profiles[0].id;
  if (!s.group) s.group = null;
  return s;
}

function load() {
  let s = read();
  if (!isValidStore(s)) {
    // Převezmi postup ze starší verze appky, ať o něj nikdo nepřijde.
    let oldProgress = [];
    let oldName = "";
    try {
      oldProgress = JSON.parse(localStorage.getItem("nyb_progress") || "[]");
      oldName = localStorage.getItem("nyb_login_name") || "";
    } catch (e) {
      /* ignore */
    }
    const p = freshProfile(oldName);
    p.progress = Array.isArray(oldProgress) ? oldProgress : [];
    s = { activeId: p.id, profiles: [p], group: null };
  }
  s = normalize(s);
  write(s);
  return s;
}

let store = load();

/* ---------------- účty ---------------- */

export function getProfiles() {
  return store.profiles;
}

export function getActive() {
  return store.profiles.find((p) => p.id === store.activeId) || store.profiles[0];
}

export function setActive(id) {
  const p = store.profiles.find((x) => x.id === id);
  if (!p) return;
  store.activeId = id;
  p.present = true; // kdo drží mobil, je u toho
  write(store);
}

export function addProfile(name) {
  const p = freshProfile(name);
  store.profiles.push(p);
  write(store);
  return p;
}

export function renameProfile(id, name) {
  const p = store.profiles.find((x) => x.id === id);
  if (!p) return;
  p.name = (name || "").trim();
  write(store);
}

/** Smaže účet. Poslední účet se nesmaže, jen se vyčistí na nového hosta. */
export function deleteProfile(id) {
  if (store.profiles.length <= 1) {
    const p = freshProfile("");
    store.profiles = [p];
    store.activeId = p.id;
  } else {
    store.profiles = store.profiles.filter((p) => p.id !== id);
    if (store.activeId === id) store.activeId = store.profiles[0].id;
  }
  write(store);
}

export function togglePresent(id) {
  const p = store.profiles.find((x) => x.id === id);
  if (!p || p.id === store.activeId) return; // držitel mobilu je u toho vždy
  p.present = !p.present;
  write(store);
}

/** Kdo je teď u toho: aktivní účet vždy, plus všichni s příznakem present. */
export function presentProfiles() {
  return store.profiles.filter((p) => p.id === store.activeId || p.present);
}

/** Set zón s check-inem aktivního účtu. */
export function progressSet() {
  return new Set(getActive().progress);
}

/** Zapíše check-in všem, kdo jsou u toho. Vrací seznam zapsaných účtů. */
export function addCheckin(zoneId) {
  const who = presentProfiles();
  who.forEach((p) => {
    if (!p.progress.includes(zoneId)) p.progress.push(zoneId);
  });
  write(store);
  return who;
}

/* ---------------- parta ---------------- */

export function getGroup() {
  return store.group || null;
}

export function ensureGroup(defaultName) {
  if (!store.group) {
    store.group = {
      code: Math.random().toString(36).slice(2, 7),
      name: defaultName || "parta",
    };
    write(store);
  }
  return store.group;
}

/** Přijetí pozvánky z odkazu ?parta=CODE&jmeno=NAME. */
export function joinGroup(code, name) {
  if (!code) return null;
  store.group = { code: String(code).slice(0, 24), name: String(name || "parta").slice(0, 40) };
  write(store);
  return store.group;
}

export function inviteLink() {
  const g = ensureGroup((getActive().name || "parta") + " a spol.");
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({ parta: g.code, jmeno: g.name });
  return `${base}?${params.toString()}`;
}

/* ---------------- záloha ---------------- */

function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

export function exportCode() {
  return BACKUP_PREFIX + toBase64(JSON.stringify({ v: 1, ...store }));
}

/** Vrátí true, když se záloha povedla načíst. */
export function importCode(code) {
  try {
    let c = String(code || "").trim();
    if (c.startsWith(BACKUP_PREFIX)) c = c.slice(BACKUP_PREFIX.length);
    const data = JSON.parse(fromBase64(c));
    const next = { activeId: data.activeId, profiles: data.profiles, group: data.group || null };
    if (!isValidStore(next)) return false;
    store = normalize(next);
    write(store);
    return true;
  } catch (e) {
    return false;
  }
}
