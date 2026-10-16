// Игра «Шифровки»: Медок и Пуся присылают секретные записки, ребёнок их расшифровывает.
// Три шифра: значки (ключ дан), сдвиг по алфавиту (считать буквы назад), номера букв (А=1).
// Шифрование и проверка здесь чистые функции, интерфейс ниже.
import { esc, shuffle, layer, closeLayer } from './games.js';

export const ABC = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'; // 32 буквы, Ё пишем как Е

export const CIPHER_LEVELS = [
  { id: 1, key: 'icons', emoji: '🔣', label: 'Значки', hint: 'Каждая буква спрятана в значок. Ключ рядом.' },
  { id: 2, key: 'shift', emoji: '↩️', label: 'Сдвиг', hint: 'Буквы сдвинуты по алфавиту. Шагай назад.' },
  { id: 3, key: 'numbers', emoji: '🔢', label: 'Номера', hint: 'Вместо букв номера: А=1, Б=2…' },
];

// who: кто прислал записку
export const MESSAGES = [
  ['medok', 'ВСТРЕЧА У СТАРОГО ДУБА'],
  ['pusya', 'БАНАН СПРЯТАН В ШКАФУ'],
  ['medok', 'ПАРОЛЬ ЗЕЛЕНЫЙ ОГУРЕЦ'],
  ['pusya', 'СЕКРЕТНЫЙ ПИРОГ НА КУХНЕ'],
  ['medok', 'ЕЖИ ЛЮБЯТ ЯБЛОКИ'],
  ['pusya', 'СЛЕДЫ ВЕДУТ К ОКНУ'],
  ['medok', 'КЛЮЧ ПОД КРАСНЫМ ГОРШКОМ'],
  ['pusya', 'СЕГОДНЯ ИГРАЕМ В ПРЯТКИ'],
  ['medok', 'ВЫПЕЙ СТАКАН ВОДЫ'],
  ['pusya', 'ОБЕЗЬЯНЫ УМЕЮТ ХОДИТЬ ПО КАНАТУ'],
  ['medok', 'ПРОВЕРЬ ЯЩИК С КАРАНДАШАМИ'],
  ['pusya', 'ТЫ ОТЛИЧНЫЙ СЫЩИК'],
  ['medok', 'МОРКОВЬ ВЫРОСЛА НА ГРЯДКЕ'],
  ['pusya', 'ЗАГАДКА РЕШЕНА УРА'],
  ['medok', 'ЛУПА ЛЕЖИТ НА ПОЛКЕ'],
  ['pusya', 'ПОСМОТРИ ПОД ПОДУШКОЙ'],
  ['medok', 'ЗАВТРА БУДЕТ СОЛНЕЧНО'],
  ['pusya', 'КТО СЪЕЛ ВСЕ ОРЕХИ'],
  ['medok', 'ПОЙДЕМ ГУЛЯТЬ В ПАРК'],
  ['pusya', 'КАША ДАЕТ СИЛЫ НА ВЕСЬ ДЕНЬ'],
  ['medok', 'СОВА НЕ СПИТ НОЧЬЮ'],
  ['pusya', 'МАМА ИСПЕКЛА БЛИНЫ'],
  ['medok', 'ПАПА НАШЕЛ СТАРУЮ КАРТУ'],
  ['pusya', 'ДРУЗЬЯ ЖДУТ У ФОНТАНА'],
  ['medok', 'НАРИСУЙ НАШ ШТАБ'],
  ['pusya', 'КЛУБНИКА ВКУСНЕЕ ЛЕТОМ'],
  ['medok', 'ПОСЧИТАЙ ВСЕ ОКНА В ДОМЕ'],
  ['pusya', 'Я СПРЯТАЛА СЮРПРИЗ'],
  ['medok', 'НАСТОЯЩИЙ ДЕТЕКТИВ НЕ СПЕШИТ'],
  ['pusya', 'ОТВЕТ НА ДНЕ КОРОБКИ'],
  ['medok', 'РОБОТ БОЛТ ЖДЕТ КОМАНДУ'],
  ['pusya', 'ВЕЧЕРОМ СМОТРИМ НА ЗВЕЗДЫ'],
  ['medok', 'СЫР ЛЕЖИТ В ХОЛОДИЛЬНИКЕ'],
  ['pusya', 'ПРИДУМАЙ СВОЙ ШИФР'],
  ['medok', 'ЛИСА ПРОШЛА ЗДЕСЬ УТРОМ'],
  ['pusya', 'ВСЕ ПОДСКАЗКИ В ДНЕВНИКЕ'],
  ['medok', 'ОШИБКИ ПОМОГАЮТ УЧИТЬСЯ'],
  ['pusya', 'ТАНЦУЕМ ПОСЛЕ УЖИНА'],
  ['medok', 'КОТ СИДИТ НА КРЫШЕ'],
  ['pusya', 'СПАСИБО ЗА ПОМОЩЬ'],
];

