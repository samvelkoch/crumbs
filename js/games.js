// Мини-игры. Каждая игра рисуется в своём полноэкранном слое поверх приложения
// и по окончании отдаёт результат в onFinish. Состояние приложения игры не трогают.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const shuffle = (a) => {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
export const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function layer(cls) {
  const el = document.createElement('div');
  el.className = 'game-layer ' + cls;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  document.body.appendChild(el);
  document.body.classList.add('game-open');
  return el;
}
export function closeLayer(el) {
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

// ---------------------------------------------------------------- «Что для меня важно»

const SORT_DECKS = [
  { id: 'v', emoji: '❤️', label: 'Очень важно' },
  { id: 'i', emoji: '👍', label: 'Важно' },
  { id: 'n', emoji: '🤷', label: 'Не очень' },
  { id: 'u', emoji: '❓', label: 'Не знаю' },
];
const SORT_CHEER = ['Записала!', 'Интересно!', 'Принято.', 'Хм, понятно.', 'Так и запишем.', 'Ага!'];

// cards: [{ id, e, n, d }], draft: { order, decks } для продолжения, onSave(draft) на паузе,
// onFinish(decks) когда всё разложено и проверено
export function playSort({ cards, hero, draft, onSave, onFinish }) {
  const el = layer('sort');
  const byId = new Map(cards.map((c) => [c.id, c]));
  const order = (draft?.order || shuffle(cards.map((c) => c.id))).filter((id) => byId.has(id));
  for (const c of cards) if (!order.includes(c.id)) order.push(c.id);
  const decks = { ...(draft?.decks || {}) };
  const history = [];
  let pos = order.findIndex((id) => !decks[id]);
  const stop = () => { document.removeEventListener('keydown', onKey); closeLayer(el); };
  const pause = () => { onSave?.({ order, decks }); stop(); };

  const head = (sub) => `<div class="g-head"><button type="button" class="g-close" data-pause aria-label="Пауза, продолжить потом">✕</button>
    <div class="g-title">Что для меня важно</div><div class="g-hint">${sub}</div></div>`;

  const showCard = () => {
    if (pos < 0) return review();
    const c = byId.get(order[pos]);
    const done = Object.keys(decks).length;
    el.innerHTML = `${head('Правильных ответов нет. Выбирай, как чувствуешь')}
      <div class="s-wrap">
        <div class="progress s-prog"><i style="width:${(done / order.length) * 100}%"></i></div>
        <div class="small muted s-count">${done} из ${order.length}</div>
        <div class="s-stage"><div class="s-hero">${hero('pusya', 'happy', 110)}</div>
          <div class="s-card" aria-live="polite"><div class="s-e">${c.e}</div><div class="s-n">${esc(c.n)}</div><div class="s-d">${esc(c.d)}</div></div></div>
        <div class="s-say" data-say></div>
        <div class="s-decks">${SORT_DECKS.map((d) => `<button type="button" class="s-deck d-${d.id}" data-deck="${d.id}"><span>${d.emoji}</span>${d.label}</button>`).join('')}</div>
        <div class="s-foot"><button type="button" class="pill-btn ghost" data-back ${history.length ? '' : 'disabled'}>↩ Назад</button>
          <button type="button" class="pill-btn ghost" data-pause>⏸ Продолжу потом</button></div>
      </div>`;
  };

  const put = (d) => {
    const id = order[pos];
    decks[id] = d;
    history.push(id);
    const card = el.querySelector('.s-card');
    card?.classList.add('fly-' + d);
    const say = el.querySelector('[data-say]');
    if (say) say.textContent = pickOne(SORT_CHEER);
    pos = order.findIndex((x) => !decks[x]);
    setTimeout(showCard, reduced() ? 0 : 260);
  };

  const review = () => {
    el.innerHTML = `${head('Посмотри, всё ли так. Нажми на карточку, чтобы переложить её')}
      <div class="s-review">${SORT_DECKS.map((d) => {
        const l = order.filter((id) => decks[id] === d.id);
        return `<section class="s-col d-${d.id}"><h3>${d.emoji} ${d.label} <span>${l.length}</span></h3>
          <div class="s-chips">${l.map((id) => `<button type="button" class="s-chip" data-move="${id}">${byId.get(id).e} ${esc(byId.get(id).n)}</button>`).join('') || '<span class="small muted">пусто</span>'}</div></section>`;
      }).join('')}</div>
      <div class="s-foot"><button type="button" class="pill-btn" data-done>Готово!</button></div>`;
  };

  const moveSheet = (id) => {
    const c = byId.get(id);
    const box = document.createElement('div');
    box.className = 's-move';
    box.innerHTML = `<div class="s-move-in"><div class="s-e">${c.e}</div><b>${esc(c.n)}</b><div class="small muted">${esc(c.d)}</div>
      <div class="s-decks">${SORT_DECKS.map((d) => `<button type="button" class="s-deck d-${d.id}" data-to="${d.id}" aria-pressed="${decks[id] === d.id}"><span>${d.emoji}</span>${d.label}</button>`).join('')}</div></div>`;
    box.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-to]');
      if (b) decks[id] = b.dataset.to;
      if (b || ev.target === box) { box.remove(); review(); }
    });
    el.appendChild(box);
  };

  const finish = () => {
    const top = order.filter((id) => decks[id] === 'v').map((id) => byId.get(id));
    el.innerHTML = `<div class="g-end">
      <div class="g-end-heroes">${hero('medok', 'cheer', 110)}${hero('pusya', 'cheer', 120)}</div>
      <h2>Готово! Спасибо, что поделилась.</h2>
      <p class="g-end-note">Медок и Пуся теперь знают тебя чуть лучше. Через какое-то время можно разложить карточки снова и посмотреть, что изменилось.</p>
      ${top.length ? `<div class="g-end-learn"><div class="g-end-cap">❤️ Самое важное для тебя</div>${top.map((c) => `<span class="chip small">${c.e} ${esc(c.n)}</span>`).join('')}</div>` : ''}
      <div class="g-end-btns"><button type="button" class="pill-btn" data-exit>Ура!</button></div></div>`;
    onFinish?.({ ...decks });
  };

  el.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-pause]')) return pause();
    if (t.closest('[data-exit]')) return stop();
    if (t.closest('[data-done]')) return finish();
    const d = t.closest('[data-deck]');
    if (d && !d.closest('.s-move') && pos >= 0) return put(d.dataset.deck);
    if (t.closest('[data-back]') && history.length) {
      const id = history.pop();
      delete decks[id];
      pos = order.indexOf(id);
      return showCard();
    }
    const m = t.closest('[data-move]');
    if (m) moveSheet(m.dataset.move);
  });
  const onKey = (ev) => {
    if (ev.key === 'Escape') pause();
    else if (pos >= 0 && ['1', '2', '3', '4'].includes(ev.key)) put(SORT_DECKS[+ev.key - 1].id);
  };
  document.addEventListener('keydown', onKey);
  showCard();
}

