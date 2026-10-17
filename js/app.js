import {
  dayKey, timeStr, toInputValue, fromInputValue, fromZoned, dayStart, addDays,
  weekday, humanDay, shortDay, MONTHS, WEEKDAYS, zoned,
} from './dates.js';
import {
  FOODS, SECTORS, FACTORS, FACTOR_BY_ID, BASIC, PLACES, PLACE_BY_ID, SWEET_DRINKS,
  foodLabel, foodEmoji, foodFamilies, parseFreeText, itemLabel, itemEmoji,
  QTY_UNITS, QTY_SIZES, QTY_NUMS, DRINK_UNITS, qtyText, defaultUnit, cleanQty,
} from './foods.js';
import { analyze, evaluateCase, skinScore, ZONES, LEVELS, MAX_LEVEL, FLARE } from './radar.js';
import { PLATE, WATER_GOAL, byDay, plateOf, waterOf, sweetOf, isSweet, stars, rankOf, BADGES, earnedBadges, streak } from './game.js';
import { load, save, flush, requestPersistence, uid, merge, emptyState } from './store.js';
import { encryptState, decryptBackup, BackupError } from './backup.js';
import { medokSVG as medokBase, pusyaSVG as pusyaBase, STYLES } from './mascots.js';
import { contextTip, CHEERS, pick } from './tips.js';
import { WISDOM, WISDOM_CATS } from './wisdom.js';
import { playCatch, playSort, playKitchen } from './games.js';
import { playRobot } from './robotgame.js';
import { playCipher, MESSAGES as CIPHER_MESSAGES } from './cipher.js';
import { playLogic } from './logic.js';
import { DEFAULT_ROBOT, MISSIONS as ROBOT_MISSIONS, robotSVG } from './robot.js';
import { RECIPES, PRODUCTS, STALLS, LEVELS as KITCHEN_LEVELS, PLATE as DISH_PLATE } from './kitchen.js';
import { VALUE_CARDS } from './values.js';
import { DECKS, POLES, poleIndices, sortDiff, claudePrompt } from './valuesort.js';
import { CHOICES, CHOICE_THEMES } from './choices.js';
import { demoEntries } from './demo.js';

const VERSION = '2.12.1';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const today = () => dayKey(Date.now());
const plural = (n, one, few, many) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
};

const MEAL_KINDS = [
  { id: 'breakfast', label: 'Завтрак', emoji: '🥣' },
  { id: 'lunch', label: 'Обед', emoji: '🍲' },
  { id: 'afternoon', label: 'Полдник', emoji: '🍎' },
  { id: 'dinner', label: 'Ужин', emoji: '🍝' },
  { id: 'snack', label: 'Перекус', emoji: '🥨' },
];
const MEAL_BY_ID = Object.fromEntries(MEAL_KINDS.map((m) => [m.id, m]));
const LEVEL_FACES = ['😊', '🙂', '😐', '😣', '😫'];

let state = emptyState();
const ui = { tab: 'today', month: null, day: null, zone: 'max', speech: null, seed: Math.floor(Math.random() * 1e6) };
let deferredInstall = null;

// Герои рисуются в стиле, который выбрали в «Агентстве»
const heroStyle = (who) => state.profile.heroes?.[who] || 'plush';
const medokSVG = (mood, size) => medokBase(mood, size, heroStyle('medok'));
const pusyaSVG = (mood, size) => pusyaBase(mood, size, heroStyle('pusya'));

// ---------------------------------------------------------------- данные

function upsert(e) {
  e.u = Date.now();
  const i = state.entries.findIndex((x) => x.id === e.id);
  if (i >= 0) state.entries[i] = e;
  else state.entries.push(e);
  state.entries.sort((a, b) => a.ts - b.ts);
}

function remove(id) {
  const e = state.entries.find((x) => x.id === id);
  state.entries = state.entries.filter((x) => x.id !== id);
  if (e && !e.demo) state.tombstones[id] = Date.now();
  return e;
}

function commit() {
  save(state);
  render();
}

// Время по умолчанию: сейчас, либо полдень выбранного в дневнике дня
function defaultTs() {
  if (ui.tab === 'diary' && ui.day && ui.day !== today()) {
    const [y, m, d] = ui.day.split('-').map(Number);
    return fromZoned(y, m, d, 12, 0);
  }
  return Date.now();
}

function kindByTime(ts) {
  const { hh, mm } = zoned(ts);
  const h = hh + mm / 60;
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 17.5) return 'afternoon';
  if (h < 21) return 'dinner';
  return 'snack';
}

function frequentFoods(limit = 10) {
  const since = Date.now() - 60 * 864e5;
  const cnt = new Map();
  for (const e of state.entries) {
    if (e.type !== 'meal' || e.ts < since) continue;
    for (const f of e.foods) cnt.set(f, (cnt.get(f) || 0) + 1);
  }
  return [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([f]) => f);
}

// ---------------------------------------------------------------- общие кусочки UI

function toast(text, undo) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(text)}</span>${undo ? '<button type="button" data-undo>Отменить</button>' : ''}`;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), undo ? 5000 : 2200);
  const b = t.querySelector('[data-undo]');
  if (b) b.onclick = () => { t.classList.remove('show'); undo(); };
}

function say(who, text, mood = 'happy', cat = null, wid = null) {
  ui.speech = { who, text, mood, cat, wid };
}

// Вопрос-выбор от героя: сначала те, на которые ещё не отвечали
function nextChoice(who) {
  const pool = CHOICES.filter((c) => c.who === who && !state.choices[c.id]);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// Загадка: ответ спрятан, открывается нажатием
function wisdomTextHTML(text) {
  const i = text.indexOf(' Ответ: ');
  if (i < 0) return esc(text);
  return `${esc(text.slice(0, i))}<details class="answer"><summary>🔍 Показать ответ</summary>Ответ: ${esc(text.slice(i + 8))}</details>`;
}

// Оценка совета ребёнком: сохраняется локально, взрослые смотрят сводку в «Агентстве»
const RATES = [
  { r: -1, emoji: '🙁', label: 'Не понравилось' },
  { r: 0, emoji: '😐', label: 'Так себе' },
  { r: 1, emoji: '🙂', label: 'Понравилось' },
];
function rateHTML(id) {
  const cur = state.reactions[id]?.r;
  return `<div class="rate" role="group" aria-label="Как тебе?">${RATES.map((x) => `<button type="button" class="rate-btn" data-action="rate" data-id="${esc(id)}" data-r="${x.r}" aria-pressed="${cur === x.r}" aria-label="${x.label}">${x.emoji}</button>`).join('')}</div>`;
}

// Фразы героев вне копилки (подсказки, похвала) получают id по тексту
function phraseId(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return 'p:' + h.toString(36);
}

// Копилка мудрости: нажатие на героя достаёт новый совет или факт, сначала ещё не виденные
function nextWisdom(who) {
  const seen = new Set(state.wisdom);
  const pool = WISDOM.filter((w) => w[2] === who);
  const fresh = pool.filter((w) => !seen.has(w[0]));
  const from = fresh.length ? fresh : pool;
  const w = from[Math.floor(Math.random() * from.length)];
  if (!seen.has(w[0])) state.wisdom.push(w[0]);
  return w;
}

function dotsHTML(zones) {
  return `<span class="dots">${ZONES.map((z) => `<i class="dot lv${zones?.[z.id] ?? 0}" title="${z.label}: ${LEVELS[zones?.[z.id] ?? 0]}"></i>`).join('')}</span>`;
}

// «Яблоко (3 штуки)», количество необязательное
const foodQ = (e, id) => foodLabel(id) + (e.qty?.[id] ? ` (${qtyText(e.qty[id])})` : '');

// Выбор количества: размеры, числа, единицы. q: {s} | {n,u} | undefined
function qtyPicker(q, id, units) {
  const on = (k, v) => (k === 's' ? q?.s === v : k === 'n' ? !q?.s && q?.n === v : !q?.s && (q?.u || defaultUnit(id)) === v);
  const b = (k, v, label) => `<button type="button" class="chip small" data-sa="q" data-k="${k}" data-v="${v}" aria-pressed="${on(k, v)}">${label}</button>`;
  const list = units ? QTY_UNITS.filter((u) => units.includes(u.id)) : QTY_UNITS;
  return `<div class="qty-pick">
    <div class="chips">${QTY_SIZES.map((x) => b('s', x.id, x.label)).join('')}</div>
    <div class="chips qty-nums">${QTY_NUMS.map((n) => b('n', n, n)).join('')}</div>
    <div class="chips">${list.map((u) => b('u', u.id, `${u.e} ${u.f[0]}`)).join('')}</div></div>`;
}
function applyQty(q, id, btn) {
  const { k, v } = btn.dataset;
  if (k === 's') return q?.s === v ? undefined : { s: v };
  if (k === 'n') return !q?.s && q?.n === +v ? undefined : { n: +v, u: (!q?.s && q?.u) || defaultUnit(id) };
  return { n: (!q?.s && q?.n) || 1, u: v };
}

function entrySummary(e) {
  if (e.type === 'meal') {
    const k = MEAL_BY_ID[e.kind] || MEAL_KINDS[4];
    const foods = e.foods.map((id) => foodQ(e, id)).join(', ');
    const pl = e.place && e.place !== 'home' ? PLACE_BY_ID[e.place] : null;
    return { ico: e.foods[0] ? foodEmoji(e.foods[0]) : k.emoji, title: k.label + (pl ? ` · ${pl.emoji} ${pl.label}` : ''), desc: [foods, e.note].filter(Boolean).join(' · ') || 'Без продуктов' };
  }
  if (e.type === 'skin') {
    const z = ZONES.map((x) => `${x.label} ${LEVELS[e.zones[x.id] ?? 0].toLowerCase()}`).join(', ');
    return { ico: '🔎', title: 'Кожа ' + dotsHTML(e.zones), desc: esc([z, e.itch ? 'чесалось' : '', e.note].filter(Boolean).join(' · ')), raw: true };
  }
  if (e.type === 'factor') {
    return { ico: FACTOR_BY_ID[e.factors[0]]?.emoji || '🧴', title: 'Улика', desc: [e.factors.map((f) => FACTOR_BY_ID[f]?.label || f).join(', '), e.note].filter(Boolean).join(' · ') };
  }
  if (isSweet(e)) return { ico: foodEmoji(e.foods?.[0] || 'soda'), title: 'Сладкий напиток', desc: (e.foods || []).map((id) => foodQ(e, id)).join(', ') || 'Напиток' };
  return { ico: e.drink === 'plain' ? '🍵' : '💧', title: e.drink === 'plain' ? 'Напиток без сахара' : 'Вода', desc: `${e.n || 1} стакан` };
}

function entryRow(e) {
  const s = entrySummary(e);
  return `<button type="button" class="entry ${e.type}" data-action="edit" data-id="${esc(e.id)}">
    <span class="eico">${s.ico}</span>
    <span><span class="etitle">${s.raw ? s.title : esc(s.title)}</span><span class="edesc">${s.raw ? s.desc : esc(s.desc)}</span></span>
    <span class="etime">${timeStr(e.ts)}</span></button>`;
}

function plateSVG(set, size = 116) {
  const c = size / 2;
  const r = c - 4;
  const seg = (i) => {
    const a0 = (i * 90 - 90 + 3) * Math.PI / 180;
    const a1 = ((i + 1) * 90 - 90 - 3) * Math.PI / 180;
    return `M${c},${c} L${c + r * Math.cos(a0)},${c + r * Math.sin(a0)} A${r},${r} 0 0 1 ${c + r * Math.cos(a1)},${c + r * Math.sin(a1)} Z`;
  };
  const emo = PLATE.map((p, i) => {
    const a = (i * 90 - 45) * Math.PI / 180;
    return `<text x="${c + r * 0.58 * Math.cos(a)}" y="${c + r * 0.58 * Math.sin(a) + 7}" font-size="20" text-anchor="middle" opacity="${set.has(p) ? 1 : 0.35}">${SECTORS[p].emoji}</text>`;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Тарелка: ${set.size} из 4">
    <circle cx="${c}" cy="${c}" r="${c - 1}" fill="#fff" stroke="#efe5d8" stroke-width="2"/>
    ${PLATE.map((p, i) => `<path d="${seg(i)}" fill="${set.has(p) ? SECTORS[p].color : '#f3eee7'}" opacity="${set.has(p) ? 0.9 : 1}"/>`).join('')}
    <circle cx="${c}" cy="${c}" r="${r * 0.26}" fill="#fff"/>
    <text x="${c}" y="${c + 6}" text-anchor="middle" font-weight="900" font-size="16" fill="#2a2238">${set.size}/4</text>
    ${emo}</svg>`;
}

