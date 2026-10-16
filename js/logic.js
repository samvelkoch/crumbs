// Игра «Логика сыщика»: у каждого героя свой фрукт, шарф и кружок. Есть улики,
// по ним нужно выяснить, у кого что. Головоломки генерируются: случайный ответ,
// потом улики добавляются, пока ответ не станет единственным, и лишние убираются.
import { esc, shuffle, layer, closeLayer } from './games.js';

export const PEOPLE = [
  { n: 'Медок', e: '🦔' }, { n: 'Пуся', e: '🐒' }, { n: 'Бублик', e: '🐱' }, { n: 'Тёма', e: '🦉' },
];

// pred: что делает герой (с этим значением); subj: «Тот, кто …» начало фразы
export const CATS = [
  { id: 'fruit', label: 'Фрукт', vals: [
    { e: '🍎', n: 'яблоко', acc: 'яблоко' }, { e: '🍐', n: 'груша', acc: 'грушу' },
    { e: '🍌', n: 'банан', acc: 'банан' }, { e: '🍓', n: 'клубника', acc: 'клубнику' }],
  pred: (v) => `любит ${v.acc}` },
  { id: 'scarf', label: 'Шарф', vals: [
    { e: '🟥', n: 'красный' }, { e: '🟦', n: 'синий' }, { e: '🟩', n: 'зелёный' }, { e: '🟨', n: 'жёлтый' }],
  pred: (v) => `носит ${v.n} шарф` },
  { id: 'hobby', label: 'Кружок', vals: [
    { e: '🏊', n: 'плавание' }, { e: '🎨', n: 'рисование' }, { e: '♟️', n: 'шахматы' }, { e: '💃', n: 'танцы' }],
  pred: (v) => `ходит на ${v.n}` },
];

export const LOGIC_LEVELS = [
  { id: 1, emoji: '🔍', label: 'Стажёр', hint: '3 героя, фрукт и шарф', n: 3, cats: 2 },
  { id: 2, emoji: '🕵️', label: 'Сыщик', hint: '4 героя, фрукт и шарф', n: 4, cats: 2 },
  { id: 3, emoji: '🎩', label: 'Детектив', hint: '4 героя, три признака', n: 4, cats: 3 },
];

