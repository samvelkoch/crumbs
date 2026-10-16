// Мини-игры. Каждая игра рисуется в своём полноэкранном слое поверх приложения
// и по окончании отдаёт результат в onFinish. Состояние приложения игры не трогают.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const shuffle = (a) => {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function layer(cls) {
  const el = document.createElement('div');
  el.className = 'game-layer ' + cls;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  document.body.appendChild(el);
  document.body.classList.add('game-open');
  return el;
}
function closeLayer(el) {
  el.remove();
  document.body.classList.remove('game-open');
}

// ---------------------------------------------------------------- «Полезное или вредное?»

// ok: полезное, можно каждый день. Остальное лучше есть иногда.
export const CATCH_FOODS = [
  { e: '🍎', n: 'Яблоко', ok: true }, { e: '🥕', n: 'Морковь', ok: true }, { e: '🥒', n: 'Огурец', ok: true },
  { e: '🍌', n: 'Банан', ok: true }, { e: '🥦', n: 'Брокколи', ok: true }, { e: '🍅', n: 'Помидор', ok: true },
  { e: '🍐', n: 'Груша', ok: true }, { e: '🍇', n: 'Виноград', ok: true }, { e: '🫐', n: 'Черника', ok: true },
  { e: '🥣', n: 'Каша', ok: true }, { e: '🐟', n: 'Рыба', ok: true }, { e: '🥚', n: 'Яйцо', ok: true },
  { e: '💧', n: 'Вода', ok: true }, { e: '🥛', n: 'Кефир', ok: true }, { e: '🍚', n: 'Рис', ok: true },
  { e: '🍗', n: 'Курица', ok: true }, { e: '🧀', n: 'Сыр', ok: true }, { e: '🫑', n: 'Перец', ok: true },
  { e: '🍊', n: 'Мандарин', ok: true }, { e: '🥝', n: 'Киви', ok: true }, { e: '🌽', n: 'Кукуруза', ok: true },
  { e: '🍬', n: 'Конфета', ok: false }, { e: '🍭', n: 'Леденец', ok: false }, { e: '🥤', n: 'Газировка', ok: false },
  { e: '🍟', n: 'Картошка фри', ok: false }, { e: '🍩', n: 'Пончик', ok: false }, { e: '🍰', n: 'Торт', ok: false },
  { e: '🍫', n: 'Шоколадка', ok: false }, { e: '🍪', n: 'Печенье', ok: false }, { e: '🌭', n: 'Хот-дог', ok: false },
  { e: '🍔', n: 'Бургер', ok: false }, { e: '🥨', n: 'Снеки', ok: false }, { e: '🧁', n: 'Капкейк', ok: false },
  { e: '🍦', n: 'Мороженое', ok: false }, { e: '🧋', n: 'Баббл ти', ok: false },
];

const ROUND = 14; // продуктов на игрока за игру

// Последовательность: поровну полезного и «иногда», перемешано
export function catchSequence(n = ROUND) {
  const ok = shuffle(CATCH_FOODS.filter((f) => f.ok)).slice(0, Math.ceil(n / 2));
  const no = shuffle(CATCH_FOODS.filter((f) => !f.ok)).slice(0, Math.floor(n / 2));
  return shuffle([...ok, ...no]);
}

const RIGHT_OK = ['Ам! Вкусно и полезно.', 'Отличный выбор!', 'Хрум-хрум, спасибо!', 'Полезно, беру!'];
const RIGHT_NO = ['Верно, это лучше иногда.', 'Сегодня не буду, спасибо!', 'Правильно, это на праздник.'];
const WRONG_OK = ['Это можно есть каждый день!', 'Хм, это как раз полезное.'];
const WRONG_NO = ['Это вкусно, но лучше иногда.', 'Ой, это скорее для праздника.'];
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