function glassSVG(full, plain = false) {
  const [light, mid, edge] = plain ? ['#fde68a', '#f59e0b', '#d97706'] : ['#bae6fd', '#38bdf8', '#0ea5e9'];
  return `<svg viewBox="0 0 38 46" aria-hidden="true"><path d="M5,4 H33 L29,42 H9 Z" fill="${full ? light : '#fff'}" stroke="${full ? edge : '#d6cfe0'}" stroke-width="2.5" stroke-linejoin="round"/>
    ${full ? `<path d="M7.5,16 H30.5 L28.5,40 H9.5 Z" fill="${mid}"/><circle cx="15" cy="24" r="2" fill="#fff" opacity=".6"/>` : ''}</svg>`;
}

// Карточка «Напитки дня»: вода и без сахара идут в цель, сладкие отдельно
function drinksCard(list) {
  const glasses = list.filter((e) => e.type === 'water' && !isSweet(e)).flatMap((e) => Array(e.n || 1).fill(e.drink === 'plain'));
  const n = glasses.length;
  const sweet = sweetOf(list);
  return `<div class="card drinks">
      <h3 style="text-align:center">Напитки дня</h3>
      <div class="glasses">${Array.from({ length: Math.max(WATER_GOAL, n) }, (_, i) => `<button type="button" class="glass" data-action="${i < n ? 'water-remove' : 'water-add'}" aria-label="${i < n ? 'Убрать стакан' : 'Добавить стакан воды'}">${glassSVG(i < n, glasses[i])}</button>`).join('')}</div>
      <div class="water-count">${Math.min(n, WATER_GOAL)} из ${WATER_GOAL}${n > WATER_GOAL ? ` (+${n - WATER_GOAL})` : ''}</div>
      <div class="drink-btns">
        <button type="button" class="chip small" data-action="water-add">💧 Вода</button>
        <button type="button" class="chip small" data-action="water-add" data-drink="plain">🍵 Без сахара</button>
        <button type="button" class="chip small" data-action="sweet">🧋 Сладкое</button>
      </div>
      ${sweet.length ? `<div class="sweet-list"><span class="small muted">Сладкие:</span> ${sweet.map((e) => `<button type="button" class="chip small" data-action="sweet-remove" data-id="${esc(e.id)}" aria-label="Убрать ${esc(foodLabel(e.foods?.[0] || 'soda'))}">${foodEmoji(e.foods?.[0] || 'soda')} ${esc(foodLabel(e.foods?.[0] || 'soda'))} <span class="x">×</span></button>`).join('')}</div>` : '<div class="small muted center">Чай, компот и морс без сахара тоже в цель.</div>'}
    </div>`;
}

// ---------------------------------------------------------------- рендер

function render() {
  const app = $('#app');
  if (!state.profile.onboarded) {
    $('#tabbar').classList.add('hidden');
    app.innerHTML = renderOnboard();
    return;
  }
  $('#tabbar').classList.remove('hidden');
  for (const t of document.querySelectorAll('.tab')) t.setAttribute('aria-current', t.dataset.tab === ui.tab ? 'page' : 'false');
  const views = { today: renderToday, diary: renderDiary, radar: renderRadar, games: renderGames, more: renderMore };
  app.innerHTML = renderTop() + `<main class="view" id="view">${views[ui.tab]()}</main>`;
}

function renderTop() {
  const total = stars(state);
  const rank = rankOf(total);
  const name = state.profile.name ? `Сыщик ${esc(state.profile.name)}` : 'Агентство Медка и Пуси';
  return `<header class="topbar">
    <div class="brand"><div class="brand-badge" aria-hidden="true">🔍</div>
      <div><h1>Агентство Медка и Пуси</h1><div class="sub">${name} · ${rank.emoji} ${esc(rank.title)}</div></div></div>
    <button type="button" class="stars-chip" data-action="go-awards" aria-label="Звёзды: ${total}">⭐ ${total}</button>
  </header>`;
}

function renderOnboard() {
  return `<div class="onboard">
    <div class="stage">
      <div class="bubble" style="--tail:48%"><span class="who">Медок и Пуся</span>Привет! Мы Медок и Пуся, а это наше агентство. Будем вместе записывать, что было на тарелке и как себя чувствует кожа. А Радар поможет найти, что с чем связано.</div>
      <div class="mascots"><div class="mascot-btn">${medokSVG('cheer', 102)}<span class="name">Медок</span></div><div class="mascot-btn">${pusyaSVG('cheer', 120)}<span class="name">Пуся</span></div></div>
    </div>
    <div class="card" style="display:grid;gap:12px;text-align:left">
      <div class="field"><label for="obName">Как зовут сыщика?</label>
        <input class="input" id="obName" maxlength="24" placeholder="Имя или прозвище" autocomplete="off"></div>
      <button type="button" class="pill-btn block" data-action="ob-start">Начать расследование</button>
      <button type="button" class="pill-btn ghost block" data-action="ob-demo">Сначала посмотреть на примере</button>
      <p class="small muted">🔒 Всё, что здесь записывается, остаётся только на этом устройстве. Сайт ничего никуда не отправляет.</p>
    </div></div>`;
}

function renderToday() {
  const t = today();
  const days = byDay(state.entries);
  const list = days.get(t) || [];
  const plate = plateOf(list);
  const water = waterOf(list);
  const skins = list.filter((e) => e.type === 'skin');
  if (!ui.speech) {
    const [who, text, mood] = contextTip({
      hour: zoned(Date.now()).hh, waterToday: water, mealsToday: list.filter((e) => e.type === 'meal').length,
      skinToday: skins.length > 0, plate: plate.size, radar: analyze(state.entries),
    }, ui.seed);
    say(who, text, mood);
  }
  const sp = ui.speech;
  const mMood = sp.who === 'medok' ? sp.mood : sp.mood === 'cheer' ? 'cheer' : 'calm';
  const pMood = sp.who === 'pusya' ? sp.mood : sp.mood === 'cheer' ? 'cheer' : 'calm';
  const st = streak(new Set(days.keys()), t);
  const lastSkin = skins[skins.length - 1];
  const active = state.cases.find((c) => !c.closed);
  const timeline = list.filter((e) => e.type !== 'water' || isSweet(e)).slice().reverse();

  return `
  ${state.profile.demo ? `<div class="banner"><span>👀 Сейчас показан пример. Твои записи появятся после того, как его убрать.</span><button class="pill-btn soft" data-action="demo-clear">Убрать</button></div>` : ''}
  <section class="stage" aria-label="Медок и Пуся">
    <div class="bubble" style="--tail:${sp.who === 'medok' ? '22%' : '72%'}" aria-live="polite"><span class="who">${sp.who === 'medok' ? '🦔 Медок' : '🐒 Пуся'}${sp.cat ? ` · ${WISDOM_CATS[sp.cat].emoji} ${esc(WISDOM_CATS[sp.cat].label)}` : ''}</span>${sp.choice ? `${esc(sp.text)}<div class="choice-opts">${CHOICES.find((c) => c.id === sp.choice).options.map((o, i) => `<button type="button" class="choice-opt" data-action="choose" data-id="${sp.choice}" data-a="${i}">${esc(o.t)}</button>`).join('')}</div>`
      : `${sp.cat ? wisdomTextHTML(sp.text) : esc(sp.text)}${rateHTML(sp.wid || phraseId(sp.text))}`}</div>
    <div class="tap-hint">Нажми на Медка или Пусю, у них есть что рассказать</div>
    <div class="mascots">
      <button type="button" class="mascot-btn" data-action="talk" data-who="medok" aria-label="Поговорить с Медком">${medokSVG(mMood, 98)}<span class="name">Медок</span></button>
      <button type="button" class="mascot-btn" data-action="talk" data-who="pusya" aria-label="Поговорить с Пусей">${pusyaSVG(pMood, 116)}<span class="name">Пуся</span></button>
    </div>
  </section>

  <section class="quick" aria-label="Быстрые записи">
    <button type="button" class="qbtn meal" data-action="meal"><span class="ico">🍽️</span>Еда</button>
    <button type="button" class="qbtn skin" data-action="skin"><span class="ico">🔎</span>Кожа</button>
    <button type="button" class="qbtn water" data-action="water-add"><span class="ico">💧</span>+ Вода</button>
    <button type="button" class="qbtn clue" data-action="factor"><span class="ico">🧴</span>Улика</button>
  </section>

  <section class="card">
    <div class="card-head"><h2>Как кожа сейчас?</h2><span class="hint">${lastSkin ? `замер в ${timeStr(lastSkin.ts)} ${dotsHTML(lastSkin.zones)}` : 'сегодня замеров нет'}</span></div>
    <div class="skin-quick">
      <button type="button" class="pill-btn green q" data-action="skin-clear">✨ Всё спокойно</button>
      <button type="button" class="pill-btn soft q" data-action="skin">Отметить подробно</button>
    </div>
  </section>

  <section class="duo">
    <div class="card plate-wrap">
      <h3>Тарелка дня</h3>
      ${plateSVG(plate)}
      <div class="plate-legend">${PLATE.map((p) => `<span class="${plate.has(p) ? 'on' : ''}">${SECTORS[p].emoji} ${SECTORS[p].label}</span>`).join('')}</div>
    </div>
    ${drinksCard(list)}
  </section>

  ${active ? caseCard(active) : ''}

  <section class="card">
    <div class="card-head"><h2>Сегодня</h2><span class="hint">${st > 1 ? `🔥 ${st} ${plural(st, 'день', 'дня', 'дней')} подряд` : ''}</span></div>
    <div class="timeline">${timeline.length ? timeline.map(entryRow).join('') : `<div class="empty">Пока пусто. Начнём с кнопки «Еда» или «Кожа».${state.entries.length ? '' : '<br><button type="button" class="link-btn" data-action="demo-load" style="margin-top:8px">🧪 Или посмотреть на примере</button>'}</div>`}</div>
  </section>`;
}

function renderDiary() {
  const t = today();
  const days = byDay(state.entries);
  const [y, m] = ui.month.split('-').map(Number);
  const first = `${ui.month}-01`;
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const pad = weekday(first);
  let cells = WEEKDAYS.map((w) => `<div class="wd">${w}</div>`).join('');
  for (let i = 0; i < pad; i++) cells += '<div></div>';
  for (let d = 1; d <= dim; d++) {
    const k = `${ui.month}-${String(d).padStart(2, '0')}`;
    const list = days.get(k) || [];
    const sk = list.filter((e) => e.type === 'skin');
    const lv = sk.length ? Math.max(...sk.map((e) => skinScore(e))) : null;
    const cls = ['day', list.length ? 'has' : '', lv !== null ? 'lv' + lv : '', list.some((e) => e.type === 'meal') ? 'meals' : '', k === t ? 'today' : '', k > t ? 'future' : ''].join(' ');
    cells += `<button type="button" class="${cls}" data-action="pick-day" data-day="${k}" aria-pressed="${k === ui.day}" ${k > t ? 'disabled' : ''} aria-label="${d} ${lv !== null ? LEVELS[lv] : ''}">${d}</button>`;
  }
  const list = (days.get(ui.day) || []).filter((e) => e.type !== 'water' || isSweet(e));
  const dayAll = days.get(ui.day) || [];
  const water = waterOf(dayAll);
  const plate = plateOf(dayAll);
  return `
  <section class="card">
    <div class="cal-head">
      <button type="button" class="cal-nav" data-action="month" data-d="-1" aria-label="Прошлый месяц">‹</button>
      <h2>${MONTHS[m - 1]} ${y}</h2>
      <button type="button" class="cal-nav" data-action="month" data-d="1" aria-label="Следующий месяц" ${ui.month >= t.slice(0, 7) ? 'disabled style="opacity:.3"' : ''}>›</button>
    </div>
    <div class="cal">${cells}</div>
    <div class="legend">${LEVELS.map((l, i) => `<span><i class="dot lv${i}"></i>${l}</span>`).join('')}<span><i class="dot" style="background:#f6f1ea"></i>нет замера</span></div>
  </section>
  <section class="card">
    <div class="card-head"><h2>${esc(humanDay(ui.day, t))}</h2><span class="hint">🍽️ ${plate.size}/4 · 💧 ${water}${sweetOf(dayAll).length ? ` · 🧋 ${sweetOf(dayAll).length}` : ''}</span></div>
    <div class="timeline">${list.length ? list.slice().reverse().map(entryRow).join('') : '<div class="empty">В этот день записей нет.</div>'}</div>
    <div class="chips" style="margin-top:12px">
      <button type="button" class="chip small" data-action="meal">＋ Еда</button>
      <button type="button" class="chip small" data-action="skin">＋ Кожа</button>
      <button type="button" class="chip small" data-action="factor">＋ Улика</button>
      ${ui.day !== t ? '<button type="button" class="chip small" data-action="water-add">＋ Вода</button><button type="button" class="chip small" data-action="water-add" data-drink="plain">＋ Без сахара</button><button type="button" class="chip small" data-action="sweet">＋ Сладкое</button>' : ''}
    </div>
  </section>`;
}