// ---------------------------------------------------------------- «Лавка и кухня»

// done: id уже приготовленных рецептов, чтобы сначала предлагать новые.
// level: 1..3 (см. LEVELS в kitchen.js), onLevel(level) запоминает выбор.
export function playKitchen({ recipes, products, stalls, plate, levels, hero, done = [], level = 1, onLevel, onFinish }) {
  const el = layer('kitchen');
  let r = null;
  let basket = {};
  let stall = stalls[0].id;
  let mistakes = 0;
  let stepIdx = 0;
  let stepOrder = [];
  let listOpen = true;
  let hideTm = 0;
  const stop = () => { clearTimeout(hideTm); document.removeEventListener('keydown', onKey); closeLayer(el); };
  const head = (sub) => `<div class="g-head"><button type="button" class="g-close" data-exit aria-label="Выйти">✕</button>
    <div class="g-title">Лавка и кухня</div><div class="g-hint">${sub}</div></div>`;
  const prod = (id) => products[id];
  const need = (id) => (level === 1 ? 1 : r.need[id] || 0);
  const needIds = () => Object.keys(r.need);
  const got = (id) => basket[id] || 0;
  const total = () => needIds().reduce((a, id) => a + need(id), 0);
  const have = () => needIds().reduce((a, id) => a + Math.min(got(id), need(id)), 0);

  const orders = () => {
    const fresh = shuffle(recipes.filter((x) => !done.includes(x.id)));
    const list = [...fresh, ...shuffle(recipes.filter((x) => done.includes(x.id)))].slice(0, 3);
    el.innerHTML = `${head('Выбери уровень и кому сегодня готовим')}
      <div class="k-wrap">
        <div class="k-levels" role="radiogroup" aria-label="Уровень">${levels.map((l) => `<button type="button" role="radio" class="k-level ${l.id === level ? 'on' : ''}" aria-checked="${l.id === level}" data-level="${l.id}"><span>${l.emoji}</span><b>${l.label}</b><small>${l.hint}</small></button>`).join('')}</div>
        <div class="k-orders">${list.map((x) => `<button type="button" class="k-order" data-recipe="${x.id}">
        <span class="k-oe">${x.emoji}</span><span class="k-ot"><b>${esc(x.who)}</b><span>${esc(x.ask)}</span><span class="k-on">${esc(x.name)} · ${Object.keys(x.need).length} продуктов, ${x.steps.length} шагов${done.includes(x.id) ? ' · уже готовили' : ''}</span></span></button>`).join('')}</div>
        <div class="s-foot"><button type="button" class="pill-btn ghost" data-shuffle>🔄 Другие заказы</button></div>
        <p class="small muted" style="text-align:center">Всего рецептов ${recipes.length}, приготовлено ${new Set(done).size}</p></div>`;
  };

  const listHTML = () => {
    if (level === 3 && !listOpen) {
      return `<div class="k-list"><div class="k-cap">🧺 Список спрятан · собрано ${have()} из ${total()}</div>
        <button type="button" class="pill-btn ghost" data-peek>👀 Подсмотреть (это подсказка)</button></div>`;
    }
    return `<div class="k-list"><div class="k-cap">🧺 Список покупок · ${have()} из ${total()}${level === 3 ? ' · запоминай!' : ''}</div>
      <div class="k-need">${needIds().map((id) => {
        const n = need(id);
        const ok = got(id) >= n;
        return `<span class="k-ni ${ok ? 'got' : ''}">${level === 1 ? prod(id)[0] + ' ' : ''}${esc(prod(id)[1])}${n > 1 || level > 1 ? ` <b>${level > 1 ? `${Math.min(got(id), n)}/${n}` : ''}</b>` : ''}</span>`;
      }).join('')}</div></div>`;
  };

  const shop = (msg = '') => {
    const ready = have() === total();
    el.innerHTML = `${head(`${esc(r.who)}: ${esc(r.name)}`)}
      <div class="k-wrap">
        ${listHTML()}
        <div class="k-say ${msg ? 'show' : ''}" data-say>${esc(msg)}</div>
        <div class="k-stalls" role="tablist">${stalls.map((s) => `<button type="button" role="tab" class="k-stall ${s.id === stall ? 'on' : ''}" data-stall="${s.id}" aria-selected="${s.id === stall}">${s.emoji}<span>${s.label}</span></button>`).join('')}</div>
        <div class="k-shelf">${Object.entries(products).filter(([, p]) => p[2] === stall).map(([id, p]) => `<button type="button" class="k-prod ${level === 1 && got(id) ? 'in' : ''}" data-prod="${id}"><span>${p[0]}</span>${esc(p[1])}${got(id) ? `<i class="k-cnt">${got(id)}</i>` : ''}</button>`).join('')}</div>
        <div class="s-foot">${level > 1 ? '<button type="button" class="pill-btn ghost" data-undo>↩ Выложить последнее</button>' : ''}
          <button type="button" class="pill-btn" data-cook ${ready ? '' : 'disabled'}>${ready ? '👩‍🍳 На кухню!' : 'Собери всё по списку'}</button></div>
      </div>`;
  };

  const cook = (msg = '') => {
    el.innerHTML = `${head(`Готовим: ${esc(r.name)}`)}
      <div class="k-wrap">
        <div class="k-pot"><div class="k-in">${needIds().map((id) => prod(id)[0]).join(' ')}</div><div class="k-pe ${stepIdx ? 'bub' : ''}">${stepIdx >= r.steps.length ? r.emoji : '🍳'}</div>
          <div class="small muted">Шаг ${Math.min(stepIdx + 1, r.steps.length)} из ${r.steps.length}</div></div>
        <div class="k-say ${msg ? 'show' : ''}" data-say>${esc(msg || 'Нажимай шаги по порядку: что сначала, что потом?')}</div>
        ${level < 3 ? `<ol class="k-done">${r.steps.slice(0, stepIdx).map((t) => `<li>✅ ${esc(t)}</li>`).join('')}</ol>` : ''}
        <div class="k-steps">${stepOrder.filter((i) => i >= stepIdx).map((i) => `<button type="button" class="k-step" data-step="${i}">${esc(r.steps[i])}</button>`).join('')}</div>
      </div>`;
  };

  const result = () => {
    const lv = levels.find((l) => l.id === level);
    el.innerHTML = `<div class="g-end">
      <div class="k-dish">${r.emoji}</div>
      <h2>Готово: ${esc(r.name)}!</h2>
      <p class="g-end-note"><b>${esc(r.who)}</b> говорит спасибо. Уровень «${lv.label}» ${lv.emoji}</p>
      <div class="k-meaning">${hero('medok', 'cheer', 70)}<p>${esc(r.meaning)}</p></div>
      <div class="g-end-learn"><div class="g-end-cap">Что даёт это блюдо</div>${r.plate.map((k) => `<span class="chip small">${esc(plate[k])}</span>`).join('')}</div>
      <p class="small muted">${mistakes ? `Подсказок понадобилось: ${mistakes}. С каждым разом получается увереннее.` : level < 3 ? 'Ни одной подсказки! Может, попробуешь уровень сложнее?' : 'Ни одной подсказки на уровне «Шеф». Настоящий мастер!'}</p>
      <div class="g-end-btns"><button type="button" class="pill-btn" data-again>Ещё заказ</button><button type="button" class="pill-btn ghost" data-exit>Выйти</button></div></div>`;
    done = [...done, r.id];
    onFinish?.({ g: 'kitchen', mode: 'solo', recipe: r.id, level, scores: [mistakes], of: total() + r.steps.length });
  };

  const nudge = (sel, text, again) => {
    mistakes++;
    const b = el.querySelector(sel);
    b?.classList.remove('shake'); void b?.offsetWidth; b?.classList.add('shake');
    setTimeout(() => again(text), reduced() ? 0 : 280);
  };
  const hideLater = () => {
    clearTimeout(hideTm);
    // время на запоминание растёт с длиной списка
    hideTm = setTimeout(() => { listOpen = false; if (r && el.querySelector('.k-shelf')) shop('Список спрятан. Что нужно купить?'); }, 3000 + needIds().length * 1200);
  };
  const history = [];

  el.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-exit]')) return stop();
    if (t.closest('[data-again]') || t.closest('[data-shuffle]')) { r = null; return orders(); }
    const lv = t.closest('[data-level]');
    if (lv) { level = +lv.dataset.level; onLevel?.(level); return orders(); }
    const o = t.closest('[data-recipe]');
    if (o) {
      r = recipes.find((x) => x.id === o.dataset.recipe);
      basket = {}; mistakes = 0; stepIdx = 0; stall = stalls[0].id; listOpen = true; history.length = 0;
      stepOrder = shuffle(r.steps.map((_, i) => i));
      shop(`${r.ask} ${level === 3 ? 'Запомни список, скоро он спрячется!' : 'Найди на прилавках всё по списку.'}`);
      if (level === 3) hideLater();
      return;
    }
    if (t.closest('[data-peek]')) { mistakes++; listOpen = true; shop('Смотри внимательно!'); return hideLater(); }
    const s = t.closest('[data-stall]');
    if (s) { stall = s.dataset.stall; return shop(); }
    if (t.closest('[data-undo]')) {
      const id = history.pop();
      if (id) { basket[id]--; if (!basket[id]) delete basket[id]; }
      return shop(id ? `${prod(id)[1]}: вернули на прилавок.` : 'Корзина пуста.');
    }
    const p = t.closest('[data-prod]');
    if (p) {
      const id = p.dataset.prod;
      const name = `${prod(id)[0]} ${prod(id)[1]}`;
      if (!r.need[id]) return nudge(`[data-prod="${id}"]`, `${name}: этого нет в рецепте.${level === 3 ? '' : ' Посмотри в список.'}`, shop);
      if (got(id) >= need(id)) {
        if (level === 1) return shop(`${prod(id)[1]} уже в корзине.`);
        return nudge(`[data-prod="${id}"]`, `${name}: столько не нужно, хватит ${need(id)}.`, shop);
      }
      basket[id] = got(id) + 1;
      history.push(id);
      const left = total() - have();
      return shop(left ? `Есть! Осталось ${left}.` : 'Всё собрано, можно на кухню!');
    }
    if (t.closest('[data-cook]')) { clearTimeout(hideTm); return cook(); }
    const st = t.closest('[data-step]');
    if (st) {
      const i = +st.dataset.step;
      if (i !== stepIdx) return nudge(`[data-step="${i}"]`, 'Хм, кажется, сначала нужно другое.', cook);
      stepIdx++;
      if (stepIdx >= r.steps.length) { cook('Готово! Пахнет очень вкусно.'); return setTimeout(result, reduced() ? 0 : 900); }
      return cook(pickOne(['Отлично!', 'Верно!', 'Так держать!', 'Дальше!']));
    }
  });
  const onKey = (ev) => { if (ev.key === 'Escape') stop(); };
  document.addEventListener('keydown', onKey);
  orders();
}
