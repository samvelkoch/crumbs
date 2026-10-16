// Радар Медка: какие продукты и улики чаще встречаются перед плохими замерами кожи.
// Сравнивает замеры «после продукта» и «без него», а не просто средний балл после еды.
import { HOUR, dayKey, dayStart, addDays } from './dates.js';
import { expandFamilies, foodFamilies } from './foods.js';

export const ZONES = [
  { id: 'face', label: 'Лицо', emoji: '🙂' },
  { id: 'neck', label: 'Шея', emoji: '🧣' },
  { id: 'hands', label: 'Руки', emoji: '✋' },
];
export const LEVELS = ['Чисто', 'Чуть-чуть', 'Заметно', 'Сильно', 'Очень сильно'];
export const MAX_LEVEL = LEVELS.length - 1;
export const FLARE = 2; // «заметно» и выше считаем плохим днём кожи

export const DEFAULTS = {
  minLagH: 1, // еда за час до замера ещё не успела «сработать»
  maxLagH: 48, // реакции на коже бывают отложенными
  minExposed: 3, // минимум замеров после продукта
  minDays: 2, // продукт должен встретиться хотя бы в 2 разных днях
  minUnexposed: 3,
  lambda: 2, // сила регуляризации регрессии
};

export function skinScore(e, zone = 'max') {
  const z = e.zones || {};
  if (zone !== 'max') return z[zone] ?? 0;
  return Math.max(z.face ?? 0, z.neck ?? 0, z.hands ?? 0);
}

// Ключи, которыми запись «помечает» окно: продукты, семейства, улики
export function entryKeys(e) {
  if (e.type === 'meal') return [...e.foods, ...expandFamilies(e.foods)];
  if (e.type === 'factor') return e.factors.map((f) => 'f:' + f);
  return [];
}

// Гребневая регрессия балла кожи на набор «был ли продукт в окне».
// Даёт вклад каждого продукта при прочих равных: если клубника просто часто
// попадала в одни дни с шоколадом, её вклад будет маленьким.
function ridge(obs, keys, lambda) {
  const p = keys.length;
  const n = obs.length;
  if (!p || n < 3) return new Map();
  const X = obs.map((ob) => keys.map((k) => (ob.keys.has(k) ? 1 : 0)));
  const y = obs.map((ob) => ob.score);
  const mx = keys.map((_, j) => X.reduce((s, r) => s + r[j], 0) / n);
  const my = y.reduce((s, v) => s + v, 0) / n;
  // A = Xc'Xc + λI, b = Xc'yc
  const A = Array.from({ length: p }, () => new Float64Array(p + 1));
  for (let i = 0; i < n; i++) {
    const r = X[i];
    const yc = y[i] - my;
    for (let a = 0; a < p; a++) {
      const xa = r[a] - mx[a];
      if (xa === 0) continue;
      const row = A[a];
      for (let b = a; b < p; b++) row[b] += xa * (r[b] - mx[b]);
      row[p] += xa * yc;
    }
  }
  for (let a = 0; a < p; a++) {
    for (let b = 0; b < a; b++) A[a][b] = A[b][a];
    A[a][a] += lambda;
  }
  // Гаусс: матрица положительно определена, перестановки строк не нужны
  for (let c = 0; c < p; c++) {
    const piv = A[c][c];
    for (let r = c + 1; r < p; r++) {
      const f = A[r][c] / piv;
      if (f === 0) continue;
      for (let k = c; k <= p; k++) A[r][k] -= f * A[c][k];
    }
  }
  const beta = new Float64Array(p);
  for (let r = p - 1; r >= 0; r--) {
    let v = A[r][p];
    for (let k = r + 1; k < p; k++) v -= A[r][k] * beta[k];
    beta[r] = v / A[r][r];
  }
  return new Map(keys.map((k, j) => [k, beta[j]]));
}

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/**
 * entries: все записи. Возвращает { measurements, ready, items[] }.
 * Замер учитывается, только если в его окне есть хотя бы одна запись еды:
 * иначе «без продукта» может значить просто «ничего не записали».
 */