function trendSVG(zone) {
  const t = today();
  const days = byDay(state.entries);
  const N = 30;
  const W = 320;
  const H = 96;
  const bw = W / N;
  let bars = '';
  for (let i = 0; i < N; i++) {
    const k = addDays(t, -(N - 1 - i));
    const sk = (days.get(k) || []).filter((e) => e.type === 'skin');
    const x = i * bw + 1.5;
    if (!sk.length) {
      bars += `<rect x="${x}" y="${H - 22}" width="${bw - 3}" height="4" rx="2" fill="#ece6f2"/>`;
      continue;
    }
    const lv = Math.max(...sk.map((e) => skinScore(e, zone)));
    const h = 8 + (lv / MAX_LEVEL) * (H - 34);
    bars += `<rect x="${x}" y="${H - 18 - h}" width="${bw - 3}" height="${h}" rx="3" fill="var(--l${lv})"><title>${shortDay(k)}: ${LEVELS[lv]}</title></rect>`;
  }
  const lab = (i) => `<text x="${i * bw + bw / 2}" y="${H - 3}" font-size="9" text-anchor="middle" fill="#6f6680">${shortDay(addDays(t, -(N - 1 - i))).replace(/ .*/, '')}</text>`;
  return `<svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Кожа за 30 дней">${bars}${[0, 7, 14, 21, 29].map(lab).join('')}</svg>`;
}

function verdictText(it) {
  const pctE = Math.round((it.flaresExp / it.nExp) * 100);
  const pctU = it.nUn ? Math.round((it.flaresUn / it.nUn) * 100) : 0;
  return `Кожа была «${LEVELS[FLARE].toLowerCase()}» или хуже в ${it.flaresExp} из ${it.nExp} замеров после него (${pctE}%) и в ${it.flaresUn} из ${it.nUn} без него (${pctU}%).`;
}

function suspectCard(it, items, canCase) {
  const fam = it.key.startsWith('fam:');
  const members = fam
    ? items.filter((x) => !x.key.startsWith('fam:') && !x.key.startsWith('f:') && foodFamilies(x.key).includes(it.key.slice(4)) && x.nExp > 0)
    : [];
  const bar = (v, color) => `<div class="bar"><i style="width:${Math.max(4, (v / MAX_LEVEL) * 100)}%;background:${color}"></i></div>`;
  return `<div class="suspect ${it.verdict}">
    <div class="suspect-head"><span class="big">${itemEmoji(it.key)}</span>
      <div><div class="name">${esc(itemLabel(it.key))}</div>
        <span class="tag ${it.verdict === 'watch' ? 'watch' : ''}">${it.verdict === 'suspect' ? 'Главный след' : 'Под наблюдением'}</span>
        ${fam ? '<span class="tag fam">семейство</span>' : ''}${it.key.startsWith('f:') ? '<span class="tag fam">улика</span>' : ''}</div></div>
    <div class="compare">
      <div class="bar-row"><span>После него</span>${bar(it.meanExp, 'var(--l3)')}<b>${it.meanExp.toFixed(1)}</b></div>
      <div class="bar-row"><span>Без него</span>${bar(it.meanUn, 'var(--l0)')}<b>${it.meanUn.toFixed(1)}</b></div>
    </div>
    <p class="small">${verdictText(it)}</p>
    ${members.length ? `<div class="note">Внутри: ${members.map((x) => `${esc(foodLabel(x.key))} (${x.flaresExp} из ${x.nExp})`).join(', ')}</div>` : ''}
    ${it.twins?.length ? `<div class="note">Всегда был вместе с: ${it.twins.map((k) => esc(itemLabel(k))).join(', ')}. Пока Радар не может их различить. Можно попробовать есть их в разные дни.</div>` : ''}
    ${canCase ? `<button type="button" class="pill-btn soft" data-action="case-new" data-key="${esc(it.key)}">📁 Открыть дело</button>` : ''}
  </div>`;
}

function caseCard(c) {
  const ev = evaluateCase(state.entries, c, today());
  const name = esc(itemLabel(c.food));
  let body = '';
  if (c.closed || ev.done) {
    const txt = {
      better: `Без «${name}» кожа была спокойнее: в среднем ${ev.meanDuring.toFixed(1)} против ${ev.meanBefore.toFixed(1)} до дела. Хороший повод показать отчёт врачу.`,
      worse: `Без «${name}» кожа была даже беспокойнее (${ev.meanDuring.toFixed(1)} против ${ev.meanBefore.toFixed(1)}). Похоже, дело не в нём.`,
      same: `Разницы почти нет (${ev.meanDuring.toFixed(1)} против ${ev.meanBefore.toFixed(1)}). Похоже, «${name}» не главный подозреваемый.`,
      few: 'Замеров мало для вывода. Дело можно повторить, отмечая кожу каждый день.',
    }[ev.outcome];
    body = `<p class="small">${txt}</p>${c.closed ? '' : `<button type="button" class="pill-btn" data-action="case-close" data-id="${esc(c.id)}">Закрыть дело ⭐ +50</button>`}`;
  } else {
    body = `<div class="progress" aria-label="Прогресс"><i style="width:${(ev.elapsed / c.days) * 100}%"></i></div>
      <p class="small">День ${ev.elapsed} из ${c.days}. Замеров кожи в деле: ${ev.during}, до дела: ${ev.before}.</p>
      ${ev.slips.length ? `<div class="note">«${name}» всё-таки встречался: ${ev.slips.map(shortDay).join(', ')}. Ничего страшного, дело продолжается.</div>` : ''}`;
  }
  return `<section class="card">
    <div class="card-head"><h2>📁 Дело: ${name}</h2><span class="hint">${c.closed ? 'закрыто' : ev.done ? 'готов итог' : `до ${shortDay(addDays(ev.endKey, -1))}`}</span></div>
    <div style="display:grid;gap:10px">${body}
    ${!c.closed && !ev.done ? `<button type="button" class="link-btn" data-action="case-stop" data-id="${esc(c.id)}" style="justify-self:start">Остановить дело</button>` : ''}</div>
  </section>`;
}

function renderRadar() {
  const a = analyze(state.entries, { zone: ui.zone });
  const active = state.cases.find((c) => !c.closed);
  const need = Math.max(0, 8 - a.measurements);
  const closed = state.cases.filter((c) => c.closed).sort((x, y) => (y.u || 0) - (x.u || 0));
  const top = [...a.suspects, ...a.watch.slice(0, 3)];
  return `
  <section class="stage" style="padding-bottom:10px">
    <div class="bubble" style="--tail:22%"><span class="who">🦔 Радар Медка</span>${
      !a.ready ? `Мне нужно ещё ${need} ${plural(need, 'замер', 'замера', 'замеров')} кожи, перед которыми записана еда. Тогда я начну искать следы.`
        : a.suspects.length ? 'Есть след! Смотрю, после чего кожа бывала беспокойнее, и сравниваю с днями без этого.'
          : a.watch.length ? 'Явного следа пока нет, но кое-что под наблюдением. Продолжаем записывать.'
            : 'Следов не видно. Это тоже хороший результат расследования.'}</div>
    <div class="mascots" style="justify-content:flex-start;gap:8px">${medokSVG(a.ready ? 'think' : 'calm', 110)}
      <div style="flex:1;align-self:center;display:grid;gap:6px"><div class="progress"><i style="width:${a.progress * 100}%"></i></div>
      <span class="small muted">Замеров для анализа: ${a.measurements} из ${state.entries.filter((e) => e.type === 'skin').length}</span></div></div>
  </section>

  <div class="zone-tabs" role="group" aria-label="Зона">
    ${[{ id: 'max', label: 'Все' }, ...ZONES].map((z) => `<button type="button" data-action="zone" data-zone="${z.id}" aria-pressed="${ui.zone === z.id}">${z.label}</button>`).join('')}
  </div>

  <section class="card"><div class="card-head"><h2>Кожа за 30 дней</h2><span class="hint">${ui.zone === 'max' ? 'худшая зона за день' : ZONES.find((z) => z.id === ui.zone).label}</span></div>${trendSVG(ui.zone)}</section>

  ${a.ready ? `
  <h3 class="section-title">Следы</h3>
  ${top.length ? top.map((it) => suspectCard(it, a.items, !active)).join('') : '<div class="card empty">Подозреваемых нет. Кожа ведёт себя одинаково с разными продуктами.</div>'}
  <section class="card">
    <div class="card-head"><h2>🟢 Зелёная зона</h2><span class="hint">с ними кожа как обычно</span></div>
    ${a.green.length ? `<div class="chips">${a.green.slice(0, 18).map((g) => `<span class="chip small green">${itemEmoji(g.key)} ${esc(itemLabel(g.key))}</span>`).join('')}</div>` : '<p class="small muted">Пока мало данных.</p>'}
  </section>` : ''}

  ${active ? caseCard(active) : ''}
  ${closed.length ? `<h3 class="section-title">Закрытые дела</h3>${closed.slice(0, 5).map(caseCard).join('')}` : ''}

  <details class="parent-note"><summary><b>Для взрослых: как считает Радар</b></summary>
    <p style="margin-top:8px">Для каждого замера кожи берутся продукты и улики за 48 часов до него (кроме последнего часа). Затем сравниваются замеры «после продукта» и «без него», а регрессия отделяет продукты, которые просто часто попадали в одни дни. След показывается, только если продукт встретился хотя бы в 3 замерах и 2 разных днях.</p>
    <p style="margin-top:8px">Это подсказки для разговора с аллергологом, а не диагноз. Исключать продукты из питания ребёнка стоит по согласованию с врачом.</p>
  </details>`;
}

// ---------------------------------------------------------------- игры

const heroFor = (who, mood, size) => (who === 'medok' ? medokSVG(mood, Math.round(size * 0.85)) : pusyaSVG(mood, size));

function gameStats(g) {
  const list = state.games.filter((x) => x.g === g);
  const solo = list.filter((x) => x.mode === 'solo');
  // рекорд на самом высоком уровне, где играли
  const top = solo.length ? Math.max(...solo.map((x) => x.level || 1)) : 0;
  const atTop = solo.filter((x) => (x.level || 1) === top);
  const b = atTop.length ? atTop.reduce((m, x) => (x.scores[0] > m.scores[0] ? x : m)) : null;
  return { n: list.length, best: b ? b.scores[0] : null, of: b?.of || 14, level: top };
}

