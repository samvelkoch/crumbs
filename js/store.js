// Хранилище: только на этом устройстве (IndexedDB, запасной вариант — localStorage).
// Никаких сетевых запросов здесь нет и быть не должно.
const DB_NAME = 'crumbs';
const STORE = 'kv';
const KEY = 'state';
const LS_KEY = 'crumbs_state_v1';

export function emptyState() {
  return {
    v: 1,
    profile: { name: '', createdAt: Date.now(), onboarded: false, demo: false },
    entries: [],
    cases: [],
    tombstones: {}, // id -> когда удалено, нужно для слияния бэкапов с двух устройств
    seenBadges: [],
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('no indexedDB'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise = null;
const db = () => (dbPromise ??= openDb());

async function idbGet() {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function idbPut(value) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function normalize(s) {
  const base = emptyState();
  if (!s || typeof s !== 'object') return base;
  return {
    ...base,
    ...s,
    profile: { ...base.profile, ...(s.profile || {}) },
    entries: Array.isArray(s.entries) ? s.entries : [],
    cases: Array.isArray(s.cases) ? s.cases : [],
    tombstones: s.tombstones && typeof s.tombstones === 'object' ? s.tombstones : {},
    seenBadges: Array.isArray(s.seenBadges) ? s.seenBadges : [],
  };
}

export async function load() {
  try {
    const s = await idbGet();
    if (s) return normalize(s);
  } catch (err) {
    console.warn('IndexedDB недоступен, читаю localStorage', err);
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch (err) {
    console.warn('localStorage недоступен', err);
    return emptyState();
  }
}

let saveTimer = null;
let pending = null;
export function save(state) {
  pending = state;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 150);
}

export async function flush() {
  if (!pending) return;
  const snapshot = JSON.parse(JSON.stringify(pending));
  pending = null;
  try {
    await idbPut(snapshot);
    return;
  } catch (err) {
    console.warn('IndexedDB: запись не удалась, пишу в localStorage', err);
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.error('Не удалось сохранить данные', err);
    throw err;
  }
}

// Просим браузер не чистить данные сайта (важно для Safari на iPhone/iPad)
export async function requestPersistence() {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch (err) {
    console.warn('storage.persist', err);
  }
  return false;
}

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

/**
 * Слияние двух состояний (например, телефон папы + iPad).
 * Записи объединяются по id, побеждает более свежая правка; удалённые не воскресают.
 */
export function merge(local, incoming) {
  const a = normalize(local);
  const b = normalize(incoming);
  const tomb = { ...a.tombstones };
  for (const [id, t] of Object.entries(b.tombstones)) tomb[id] = Math.max(tomb[id] || 0, t);
  const pick = (listA, listB) => {
    const map = new Map();
    for (const x of [...listA, ...listB]) {
      const prev = map.get(x.id);
      if (!prev || (x.u || 0) > (prev.u || 0)) map.set(x.id, x);
    }
    return [...map.values()].filter((x) => !(tomb[x.id] && tomb[x.id] >= (x.u || 0)));
  };
  return {
    ...a,
    profile: { ...b.profile, ...a.profile, onboarded: true, demo: a.profile.demo && b.profile.demo },
    entries: pick(a.entries, b.entries).sort((x, y) => x.ts - y.ts),
    cases: pick(a.cases, b.cases),
    tombstones: tomb,
    seenBadges: [...new Set([...a.seenBadges, ...b.seenBadges])],
  };
}
