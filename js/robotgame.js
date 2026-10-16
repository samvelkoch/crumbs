// Игра «Робот»: мастерская (собрать робота из деталей) и миссии, где робот буквально
// выполняет программу из команд. Логика и правила в robot.js, здесь только экран.

import { esc, layer, closeLayer, reduced } from './games.js';
import { PARTS, MISSIONS, parseMission, initState, runCommand, isWin, simulate, solve, robotSVG, FLY_ENERGY } from './robot.js';

const CELL_EMOJI = { '#': '🧱', '~': '🌊', '^': '🪨', '%': '🟫', E: '🏁', C: '🥕', I: '📦', H: '🏠', B: '🔩' };
const ARROW = { N: 0, E: 90, S: 180, W: 270 };
const ACT_LABEL = { can: 'Полить', claw: 'Взять / отдать', basket: 'Взять / отдать', magnet: 'Собрать' };
const EV_TEXT = {
  watered: '💦 Полито!', picked: '📦 Взял!', delivered: '🏠 Доставлено!', collected: '🔩 Есть!', nothing: '🤷 Здесь нечего делать',
  full: 'Руки заняты, сначала отнеси посылку домой', stay: 'Впереди преграда, ехать некуда',
  wall: 'Бам! Впереди стена.', water: 'Плюх! По воде может только летающий робот.', rock: 'Камень мешает. Ноги или пропеллер его прошли бы.',
  mud: 'Колёса застряли в грязи!', energy: 'Заряд кончился, робот приземлился.',
};
const STOP = new Set(['wall', 'water', 'rock', 'mud', 'energy']);
const part = (kind, id) => PARTS[kind].find((p) => p.id === id);
const starsFor = (n, par) => (n <= par ? 3 : n <= par + 3 ? 2 : 1);