function renderGames() {
  const c = gameStats('catch');
  const me = state.profile.name || 'Игрок 1';
  return `
  <section class="card game-card">
    <div class="gc-top"><span class="gc-ico">🍎</span><div><h2>Полезное или вредное?</h2>
      <p class="small muted">Медок и Пуся подкидывают еду. Полезное ловим и едим, от вредного отказываемся. Три уровня: Легко, Средне и Сложно с хитрыми продуктами.</p></div></div>
    ${c.n ? `<p class="small muted">Сыграно ${c.n} ${plural(c.n, 'раз', 'раза', 'раз')}${c.best !== null ? ` · рекорд ${c.best} из ${c.of}${c.level > 1 ? ` (${c.level === 3 ? 'сложно' : 'средне'})` : ''}` : ''}</p>` : ''}
    <div class="gc-btns">
      <button type="button" class="pill-btn" data-action="game-catch" data-mode="pusya">🐒 Играть с Пусей</button>
      <button type="button" class="pill-btn soft" data-action="game-catch" data-mode="medok">🦔 Играть с Медком</button>
      <button type="button" class="pill-btn ghost" data-action="game-catch" data-mode="duo">👯 Вдвоём</button>
    </div>
    <p class="small muted">Вдвоём: экран делится пополам, ${esc(me)} играет за Пусю слева, второй игрок за Медка справа.</p>
  </section>
  <section class="card game-card">
    <div class="gc-top"><span class="gc-ico gc-robot">${robotSVG({ ...DEFAULT_ROBOT, ...(state.profile.robot || {}) }, 54)}</span><div><h2>Робот</h2>
      <p class="small muted">Собери своего робота: на колёсах, ногах, гусеницах или с пропеллером. Потом программируй его командами: выбраться из лабиринта, доставить продукты, полить морковь.</p></div></div>
    ${(() => { const d = new Set(state.games.filter((x) => x.g === 'robot').map((x) => x.mission)); return d.size ? `<p class="small muted">Пройдено миссий: ${d.size} из ${ROBOT_MISSIONS.length}</p>` : ''; })()}
    <div class="gc-btns"><button type="button" class="pill-btn" data-action="game-robot">🤖 К роботу</button></div>
  </section>
  <section class="card game-card">
    <div class="gc-top"><span class="gc-ico">✉️</span><div><h2>Шифровки</h2>
      <p class="small muted">Медок и Пуся переписываются секретным шифром. Разгадай записку: по значкам, по сдвигу алфавита или по номерам букв.</p></div></div>
    ${(() => { const k = new Set(state.games.filter((x) => x.g === 'cipher').map((x) => x.msg)); return k.size ? `<p class="small muted">Разгадано ${k.size} из ${CIPHER_MESSAGES.length} записок</p>` : ''; })()}
    <div class="gc-btns"><button type="button" class="pill-btn" data-action="game-cipher">✉️ Открыть записку</button></div>
  </section>
  <section class="card game-card">
    <div class="gc-top"><span class="gc-ico">🔍</span><div><h2>Логика сыщика</h2>
      <p class="small muted">Кто любит грушу, а кто ходит на шахматы? По уликам выясни, у кого какой фрукт, шарф и кружок. Три уровня: Стажёр, Сыщик, Детектив.</p></div></div>
    ${(() => { const n = state.games.filter((x) => x.g === 'logic').length; return n ? `<p class="small muted">Раскрыто дел: ${n}</p>` : ''; })()}
    <div class="gc-btns"><button type="button" class="pill-btn" data-action="game-logic">🔍 Новое дело</button></div>
  </section>
  <section class="card game-card">
    <div class="gc-top"><span class="gc-ico">🃏</span><div><h2>Что для меня важно</h2>
      <p class="small muted">Пуся показывает карточки: семья, друзья, приключения, быть лучшей и много другого. Раскладываешь их по колодам, как чувствуешь. Правильных ответов нет.</p></div></div>
    ${state.sorts.length ? `<p class="small muted">Разложено ${state.sorts.length} ${plural(state.sorts.length, 'раз', 'раза', 'раз')}, последний раз ${shortDay(dayKey(state.sorts[state.sorts.length - 1].ts))}</p>` : ''}
    <div class="gc-btns">
      ${state.sortDraft ? `<button type="button" class="pill-btn" data-action="game-sort">▶ Продолжить (${Object.keys(state.sortDraft.decks).length} из ${VALUE_CARDS.length})</button>
        <button type="button" class="pill-btn ghost" data-action="game-sort" data-fresh="1">Начать заново</button>`
        : `<button type="button" class="pill-btn" data-action="game-sort">🃏 Разложить карточки</button>`}
    </div>
    <p class="small muted">${VALUE_CARDS.length} карточек. Можно остановиться в любой момент и продолжить потом.</p>
  </section>
  <section class="card game-card">
    <div class="gc-top"><span class="gc-ico">🧺</span><div><h2>Лавка и кухня</h2>
      <p class="small muted">Кто-то из близких просит приготовить блюдо. Собираешь продукты на прилавках по списку, готовишь по шагам и узнаёшь, чем это блюдо помогает. Три уровня: Помощник, Повар и Шеф.</p></div></div>
    ${(() => { const k = new Set(state.games.filter((x) => x.g === 'kitchen').map((x) => x.recipe)); return k.size ? `<p class="small muted">Приготовлено ${k.size} из ${RECIPES.length} рецептов</p>` : ''; })()}
    <div class="gc-btns"><button type="button" class="pill-btn" data-action="game-kitchen">🧺 Открыть лавку</button></div>
  </section>`;
}

function startCatch(mode) {
  const me = state.profile.name || 'Игрок 1';
  const players = mode === 'duo' ? [{ who: 'pusya', name: me }, { who: 'medok', name: 'Игрок 2' }] : [{ who: mode, name: me }];
  playCatch({
    players,
    hero: heroFor,
    startLevel: state.profile.catchLevel || 1,
    onLevel: (l) => { state.profile.catchLevel = l; save(state); },
    onFinish: (r) => {
      state.games.push({ id: uid(), ts: Date.now(), ...r });
      commit();
    },
  });
}

function startRobot() {
  const best = {};
  for (const x of state.games) if (x.g === 'robot') best[x.mission] = Math.min(best[x.mission] || Infinity, x.scores[0]);
  playRobot({
    robot: { ...DEFAULT_ROBOT, ...(state.profile.robot || {}) },
    best,
    hero: heroFor,
    onRobot: (r) => { state.profile.robot = r; save(state); },
    onFinish: (r) => { state.games.push({ id: uid(), ts: Date.now(), ...r }); commit(); },
  });
}

function startCipher() {
  playCipher({
    hero: heroFor,
    level: state.profile.cipherLevel || 1,
    onLevel: (l) => { state.profile.cipherLevel = l; save(state); },
    done: [...new Set(state.games.filter((x) => x.g === 'cipher').map((x) => x.msg))],
    onFinish: (r) => { state.games.push({ id: uid(), ts: Date.now(), ...r }); commit(); },
  });
}

function startLogic() {
  playLogic({
    hero: heroFor,
    level: state.profile.logicLevel || 1,
    solved: state.games.filter((x) => x.g === 'logic').length,
    onLevel: (l) => { state.profile.logicLevel = l; save(state); },
    onFinish: (r) => { state.games.push({ id: uid(), ts: Date.now(), ...r }); commit(); },
  });
}

function startKitchen() {
  playKitchen({
    recipes: RECIPES, products: PRODUCTS, stalls: STALLS, plate: DISH_PLATE, levels: KITCHEN_LEVELS, hero: heroFor,
    level: state.profile.kitchenLevel || 1,
    onLevel: (l) => { state.profile.kitchenLevel = l; save(state); },
    done: state.games.filter((x) => x.g === 'kitchen').map((x) => x.recipe),
    onFinish: (r) => { state.games.push({ id: uid(), ts: Date.now(), ...r }); commit(); },
  });
}

function startSort(fresh) {
  if (fresh) state.sortDraft = null;
  playSort({
    cards: VALUE_CARDS,
    hero: heroFor,
    draft: state.sortDraft,
    onSave: (d) => { state.sortDraft = Object.keys(d.decks).length ? d : null; commit(); },
    onFinish: (decks) => {
      const ts = Date.now();
      state.sorts.push({ id: uid(), ts, decks });
      state.sortDraft = null;
      state.games.push({ id: uid(), ts, g: 'values', mode: 'solo', scores: [], of: 0 });
      commit();
    },
  });
}

// Для взрослых: расклад ценностей, что поменялось, полюса Шварца и текст для Claude
function valuesSheet() {
  const byId = new Map(VALUE_CARDS.map((c) => [c.id, c]));
  const sorts = state.sorts;
  if (!sorts.length) {
    openSheet({
      title: 'Что для неё важно',
      body: '<div class="empty">Расклада пока нет. Он появится, когда ребёнок разложит карточки в игре «Что для меня важно» во вкладке «Игры».</div>',
      foot: '<button type="button" class="pill-btn" data-sa="close">Понятно</button>',
      actions: { close: () => closeSheet() },
    });
    return;
  }
  const cur = sorts[sorts.length - 1];
  const chips = (ids) => ids.map((id) => byId.get(id)).filter(Boolean).map((c) => `<span class="chip small" title="${esc(c.d)}">${c.e} ${esc(c.n)}</span>`).join('');
  const decksHTML = DECKS.map((d) => {
    const ids = Object.keys(cur.decks).filter((id) => cur.decks[id] === d.id);
    return `<div class="cat-title">${d.emoji} ${d.label} · ${ids.length}</div><div class="chips">${chips(ids) || '<span class="small muted">пусто</span>'}</div>`;
  }).join('');
  let diffHTML = '';
  if (sorts.length > 1) {
    const prev = sorts[sorts.length - 2];
    const { up, down } = sortDiff(prev.decks, cur.decks);
    diffHTML = `<div class="cat-title">🔄 С прошлого раза (${shortDay(dayKey(prev.ts))})</div>
      ${up.length ? `<div class="small"><b>Стало важнее:</b></div><div class="chips">${chips(up)}</div>` : ''}
      ${down.length ? `<div class="small"><b>Стало менее важно:</b></div><div class="chips">${chips(down)}</div>` : ''}
      ${!up.length && !down.length ? '<p class="small muted">Расклад почти не изменился.</p>' : ''}`;
  }
  const pi = poleIndices(cur.decks, VALUE_CARDS);
  const polesHTML = pi ? `<div class="cat-title">🧭 Четыре стороны (модель Шварца)</div>
    <div class="poles">${Object.entries(POLES).map(([k, p]) => {
      const v = Math.abs(pi[k].index) < 0.005 ? 0 : pi[k].index;
      const w = Math.min(50, Math.abs(v) * 50);
      return `<div class="pole"><div class="pl"><b>${p.label}</b><span class="small muted">${p.hint}</span></div>
        <div class="pbar"><i class="${v >= 0 ? 'pos' : 'neg'}" style="width:${w}%;${v >= 0 ? 'left:50%' : `left:${50 - w}%`}"></i></div><span class="pv">${v > 0 ? '+' : ''}${v.toFixed(2)}</span></div>`;
    }).join('')}</div>
    <p class="small muted">Справа от середины: важнее среднего для неё, слева: менее важно. Это грубая оценка по одному раскладу, она не про «хорошо» или «плохо».</p>` : '';
  openSheet({
    title: 'Что для неё важно',
    body: `<p class="small muted">Расклад от ${shortDay(dayKey(cur.ts))}, всего раскладов ${sorts.length}. Детские ценности только складываются и меняются, это повод заметить интересы и поговорить, а не тест и не диагноз.</p>
      ${decksHTML}${diffHTML}${polesHTML}
      <p class="small muted">Кнопка ниже копирует расклад и бережное задание. Его можно вставить в чат с Claude и получить идеи, о чём поговорить и что предложить. Имени ребёнка в тексте нет.</p>`,
    foot: '<button type="button" class="pill-btn" data-sa="copy">📋 Скопировать для Claude</button>',
    actions: {
      copy: async () => {
        const text = claudePrompt(sorts, VALUE_CARDS);
        try {
          await navigator.clipboard.writeText(text);
          toast('Скопировано. Вставьте в чат с Claude');
        } catch {
          toast('Не удалось скопировать автоматически');
        }
      },
    },
  });
}