function perms(n) {
  if (n === 1) return [[0]];
  const out = [];
  for (const p of perms(n - 1)) for (let i = 0; i < n; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}

// Все возможные ответы: sol[c][человек] = номер значения
export function allSolutions(n, cats) {
  const P = perms(n);
  let acc = [[]];
  for (let c = 0; c < cats; c++) acc = acc.flatMap((s) => P.map((p) => [...s, p]));
  return acc;
}

// Улика: a и b это {c: -1 (герой) | номер признака, v}; neg: «не»
const who = (sol, a) => (a.c < 0 ? a.v : sol[a.c].indexOf(a.v));
export const clueHolds = (sol, k) => (sol[k.b.c][who(sol, k.a)] === k.b.v) !== k.neg;

export function clueText(k, cats = CATS, people = PEOPLE) {
  const pred = (b) => cats[b.c].pred(cats[b.c].vals[b.v]);
  const subj = k.a.c < 0 ? people[k.a.v].n : `Тот, кто ${pred(k.a)},`;
  return `${subj} ${k.neg ? 'не ' : ''}${pred(k.b)}.`;
}

// несколько попыток, берём головоломку с самым коротким списком улик
export function makePuzzle(levelId, rand = Math.random, tries = 6) {
  let best = null;
  for (let i = 0; i < tries; i++) {
    const p = onePuzzle(levelId, rand);
    if (!best || p.clues.length < best.clues.length) best = p;
  }
  return best;
}

function onePuzzle(levelId, rand) {
  const L = LOGIC_LEVELS.find((l) => l.id === levelId) || LOGIC_LEVELS[0];
  const { n } = L;
  const C = L.cats;
  const all = allSolutions(n, C);
  const answer = all[Math.floor(rand() * all.length)];
  // все верные улики
  const cand = [];
  for (let b = 0; b < C; b++) {
    for (let v = 0; v < n; v++) {
      for (let p = 0; p < n; p++) cand.push({ a: { c: -1, v: p }, b: { c: b, v } });
      for (let a = 0; a < C; a++) if (a !== b) for (let u = 0; u < n; u++) cand.push({ a: { c: a, v: u }, b: { c: b, v } });
    }
  }
  const truths = [];
  for (const k of cand) {
    for (const neg of [false, true]) {
      const x = { ...k, neg };
      if (clueHolds(answer, x)) truths.push(x);
    }
  }
  // «не» и связи между признаками интереснее, прямых «Пуся любит грушу» поменьше
  const weight = (k) => (k.neg ? 0.4 : 0) + (k.a.c >= 0 ? 0.8 : 0) + rand() * 2;
  const order = truths.map((k) => [weight(k), k]).sort((x, y) => y[0] - x[0]).map((x) => x[1]);
  let left = all;
  const clues = [];
  for (const k of order) {
    const next = left.filter((s) => clueHolds(s, k));
    if (next.length < left.length) { clues.push(k); left = next; }
    if (left.length === 1) break;
  }
  // убрать лишние улики
  for (let i = clues.length - 1; i >= 0; i--) {
    const rest = clues.filter((_, j) => j !== i);
    if (all.filter((s) => rest.every((k) => clueHolds(s, k))).length === 1) clues.splice(i, 1);
  }
  return { level: L.id, n, cats: C, answer, clues: shuffle(clues) };
}

export const countSolutions = (pz) => allSolutions(pz.n, pz.cats).filter((s) => pz.clues.every((k) => clueHolds(s, k))).length;

// ---------------------------------------------------------------- интерфейс

export function playLogic({ hero, level = 1, solved = 0, onLevel, onFinish }) {
  const el = layer('logic');
  let lv = level;
  let pz = null;
  let marks = {}; // "p,c,v" -> 'x' | 'o'
  let crossed = new Set();
  let checks = 0;
  let wrong = new Set();
  const stop = () => { document.removeEventListener('keydown', onKey); closeLayer(el); };
  const head = (sub, back = false) => `<div class="g-head"><button type="button" class="g-close" ${back ? 'data-back' : 'data-exit'} aria-label="${back ? 'Назад' : 'Выйти'}">${back ? '←' : '✕'}</button>
    <div class="g-title">Логика сыщика</div><div class="g-hint">${sub}</div></div>`;
  const people = () => PEOPLE.slice(0, pz.n);
  const vals = (c) => CATS[c].vals.slice(0, pz.n);

  const menu = () => {
    pz = null;
    el.innerHTML = `${head('Улики, герои и одна правильная разгадка')}
      <div class="k-wrap">
        <div class="k-meaning">${hero('medok', 'think', 64)}<p>У каждого героя свой фрукт, свой шарф и свой кружок, и ни у кого они не повторяются. Читай улики, ставь ✗ там, где точно нет, и ✓ там, где точно да.</p></div>
        <div class="k-levels" role="radiogroup" aria-label="Уровень">${LOGIC_LEVELS.map((l) => `<button type="button" role="radio" class="k-level ${l.id === lv ? 'on' : ''}" aria-checked="${l.id === lv}" data-level="${l.id}"><span>${l.emoji}</span><b>${l.label}</b><small>${l.hint}</small></button>`).join('')}</div>
        <button type="button" class="pill-btn" data-start>🔍 Новое дело</button>
        ${solved ? `<p class="small muted" style="text-align:center">Раскрыто дел: ${solved}</p>` : ''}
      </div>`;
  };

  const start = () => {
    pz = makePuzzle(lv);
    marks = {};
    crossed = new Set();
    checks = 0;
    wrong = new Set();
    render();
  };

  // ответ ребёнка: для каждого героя и признака значение с ✓
  const picked = () => people().map((_, p) => Array.from({ length: pz.cats }, (__, c) => {
    const v = vals(c).findIndex((___, j) => marks[`${p},${c},${j}`] === 'o');
    return v;
  }));
  const complete = () => picked().every((row) => row.every((v) => v >= 0));

  const render = (say = '') => {
    const cols = Array.from({ length: pz.cats }, (_, c) => c);
    el.innerHTML = `${head(`${LOGIC_LEVELS[lv - 1].emoji} ${LOGIC_LEVELS[lv - 1].label}`, true)}
      <div class="k-wrap">
        <div class="lg-clues"><div class="k-cap">🗂 Улики · нажми, чтобы зачеркнуть</div>
          <ol class="lg-list">${pz.clues.map((k, i) => `<li><button type="button" class="${crossed.has(i) ? 'done' : ''}" data-clue="${i}"><b>${i + 1}.</b><span>${esc(clueText(k))}</span></button></li>`).join('')}</ol></div>
        <div class="lg-grid-wrap"><table class="lg-grid" style="--n:${pz.n}">
          <thead><tr><th></th>${cols.map((c) => `<th colspan="${pz.n}" class="lg-cat">${CATS[c].label}</th>`).join('')}</tr>
          <tr><th></th>${cols.map((c) => vals(c).map((v, j) => `<th class="lg-val ${j === 0 ? 'first' : ''}" title="${esc(v.n)}">${v.e}</th>`).join('')).join('')}</tr></thead>
          <tbody>${people().map((p, pi) => `<tr><th class="lg-who">${p.e}<span>${esc(p.n)}</span></th>${cols.map((c) => vals(c).map((v, j) => {
            const k = `${pi},${c},${j}`;
            const m = marks[k];
            return `<td class="${j === 0 ? 'first' : ''}"><button type="button" class="lg-cell ${m || ''} ${wrong.has(k) ? 'bad' : ''}" data-mark="${k}" aria-label="${esc(p.n)}: ${esc(v.n)}">${m === 'o' ? '✓' : m === 'x' ? '✗' : ''}</button></td>`;
          }).join('')).join('')}</tr>`).join('')}</tbody></table></div>
        <div class="rb-say" data-say>${esc(say || 'Нажимай на клетку: один раз ✗, два раза ✓, третий раз стереть.')}</div>
        <div class="s-foot"><button type="button" class="pill-btn ghost" data-clear>🧽 Стереть всё</button>
          <button type="button" class="pill-btn" data-check ${complete() ? '' : 'disabled'}>✅ Проверить</button></div>
      </div>`;
  };

  const check = () => {
    checks++;
    const pick = picked();
    wrong = new Set();
    pick.forEach((row, p) => row.forEach((v, c) => { if (pz.answer[c][p] !== v) wrong.add(`${p},${c},${v}`); }));
    if (!wrong.size) return win();
    return render(`Не сходится в ${wrong.size} ${wrong.size === 1 ? 'месте' : 'местах'}, они подсвечены. Перечитай улики!`);
  };

  const win = () => {
    const stars = checks === 1 ? 3 : checks === 2 ? 2 : 1;
    solved++;
    el.innerHTML = `<div class="g-end">
      ${hero('medok', 'cheer', 120)}
      <h2>Дело раскрыто!</h2>
      <div class="rb-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="lg-answer">${people().map((p, pi) => `<div><b>${p.e} ${esc(p.n)}</b><span>${Array.from({ length: pz.cats }, (_, c) => vals(c)[pz.answer[c][pi]].e).join(' ')}</span></div>`).join('')}</div>
      <p class="g-end-note">${stars === 3 ? 'С первой проверки, как настоящий детектив!' : 'Распутано! Сыщики тоже иногда перепроверяют.'}</p>
      <div class="g-end-btns"><button type="button" class="pill-btn" data-start>Новое дело</button><button type="button" class="pill-btn ghost" data-back>Уровни</button></div></div>`;
    onFinish?.({ g: 'logic', mode: 'solo', level: lv, scores: [stars], of: 3 });
  };

  el.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-exit]')) return stop();
    if (t.closest('[data-back]')) return menu();
    const l = t.closest('[data-level]');
    if (l) { lv = +l.dataset.level; onLevel?.(lv); return menu(); }
    if (t.closest('[data-start]')) return start();
    if (!pz) return;
    const c = t.closest('[data-clue]');
    if (c) { const i = +c.dataset.clue; if (crossed.has(i)) crossed.delete(i); else crossed.add(i); return render(); }
    const mk = t.closest('[data-mark]');
    if (mk) {
      const k = mk.dataset.mark;
      marks[k] = { undefined: 'x', x: 'o', o: undefined }[marks[k]];
      if (!marks[k]) delete marks[k];
      wrong.delete(k);
      return render();
    }
    if (t.closest('[data-clear]')) { marks = {}; wrong = new Set(); return render(); }
    if (t.closest('[data-check]')) return check();
  });
  const onKey = (ev) => { if (ev.key === 'Escape') stop(); };
  document.addEventListener('keydown', onKey);
  menu();
}