// players: [{ who: 'pusya' | 'medok', name }], hero(who, mood, size) -> svg
export function playCatch({ players, hero, onFinish }) {
  const el = layer('catch');
  const seq = catchSequence();
  const lanes = players.map((p) => ({ ...p, i: 0, score: 0, log: [], cur: null, done: false }));
  // в одиночной игре дорожка широкая, герой крупнее
  const hs = (l) => (players.length > 1 ? 130 : 190) - (l.who === 'medok' ? 10 : 0);
  el.innerHTML = `
    <div class="g-head"><button type="button" class="g-close" aria-label="Выйти из игры">✕</button>
      <div class="g-title">Полезное или вредное?</div><div class="g-hint">Ешь полезное, от вредного отказывайся</div></div>
    <div class="g-lanes">${lanes.map((l, k) => `
      <section class="g-lane" data-k="${k}" aria-label="${esc(l.name)}">
        <div class="g-score"><span>${esc(l.name)}</span><b data-score>0</b><span class="g-left" data-left>${ROUND}</span></div>
        <div class="g-sky"><div class="g-food" data-food aria-live="polite"></div><div class="g-say" data-say></div>
          <div class="g-hero" data-hero>${hero(l.who, 'happy', hs(l))}</div></div>
        <div class="g-btns">
          <button type="button" class="g-yes" data-ans="1">😋 Съем</button>
          <button type="button" class="g-no" data-ans="0">🙅 Не буду</button>
        </div>
      </section>`).join('')}</div>`;
  const laneEl = (k) => el.querySelector(`.g-lane[data-k="${k}"]`);
  let raf = 0;
  let stopped = false;

  const launch = (l, k) => {
    if (l.i >= seq.length) { l.done = true; l.cur = null; laneEl(k).querySelector('[data-food]').textContent = ''; checkEnd(); return; }
    // скорость растёт к концу раунда
    const dur = Math.max(1700, 3200 - l.i * 110);
    l.cur = { f: seq[l.i], t0: performance.now(), dur, answered: false };
    const food = laneEl(k).querySelector('[data-food]');
    food.textContent = l.cur.f.e;
    food.setAttribute('aria-label', l.cur.f.n);
    food.className = 'g-food';
    laneEl(k).querySelector('[data-left]').textContent = seq.length - l.i;
  };

  const say = (k, text, good) => {
    const s = laneEl(k).querySelector('[data-say]');
    s.textContent = text;
    s.className = 'g-say show ' + (good ? 'good' : 'soft');
    clearTimeout(s.tm);
    s.tm = setTimeout(() => { s.className = 'g-say'; }, 1100);
  };

  const resolve = (l, k, ans) => {
    if (!l.cur || l.cur.answered) return;
    l.cur.answered = true;
    const f = l.cur.f;
    const right = ans === null ? false : ans === f.ok;
    if (right) l.score++;
    l.log.push({ n: f.n, e: f.e, ok: f.ok, ans });
    laneEl(k).querySelector('[data-score]').textContent = l.score;
    const food = laneEl(k).querySelector('[data-food]');
    const heroEl = laneEl(k).querySelector('[data-hero]');
    if (ans === null) say(k, f.ok ? `Не успели! ${f.n} полезное.` : `Не успели! ${f.n} лучше иногда.`, false);
    else if (right) say(k, pickOne(f.ok ? RIGHT_OK : RIGHT_NO), true);
    else say(k, pickOne(f.ok ? WRONG_OK : WRONG_NO), false);
    food.className = 'g-food ' + (ans === 1 ? 'eat' : 'away');
    heroEl.innerHTML = hero(l.who, right ? 'cheer' : 'think', hs(l));
    l.i++;
    setTimeout(() => {
      if (stopped) return;
      heroEl.innerHTML = hero(l.who, 'happy', hs(l));
      launch(l, k);
    }, 650);
  };

  const tick = (now) => {
    lanes.forEach((l, k) => {
      if (!l.cur || l.cur.answered) return;
      const t = Math.min(1, (now - l.cur.t0) / l.cur.dur);
      const food = laneEl(k).querySelector('[data-food]');
      // подброс: вверх и обратно в лапы героя
      const y = reduced() ? 0.5 : 4 * t * (1 - t);
      food.style.setProperty('--y', y.toFixed(3));
      food.style.setProperty('--r', `${Math.round(t * 360)}deg`);
      if (t >= 1) resolve(l, k, null);
    });
    if (!stopped) raf = requestAnimationFrame(tick);
  };

  const finish = () => {
    stopped = true;
    cancelAnimationFrame(raf);
    const best = Math.max(...lanes.map((l) => l.score));
    const winners = lanes.filter((l) => l.score === best);
    const missed = lanes.flatMap((l) => l.log.filter((x) => x.ans === null || x.ans !== x.ok));
    const uniq = [...new Map(missed.map((x) => [x.n, x])).values()];
    el.innerHTML = `<div class="g-end">
      <div class="g-end-heroes">${hero('medok', 'cheer', 110)}${hero('pusya', 'cheer', 120)}</div>
      <h2>${lanes.length > 1 ? (winners.length > 1 ? 'Ничья! Вы оба молодцы.' : `Победил игрок «${esc(winners[0].name)}»!`) : `${best} из ${ROUND}!`}</h2>
      ${lanes.length > 1 ? `<div class="g-end-scores">${lanes.map((l) => `<div><span>${esc(l.name)}</span><b>${l.score}</b></div>`).join('')}</div>` : ''}
      <p class="g-end-note">${best >= ROUND - 1 ? 'Почти идеально! Медок записывает это в протокол.' : best >= ROUND / 2 ? 'Хорошая игра! С каждым разом получается лучше.' : 'Разминка засчитана. Попробуем ещё раз?'}</p>
      ${uniq.length ? `<div class="g-end-learn"><div class="g-end-cap">Запомним</div>${uniq.map((x) => `<span class="chip small">${x.e} ${esc(x.n)}: ${x.ok ? 'полезное' : 'лучше иногда'}</span>`).join('')}</div>` : ''}
      <div class="g-end-btns"><button type="button" class="pill-btn" data-again>Ещё раз</button><button type="button" class="pill-btn ghost" data-exit>Выйти</button></div>
    </div>`;
    onFinish?.({ g: 'catch', mode: lanes.length > 1 ? 'duo' : 'solo', scores: lanes.map((l) => l.score), of: ROUND });
    el.querySelector('[data-again]').onclick = () => { closeLayer(el); playCatch({ players, hero, onFinish }); };
    el.querySelector('[data-exit]').onclick = () => closeLayer(el);
  };
  const checkEnd = () => { if (lanes.every((l) => l.done)) setTimeout(finish, 300); };

  el.addEventListener('click', (ev) => {
    if (ev.target.closest('.g-close')) { stopped = true; cancelAnimationFrame(raf); closeLayer(el); return; }
    const b = ev.target.closest('[data-ans]');
    if (!b) return;
    const k = +b.closest('.g-lane').dataset.k;
    resolve(lanes[k], k, +b.dataset.ans === 1);
  });
  // клавиатура для одиночной игры: стрелки или Y/N
  const onKey = (ev) => {
    if (!document.body.contains(el)) { document.removeEventListener('keydown', onKey); return; }
    if (ev.key === 'Escape') { el.querySelector('.g-close')?.click(); return; }
    if (lanes.length === 1 && ['ArrowLeft', 'ArrowRight'].includes(ev.key)) resolve(lanes[0], 0, ev.key === 'ArrowLeft');
  };
  document.addEventListener('keydown', onKey);

  // короткий отсчёт, чтобы оба игрока успели приготовиться
  const sky = el.querySelectorAll('[data-say]');
  let n = 3;
  const count = () => {
    if (stopped) return;
    sky.forEach((s) => { s.textContent = n ? String(n) : 'Начали!'; s.className = 'g-say show big'; });
    if (n-- > 0) setTimeout(count, 600);
    else { sky.forEach((s) => setTimeout(() => { s.className = 'g-say'; }, 500)); lanes.forEach(launch); raf = requestAnimationFrame(tick); }
  };
  count();
}