function renderMore() {
  const total = stars(state);
  const rank = rankOf(total);
  const got = earnedBadges(state);
  return `
  <section class="card rank-card">
    <div class="rank-line"><span class="big">${rank.emoji}</span><div><h2>${esc(rank.title)}</h2>
      <p class="small muted">${rank.next ? `До звания «${esc(rank.next.title)}» ещё ${rank.toNext} ⭐` : 'Высшее звание агентства!'}</p></div></div>
    <div class="progress"><i style="width:${rank.progress * 100}%"></i></div>
    <p class="small muted">⭐ 10 за еду и замер кожи, 5 за улику, 2 за стакан воды или напитка без сахара, 20 за супер-тарелку, 5 за игру (до трёх в день), 50 за закрытое дело.</p>
  </section>

  <section class="card">
    <div class="card-head"><h2>Копилка мудрости</h2><span class="hint">${state.wisdom.length} из ${WISDOM.length}</span></div>
    <p class="small muted">Каждый раз, когда нажимаешь на Медка или Пусю, в копилку падает новый совет, факт или загадка.</p>
    <div class="progress"><i style="width:${(state.wisdom.length / WISDOM.length) * 100}%"></i></div>
    <div class="chips" style="margin-top:10px">${Object.entries(WISDOM_CATS).map(([id, c]) => {
      const n = WISDOM.filter((w) => w[1] === id).length;
      const g = WISDOM.filter((w) => w[1] === id && state.wisdom.includes(w[0])).length;
      return `<button type="button" class="chip small" data-action="wisdom" data-cat="${id}">${c.emoji} ${esc(c.label)} ${g}/${n}</button>`;
    }).join('')}</div>
  </section>

  <section class="card" id="awards">
    <div class="card-head"><h2>Значки</h2><span class="hint">${got.size} из ${BADGES.length}</span></div>
    <div class="badges">${BADGES.map((b) => `<div class="badge ${got.has(b.id) ? '' : 'locked'}"><span class="ico">${b.emoji}</span><span class="t">${esc(b.title)}</span><span class="h">${esc(b.hint)}</span></div>`).join('')}</div>
  </section>

  <h3 class="section-title">Для взрослых</h3>
  <section class="card list">
    <button type="button" class="row" data-action="report"><span class="ico">🩺</span><span class="txt"><span class="t">Отчёт для врача</span><span class="d">Таблица по дням и следы Радара, можно распечатать</span></span><span class="chev">›</span></button>
    <button type="button" class="row" data-action="backup"><span class="ico">🔐</span><span class="txt"><span class="t">Сохранить копию</span><span class="d">Зашифрованный файл с паролем семьи</span></span><span class="chev">›</span></button>
    <button type="button" class="row" data-action="restore"><span class="ico">📥</span><span class="txt"><span class="t">Загрузить копию</span><span class="d">Перенести записи с другого телефона или планшета</span></span><span class="chev">›</span></button>
    <button type="button" class="row" data-action="install"><span class="ico">📲</span><span class="txt"><span class="t">Установить как приложение</span><span class="d">Иконка на экране, работает без интернета</span></span><span class="chev">›</span></button>
    <button type="button" class="row" data-action="values-view"><span class="ico">🃏</span><span class="txt"><span class="t">Что для неё важно</span><span class="d">${state.sorts.length ? `Раскладов: ${state.sorts.length}. Карточки ценностей и что меняется` : 'Расклад карточек ценностей появится здесь'}</span></span><span class="chev">›</span></button>
    <button type="button" class="row" data-action="choices-view"><span class="ico">🧭</span><span class="txt"><span class="t">Выборы и ценности</span><span class="d">${Object.keys(state.choices).length ? `Ответов: ${Object.keys(state.choices).length}. Как ребёнок отвечает на вопросы героев` : 'Ответы на вопросы героев появятся здесь'}</span></span><span class="chev">›</span></button>
    <button type="button" class="row" data-action="reactions"><span class="ico">💬</span><span class="txt"><span class="t">Реакции на советы</span><span class="d">${Object.keys(state.reactions).length ? `Оценено ${Object.keys(state.reactions).length}: какие советы нравятся, а какие нет` : 'Пока оценок нет'}</span></span><span class="chev">›</span></button>
    <button type="button" class="row" data-action="privacy"><span class="ico">🔒</span><span class="txt"><span class="t">Где хранятся данные</span><span class="d">Только на этом устройстве</span></span><span class="chev">›</span></button>
  </section>

  <section class="card list">
    <button type="button" class="row" data-action="heroes"><span class="ico">🦔</span><span class="txt"><span class="t">Внешний вид героев</span><span class="d">Медок: ${esc(STYLES.find((x) => x.id === heroStyle('medok')).label)}, Пуся: ${esc(STYLES.find((x) => x.id === heroStyle('pusya')).label)}</span></span><span class="chev">›</span></button>
    <button type="button" class="row" data-action="rename"><span class="ico">🪪</span><span class="txt"><span class="t">Имя сыщика</span><span class="d">${esc(state.profile.name || 'не указано')}</span></span><span class="chev">›</span></button>
    ${state.profile.demo
      ? '<button type="button" class="row" data-action="demo-clear"><span class="ico">🧹</span><span class="txt"><span class="t">Убрать пример</span><span class="d">Останутся только настоящие записи</span></span><span class="chev">›</span></button>'
      : '<button type="button" class="row" data-action="demo-load"><span class="ico">🧪</span><span class="txt"><span class="t">Показать пример</span><span class="d">3 недели выдуманных записей, чтобы посмотреть Радар</span></span><span class="chev">›</span></button>'}
    <button type="button" class="row" data-action="wipe"><span class="ico">🗑️</span><span class="txt"><span class="t" style="color:var(--red)">Стереть все данные</span><span class="d">На этом устройстве</span></span><span class="chev">›</span></button>
  </section>
  <p class="small muted" style="text-align:center">Версия ${VERSION} · Медок и Пуся</p>`;
}

// ---------------------------------------------------------------- шторки

const sheet = () => $('#sheet');
let sheetCtx = null;

function openSheet({ title, body, foot = '', actions = {}, onInput, mount }) {
  const d = sheet();
  d.innerHTML = `<div class="sheet-head"><h2 id="sheetTitle">${title}</h2><button type="button" class="sheet-close" data-sa="close" aria-label="Закрыть">✕</button></div>
    <div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}`;
  sheetCtx = { actions: { close: closeSheet, ...actions }, onInput };
  if (!d.open) d.showModal();
  mount?.(d);
}

function closeSheet() {
  const d = sheet();
  if (d.open) d.close();
  sheetCtx = null;
}

function timeField(ts) {
  return `<div class="field"><label for="fTime">Когда</label><input class="input" type="datetime-local" id="fTime" value="${toInputValue(ts)}" max="${toInputValue(Date.now() + 36e5)}"></div>`;
}

function readTime(fallback) {
  const v = fromInputValue($('#fTime')?.value);
  return Number.isFinite(v) ? v : fallback;
}

function deleteBtn(e) {
  return e ? `<button type="button" class="pill-btn danger" data-sa="delete" style="flex:0 0 auto">🗑️</button>` : '';
}

function afterDelete(e) {
  closeSheet();
  commit();
  toast('Запись удалена', () => { delete state.tombstones[e.id]; upsert(e); commit(); });
}

function afterSave(e, isNew, kind) {
  closeSheet();
  if (isNew) {
    const days = byDay(state.entries);
    const k = dayKey(e.ts);
    const superPlate = kind === 'meal' && plateOf(days.get(k)).size === 4 && plateOf((days.get(k) || []).filter((x) => x.id !== e.id)).size < 4;
    if (superPlate) say('pusya', CHEERS.plate[0], 'cheer');
    else say(kind === 'skin' ? 'medok' : 'pusya', pick(CHEERS[kind] || CHEERS.meal, e.ts / 1000), 'cheer');
  }
  commit();
  if (isNew) toast(kind === 'skin' ? 'Замер записан ⭐ +10' : kind === 'factor' ? 'Улика записана ⭐ +5' : 'Записано ⭐ +10', () => { remove(e.id); commit(); });
  else toast('Изменения сохранены');
}

// --- еда
function mealSheet(existing) {
  const ts0 = existing?.ts ?? defaultTs();
  const st = { kind: existing?.kind || kindByTime(ts0), place: existing?.place || 'home', foods: [...(existing?.foods || [])], qty: { ...(existing?.qty || {}) }, qOpen: null };
  const freq = frequentFoods();
  const sectorOrder = ['dish', 'veg', 'prot', 'carb', 'fruit', 'treat', 'drink'];
  const chip = (id) => `<button type="button" class="chip" data-sa="food" data-id="${esc(id)}" aria-pressed="${st.foods.includes(id)}">${foodEmoji(id)} ${esc(foodLabel(id))}</button>`;
  const cats = sectorOrder.map((s) => `<div><div class="cat-title"><i style="background:${SECTORS[s].color}"></i>${SECTORS[s].label}</div>
    <div class="chips">${FOODS.filter((f) => f.sector === s).map((f) => chip(f.id)).join('')}</div></div>`).join('');
  const tray = () => (st.foods.length
    ? `<div class="chips">${st.foods.map((id) => `<span class="tray-item ${st.qOpen === id ? 'open' : ''}"><button type="button" class="chip small" data-sa="qopen" data-id="${esc(id)}" aria-expanded="${st.qOpen === id}">${foodEmoji(id)} ${esc(foodLabel(id))} <span class="qty ${st.qty[id] ? '' : 'none'}">${st.qty[id] ? esc(qtyText(st.qty[id])) : 'сколько?'}</span></button><button type="button" class="chip small x-btn" data-sa="unfood" data-id="${esc(id)}" aria-label="Убрать ${esc(foodLabel(id))}">×</button></span>`).join('')}</div>
      ${st.qOpen && st.foods.includes(st.qOpen) ? `<div class="qty-box"><div class="small"><b>${foodEmoji(st.qOpen)} ${esc(foodLabel(st.qOpen))}: сколько?</b> <span class="muted">Можно не указывать.</span></div>${qtyPicker(st.qty[st.qOpen], st.qOpen)}
        <div class="qty-foot">${st.qty[st.qOpen] ? '<button type="button" class="pill-btn ghost" data-sa="qclear">Без количества</button>' : ''}<button type="button" class="pill-btn soft" data-sa="qdone">Готово</button></div></div>` : '<div class="small muted tray-hint">Нажми на продукт, чтобы указать сколько. Это необязательно.</div>'}`
    : '<div class="placeholder">Выбери продукты ниже или напиши блюдо словами</div>');
  const sync = () => {
    $('#tray').innerHTML = tray();
    for (const b of sheet().querySelectorAll('[data-sa="food"]')) b.setAttribute('aria-pressed', st.foods.includes(b.dataset.id));
  };
  const addFoods = (ids) => { for (const id of ids) if (!st.foods.includes(id)) st.foods.push(id); sync(); };
  const suggest = () => {
    const v = $('#fText').value;
    const box = $('#suggest');
    if (!v.trim()) { box.innerHTML = ''; return; }
    const parsed = parseFreeText(v);
    box.innerHTML = parsed.map((p, i) => {
      const what = p.kind === 'dish' ? `${foodEmoji(p.foods[0])} ${esc(p.label)}${p.foods.length > 1 ? `, ${p.foods.slice(1).map((f) => esc(foodLabel(f).toLowerCase())).join(', ')}` : ''}`
        : p.kind === 'custom' ? `Свой продукт «${esc(p.text)}»` : p.foods.map((f) => `${foodEmoji(f)} ${esc(foodLabel(f))}`).join(', ');
      return `<button type="button" data-sa="parsed" data-i="${i}">＋ ${what}</button>`;
    }).join('') + (parsed.length > 1 ? '<button type="button" data-sa="parsed-all">＋ Добавить всё</button>' : '');
    st.parsed = parsed;
  };
  openSheet({
    title: existing ? 'Изменить запись' : 'Что было на тарелке?',
    body: `
      <div class="seg" role="group" aria-label="Приём пищи">${MEAL_KINDS.map((k) => `<button type="button" data-sa="kind" data-id="${k.id}" aria-pressed="${st.kind === k.id}">${k.emoji} ${k.label}</button>`).join('')}</div>
      <div class="seg place" role="group" aria-label="Где ели">${PLACES.map((x) => `<button type="button" data-sa="place" data-id="${x.id}" aria-pressed="${st.place === x.id}">${x.emoji} ${x.label}</button>`).join('')}</div>
      <div class="tray" id="tray">${tray()}</div>
      <div class="field"><label for="fText">Написать словами</label>
        <input class="input" id="fText" placeholder="Например: борщ, сырники, нутелла" autocomplete="off" enterkeyhint="done">
        <div class="suggest" id="suggest"></div></div>
      ${freq.length ? `<div><div class="cat-title">⭐ Часто</div><div class="chips">${freq.map(chip).join('')}</div></div>` : ''}
      <div><div class="cat-title">🍽️ Основное</div><div class="chips">${BASIC.filter((id) => !freq.includes(id)).map(chip).join('')}</div></div>
      ${cats}
      ${timeField(ts0)}
      <div class="field"><label for="fNote">Заметка</label><textarea class="input" id="fNote" placeholder="Например: в гостях, новая марка йогурта">${esc(existing?.note || '')}</textarea></div>`,
    foot: `${deleteBtn(existing)}<button type="button" class="pill-btn" data-sa="save">Сохранить</button>`,
    onInput: (ev) => { if (ev.target.id === 'fText') suggest(); },
    actions: {
      kind: (b) => { st.kind = b.dataset.id; for (const x of sheet().querySelectorAll('[data-sa="kind"]')) x.setAttribute('aria-pressed', x === b); },
      place: (b) => { st.place = b.dataset.id; for (const x of sheet().querySelectorAll('[data-sa="place"]')) x.setAttribute('aria-pressed', x === b); },
      food: (b) => { const id = b.dataset.id; st.foods = st.foods.includes(id) ? st.foods.filter((x) => x !== id) : [...st.foods, id]; sync(); },
      unfood: (b) => { st.foods = st.foods.filter((x) => x !== b.dataset.id); delete st.qty[b.dataset.id]; if (st.qOpen === b.dataset.id) st.qOpen = null; sync(); },
      qopen: (b) => { st.qOpen = st.qOpen === b.dataset.id ? null : b.dataset.id; sync(); },
      q: (b) => { const id = st.qOpen; if (!id) return; const q = applyQty(st.qty[id], id, b); if (q) st.qty[id] = q; else delete st.qty[id]; sync(); },
      qclear: () => { delete st.qty[st.qOpen]; sync(); },
      qdone: () => { st.qOpen = null; sync(); },
      parsed: (b) => { addFoods(st.parsed[+b.dataset.i].foods); b.remove(); if (!$('#suggest [data-sa="parsed"]')) { $('#fText').value = ''; suggest(); } },
      'parsed-all': () => { for (const p of st.parsed) addFoods(p.foods); $('#fText').value = ''; suggest(); },
      delete: () => afterDelete(remove(existing.id)),
      save: () => {
        const pending = $('#fText').value.trim();
        if (pending) for (const p of parseFreeText(pending)) addFoods(p.foods);
        if (!st.foods.length) { toast('Добавь хотя бы один продукт'); return; }
        const e = { ...(existing || { id: uid(), type: 'meal' }), kind: st.kind, place: st.place, foods: st.foods, qty: cleanQty(st.qty, st.foods), ts: readTime(ts0), note: $('#fNote').value.trim().slice(0, 300) };
        if (!e.qty) delete e.qty;
        delete e.demo;
        upsert(e);
        afterSave(e, !existing, 'meal');
      },
    },
    mount: (d) => {
      d.querySelector('#fText').addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); sheetCtx.actions['parsed-all'](); }
      });
    },
  });
}