// robot: { name, head, move, tool, color }; best: { missionId: команд }
export function playRobot({ robot, best = {}, hero, onRobot, onFinish }) {
  const el = layer('robot');
  robot = { ...robot };
  best = { ...best };
  let m = null;
  let g = null;
  let program = [];
  let st = null;
  let running = false;
  let hints = 0;
  let peekTm = 0;
  let showMap = true;
  const stop = () => { running = false; clearTimeout(peekTm); document.removeEventListener('keydown', onKey); closeLayer(el); };
  const head = (title, sub, back = true) => `<div class="g-head"><button type="button" class="g-close" ${back ? 'data-back' : 'data-exit'} aria-label="${back ? 'Назад' : 'Выйти'}">${back ? '←' : '✕'}</button>
    <div class="g-title">${title}</div><div class="g-hint">${sub}</div></div>`;
  const unlocked = (i) => i < 3 || MISSIONS.slice(0, i).filter((x) => best[x.id]).length >= i - 1;

  // ------------------------------------------------ главная: робот и миссии
  const hub = () => {
    const doneN = MISSIONS.filter((x) => best[x.id]).length;
    el.innerHTML = `${head('Робот', 'Собери робота и запрограммируй его', false)}
      <div class="k-wrap">
        <div class="rb-hub"><div class="rb-me">${robotSVG(robot, 120)}</div>
          <div><b class="rb-name">${esc(robot.name)}</b>
            <div class="small muted">${[part('head', robot.head), part('move', robot.move), part('tool', robot.tool)].map((p) => `${p.emoji} ${p.label}`).join(' · ')}</div>
            <button type="button" class="pill-btn soft" data-workshop>🔧 Мастерская</button></div></div>
        <div class="k-cap">Миссии · пройдено ${doneN} из ${MISSIONS.length}</div>
        <div class="rb-missions">${MISSIONS.map((x, i) => {
          const open = unlocked(i);
          const b = best[x.id];
          const par = b ? solve(parseMission(x), x, robot)?.length : null;
          return `<button type="button" class="rb-mission ${open ? '' : 'locked'}" ${open ? `data-mission="${x.id}"` : 'disabled'}>
            <span class="rb-me2">${open ? x.emoji : '🔒'}</span><b>${i + 1}. ${esc(x.title)}</b>
            <span class="small muted">${b ? `${'⭐'.repeat(par ? starsFor(b, par) : 1)} · ${b} ${b === 1 ? 'команда' : b < 5 ? 'команды' : 'команд'}` : open ? esc(x.task) : 'Пройди предыдущие'}</span></button>`;
        }).join('')}</div>
      </div>`;
  };

  // ------------------------------------------------ мастерская
  const workshop = () => {
    const row = (kind, title) => `<div class="rb-sec"><div class="k-cap">${title}</div><div class="rb-opts">${PARTS[kind].map((p) => `
      <button type="button" class="rb-opt ${robot[kind] === p.id ? 'on' : ''}" data-part="${kind}" data-id="${p.id}" aria-pressed="${robot[kind] === p.id}">
        <span>${p.emoji}</span><b>${p.label}</b><small>${esc(p.perk)}</small></button>`).join('')}</div></div>`;
    el.innerHTML = `${head('Мастерская', 'Каждая деталь что-то умеет. Выбирай под миссию')}
      <div class="k-wrap">
        <div class="rb-preview">${robotSVG(robot, 170)}</div>
        <label class="rb-namefield">Имя робота <input type="text" maxlength="16" value="${esc(robot.name)}" data-name></label>
        ${row('move', '🦿 Чем передвигается')}${row('tool', '🛠️ Что в руке')}${row('head', '🤖 Голова')}
        <div class="rb-sec"><div class="k-cap">🎨 Цвет</div><div class="rb-colors">${PARTS.color.map((p) => `<button type="button" class="rb-color ${robot.color === p.id ? 'on' : ''}" style="background:${p.id}" data-part="color" data-id="${p.id}" aria-label="${p.label}"></button>`).join('')}</div></div>
        <div class="s-foot"><button type="button" class="pill-btn" data-back>Готово!</button></div>
      </div>`;
  };

  // ------------------------------------------------ миссия: карта и программа
  const startMission = (id) => {
    m = MISSIONS.find((x) => x.id === id);
    g = parseMission(m);
    program = [];
    hints = 0;
    resetRun();
    showMap = !(m.dark && robot.head !== 'lamp');
    if (!showMap) peek();
    mission();
  };
  const resetRun = () => { st = initState(g, m, robot); running = false; };
  const peek = () => {
    showMap = true;
    clearTimeout(peekTm);
    peekTm = setTimeout(() => { showMap = false; if (m && !running) mission('Карта погасла. Помнишь дорогу?'); }, 5000);
  };

  const mapHTML = (trail = []) => {
    const seenCells = new Set(trail.map(([r, c]) => `${r},${c}`));
    const near = (r, c) => Math.abs(r - st.r) + Math.abs(c - st.c) <= 1;
    const dark = m.dark && robot.head !== 'lamp' && !showMap;
    return `<div class="rb-map" style="--w:${g.w};--h:${g.h}">
      ${g.cells.map((row, r) => row.map((ch, c) => {
        const ti = g.targets.findIndex((t) => t.r === r && t.c === c);
        const doneT = ti >= 0 && st.done & (1 << ti);
        let e = CELL_EMOJI[ch] || '';
        if (doneT && ch !== 'C') e = '';
        const hidden = dark && !near(r, c) && !seenCells.has(`${r},${c}`);
        return `<div class="rb-cell t-${ch === '#' ? 'wall' : ch === '~' ? 'water' : ch === '%' ? 'mud' : 'floor'} ${hidden ? 'dark' : ''}">${hidden ? '' : e}${doneT && ch === 'C' ? '<i class="rb-badge">💦</i>' : ''}${ch === 'H' && st.delivered ? `<i class="rb-badge">${st.delivered}</i>` : ''}${!hidden && trail.length && seenCells.has(`${r},${c}`) && !(r === g.start[0] && c === g.start[1]) ? '<i class="rb-dot"></i>' : ''}</div>`;
      }).join('')).join('')}
      <div class="rb-bot" style="--r:${st.r};--c:${st.c}">${robotSVG(robot, 40)}<i class="rb-arrow" style="transform:rotate(${ARROW[st.d]}deg)">▲</i>${st.carry ? `<i class="rb-carry">📦${st.carry > 1 ? st.carry : ''}</i>` : ''}</div>
    </div>`;
  };

  const chipHTML = (p, k, cur) => {
    const sym = { F: '⬆', L: '↺', R: '↻', A: '✋', U: '⏩' }[p.c];
    return `<button type="button" class="rb-chip ${k === cur ? 'cur' : ''}" data-del="${k}" ${running ? 'disabled' : ''} aria-label="Убрать команду ${k + 1}">${sym}${p.n > 1 ? `<small>×${p.n}</small>` : ''}</button>`;
  };

  const mission = (msg = '', cur = -1) => {
    const preview = robot.head === 'camera' && !running && program.length ? simulate(g, m, robot, program).trail : [];
    const energy = robot.move === 'fly' ? `<span class="rb-energy">🔋 ${Number.isFinite(st.energy) ? st.energy : FLY_ENERGY}</span>` : '';
    el.innerHTML = `${head(`${m.emoji} ${esc(m.title)}`, esc(m.task))}
      <div class="k-wrap rb-wrap">
        ${mapHTML(preview)}
        <div class="k-say show rb-say" data-say>${esc(msg || (m.tip && !program.length ? `Совет: ${m.tip}` : 'Нажимай команды, потом «Запустить».'))} ${energy}</div>
        <div class="rb-prog" aria-label="Программа">${program.length ? program.map((p, k) => chipHTML(p, k, cur)).join('') : '<span class="small muted">Программа пустая</span>'}</div>
        <div class="rb-pal">
          <button type="button" class="rb-cmd" data-cmd="F" ${running ? 'disabled' : ''}>⬆<span>Вперёд</span></button>
          <button type="button" class="rb-cmd" data-cmd="L" ${running ? 'disabled' : ''}>↺<span>Налево</span></button>
          <button type="button" class="rb-cmd" data-cmd="R" ${running ? 'disabled' : ''}>↻<span>Направо</span></button>
          <button type="button" class="rb-cmd" data-cmd="A" ${running ? 'disabled' : ''}>✋<span>${ACT_LABEL[robot.tool]}</span></button>
          ${robot.move === 'wheels' ? `<button type="button" class="rb-cmd" data-cmd="U" ${running ? 'disabled' : ''}>⏩<span>До упора</span></button>` : ''}
        </div>
        <div class="rb-mult">${[2, 3, 4, 5].map((n) => `<button type="button" class="rb-x" data-mult="${n}" ${running ? 'disabled' : ''}>×${n}</button>`).join('')}<span class="small muted">повторить последнюю</span></div>
        <div class="s-foot">
          <button type="button" class="pill-btn ghost" data-undo ${running ? 'disabled' : ''}>⌫</button>
          <button type="button" class="pill-btn ghost" data-clear ${running ? 'disabled' : ''}>🗑</button>
          ${m.dark && robot.head !== 'lamp' ? `<button type="button" class="pill-btn ghost" data-peek ${running ? 'disabled' : ''}>👀 Карта</button>` : ''}
          ${robot.head === 'brain' ? `<button type="button" class="pill-btn ghost" data-hint ${running || hints >= 3 ? 'disabled' : ''}>💡 ${3 - hints}</button>` : ''}
          <button type="button" class="pill-btn" data-run ${running || !program.length ? 'disabled' : ''}>▶ Запустить</button>
        </div>
      </div>`;
  };

  const wait = (ms) => new Promise((res) => setTimeout(res, reduced() ? 40 : ms));

  const run = async () => {
    resetRun();
    running = true;
    const seen = [[st.r, st.c]];
    mission('Поехали!', 0);
    for (let k = 0; k < program.length; k++) {
      for (const x of runCommand(g, robot, st, program[k])) {
        if (!running) return;
        st = x.s;
        if (x.ev === null) seen.push([st.r, st.c]);
        // карту перерисовываем целиком: она маленькая
        mission(EV_TEXT[x.ev] || (x.ev === 'notool' ? `Нечем это сделать: нужен инструмент «${part('tool', x.need).label}»` : `Команда ${k + 1} из ${program.length}`), k);
        el.querySelector('.rb-map')?.replaceWith(htmlNode(mapHTML(m.dark ? seen : [])));
        if (STOP.has(x.ev)) { await wait(400); return fail(x.ev); }
        await wait(x.ev === 'turn' ? 260 : x.ev === null ? 380 : 650);
      }
    }
    running = false;
    if (isWin(g, st)) return win();
    return fail(null);
  };
  const htmlNode = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };

  const fail = (ev) => {
    running = false;
    const left = [];
    const need = (t) => g.targets.filter((x, i) => x.t === t && !(st.done & (1 << i))).length;
    if (need('C')) left.push(`полить грядки: ${need('C')}`);
    if (need('B')) left.push(`собрать детали: ${need('B')}`);
    const undelivered = g.targets.filter((x) => x.t === 'I').length - st.delivered;
    if (undelivered) left.push(`доставить посылки: ${undelivered}`);
    if (g.exit && !(st.r === g.exit[0] && st.c === g.exit[1])) left.push('доехать до флажка');
    const possible = solve(g, m, robot);
    const why = ev ? EV_TEXT[ev] : `Программа закончилась. Осталось: ${left.join(', ')}.`;
    mission(`${why}${possible ? ' Исправь программу и попробуй ещё раз.' : ' С этими деталями здесь не пройти, загляни в мастерскую 🔧'}`);
  };

  const win = () => {
    const par = solve(g, m, robot)?.length || program.length;
    const n = program.length;
    const stars = starsFor(n, par);
    const prev = best[m.id];
    best[m.id] = prev ? Math.min(prev, n) : n;
    el.innerHTML = `<div class="g-end">
      <div class="rb-preview">${robotSVG(robot, 150)}</div>
      <h2>Миссия выполнена!</h2>
      <div class="rb-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <p class="g-end-note">В твоей программе ${n} ${n === 1 ? 'команда' : n < 5 ? 'команды' : 'команд'}. ${n <= par ? 'Это самая короткая программа, какую знает Медок!' : `Медок знает решение из ${par}. Попробуешь короче? Подсказка: повторы ×2, ×3 экономят команды.`}</p>
      <div class="k-meaning">${hero('medok', 'cheer', 64)}<p>Программисты тоже сначала пишут длинно, а потом ищут, как короче. Главное, что робот сделал ровно то, что ты сказала.</p></div>
      <div class="g-end-btns"><button type="button" class="pill-btn" data-again>Ещё раз</button><button type="button" class="pill-btn ghost" data-back>К миссиям</button></div></div>`;
    onFinish?.({ g: 'robot', mode: 'solo', mission: m.id, scores: [n], of: par, stars });
  };

  const hint = () => {
    const sim = simulate(g, m, robot, program);
    if (sim.fail) return mission(`Сначала исправь программу: на команде ${sim.at + 1} робот останавливается.`);
    const rest = solve(g, m, robot, sim.s);
    if (!rest) return mission('Из этого места не дойти. Попробуй стереть последние команды.');
    if (!rest.length) return mission('Программа уже готова, запускай!');
    hints++;
    const p = rest[0];
    const names = { F: 'вперёд', L: 'налево', R: 'направо', A: ACT_LABEL[robot.tool].toLowerCase(), U: 'до упора' };
    return mission(`💡 Следующая команда: ${names[p.c]}${p.n > 1 ? ` ×${p.n}` : ''}.`);
  };

  el.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-exit]')) return stop();
    if (t.closest('[data-back]')) { running = false; clearTimeout(peekTm); m = null; return hub(); }
    if (t.closest('[data-workshop]')) return workshop();
    const pt = t.closest('[data-part]');
    if (pt) {
      robot[pt.dataset.part] = pt.dataset.id;
      onRobot?.({ ...robot });
      const y = el.scrollTop;
      workshop();
      el.scrollTop = y;
      return;
    }
    const mi = t.closest('[data-mission]');
    if (mi) return startMission(mi.dataset.mission);
    if (t.closest('[data-again]')) return startMission(m.id);
    if (!m || running) return;
    const cmd = t.closest('[data-cmd]');
    if (cmd) {
      if (program.length >= 40) return mission('Слишком длинная программа. Попробуй повторы ×2, ×3.');
      const c = cmd.dataset.cmd;
      const last = program[program.length - 1];
      // два одинаковых шага подряд склеиваем в повтор: так программа короче
      if (last && last.c === c && 'FLR'.includes(c) && (last.n || 1) < 9) last.n = (last.n || 1) + 1;
      else program.push({ c, n: 1 });
      resetRun();
      return mission();
    }
    const mu = t.closest('[data-mult]');
    if (mu) {
      const last = program[program.length - 1];
      if (!last || last.c === 'U') return mission('Сначала добавь команду, которую нужно повторить.');
      last.n = +mu.dataset.mult;
      resetRun();
      return mission();
    }
    const del = t.closest('[data-del]');
    if (del) { program.splice(+del.dataset.del, 1); resetRun(); return mission(); }
    if (t.closest('[data-undo]')) { program.pop(); resetRun(); return mission(); }
    if (t.closest('[data-clear]')) { program = []; resetRun(); return mission(); }
    if (t.closest('[data-peek]')) { peek(); return mission('Смотри и запоминай!'); }
    if (t.closest('[data-hint]')) return hint();
    if (t.closest('[data-run]')) return run();
  });
  el.addEventListener('input', (ev) => {
    if (ev.target.matches('[data-name]')) { robot.name = ev.target.value.trim() || 'Робот'; onRobot?.({ ...robot }); }
  });
  const onKey = (ev) => {
    if (ev.key === 'Escape') stop();
    if (!m || running || ev.target.matches?.('input')) return;
    const k = { ArrowUp: 'F', ArrowLeft: 'L', ArrowRight: 'R', ' ': 'A' }[ev.key];
    if (k) { ev.preventDefault(); el.querySelector(`[data-cmd="${k}"]`)?.click(); }
    if (ev.key === 'Enter') el.querySelector('[data-run]')?.click();
    if (ev.key === 'Backspace') el.querySelector('[data-undo]')?.click();
  };
  document.addEventListener('keydown', onKey);
  hub();
}
