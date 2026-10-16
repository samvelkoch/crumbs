// Игра «Робот»: мастерская (собрать робота из деталей) и миссии, где робот буквально
// выполняет программу. Команды привязаны к сторонам карты: ⬆ вверх, ➡ вправо и т. д.,
// плана на карте нет: ребёнок считает клетки в уме, на карте остаётся только след после запуска. Логика и правила в robot.js.

import { esc, layer, closeLayer, reduced } from './games.js';
import { PARTS, MISSIONS, DEFAULT_ROBOT, parseMission, initState, runCommand, isWin, simulate, solve, robotSVG, FLY_ENERGY } from './robot.js';

const CELL = { '#': '🧱', '~': '🌊', '^': '🪨', '%': '', E: '🏁', C: '🥕', I: '📦', H: '🏠', B: '🔩' };
const DIR = {
  N: { arrow: '⬆️', word: 'вверх' }, S: { arrow: '⬇️', word: 'вниз' }, W: { arrow: '⬅️', word: 'влево' }, E: { arrow: '➡️', word: 'вправо' },
};
const ACT = { can: ['💧', 'Полить'], claw: ['🦾', 'Взять / отдать'], basket: ['🧺', 'Взять / отдать'], magnet: ['🧲', 'Собрать'] };
const EV_TEXT = {
  watered: '💦 Полито!', picked: '📦 Взял!', delivered: '🏠 Доставлено!', collected: '🔩 Есть!', nothing: '🤷 Здесь нечего делать',
  full: 'Руки заняты: сначала отнеси посылку домой',
  wall: 'Бам! Там стена.', water: 'Плюх! По воде может только робот с пропеллером.', rock: 'Камень! Его перешагнут ноги или перелетит пропеллер.',
  mud: 'Колёса застряли в грязи!', energy: 'Заряд кончился, робот приземлился.',
};
const STOP = new Set(['wall', 'water', 'rock', 'mud', 'energy']);
const GAP = 0.07; // промежуток между клетками в долях клетки
const part = (kind, id) => PARTS[kind].find((p) => p.id === id);
const starsFor = (n, par) => (n <= par ? 3 : n <= par + 3 ? 2 : 1);
const word = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'команда' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'команды' : 'команд');
const pos = (k) => GAP + k * (1 + GAP); // координата клетки в единицах клетки