// --- кожа
function skinSheet(existing) {
  const ts0 = existing?.ts ?? defaultTs();
  const zones = { face: 0, neck: 0, hands: 0, ...(existing?.zones || {}) };
  let itch = !!existing?.itch;
  const zoneHTML = (z) => `<div class="zone"><div class="zone-head"><span>${z.emoji} ${z.label}</span><span class="val" id="v-${z.id}">${LEVELS[zones[z.id]]}</span></div>
    <div class="levels">${LEVELS.map((l, i) => `<button type="button" class="level lv${i}" data-sa="lvl" data-z="${z.id}" data-v="${i}" aria-pressed="${zones[z.id] === i}" aria-label="${z.label}: ${l}">${LEVEL_FACES[i]}</button>`).join('')}</div></div>`;
  openSheet({
    title: existing ? 'Изменить замер' : 'Как кожа?',
    body: `${ZONES.map(zoneHTML).join('')}
      <div class="toggle"><span>Чешется?</span><button type="button" class="switch" role="switch" data-sa="itch" aria-checked="${itch}" aria-label="Чешется"></button></div>
      ${timeField(ts0)}
      <div class="field"><label for="fNote">Заметка</label><textarea class="input" id="fNote" placeholder="Например: покраснение на сгибе локтя">${esc(existing?.note || '')}</textarea></div>`,
    foot: `${deleteBtn(existing)}<button type="button" class="pill-btn" data-sa="save">Сохранить замер</button>`,
    actions: {
      lvl: (b) => {
        const z = b.dataset.z;
        zones[z] = +b.dataset.v;
        for (const x of sheet().querySelectorAll(`[data-sa="lvl"][data-z="${z}"]`)) x.setAttribute('aria-pressed', x === b);
        $(`#v-${z}`).textContent = LEVELS[zones[z]];
      },
      itch: (b) => { itch = !itch; b.setAttribute('aria-checked', itch); },
      delete: () => afterDelete(remove(existing.id)),
      save: () => {
        const e = { ...(existing || { id: uid(), type: 'skin' }), zones: { ...zones }, itch, ts: readTime(ts0), note: $('#fNote').value.trim().slice(0, 300) };
        delete e.demo;
        upsert(e);
        afterSave(e, !existing, 'skin');
      },
    },
  });
}

// --- улики
function factorSheet(existing) {
  const ts0 = existing?.ts ?? defaultTs();
  let sel = [...(existing?.factors || [])];
  openSheet({
    title: existing ? 'Изменить улику' : 'Что ещё было?',
    body: `<p class="small muted">Не только еда влияет на кожу. Отметь, что было сегодня необычного.</p>
      <div class="chips">${FACTORS.filter((f) => !f.place).map((f) => `<button type="button" class="chip" data-sa="f" data-id="${f.id}" aria-pressed="${sel.includes(f.id)}">${f.emoji} ${esc(f.label)}</button>`).join('')}</div>
      ${timeField(ts0)}
      <div class="field"><label for="fNote">Подробности</label><textarea class="input" id="fNote" placeholder="Например: крем с ромашкой">${esc(existing?.note || '')}</textarea></div>`,
    foot: `${deleteBtn(existing)}<button type="button" class="pill-btn" data-sa="save">Сохранить</button>`,
    actions: {
      f: (b) => { const id = b.dataset.id; sel = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]; b.setAttribute('aria-pressed', sel.includes(id)); },
      delete: () => afterDelete(remove(existing.id)),
      save: () => {
        if (!sel.length) { toast('Выбери хотя бы одну улику'); return; }
        const e = { ...(existing || { id: uid(), type: 'factor' }), factors: sel, ts: readTime(ts0), note: $('#fNote').value.trim().slice(0, 300) };
        delete e.demo;
        upsert(e);
        afterSave(e, !existing, 'factor');
      },
    },
  });
}

function waterAdd(b) {
  const plain = b?.dataset?.drink === 'plain';
  const e = { id: uid(), type: 'water', drink: plain ? 'plain' : 'water', ts: defaultTs(), n: 1 };
  upsert(e);
  const n = waterOf(byDay(state.entries).get(dayKey(e.ts)));
  if (ui.tab === 'today') say('pusya', n === WATER_GOAL ? 'Шесть стаканов! Значок «Водный агент» у тебя.' : `${pick(CHEERS[plain ? 'plain' : 'water'], n)} Уже ${n} из ${WATER_GOAL}.`, n >= WATER_GOAL ? 'cheer' : 'happy');
  commit();
  toast(`${plain ? 'Без сахара' : 'Вода'}: ${n} из ${WATER_GOAL}`, () => { remove(e.id); commit(); });
}

function waterRemove() {
  const k = ui.tab === 'diary' ? ui.day : today();
  const last = (byDay(state.entries).get(k) || []).filter((e) => e.type === 'water' && !isSweet(e)).pop();
  if (!last) return;
  remove(last.id);
  commit();
  toast('Стакан убран', () => { delete state.tombstones[last.id]; upsert(last); commit(); });
}

function wisdomSheet(cat) {
  const c = WISDOM_CATS[cat];
  const seen = new Set(state.wisdom);
  const list = WISDOM.filter((w) => w[1] === cat);
  const got = list.filter((w) => seen.has(w[0]));
  openSheet({
    title: `${c.emoji} ${c.label}`,
    body: `<p class="small muted">Собрано ${got.length} из ${list.length}. Остальные расскажут Медок и Пуся, если на них нажимать.</p>
      ${got.length ? got.map((w) => `<div class="wisdom-item"><span class="who">${w[2] === 'medok' ? '🦔' : '🐒'}</span><span class="wtext">${wisdomTextHTML(w[3])}${rateHTML(w[0])}</span></div>`).join('') : '<div class="empty">Пока пусто. Нажми на героя на главной.</div>'}`,
    foot: '<button type="button" class="pill-btn" data-sa="close">Понятно</button>',
    actions: { close: () => closeSheet() },
  });
}

// Для взрослых: ответы на вопросы-выборы, по темам. Не тест, а поводы поговорить.
function choicesSheet() {
  const answered = CHOICES.filter((c) => state.choices[c.id]);
  const byTheme = Object.entries(CHOICE_THEMES).map(([th, t]) => {
    const l = answered.filter((c) => c.theme === th);
    if (!l.length) return '';
    return `<div class="cat-title">${t.emoji} ${esc(t.label)} · ${l.length}</div>${l.map((c) => {
      const a = state.choices[c.id].a;
      return `<div class="choice-row"><div class="cq">${esc(c.q)}</div><div class="ca">→ ${esc(c.options[a]?.t || '')}</div>
        <div class="small muted">${shortDay(dayKey(state.choices[c.id].t))} · другие варианты: ${c.options.filter((_, i) => i !== a).map((o) => esc(o.t)).join(' / ')}</div></div>`;
    }).join('')}`;
  }).join('');
  openSheet({
    title: 'Выборы и ценности',
    body: `<p class="small muted">Иногда Медок и Пуся задают вопросы про дружбу, честность, чувства и семью. Правильных ответов нет, герои принимают любой. Это не тест, а повод поговорить, если какой-то ответ удивил. Отвечено ${answered.length} из ${CHOICES.length}.</p>
      ${answered.length ? byTheme : '<div class="empty">Ответов пока нет. Вопросы появляются, когда нажимаешь на героев на главной.</div>'}`,
    foot: '<button type="button" class="pill-btn" data-sa="close">Понятно</button>',
    actions: { close: () => closeSheet() },
  });
}

// Для взрослых: как ребёнок оценивает советы, по категориям
function reactionsSheet() {
  const byId = Object.fromEntries(WISDOM.map((w) => [w[0], w]));
  // фразы вне копилки идут отдельной строкой «Фразы героев»
  for (const [id, v] of Object.entries(state.reactions)) if (id.startsWith('p:') && v.text) byId[id] = [id, 'phrases', v.who, v.text];
  const CATS = { ...WISDOM_CATS, phrases: { label: 'Фразы героев', emoji: '💬' } };
  const rated = Object.entries(state.reactions).filter(([id]) => byId[id]).sort((a, b) => b[1].t - a[1].t);
  const count = (list, r) => list.filter(([, v]) => v.r === r).length;
  const rows = Object.entries(CATS).map(([cat, c]) => {
    const l = rated.filter(([id]) => byId[id][1] === cat);
    return l.length ? `<tr><td>${c.emoji} ${esc(c.label)}</td><td class="num">${count(l, 1)}</td><td class="num">${count(l, 0)}</td><td class="num">${count(l, -1)}</td></tr>` : '';
  }).join('');
  const list = (r) => rated.filter(([, v]) => v.r === r).slice(0, 40).map(([id]) => `<div class="wisdom-item"><span class="who">${CATS[byId[id][1]].emoji}</span><span>${esc(byId[id][3])}</span></div>`).join('');
  openSheet({
    title: 'Реакции на советы',
    body: rated.length ? `<p class="small muted">Оценки ставятся смайликами под фразами и советами Медка и Пуси. Хранятся только на этом устройстве и в зашифрованной копии.</p>
      <table class="rtable"><thead><tr><th></th><th>🙂</th><th>😐</th><th>🙁</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td>Всего</td><td class="num">${count(rated, 1)}</td><td class="num">${count(rated, 0)}</td><td class="num">${count(rated, -1)}</td></tr></tfoot></table>
      ${count(rated, 1) ? `<div class="cat-title">🙂 Понравились</div>${list(1)}` : ''}
      ${count(rated, -1) ? `<div class="cat-title">🙁 Не понравились</div>${list(-1)}` : ''}`
      : '<div class="empty">Оценок пока нет. Они появятся, когда под советами начнут нажимать смайлики.</div>',
    foot: '<button type="button" class="pill-btn" data-sa="close">Понятно</button>',
    actions: { close: () => closeSheet() },
  });
}