const ICONS = ['🍎', '🍐', '🍋', '🍉', '🍇', '🍓', '🍒', '🥝', '🥕', '🌽', '🍄', '🌵', '🌻', '🌙', '⭐', '☀️', '⚡', '❄️', '🔥', '💧',
  '🎈', '🎁', '🎲', '🧩', '🔑', '🔔', '📌', '✂️', '🧲', '🪁', '🐸', '🐙'];

export const clean = (s) => s.toUpperCase().replace(/Ё/g, 'Е');
export const isLetter = (ch) => ABC.includes(ch);

// Каждой букве послания свой символ. Возвращает { cells: [{ch, sym}|{sep}], key, shift }
export function encode(text, kind, rand = Math.random) {
  const t = clean(text);
  let key = null;
  let shift = 0;
  if (kind === 'icons') {
    const letters = [...new Set([...t].filter(isLetter))];
    const icons = shuffle(ICONS);
    key = Object.fromEntries(letters.map((l, i) => [l, icons[i]]));
  }
  if (kind === 'shift') shift = 1 + Math.floor(rand() * 3);
  const sym = (ch) => {
    if (kind === 'icons') return key[ch];
    if (kind === 'shift') return ABC[(ABC.indexOf(ch) + shift) % ABC.length];
    return String(ABC.indexOf(ch) + 1);
  };
  const cells = [...t].map((ch) => (isLetter(ch) ? { ch, sym: sym(ch) } : { sep: ch }));
  return { cells, key, shift };
}

// Обратное преобразование одного символа (для проверки и тестов)
export function decodeSym(sym, kind, { key, shift }) {
  if (kind === 'icons') return Object.keys(key).find((l) => key[l] === sym) || '';
  if (kind === 'shift') return ABC[(ABC.indexOf(sym) - shift + ABC.length) % ABC.length];
  return ABC[+sym - 1] || '';
}

export const cipherStars = (hints, checks) => (hints === 0 && checks <= 1 ? 3 : hints <= 2 && checks <= 2 ? 2 : 1);

// ---------------------------------------------------------------- интерфейс

