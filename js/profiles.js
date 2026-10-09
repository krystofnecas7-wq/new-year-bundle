/**
 * profiles.js, lokální účty, parta a záloha (varianta A, bez backendu).
 *
 * Všechno žije v localStorage tohohle prohlížeče. Víc účtů na jednom mobilu
 * (parta s jedním telefonem se přepíná), pozvánka odkazem a ruční záloha
 * kódem jako pojistka proti vybitému mobilu.
 */

const KEY = "nyb_profiles";
const BACKUP_PREFIX = "NYB1.";

function newId() {
  return "p_" + Math.random().toString(36).slice(2, 10);
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

function write(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
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

/** Načte store, při prvním spuštění převezme starý postup z dřívější verze. */
function load() {
  let s = read();
  if (!isValidStore(s)) {
    let oldProgress = [];
    let oldName = "";
    try {
      oldProgress = JSON.parse(localStorage.getItem("nyb_progress") || "[]");
      oldName = localStorage.getItem("nyb_login_name") || "";
    } catch (e) {
      /* ignore */
    }
    const p = {
      id: newId(),
      name: oldName,
      progress: Array.isArray(oldProgress) ? oldProgress : [],
    };
    s = { activeId: p.id, profiles: [p], group: null };
    write(s);
  }
  if (!s.profiles.find((p) => p.id === s.activeId)) s.activeId = s.profiles[0].id;
  return s;
}

let store = load();

export function getProfiles() {
  return store.profiles;
}

export function getActive() {
  return store.profiles.find((p) => p.id === store.activeId) || store.profiles[0];
}

export function setActive(id) {
  if (store.profiles.find((p) => p.id === id)) {
    store.activeId = id;
    write(store);
  }
}

export function addProfile(name) {
  const p = { id: newId(), name: (name || "").trim(), progress: [] };
  store.profiles.push(p);
  store.activeId = p.id;
  write(store);
  return p;
}

export function renameActive(name) {
  const p = getActive();
  p.name = (name || "").trim();
  write(store);
}

/** Set s id zón, kde má aktivní účet check-in. */
export function progressSet() {
  return new Set(getActive().progress);
}

export function addCheckin(zoneId) {
  const p = getActive();
  if (!p.progress.includes(zoneId)) {
    p.progress.push(zoneId);
    write(store);
  }
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
  store.group = { code: String(code).slice(0, 24), name: (name || "parta").slice(0, 40) };
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
    if (!next.profiles.find((p) => p.id === next.activeId)) next.activeId = next.profiles[0].id;
    store = next;
    write(store);
    return true;
  } catch (e) {
    return false;
  }
}