// Сладкий напиток: без минусов, просто ещё одна улика для Радара
function sweetSheet(existing) {
  const ts0 = existing?.ts ?? defaultTs();
  let sel = existing?.foods?.[0] || null;
  let q = existing?.qty?.[sel];
  const qBox = () => `<div class="field"><label>Сколько? <span class="muted">Можно не указывать</span></label>${qtyPicker(q, sel || 'soda', DRINK_UNITS)}</div>`;
  openSheet({
    title: existing ? 'Изменить напиток' : 'Какой сладкий напиток?',
    body: `<p class="small muted">Это не идёт в стаканы дня, но помогает Радару: в сладких напитках бывают красители и цитрус.</p>
      <div class="chips">${SWEET_DRINKS.map((id) => `<button type="button" class="chip" data-sa="d" data-id="${id}" aria-pressed="${sel === id}">${foodEmoji(id)} ${esc(id === 'tea' ? 'Сладкий чай' : id === 'compote' ? 'Сладкий компот, морс' : foodLabel(id))}</button>`).join('')}</div>
      <div id="qBox">${qBox()}</div>
      ${timeField(ts0)}`,
    foot: `${deleteBtn(existing)}<button type="button" class="pill-btn" data-sa="save">Записать</button>`,
    actions: {
      d: (b) => { sel = b.dataset.id; for (const x of sheet().querySelectorAll('[data-sa="d"]')) x.setAttribute('aria-pressed', x === b); },
      q: (b) => { q = applyQty(q, sel || 'soda', b); $('#qBox').innerHTML = qBox(); },
      delete: () => afterDelete(remove(existing.id)),
      save: () => {
        if (!sel) { toast('Выбери напиток'); return; }
        const e = { ...(existing || { id: uid(), type: 'water', drink: 'sweet', n: 1 }), foods: [sel], qty: cleanQty({ [sel]: q }, [sel]), ts: readTime(ts0) };
        if (!e.qty) delete e.qty;
        delete e.demo;
        upsert(e);
        closeSheet();
        if (!existing) say('medok', pick(CHEERS.sweet, e.ts / 1000), 'calm');
        commit();
        toast(existing ? 'Изменения сохранены' : 'Напиток записан', existing ? undefined : () => { remove(e.id); commit(); });
      },
    },
  });
}

function sweetRemove(b) {
  const e = state.entries.find((x) => x.id === b.dataset.id);
  if (!e) return;
  remove(e.id);
  commit();
  toast('Напиток убран', () => { delete state.tombstones[e.id]; upsert(e); commit(); });
}

function editEntry(id) {
  const e = state.entries.find((x) => x.id === id);
  if (!e) return;
  if (e.type === 'meal') mealSheet(e);
  else if (e.type === 'skin') skinSheet(e);
  else if (e.type === 'factor') factorSheet(e);
  else if (isSweet(e)) sweetSheet(e);
}

// --- дела
function caseSheet(key) {
  let days = 10;
  const name = esc(itemLabel(key));
  openSheet({
    title: '📁 Новое дело',
    body: `<p><b>Проверим ${name}.</b> Несколько дней без него, и каждый день отмечаем кожу. Потом Медок сравнит с днями до дела.</p>
      <div class="seg" role="group" aria-label="Сколько дней">${[7, 10, 14].map((d) => `<button type="button" data-sa="days" data-d="${d}" aria-pressed="${d === days}">${d} дней</button>`).join('')}</div>
      <div class="parent-note">Для взрослых: перед тем как убирать продукт из питания, стоит договориться об этом с врачом. Если продукт всё-таки съелся, это не провал: дело продолжается, Медок просто это учтёт.</div>`,
    foot: '<button type="button" class="pill-btn" data-sa="start">Открыть дело</button>',
    actions: {
      days: (b) => { days = +b.dataset.d; for (const x of sheet().querySelectorAll('[data-sa="days"]')) x.setAttribute('aria-pressed', x === b); },
      start: () => {
        state.cases.push({ id: uid(), food: key, start: today(), days, closed: false, u: Date.now() });
        closeSheet();
        say('medok', `Дело открыто: ${itemLabel(key)}. Отмечаем кожу каждый день, а я веду протокол.`, 'think');
        commit();
      },
    },
  });
}

// --- внешний вид героев
function heroesSheet() {
  const pick = { medok: heroStyle('medok'), pusya: heroStyle('pusya') };
  const row = (who, fn) => `<div class="field"><span class="label">${who === 'medok' ? 'Медок' : 'Пуся'}</span>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${STYLES.map((st) => `<button type="button" class="chip" style="display:grid;justify-items:center;border-radius:18px;padding:8px 4px" data-sa="hero" data-who="${who}" data-style="${st.id}" aria-pressed="${pick[who] === st.id}">${fn('happy', 72, st.id)}<span class="small">${st.label}</span></button>`).join('')}</div></div>`;
  openSheet({
    title: 'Внешний вид героев',
    body: row('medok', medokBase) + row('pusya', pusyaBase),
    foot: '<button type="button" class="pill-btn" data-sa="save">Сохранить</button>',
    actions: {
      hero: (b) => {
        pick[b.dataset.who] = b.dataset.style;
        for (const x of sheet().querySelectorAll(`[data-sa="hero"][data-who="${b.dataset.who}"]`)) x.setAttribute('aria-pressed', x === b);
      },
      save: () => { state.profile.heroes = { ...pick }; closeSheet(); say('pusya', 'Новый образ! Нравится?', 'cheer'); commit(); },
    },
  });
}

// --- имя
function renameSheet() {
  openSheet({
    title: 'Имя сыщика',
    body: `<div class="field"><label for="fName">Имя или прозвище</label><input class="input" id="fName" maxlength="24" value="${esc(state.profile.name)}" autocomplete="off"></div>
      <p class="small muted">Хранится только на этом устройстве.</p>`,
    foot: '<button type="button" class="pill-btn" data-sa="save">Сохранить</button>',
    actions: { save: () => { state.profile.name = $('#fName').value.trim().slice(0, 24); closeSheet(); commit(); } },
  });
}

// --- бэкап
function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

async function shareOrDownload(name, blob) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.warn('share failed, fallback to download', err);
    }
  }
  download(name, blob);
}

function backupSheet() {
  const real = state.entries.filter((e) => !e.demo).length;
  openSheet({
    title: '🔐 Сохранить копию',
    body: `<p class="small">В копии ${real} ${plural(real, 'запись', 'записи', 'записей')}. Файл зашифрован: без пароля его никто не прочитает, поэтому его можно хранить в облаке или отправить себе в мессенджер.</p>
      <div class="field"><label for="p1">Пароль семьи</label><input class="input" type="password" id="p1" autocomplete="new-password" minlength="6"></div>
      <div class="field"><label for="p2">Ещё раз</label><input class="input" type="password" id="p2" autocomplete="new-password"></div>
      <p class="small muted">Пароль нигде не хранится. Если его забыть, копию открыть не получится.</p>`,
    foot: '<button type="button" class="pill-btn" data-sa="go">Сохранить файл</button>',
    actions: {
      go: async (b) => {
        const p1 = $('#p1').value;
        if (p1.length < 6) { toast('Пароль: минимум 6 символов'); return; }
        if (p1 !== $('#p2').value) { toast('Пароли не совпадают'); return; }
        b.disabled = true;
        b.textContent = 'Шифрую…';
        try {
          const snapshot = { ...state, entries: state.entries.filter((e) => !e.demo), profile: { ...state.profile, demo: false } };
          const text = await encryptState(snapshot, p1);
          await shareOrDownload(`detective-${today()}.crumbs`, new Blob([text], { type: 'application/octet-stream' }));
          closeSheet();
          toast('Копия готова');
        } catch (err) {
          console.error(err);
          toast('Не получилось сохранить копию');
          b.disabled = false;
          b.textContent = 'Сохранить файл';
        }
      },
    },
  });
}

function restoreSheet() {
  let mode = 'merge';
  openSheet({
    title: '📥 Загрузить копию',
    body: `<div class="field"><label for="fFile">Файл копии</label><input class="input" type="file" id="fFile"></div>
      <div class="field"><label for="p1">Пароль семьи</label><input class="input" type="password" id="p1" autocomplete="current-password"></div>
      <div class="seg" role="group" aria-label="Как загрузить">
        <button type="button" data-sa="mode" data-m="merge" aria-pressed="true">Объединить</button>
        <button type="button" data-sa="mode" data-m="replace" aria-pressed="false">Заменить всё</button></div>
      <p class="small muted">«Объединить» сложит записи с этого устройства и из копии, повторов не будет. Так можно вести дневник и на телефоне, и на планшете.</p>`,
    foot: '<button type="button" class="pill-btn" data-sa="go">Загрузить</button>',
    actions: {
      mode: (b) => { mode = b.dataset.m; for (const x of sheet().querySelectorAll('[data-sa="mode"]')) x.setAttribute('aria-pressed', x === b); },
      go: async (b) => {
        const f = $('#fFile').files?.[0];
        if (!f) { toast('Выбери файл копии'); return; }
        b.disabled = true;
        try {
          const data = await decryptBackup(await f.text(), $('#p1').value);
          const base = { ...state, entries: state.entries.filter((e) => !e.demo), profile: { ...state.profile, demo: false } };
          state = mode === 'replace' ? merge(emptyState(), data) : merge(base, data);
          state.profile.onboarded = true;
          await flush();
          closeSheet();
          commit();
          toast(`Готово: ${state.entries.length} ${plural(state.entries.length, 'запись', 'записи', 'записей')}`);
        } catch (err) {
          toast(err instanceof BackupError ? err.message : 'Не получилось прочитать файл');
          if (!(err instanceof BackupError)) console.error(err);
          b.disabled = false;
        }
      },
    },
  });
}

function installSheet() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  openSheet({
    title: '📲 Установить как приложение',
    body: standalone ? '<p>Приложение уже установлено и открыто с экрана «Домой». 🎉</p>' : `
      ${deferredInstall ? '<button type="button" class="pill-btn block" data-sa="install">Установить</button>' : ''}
      <div class="card"><h3>iPhone и iPad</h3><ol class="small" style="margin:8px 0 0;padding-left:20px;display:grid;gap:4px">
        <li>Открыть этот сайт в <b>Safari</b>.</li><li>Нажать «Поделиться» (квадрат со стрелкой).</li><li>Выбрать «На экран "Домой"» и «Добавить».</li></ol></div>
      <div class="card"><h3>Android</h3><ol class="small" style="margin:8px 0 0;padding-left:20px;display:grid;gap:4px">
        <li>Открыть сайт в <b>Chrome</b>.</li><li>Меню ⋮ → «Установить приложение» или «Добавить на главный экран».</li></ol></div>
      <div class="parent-note">${ios ? 'Важно для iPhone и iPad: у установленного приложения своё хранилище, отдельное от Safari. Если записи уже есть в Safari, сохрани копию и загрузи её в приложении.' : 'Записи хранятся отдельно в каждом браузере и на каждом устройстве. Переносить их можно через «Сохранить копию».'}</div>`,
    actions: {
      install: async () => {
        deferredInstall.prompt();
        await deferredInstall.userChoice.catch(() => null);
        deferredInstall = null;
        closeSheet();
      },
    },
  });
}

function privacySheet() {
  openSheet({
    title: '🔒 Где хранятся данные',
    body: `<p>Все записи хранятся <b>только в этом браузере на этом устройстве</b>. Сайт состоит из файлов кода и ничего не отправляет: браузеру прямо запрещено обращаться к другим адресам, нет аналитики, счётчиков и шрифтов из интернета.</p>
      <p>В коде сайта на GitHub нет ни одной записи и ни одного имени, он одинаковый для всех.</p>
      <p><b>Как переносить:</b> «Сохранить копию» делает файл, зашифрованный паролем семьи (AES-256). Без пароля это просто набор случайных символов.</p>
      <p><b>Чтобы данные не пропали:</b> браузер может очистить хранилище сайта, если им долго не пользоваться или мало места. Установленное приложение защищено лучше, но копию раз в неделю сохранить полезно.</p>
      <p class="small muted">Хранилище: ${navigator.storage?.persist ? 'постоянное (запрошено у браузера)' : 'обычное'}.</p>`,
  });
}

function confirmSheet(title, text, btn, fn) {
  openSheet({
    title,
    body: `<p>${text}</p>`,
    foot: `<button type="button" class="pill-btn ghost" data-sa="close">Отмена</button><button type="button" class="pill-btn danger" data-sa="ok">${btn}</button>`,
    actions: { ok: () => { closeSheet(); fn(); } },
  });
}

// ---------------------------------------------------------------- отчёт для врача

function reportSheet() {
  openSheet({
    title: '🩺 Отчёт для врача',
    body: '<p class="small muted">Отчёт откроется отдельной страницей, его можно распечатать или сохранить в PDF через «Печать».</p>',
    foot: [14, 30, 90].map((d) => `<button type="button" class="pill-btn soft" data-sa="r" data-d="${d}">${d} дней</button>`).join(''),
    actions: { r: (b) => { closeSheet(); openReport(+b.dataset.d); } },
  });
}