// robot: { name, head, move, tool, color }; best: { missionId: команд }
export function playRobot({ robot, best = {}, hero, onRobot, onFinish }) {
  const el = layer('robot');
  robot = { ...DEFAULT_ROBOT, ...robot };
  for (const k of ['head', 'move', 'tool']) if (!part(k, robot[k])) robot[k] = DEFAULT_ROBOT[k];
  best = { ...best };
  let m = null;
  let g = null;
  let program = [];
  let sel = -1;
  let st = null;
  let running = false;
  let trail = [];
  let stepping = null; // пошаговый запуск (антенна): итератор
  let hints = 0;
  let peekTm = 0;
  let showMap = true;
  let tab = 'move';
  const stop = () => { running = false; clearTimeout(peekTm); document.removeEventListener('keydown', onKey); closeLayer(el); };
  const head = (title, sub, back = true) => `<div class="g-head"><button type="button" class="g-close" ${back ? 'data-back' : 'data-exit'} aria-label="${back ? 'Назад' : 'Выйти'}">${back ? '←' : '✕'}</button>
    <div class="g-title">${title}</div><div class="g-hint">${sub}</div></div>`;
  const unlocked = (i) => i < 3 || MISSIONS.slice(0, i).filter((x) => best[x.id]).length >= i - 1;
  const skills = () => [part('move', robot.move), part('tool', robot.tool), part('head', robot.head)];

  // ------------------------------------------------ главная: робот и миссии
  const hub = () => {
    m = null;
    const doneN = MISSIONS.filter((x) => best[x.id]).length;
    el.innerHTML = `${head('Робот', 'Собери робота и запрограммируй его', false)}
      <div class="k-wrap">
        <div class="rb-hub"><div class="rb-stage small-stage">${robotSVG(robot, 130)}</div>
          <div class="rb-hub-info"><b class="rb-name">${esc(robot.name)}</b>
            <div class="rb-skills">${skills().map((p) => `<span>${p.emoji} ${p.label}</span>`).join('')}</div>
            <button type="button" class="pill-btn" data-workshop>🔧 Мастерская</button></div></div>
        <div class="k-cap">Миссии · пройдено ${doneN} из ${MISSIONS.length}</div>
        <div class="rb-missions">${MISSIONS.map((x, i) => {
          const open = unlocked(i);
          const b = best[x.id];
          const par = b ? solve(parseMission(x), x, robot)?.length : null;
          return `<button type="button" class="rb-mission ${open ? '' : 'locked'} ${b ? 'done' : ''}" ${open ? `data-mission="${x.id}"` : 'disabled'}>
            <span class="rb-mi">${open ? x.emoji : '🔒'}</span><span class="rb-mt"><b>${i + 1}. ${esc(x.title)}</b>
            <span class="small muted">${b ? `${'⭐'.repeat(par ? starsFor(b, par) : 1)} · ${b} ${word(b)}` : open ? esc(x.task) : 'Пройди предыдущие'}</span></span></button>`;
        }).join('')}</div>
      </div>`;
  };

  // ------------------------------------------------ мастерская
  const TABS = [['move', '🦿', 'Ход'], ['tool', '✋', 'Рука'], ['head', '🤖', 'Голова'], ['color', '🎨', 'Цвет']];
  const workshop = () => {
    const opts = tab === 'color'
      ? `<div class="ws-colors">${PARTS.color.map((p) => `<button type="button" class="ws-color ${robot.color === p.id ? 'on' : ''}" style="--c:${p.id}" data-part="color" data-id="${p.id}" aria-label="${p.label}" aria-pressed="${robot.color === p.id}"></button>`).join('')}</div>`
      : `<div class="ws-opts">${PARTS[tab].map((p) => `
        <button type="button" class="ws-opt ${robot[tab] === p.id ? 'on' : ''}" data-part="${tab}" data-id="${p.id}" aria-pressed="${robot[tab] === p.id}">
          <span class="ws-mini">${robotSVG({ ...robot, [tab]: p.id }, 74)}</span>
          <b>${p.emoji} ${p.label}</b><small>${esc(p.perk)}</small>${robot[tab] === p.id ? '<i class="ws-check">✓</i>' : ''}</button>`).join('')}</div>`;
    el.innerHTML = `${head('Мастерская', 'Каждая деталь что-то умеет. Собери робота под миссию')}
      <div class="k-wrap ws">
        <div class="rb-stage"><div class="ws-bot">${robotSVG(robot, 190, 'cheer')}</div>
          <label class="ws-plate"><span>Имя</span><input type="text" maxlength="16" value="${esc(robot.name)}" data-name aria-label="Имя робота"></label></div>
        <div class="rb-skills center">${skills().map((p) => `<span>${p.emoji} ${p.label}</span>`).join('')}</div>
        <div class="ws-tabs" role="tablist">${TABS.map(([k, e, l]) => `<button type="button" role="tab" class="ws-tab ${tab === k ? 'on' : ''}" aria-selected="${tab === k}" data-tab="${k}"><span>${e}</span>${l}</button>`).join('')}</div>
        ${opts}
        <div class="s-foot"><button type="button" class="pill-btn" data-back>Готово, к миссиям!</button></div>
      </div>`;
  };

  // ------------------------------------------------ миссия
  const startMission = (id) => {
    m = MISSIONS.find((x) => x.id === id);
    g = parseMission(m);
    program = [];
    sel = -1;
    hints = 0;
    resetRun();
    showMap = !(m.dark && robot.head !== 'lamp');
    if (!showMap) peek();
    mission();
  };
  const resetRun = () => { st = initState(g, m, robot); running = false; stepping = null; trail = []; };
  const peek = () => {
    showMap = true;
    clearTimeout(peekTm);
    peekTm = setTimeout(() => { showMap = false; if (m && !running) mission('Карта погасла. Помнишь дорогу?'); }, 5000);
  };

  const mapHTML = (seen = []) => {
    const seenSet = new Set(seen.map(([r, c]) => `${r},${c}`));
    const dark = m.dark && robot.head !== 'lamp' && !showMap;
    const near = (r, c) => Math.abs(r - st.r) + Math.abs(c - st.c) <= 1;
    const W = pos(g.w);
    const H = pos(g.h);
    const P = (r, c) => `${(pos(c) + 0.5).toFixed(2)},${(pos(r) + 0.5).toFixed(2)}`;
    // план не рисуем: программу ребёнок держит в голове. Показываем только след уже проехавшего робота.
    const overlay = trail.length > 1 ? `<svg class="rb-plan" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}" aria-hidden="true">
      <polyline points="${trail.map(([r, c]) => P(r, c)).join(' ')}" fill="none" stroke="#7c3aed" stroke-width=".1" stroke-dasharray=".05 .16" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>
    </svg>` : '';
    return `<div class="rb-map" style="--w:${g.w};--h:${g.h};--gap:${GAP}">
      ${g.cells.map((row, r) => row.map((ch, c) => {
        const ti = g.targets.findIndex((t) => t.r === r && t.c === c);
        const doneT = ti >= 0 && st.done & (1 << ti);
        let e = CELL[ch] || '';
        if (doneT && ch !== 'C') e = '';
        const hidden = dark && !near(r, c) && !seenSet.has(`${r},${c}`);
        const kind = { '#': 'wall', '~': 'water', '%': 'mud', '^': 'rock' }[ch] || (ch === 'S' ? 'start' : 'floor');
        return `<div class="rb-cell t-${kind} ${hidden ? 'dark' : ''}">${hidden ? '' : e}${doneT && ch === 'C' ? '<i class="rb-badge">💦</i>' : ''}${ch === 'H' && st.delivered ? `<i class="rb-badge">${st.delivered}</i>` : ''}</div>`;
      }).join('')).join('')}
      ${overlay}
      <div class="rb-bot" style="--x:${pos(st.c)};--y:${pos(st.r)}">${robotSVG(robot, 60, 'happy', st.d === 'W')}${st.carry ? `<i class="rb-carry">📦${st.carry > 1 ? st.carry : ''}</i>` : ''}</div>
    </div>`;
  };

  const chipHTML = (p, k, cur) => {
    const face = p.c === 'A' ? ACT[robot.tool][0] : DIR[p.d].arrow;
    return `<button type="button" class="rb-chip ${k === cur ? 'cur' : ''} ${k === sel ? 'sel' : ''} ${p.c === 'A' ? 'act' : ''}" data-chip="${k}" ${running ? 'disabled' : ''}
      aria-label="Команда ${k + 1}: ${p.c === 'A' ? ACT[robot.tool][1] : `${DIR[p.d].word} ${p.n}`}"><i>${k + 1}</i><span>${face}</span>${p.c === 'M' ? `<b>${p.n}</b>` : ''}</button>`;
  };

  const editBar = () => {
    if (sel < 0 || !program[sel]) return '';
    const p = program[sel];
    return `<div class="rb-edit"><span>Команда ${sel + 1}: ${p.c === 'A' ? `${ACT[robot.tool][0]} ${ACT[robot.tool][1]}` : `${DIR[p.d].arrow} ${DIR[p.d].word} на ${p.n}`}</span>
      ${p.c === 'M' ? '<button type="button" data-ed="-1" aria-label="Меньше шагов">−</button><button type="button" data-ed="1" aria-label="Больше шагов">+</button>' : ''}
      <button type="button" data-ed="del" aria-label="Удалить команду">🗑</button><button type="button" data-ed="ok">Готово</button></div>`;
  };

  const mission = (msg = '', cur = -1) => {
    const energy = robot.move === 'fly' ? `<span class="rb-energy">🔋 ${Number.isFinite(st.energy) ? st.energy : FLY_ENERGY}</span>` : '';
    const dis = running ? 'disabled' : '';
    const pad = (d) => `<button type="button" class="rb-dir d-${d}" data-dir="${d}" ${dis} aria-label="${DIR[d].word}">${DIR[d].arrow}<span>${DIR[d].word}</span></button>`;
    el.innerHTML = `${head(`${m.emoji} ${esc(m.title)}`, esc(m.task))}
      <div class="rb-play">
        <div class="rb-left">
          ${mapHTML(m.dark ? [] : [])}
          <div class="rb-say" data-say>${esc(msg || (m.tip && !program.length ? `Совет: ${m.tip}` : program.length ? 'Посчитай клетки в уме и нажми «Запустить».' : 'Нажимай стрелки: куда ехать роботу по карте?'))} ${energy}</div>
        </div>
        <div class="rb-right">
          <div class="rb-prog" aria-label="Программа">${program.length ? program.map((p, k) => chipHTML(p, k, cur)).join('') : '<span class="small muted">Программа пустая. Каждое нажатие стрелки = шаг на одну клетку.</span>'}</div>
          ${editBar()}
          <div class="rb-pad">${pad('N')}${pad('W')}<button type="button" class="rb-dir d-act" data-act ${dis} aria-label="${ACT[robot.tool][1]}">${ACT[robot.tool][0]}<span>${ACT[robot.tool][1]}</span></button>${pad('E')}${pad('S')}</div>
          <div class="rb-ctrl">
            <button type="button" class="pill-btn ghost" data-undo ${dis} aria-label="Убрать последний шаг">⌫</button>
            <button type="button" class="pill-btn ghost" data-clear ${dis} aria-label="Очистить программу">🗑</button>
            ${m.dark && robot.head !== 'lamp' ? `<button type="button" class="pill-btn ghost" data-peek ${dis}>👀 Карта</button>` : ''}
            ${robot.head === 'brain' ? `<button type="button" class="pill-btn ghost" data-hint ${running || hints >= 3 ? 'disabled' : ''}>💡 ${3 - hints}</button>` : ''}
            ${robot.head === 'antenna' ? `<button type="button" class="pill-btn ghost" data-step ${running || !program.length ? 'disabled' : ''}>👣 Шаг</button>` : ''}
            <button type="button" class="pill-btn rb-run" data-run ${running || !program.length ? 'disabled' : ''}>▶ Запустить</button>
          </div>
        </div>
      </div>`;
  };

  const wait = (ms) => new Promise((res) => setTimeout(res, reduced() ? 40 : ms));
  const htmlNode = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };

  // все элементарные шаги программы по очереди
  function* allSteps() {
    let s = initState(g, m, robot);
    for (let k = 0; k < program.length; k++) {
      for (const x of runCommand(g, robot, s, program[k])) { s = x.s; yield { ...x, k }; }
    }
  }
  const evText = (x) => EV_TEXT[x.ev] || (x.ev === 'notool' ? `Нечем это сделать: нужен инструмент «${part('tool', x.need).label}»` : `Команда ${x.k + 1} из ${program.length}`);
  const showStep = (x, seen) => {
    st = x.s;
    if (x.ev === null) seen.push([st.r, st.c]);
    trail = seen;
    mission(evText(x), x.k);
    el.querySelector('.rb-map')?.replaceWith(htmlNode(mapHTML(seen)));
    const bot = el.querySelector('.rb-bot');
    if (STOP.has(x.ev)) bot?.classList.add('oops');
    else if (x.ev && x.ev !== 'turn') bot?.classList.add('busy');
  };

  const run = async () => {
    sel = -1;
    resetRun();
    running = true;
    const seen = [[st.r, st.c]];
    mission('Поехали!', 0);
    await wait(250);
    for (const x of allSteps()) {
      if (!running) return;
      showStep(x, seen);
      if (STOP.has(x.ev)) { await wait(500); return fail(x.ev); }
      await wait(x.ev === 'turn' ? 120 : x.ev === null ? 420 : 700);
    }
    running = false;
    return isWin(g, st) ? win() : fail(null);
  };

  const step = () => {
    if (!stepping) { sel = -1; resetRun(); stepping = { it: allSteps(), seen: [[st.r, st.c]] }; }
    let x = stepping.it.next();
    while (!x.done && x.value.ev === 'turn') x = stepping.it.next();
    if (x.done) { const ok = isWin(g, st); stepping = null; return ok ? win() : fail(null); }
    showStep(x.value, stepping.seen);
    if (STOP.has(x.value.ev)) { stepping = null; fail(x.value.ev); }
  };

  const fail = (ev) => {
    running = false;
    const left = [];
    const need = (t) => g.targets.filter((x, i) => x.t === t && !(st.done & (1 << i))).length;
    if (need('C')) left.push(`полить грядки: ${need('C')}`);
    if (need('B')) left.push(`собрать детали: ${need('B')}`);
    const undelivered = g.targets.filter((x) => x.t === 'I').length - st.delivered;
    if (undelivered) left.push(`доставить посылки: ${undelivered}`);
    if (g.exit && !(st.r === g.exit[0] && st.c === g.exit[1])) left.push('доехать до флажка 🏁');
    const possible = solve(g, m, robot);
    const why = ev ? EV_TEXT[ev] : `Программа закончилась. Осталось: ${left.join(', ')}.`;
    mission(`${why}${possible ? ' Поправь программу и запусти ещё раз.' : ' С этими деталями здесь не пройти, загляни в мастерскую 🔧'}`);
    if (ev) el.querySelector('.rb-bot')?.classList.add('oops');
  };

  const win = () => {
    const par = solve(g, m, robot)?.length || program.length;
    const n = program.length;
    const stars = starsFor(n, par);
    best[m.id] = best[m.id] ? Math.min(best[m.id], n) : n;
    el.innerHTML = `<div class="g-end">
      <div class="rb-stage"><div class="ws-bot dance">${robotSVG(robot, 170, 'cheer')}</div></div>
      <h2>Миссия выполнена!</h2>
      <div class="rb-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <p class="g-end-note">В программе ${n} ${word(n)}. ${n <= par ? 'Это самая короткая программа, какую знает Медок!' : `Медок знает решение из ${par}. Попробуешь короче? Подсказка: «➡ 3» это одна команда, а «➡ 1, ➡ 1, ➡ 1» почти то же, но нажимай стрелку подряд, и шаги склеятся.`}</p>
      <div class="k-meaning">${hero('medok', 'cheer', 64)}<p>Робот делает ровно то, что написано в программе. Поэтому программисты сначала думают, а потом проверяют, как настоящие детективы.</p></div>
      <div class="g-end-btns"><button type="button" class="pill-btn" data-again>Ещё раз</button><button type="button" class="pill-btn ghost" data-back>К миссиям</button></div></div>`;
    onFinish?.({ g: 'robot', mode: 'solo', mission: m.id, scores: [n], of: par, stars });
  };

  const hint = () => {
    const sim = simulate(g, m, robot, program);
    if (sim.fail) return mission(`Сначала поправь программу: на команде ${sim.at + 1} робот останавливается.`);
    const rest = solve(g, m, robot, sim.s);
    if (!rest) return mission('Отсюда не дойти. Попробуй убрать последние команды.');
    if (!rest.length) return mission('Программа уже готова, запускай!');
    hints++;
    const p = rest[0];
    return mission(`💡 Следующая команда: ${p.c === 'A' ? `${ACT[robot.tool][0]} ${ACT[robot.tool][1].toLowerCase()}` : `${DIR[p.d].arrow} ${DIR[p.d].word} на ${p.n}`}.`);
  };

  const addMove = (d) => {
    const last = program[program.length - 1];
    if (sel < 0 && last && last.c === 'M' && last.d === d && last.n < 9) last.n++;
    else if (program.length >= 30) return mission('Слишком длинная программа. Нажимай стрелку подряд: шаги склеятся в одну команду.');
    else program.push({ c: 'M', d, n: 1 });
    sel = -1;
    resetRun();
    mission();
  };

  el.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-exit]')) return stop();
    if (t.closest('[data-back]')) { running = false; clearTimeout(peekTm); return hub(); }
    if (t.closest('[data-workshop]')) return workshop();
    const tb = t.closest('[data-tab]');
    if (tb) { tab = tb.dataset.tab; return workshop(); }
    const pt = t.closest('[data-part]');
    if (pt) {
      robot[pt.dataset.part] = pt.dataset.id;
      onRobot?.({ ...robot });
      const y = el.scrollTop;
      workshop();
      el.scrollTop = y;
      el.querySelector('.ws-bot')?.classList.add('pop');
      return;
    }
    const mi = t.closest('[data-mission]');
    if (mi) return startMission(mi.dataset.mission);
    if (t.closest('[data-again]')) return startMission(m.id);
    if (!m || running) return;
    const d = t.closest('[data-dir]');
    if (d) return addMove(d.dataset.dir);
    if (t.closest('[data-act]')) {
      if (program.length >= 30) return mission('Слишком длинная программа.');
      program.push({ c: 'A' }); sel = -1; resetRun(); return mission();
    }
    const ch = t.closest('[data-chip]');
    if (ch) { sel = sel === +ch.dataset.chip ? -1 : +ch.dataset.chip; return mission(); }
    const ed = t.closest('[data-ed]');
    if (ed && program[sel]) {
      const v = ed.dataset.ed;
      if (v === 'del') { program.splice(sel, 1); sel = -1; } else if (v === 'ok') sel = -1;
      else program[sel].n = Math.max(1, Math.min(9, program[sel].n + +v));
      resetRun();
      return mission();
    }
    if (t.closest('[data-undo]')) {
      const last = program[program.length - 1];
      if (last?.c === 'M' && last.n > 1) last.n--; else program.pop();
      sel = -1; resetRun(); return mission();
    }
    if (t.closest('[data-clear]')) { program = []; sel = -1; resetRun(); return mission(); }
    if (t.closest('[data-peek]')) { peek(); return mission('Смотри и запоминай!'); }
    if (t.closest('[data-hint]')) return hint();
    if (t.closest('[data-step]')) return step();
    if (t.closest('[data-run]')) return run();
  });
  el.addEventListener('input', (ev) => {
    if (ev.target.matches('[data-name]')) { robot.name = ev.target.value.trim() || 'Робот'; onRobot?.({ ...robot }); }
  });
  const onKey = (ev) => {
    if (ev.key === 'Escape') return stop();
    if (!m || running || ev.target.matches?.('input')) return;
    const k = { ArrowUp: 'N', ArrowDown: 'S', ArrowLeft: 'W', ArrowRight: 'E' }[ev.key];
    if (k) { ev.preventDefault(); addMove(k); }
    if (ev.key === ' ') { ev.preventDefault(); el.querySelector('[data-act]')?.click(); }
    if (ev.key === 'Enter') el.querySelector('[data-run]')?.click();
    if (ev.key === 'Backspace') el.querySelector('[data-undo]')?.click();
  };
  document.addEventListener('keydown', onKey);
  hub();
}