export function analyze(entries, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const zone = o.zone || 'max';
  const skins = entries.filter((e) => e.type === 'skin').sort((a, b) => a.ts - b.ts);
  const tagged = entries.filter((e) => e.type === 'meal' || e.type === 'factor').sort((a, b) => a.ts - b.ts);

  // Двумя указателями собираем окно [ts - maxLag, ts - minLag] для каждого замера
  const obs = [];
  let lo = 0;
  for (const s of skins) {
    const from = s.ts - o.maxLagH * HOUR;
    const to = s.ts - o.minLagH * HOUR;
    while (lo < tagged.length && tagged[lo].ts < from) lo++;
    const keys = new Map(); // key -> Set(dayKey) встреч в окне
    let hasMeal = false;
    for (let i = lo; i < tagged.length && tagged[i].ts <= to; i++) {
      const t = tagged[i];
      if (t.type === 'meal') hasMeal = true;
      const dk = dayKey(t.ts);
      for (const k of entryKeys(t)) {
        if (!keys.has(k)) keys.set(k, new Set());
        keys.get(k).add(dk);
      }
    }
    if (hasMeal) obs.push({ id: s.id, ts: s.ts, score: skinScore(s, zone), keys });
  }

  const all = new Set();
  for (const ob of obs) for (const k of ob.keys.keys()) all.add(k);

  const items = [];
  for (const key of all) {
    const exp = [];
    const unexp = [];
    const days = new Set();
    const expIds = new Set();
    for (const ob of obs) {
      const d = ob.keys.get(key);
      if (d) {
        exp.push(ob.score);
        expIds.add(ob.id);
        for (const x of d) days.add(x);
      } else unexp.push(ob.score);
    }
    const mExp = mean(exp);
    const mUn = mean(unexp);
    const lift = exp.length && unexp.length ? mExp - mUn : 0;
    // сжатие к нулю при малом числе замеров, чтобы одна встреча не делала «главного подозреваемого»
    const adj = lift * (exp.length / (exp.length + 2));
    const flaresExp = exp.filter((x) => x >= FLARE).length;
    const flaresUn = unexp.filter((x) => x >= FLARE).length;
    const enough = exp.length >= o.minExposed && days.size >= o.minDays && unexp.length >= o.minUnexposed;
    let verdict = 'unknown';
    if (enough) {
      if (adj >= 0.7 && flaresExp / exp.length >= 0.5) verdict = 'suspect';
      else if (adj >= 0.35) verdict = 'watch';
      else if (adj <= 0.15 && mExp < FLARE) verdict = 'green';
      else verdict = 'neutral';
    }
    items.push({
      key, nExp: exp.length, nUn: unexp.length, days: days.size,
      meanExp: mExp, meanUn: mUn, lift, adj, flaresExp, flaresUn, verdict, enough, expIds,
    });
  }

  // Вклады при прочих равных: продукты и улики вместе, семейства отдельно вместо своих членов
  const usable = items.filter((i) => i.nExp >= 2 && i.nUn >= 2).map((i) => i.key);
  const isFam = (k) => k.startsWith('fam:');
  const foodsModel = ridge(obs, usable.filter((k) => !isFam(k)), o.lambda);
  const famKeys = usable.filter(isFam);
  const famModel = ridge(obs, [...famKeys, ...usable.filter((k) => k.startsWith('f:'))], o.lambda);
  for (const it of items) {
    it.effect = (isFam(it.key) ? famModel : foodsModel).get(it.key) ?? 0;
    if (!it.enough) continue;
    const e = it.effect;
    if (e >= 0.45 && it.adj >= 0.6 && it.flaresExp / it.nExp >= 0.5) it.verdict = 'suspect';
    else if (e >= 0.33 && it.adj >= 0.35) it.verdict = 'watch';
    else if (it.verdict === 'suspect' || it.verdict === 'watch') it.verdict = 'neutral';
  }

  // Семейство, совпадающее по замерам с одним продуктом, ничего нового не говорит
  const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
  const filtered = items.filter((it) => {
    if (!it.key.startsWith('fam:')) return true;
    for (const other of items) {
      if (other.key.startsWith('fam:') || other.key.startsWith('f:')) continue;
      if (sameSet(other.expIds, it.expIds)) return false;
    }
    return true;
  });

  // Продукты, которые всегда шли вместе: Радар их не различит, честно скажем об этом
  for (const it of filtered) {
    if (it.verdict !== 'suspect' && it.verdict !== 'watch') continue;
    it.twins = [];
    for (const other of filtered) {
      if (other === it || other.nExp < 2) continue;
      if (other.key.startsWith('fam:') !== it.key.startsWith('fam:')) continue;
      let inter = 0;
      for (const x of it.expIds) if (other.expIds.has(x)) inter++;
      const jac = inter / (it.expIds.size + other.expIds.size - inter);
      if (jac >= 0.8) it.twins.push(other.key);
    }
  }

  // Продукт внутри семейства-подозреваемого показывается в карточке семейства, а не отдельно
  const suspectFams = new Set(filtered.filter((i) => i.verdict === 'suspect' && isFam(i.key)).map((i) => i.key.slice(4)));
  for (const it of filtered) {
    if (it.verdict === 'watch' && foodFamilies(it.key).some((f) => suspectFams.has(f))) it.verdict = 'neutral';
  }

  filtered.sort((a, b) => b.effect - a.effect || b.adj - a.adj);
  for (const it of filtered) delete it.expIds;

  return {
    measurements: obs.length,
    skinsTotal: skins.length,
    ready: obs.length >= 8,
    progress: Math.min(1, obs.length / 8),
    items: filtered,
    suspects: filtered.filter((i) => i.verdict === 'suspect'),
    watch: filtered.filter((i) => i.verdict === 'watch'),
    green: filtered.filter((i) => i.verdict === 'green').sort((a, b) => b.nExp - a.nExp),
  };
}

/**
 * «Дело»: продукт исключён на N дней. Сравниваем кожу в эти дни с тем же числом дней до начала.
 */
export function evaluateCase(entries, c, todayKey) {
  const endKey = addDays(c.start, c.days);
  const beforeKey = addDays(c.start, -c.days);
  const t0 = dayStart(c.start);
  const t1 = dayStart(endKey);
  const tb = dayStart(beforeKey);
  const during = [];
  const before = [];
  const slips = [];
  for (const e of entries) {
    if (e.type === 'skin') {
      if (e.ts >= t0 && e.ts < t1) during.push(skinScore(e));
      else if (e.ts >= tb && e.ts < t0) before.push(skinScore(e));
    } else if (e.type === 'meal' && e.ts >= t0 && e.ts < t1 && entryKeys(e).includes(c.food)) {
      slips.push(dayKey(e.ts));
    }
  }
  const elapsed = Math.max(0, Math.min(c.days, Math.round((dayStart(todayKey) - t0) / (24 * HOUR)) + 1));
  const done = todayKey >= endKey;
  const mB = mean(before);
  const mD = mean(during);
  let outcome = 'pending';
  if (done) {
    if (during.length < 3 || before.length < 3) outcome = 'few';
    else if (mB - mD >= 0.5) outcome = 'better';
    else if (mD - mB >= 0.5) outcome = 'worse';
    else outcome = 'same';
  }
  return { elapsed, done, endKey, before: before.length, during: during.length, meanBefore: mB, meanDuring: mD, slips: [...new Set(slips)], outcome };
}
