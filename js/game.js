// Игровой слой: звёзды, ранги, значки, тарелка дня, серии.
// Всё считается из записей, поэтому звёзды не «пропадают» на следующий день.
import { dayKey, addDays } from './dates.js';
import { expandParts, foodSector, plateSectors } from './foods.js';

export const PLATE = ['veg', 'prot', 'carb', 'fruit'];
export const WATER_GOAL = 6;
const WATER_STAR_CAP = 8;

export const RANKS = [
  { min: 0, title: 'Стажёр агентства', emoji: '🌱' },
  { min: 100, title: 'Младший сыщик', emoji: '🔍' },
  { min: 300, title: 'Сыщик', emoji: '🕵️' },
  { min: 700, title: 'Старший сыщик', emoji: '🎖️' },
  { min: 1500, title: 'Главный детектив', emoji: '🏅' },
  { min: 3000, title: 'Легенда агентства', emoji: '👑' },
];

export function byDay(entries) {
  const m = new Map();
  for (const e of entries) {
    const k = dayKey(e.ts);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(e);
  }
  for (const list of m.values()) list.sort((a, b) => a.ts - b.ts);
  return m;
}

export function plateOf(dayEntries) {
  const s = new Set();
  for (const e of dayEntries || []) {
    if (e.type !== 'meal') continue;
    for (const f of e.foods) for (const sec of plateSectors(f)) if (PLATE.includes(sec)) s.add(sec);
  }
  return s;
}

// Напитки: вода и напитки без сахара идут в цель дня, сладкие считаются отдельно.
// Старые записи без drink — это вода.
export const isSweet = (e) => e.type === 'water' && e.drink === 'sweet';
export function waterOf(dayEntries) {
  return (dayEntries || []).reduce((n, e) => n + (e.type === 'water' && !isSweet(e) ? e.n || 1 : 0), 0);
}
export function sweetOf(dayEntries) {
  return (dayEntries || []).filter(isSweet);
}

export function streak(days, today) {
  let n = 0;
  let k = days.has(today) ? today : addDays(today, -1);
  while (days.has(k)) { n++; k = addDays(k, -1); }
  return n;
}

function bestStreak(keys) {
  const sorted = [...keys].sort();
  let best = 0;
  let cur = 0;
  let prev = null;
  for (const k of sorted) {
    cur = prev && addDays(prev, 1) === k ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = k;
  }
  return best;
}

export function stars(state) {
  const days = byDay(state.entries);
  let total = 0;
  for (const list of days.values()) {
    let water = 0;
    for (const e of list) {
      if (e.type === 'meal' || e.type === 'skin') total += 10;
      else if (e.type === 'factor') total += 5;
      else if (e.type === 'water' && !isSweet(e)) water += e.n || 1;
    }
    total += Math.min(water, WATER_STAR_CAP) * 2;
    if (plateOf(list).size === 4) total += 20;
  }
  total += state.cases.filter((c) => c.closed).length * 50;
  // мини-игры: 5 звёзд за игру, не больше трёх игр в день
  const perDay = new Map();
  for (const g of state.games || []) perDay.set(dayKey(g.ts), Math.min(3, (perDay.get(dayKey(g.ts)) || 0) + 1));
  for (const n of perDay.values()) total += n * 5;
  return total;
}

export function rankOf(total) {
  let i = 0;
  while (i + 1 < RANKS.length && total >= RANKS[i + 1].min) i++;
  const next = RANKS[i + 1];
  return { ...RANKS[i], index: i, next, toNext: next ? next.min - total : 0, progress: next ? (total - RANKS[i].min) / (next.min - RANKS[i].min) : 1 };
}

export const BADGES = [
  { id: 'first_meal', emoji: '🍽️', title: 'Первая улика', hint: 'Записать первую еду' },
  { id: 'first_skin', emoji: '🔎', title: 'Первый замер', hint: 'Отметить, как кожа' },
  { id: 'clue', emoji: '🧴', title: 'Внимательный глаз', hint: 'Записать внешнюю улику' },
  { id: 'plate1', emoji: '🌈', title: 'Супер-тарелка', hint: 'Собрать 4 клетки за день' },
  { id: 'plate5', emoji: '🏆', title: 'Мастер тарелок', hint: '5 супер-тарелок' },
  { id: 'water', emoji: '💧', title: 'Водный агент', hint: `${WATER_GOAL} стаканов за день` },
  { id: 'streak3', emoji: '🔥', title: 'Три дня подряд', hint: 'Записи 3 дня подряд' },
  { id: 'streak7', emoji: '📅', title: 'Неделя сыщика', hint: 'Записи 7 дней подряд' },
  { id: 'skin10', emoji: '📈', title: 'Точные данные', hint: '10 замеров кожи' },
  { id: 'rainbow', emoji: '🥕', title: 'Радуга', hint: '8 разных овощей и фруктов за неделю' },
  { id: 'case1', emoji: '📁', title: 'Дело закрыто', hint: 'Довести дело до конца' },
];

export function earnedBadges(state) {
  const days = byDay(state.entries);
  const got = new Set();
  const es = state.entries;
  if (es.some((e) => e.type === 'meal')) got.add('first_meal');
  if (es.some((e) => e.type === 'skin')) got.add('first_skin');
  if (es.some((e) => e.type === 'factor')) got.add('clue');
  let plates = 0;
  for (const list of days.values()) {
    if (plateOf(list).size === 4) plates++;
    if (waterOf(list) >= WATER_GOAL) got.add('water');
  }
  if (plates >= 1) got.add('plate1');
  if (plates >= 5) got.add('plate5');
  const best = bestStreak(days.keys());
  if (best >= 3) got.add('streak3');
  if (best >= 7) got.add('streak7');
  if (es.filter((e) => e.type === 'skin').length >= 10) got.add('skin10');
  // радуга: любые 7 дней подряд, где было 8+ разных овощей и фруктов
  const keys = [...days.keys()].sort();
  for (const end of keys) {
    const set = new Set();
    for (let i = 0; i < 7; i++) {
      for (const e of days.get(addDays(end, -i)) || []) {
        if (e.type === 'meal') for (const f of expandParts(e.foods)) if (['veg', 'fruit'].includes(foodSector(f))) set.add(f);
      }
    }
    if (set.size >= 8) { got.add('rainbow'); break; }
  }
  if (state.cases.some((c) => c.closed)) got.add('case1');
  return got;
}