function openReport(n) {
  const t = today();
  const from = addDays(t, -(n - 1));
  const t0 = dayStart(from);
  const entries = state.entries.filter((e) => e.ts >= t0);
  const days = byDay(entries);
  const skins = entries.filter((e) => e.type === 'skin');
  const a = analyze(state.entries.filter((e) => e.ts >= t0 - 2 * 864e5));
  const avg = (z) => (skins.length ? (skins.reduce((s, e) => s + (e.zones[z] ?? 0), 0) / skins.length).toFixed(1) : '—');
  const flareDays = [...days.values()].filter((l) => l.some((e) => e.type === 'skin' && skinScore(e) >= FLARE)).length;
  const row = (it) => `<tr><td>${esc(itemLabel(it.key))}${it.key.startsWith('fam:') ? ' (группа)' : ''}</td><td class="num">${it.nExp}</td><td class="num">${it.meanExp.toFixed(1)}</td><td class="num">${it.meanUn.toFixed(1)}</td><td class="num">${it.flaresExp}/${it.nExp}</td><td class="num">${it.flaresUn}/${it.nUn}</td></tr>`;
  let rows = '';
  for (let k = t; k >= from; k = addDays(k, -1)) {
    const l = days.get(k);
    if (!l) continue;
    const meals = l.filter((e) => e.type === 'meal' || isSweet(e)).map((e) => `<b>${timeStr(e.ts)}</b> ${e.place && e.place !== 'home' ? `${esc(PLACE_BY_ID[e.place]?.label || '')}: ` : ''}${esc(e.foods.map((id) => foodQ(e, id)).join(', '))}${e.note ? ` <i>(${esc(e.note)})</i>` : ''}`).join('<br>');
    const factors = l.filter((e) => e.type === 'factor').map((e) => esc(e.factors.map((f) => FACTOR_BY_ID[f]?.label || f).join(', ') + (e.note ? ` (${e.note})` : ''))).join('<br>');
    const sk = l.filter((e) => e.type === 'skin');
    const mx = (z) => (sk.length ? Math.max(...sk.map((e) => e.zones[z] ?? 0)) : '');
    const notes = sk.map((e) => [e.itch ? 'зуд' : '', e.note].filter(Boolean).join(', ')).filter(Boolean).map(esc).join('; ');
    rows += `<tr><td>${shortDay(k)}</td><td>${meals}</td><td>${factors}</td><td class="num">${mx('face')}</td><td class="num">${mx('neck')}</td><td class="num">${mx('hands')}</td><td>${notes}</td><td class="num">${waterOf(l)}${sweetOf(l).length ? ` +${sweetOf(l).length} сл.` : ''}</td></tr>`;
  }
  const el = document.createElement('div');
  el.className = 'report';
  el.innerHTML = `<div class="report-inner">
    <div class="report-tools"><button type="button" class="pill-btn ghost" data-r="close">Закрыть</button><button type="button" class="pill-btn" data-r="print">🖨️ Печать / PDF</button></div>
    <h1>Дневник питания и кожи${state.profile.name ? `: ${esc(state.profile.name)}` : ''}</h1>
    <p>Период: ${shortDay(from)} — ${shortDay(t)} ${t.slice(0, 4)} (${n} дн.). Шкала кожи: 0 чисто, 1 чуть-чуть, 2 заметно, 3 сильно, 4 очень сильно.</p>
    <h2>Сводка</h2>
    <div class="kpis">
      <div class="kpi"><b>${days.size}</b>дней с записями</div>
      <div class="kpi"><b>${entries.filter((e) => e.type === 'meal').length}</b>приёмов пищи</div>
      <div class="kpi"><b>${skins.length}</b>замеров кожи</div>
      <div class="kpi"><b>${flareDays}</b>дней с баллом ≥ 2</div>
      <div class="kpi"><b>${avg('face')} / ${avg('neck')} / ${avg('hands')}</b>средний балл: лицо / шея / руки</div>
    </div>
    <h2>Возможные связи (автоматический анализ)</h2>
    ${a.suspects.length || a.watch.length ? `<table><thead><tr><th>Продукт / фактор</th><th>Замеров после</th><th>Ср. балл после</th><th>Ср. балл без</th><th>Балл ≥ 2 после</th><th>Балл ≥ 2 без</th></tr></thead><tbody>${[...a.suspects, ...a.watch].map(row).join('')}</tbody></table>` : '<p>Устойчивых связей не найдено.</p>'}
    <p class="disclaimer">Метод: для каждого замера кожи учитываются продукты и факторы за 1–48 ч до него; сравниваются замеры с продуктом и без него, вклад оценивается регрессией с регуляризацией. Учитываются продукты, встреченные минимум в 3 замерах и 2 днях. Это наблюдения семьи, не диагноз.</p>
    ${a.green.length ? `<p><b>Без видимой связи:</b> ${a.green.map((g) => esc(itemLabel(g.key))).join(', ')}.</p>` : ''}
    <h2>По дням</h2>
    <table><thead><tr><th>Дата</th><th>Еда</th><th>Другие факторы</th><th>Лицо</th><th>Шея</th><th>Руки</th><th>Заметки</th><th>Вода</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Нет записей</td></tr>'}</tbody></table>
    <p class="disclaimer">Сформировано в приложении «Агентство Медка и Пуси» ${shortDay(t)} ${t.slice(0, 4)}. Баллы кожи — максимальные за день.</p>
  </div>`;
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-r]');
    if (!b) return;
    if (b.dataset.r === 'print') window.print();
    else el.remove();
  });
  document.body.appendChild(el);
}

// ---------------------------------------------------------------- события

const ACTIONS = {
  meal: () => mealSheet(),
  skin: () => skinSheet(),
  factor: () => factorSheet(),
  'skin-clear': () => {
    const e = { id: uid(), type: 'skin', ts: Date.now(), zones: { face: 0, neck: 0, hands: 0 }, itch: false, note: '' };
    upsert(e);
    afterSave(e, true, 'skin');
  },
  'water-add': waterAdd,
  'water-remove': waterRemove,
  sweet: () => sweetSheet(),
  'game-catch': (b) => startCatch(b.dataset.mode),
  wisdom: (b) => wisdomSheet(b.dataset.cat),
  choose: (b) => {
    const c = CHOICES.find((x) => x.id === b.dataset.id);
    if (!c) return;
    const a = +b.dataset.a;
    state.choices[c.id] = { a, t: Date.now() };
    say(c.who, c.options[a].reply, 'happy');
    commit();
  },
  'choices-view': () => choicesSheet(),
  'values-view': () => valuesSheet(),
  'game-sort': (b) => startSort(!!b.dataset.fresh),
  'game-kitchen': () => startKitchen(),
  'game-robot': () => startRobot(),
  'game-cipher': () => startCipher(),
  'game-logic': () => startLogic(),
  rate: (b) => {
    const id = b.dataset.id;
    const r = +b.dataset.r;
    // для фраз вне копилки сохраняем сам текст, чтобы взрослым было видно, что оценили
    const sp = ui.speech;
    state.reactions[id] = id.startsWith('p:') && sp && phraseId(sp.text) === id ? { r, t: Date.now(), text: sp.text, who: sp.who } : { r, t: Date.now() };
    save(state);
    for (const x of b.parentElement.querySelectorAll('.rate-btn')) x.setAttribute('aria-pressed', x === b);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  },
  reactions: () => reactionsSheet(),
  'sweet-remove': sweetRemove,
  edit: (b) => editEntry(b.dataset.id),
  talk: (b) => {
    const who = b.dataset.who;
    ui.seed += 7;
    // примерно каждая четвёртая реплика — вопрос-выбор, каждая пятая — про само приложение,
    // остальные из копилки мудрости
    const ch = ui.seed % 4 === 1 ? nextChoice(who) : null;
    if (ch) {
      ui.speech = { who, text: ch.q, mood: 'think', choice: ch.id, cat: null, wid: null };
    } else if (ui.seed % 5 === 0) {
      let [w, text, mood] = contextTip({ hour: 12, waterToday: 1, mealsToday: 1, skinToday: true, plate: 0 }, ui.seed);
      for (let i = 0; w !== who && i < 12; i++) [w, text, mood] = contextTip({ hour: 12, waterToday: 1, mealsToday: 1, skinToday: true, plate: 0 }, (ui.seed += 1));
      say(who, text, mood);
    } else {
      const [wid, cat, , text] = nextWisdom(who);
      say(who, text, cat === 'riddles' || cat === 'facts' ? 'think' : who === 'medok' ? 'calm' : 'happy', cat, wid);
      save(state);
    }
    render();
    const svg = document.querySelector(`[data-who="${who}"] .mascot`);
    svg?.classList.add('wiggle');
  },
  'pick-day': (b) => { ui.day = b.dataset.day; render(); },
  month: (b) => {
    const [y, m] = ui.month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + +b.dataset.d, 1));
    ui.month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    render();
  },
  zone: (b) => { ui.zone = b.dataset.zone; render(); },
  'case-new': (b) => caseSheet(b.dataset.key),
  'case-close': (b) => {
    const c = state.cases.find((x) => x.id === b.dataset.id);
    const ev = evaluateCase(state.entries, c, today());
    Object.assign(c, { closed: true, outcome: ev.outcome, u: Date.now() });
    say('medok', 'Дело закрыто! Протокол в архиве агентства. Значок «Дело закрыто» твой.', 'cheer');
    commit();
  },
  'case-stop': (b) => confirmSheet('Остановить дело?', 'Дело удалится, записи останутся.', 'Остановить', () => {
    state.cases = state.cases.filter((x) => x.id !== b.dataset.id);
    state.tombstones[b.dataset.id] = Date.now();
    commit();
  }),
  'go-awards': () => { ui.tab = 'more'; render(); $('#awards')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  report: reportSheet,
  backup: backupSheet,
  restore: restoreSheet,
  install: installSheet,
  privacy: privacySheet,
  rename: renameSheet,
  heroes: heroesSheet,
  'demo-load': () => {
    state.entries = [...state.entries.filter((e) => !e.demo), ...demoEntries(today())].sort((a, b) => a.ts - b.ts);
    state.profile.demo = true;
    ui.speech = null;
    commit();
    toast('Пример загружен. Загляни на «Радар».');
  },
  'demo-clear': () => {
    state.entries = state.entries.filter((e) => !e.demo);
    state.profile.demo = false;
    ui.speech = null;
    commit();
    toast('Пример убран');
  },
  wipe: () => confirmSheet('Стереть все данные?', 'Все записи на этом устройстве удалятся. Если есть копия, их можно будет загрузить обратно.', 'Стереть', async () => {
    state = emptyState();
    state.profile.onboarded = true;
    await flush();
    commit();
    toast('Данные стёрты');
  }),
  'ob-start': () => {
    state.profile.name = ($('#obName')?.value || '').trim().slice(0, 24);
    state.profile.onboarded = true;
    requestPersistence();
    commit();
  },
  'ob-demo': () => {
    state.profile.name = ($('#obName')?.value || '').trim().slice(0, 24);
    state.profile.onboarded = true;
    state.profile.demo = true;
    state.entries = demoEntries(today());
    requestPersistence();
    commit();
  },
};

function bind() {
  document.addEventListener('click', (ev) => {
    const tab = ev.target.closest('.tab');
    if (tab) {
      ui.tab = tab.dataset.tab;
      if (ui.tab === 'today') ui.speech = null;
      render();
      window.scrollTo({ top: 0 });
      return;
    }
    const sa = ev.target.closest('[data-sa]');
    if (sa && sheetCtx) {
      sheetCtx.actions[sa.dataset.sa]?.(sa, ev);
      return;
    }
    const a = ev.target.closest('[data-action]');
    if (a && ACTIONS[a.dataset.action]) ACTIONS[a.dataset.action](a, ev);
  });
  sheet().addEventListener('input', (ev) => sheetCtx?.onInput?.(ev));
  sheet().addEventListener('click', (ev) => { if (ev.target === sheet()) closeSheet(); });
  sheet().addEventListener('close', () => { sheetCtx = null; });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else if (state.profile.onboarded) render();
  });
  window.addEventListener('pagehide', () => flush());
  window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); deferredInstall = ev; });
}

async function init() {
  state = await load();
  const t = today();
  ui.day = t;
  ui.month = t.slice(0, 7);
  bind();
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW', err));
  }
}

init();