export function playCipher({ hero, level = 1, done = [], onLevel, onFinish }) {
  const el = layer('cipher');
  let lv = CIPHER_LEVELS.find((l) => l.id === level) || CIPHER_LEVELS[0];
  let msg = null;
  let enc = null;
  let ans = [];
  let cur = 0;
  let hints = 0;
  let checks = 0;
  let bad = new Set();
  const stop = () => { document.removeEventListener('keydown', onKey); closeLayer(el); };
  const head = (sub, back = false) => `<div class="g-head"><button type="button" class="g-close" ${back ? 'data-back' : 'data-exit'} aria-label="${back ? 'Назад' : 'Выйти'}">${back ? '←' : '✕'}</button>
    <div class="g-title">Шифровки</div><div class="g-hint">${sub}</div></div>`;
  const slots = () => enc.cells.map((c, i) => (c.sep ? -1 : i)).filter((i) => i >= 0);

  const menu = () => {
    msg = null;
    el.innerHTML = `${head('Медок и Пуся прислали секретные записки')}
      <div class="k-wrap">
        <div class="k-meaning">${hero('pusya', 'happy', 64)}<p>Сыщики переписываются шифром, чтобы никто чужой не прочитал. Выбери шифр и разгадай записку!</p></div>
        <div class="k-levels" role="radiogroup" aria-label="Шифр">${CIPHER_LEVELS.map((l) => `<button type="button" role="radio" class="k-level ${l.id === lv.id ? 'on' : ''}" aria-checked="${l.id === lv.id}" data-level="${l.id}"><span>${l.emoji}</span><b>${l.label}</b><small>${l.hint}</small></button>`).join('')}</div>
        <button type="button" class="pill-btn" data-start>✉️ Открыть записку</button>
        <p class="small muted" style="text-align:center">Записок ${MESSAGES.length}, разгадано ${new Set(done).size}</p>
      </div>`;
  };

  const start = () => {
    const fresh = MESSAGES.map((m, i) => i).filter((i) => !done.includes(i));
    const pool = fresh.length ? fresh : MESSAGES.map((m, i) => i);
    const idx = shuffle(pool)[0];
    msg = { idx, who: MESSAGES[idx][0], text: clean(MESSAGES[idx][1]) };
    enc = encode(msg.text, lv.key);
    ans = enc.cells.map(() => '');
    cur = slots()[0];
    hints = 0;
    checks = 0;
    bad = new Set();
    render();
  };

  const helper = () => {
    if (lv.key === 'icons') {
      const pairs = shuffle(Object.entries(enc.key));
      return `<div class="cf-key"><div class="k-cap">🔑 Ключ</div><div class="cf-keys">${pairs.map(([l, s]) => `<span><i>${s}</i>${l}</span>`).join('')}</div></div>`;
    }
    const strip = `<div class="cf-abc" aria-hidden="true">${[...ABC].map((l, i) => `<span>${l}${lv.key === 'numbers' && [1, 5, 10, 15, 20, 25, 30].includes(i + 1) ? `<small>${i + 1}</small>` : ''}</span>`).join('')}</div>`;
    const rule = lv.key === 'shift'
      ? `Каждая буква сдвинута на <b>${enc.shift}</b> ${enc.shift === 1 ? 'шаг' : 'шага'} вперёд по алфавиту. Чтобы прочитать, шагни на ${enc.shift} назад: «${ABC[enc.shift]}» значит «А».`
      : 'Каждое число это номер буквы в алфавите: 1 это А, 2 это Б. Под некоторыми буквами есть номера, от них удобно считать.';
    return `<div class="cf-key"><p class="small">${rule}</p>${strip}</div>`;
  };

  const render = (say = '') => {
    const words = [];
    let w = [];
    enc.cells.forEach((c, i) => {
      if (c.sep === ' ') { words.push(w); w = []; } else w.push(i);
    });
    words.push(w);
    el.innerHTML = `${head(`${lv.emoji} ${lv.label}`, true)}
      <div class="k-wrap">
        <div class="cf-from">${hero(msg.who, 'happy', 48)}<span>Записка от ${msg.who === 'medok' ? 'Медка' : 'Пуси'}</span></div>
        <div class="cf-msg ${lv.key}">${words.map((ws) => `<span class="cf-word">${ws.map((i) => {
          const c = enc.cells[i];
          if (c.sep) return `<span class="cf-sep">${esc(c.sep)}</span>`;
          return `<button type="button" class="cf-cell ${i === cur ? 'cur' : ''} ${bad.has(i) ? 'bad' : ''}" data-cell="${i}" aria-label="Буква ${slots().indexOf(i) + 1}"><i>${esc(c.sym)}</i><b>${ans[i] || ''}</b></button>`;
        }).join('')}</span>`).join('')}</div>
        <div class="rb-say" data-say>${esc(say || 'Нажми на клетку и выбери букву.')}</div>
        ${helper()}
        <div class="cf-kbd">${[...ABC].map((l) => `<button type="button" data-letter="${l}">${l}</button>`).join('')}
          <button type="button" class="wide" data-del aria-label="Стереть">⌫</button></div>
        <div class="s-foot"><button type="button" class="pill-btn ghost" data-hint>💡 Открыть букву</button></div>
      </div>`;
  };

  const nextEmpty = (from) => {
    const s = slots();
    const k = s.indexOf(from);
    return [...s.slice(k + 1), ...s.slice(0, k + 1)].find((i) => !ans[i]) ?? from;
  };

  const check = () => {
    if (slots().some((i) => !ans[i])) return render();
    checks++;
    bad = new Set(slots().filter((i) => ans[i] !== enc.cells[i].ch));
    if (!bad.size) return win();
    cur = [...bad][0];
    return render(`Почти! Неверных букв: ${bad.size}. Они красные, исправь их.`);
  };

  const put = (l) => {
    ans[cur] = l;
    bad.delete(cur);
    if (slots().every((i) => ans[i])) return check();
    cur = nextEmpty(cur);
    render();
  };

  const win = () => {
    const stars = cipherStars(hints, checks);
    if (!done.includes(msg.idx)) done.push(msg.idx);
    el.innerHTML = `<div class="g-end">
      ${hero(msg.who, 'cheer', 120)}
      <h2>Расшифровано!</h2>
      <div class="rb-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <p class="cf-done">«${esc(msg.text)}»</p>
      <p class="g-end-note">${hints ? `Подсказок: ${hints}. ` : ''}${stars === 3 ? 'Чисто, с первого раза. Настоящий шифровальщик!' : 'Отличная работа. В следующий раз попробуй без подсказок.'}</p>
      <div class="g-end-btns"><button type="button" class="pill-btn" data-start>Ещё записку</button><button type="button" class="pill-btn ghost" data-back>Другой шифр</button></div></div>`;
    onFinish?.({ g: 'cipher', mode: 'solo', level: lv.id, msg: msg.idx, scores: [stars], of: 3 });
  };

  el.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-exit]')) return stop();
    if (t.closest('[data-back]')) return menu();
    const l = t.closest('[data-level]');
    if (l) { lv = CIPHER_LEVELS.find((x) => x.id === +l.dataset.level); onLevel?.(lv.id); return menu(); }
    if (t.closest('[data-start]')) return start();
    if (!msg) return;
    const c = t.closest('[data-cell]');
    if (c) { cur = +c.dataset.cell; return render(); }
    const k = t.closest('[data-letter]');
    if (k) return put(k.dataset.letter);
    if (t.closest('[data-del]')) {
      if (!ans[cur]) { const s = slots(); cur = s[Math.max(0, s.indexOf(cur) - 1)]; }
      ans[cur] = '';
      bad.delete(cur);
      return render();
    }
    if (t.closest('[data-hint]')) {
      const s = slots();
      const i = ans[cur] !== enc.cells[cur].ch ? cur : s.find((x) => ans[x] !== enc.cells[x].ch);
      if (i == null) return check();
      hints++;
      cur = i;
      return put(enc.cells[i].ch);
    }
  });
  const onKey = (ev) => {
    if (ev.key === 'Escape') return stop();
    if (!msg || !el.querySelector('.cf-kbd')) return;
    const ch = clean(ev.key);
    if (ch.length === 1 && isLetter(ch)) { ev.preventDefault(); put(ch); }
    if (ev.key === 'Backspace') el.querySelector('[data-del]')?.click();
  };
  document.addEventListener('keydown', onKey);
  menu();
}
