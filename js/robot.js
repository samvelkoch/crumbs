// Робот: детали, миссии и правила. Чистая логика без DOM: её же используют поиск
// лучшего решения (par) и подсказки, поэтому робот на экране и в расчётах ведёт себя одинаково.

export const PARTS = {
  head: [
    { id: 'face', emoji: '😊', label: 'Экран-лицо', perk: 'Показывает настроение робота. Просто красиво!' },
    { id: 'brain', emoji: '🧠', label: 'Умная голова', perk: 'Даёт до трёх подсказок в миссии' },
    { id: 'lamp', emoji: '🔦', label: 'Фонарь', perk: 'Видит в тёмных миссиях' },
    { id: 'antenna', emoji: '📡', label: 'Антенна', perk: 'Можно запускать программу по одному шагу' },
  ],
  move: [
    { id: 'wheels', emoji: '🛞', label: 'Колёса', perk: 'Самые быстрые, но только по ровному: в грязи вязнут, камни не берут' },
    { id: 'legs', emoji: '🦿', label: 'Ноги', perk: 'Перешагивают камни и грязь' },
    { id: 'tracks', emoji: '🐛', label: 'Гусеницы', perk: 'Проходят грязь' },
    { id: 'fly', emoji: '🚁', label: 'Пропеллер', perk: 'Летает над водой и камнями, но заряда хватает на 16 клеток' },
  ],
  tool: [
    { id: 'can', emoji: '💧', label: 'Лейка', perk: 'Поливает грядки' },
    { id: 'claw', emoji: '🦾', label: 'Клешня', perk: 'Берёт одну посылку' },
    { id: 'basket', emoji: '🧺', label: 'Корзина', perk: 'Берёт до трёх посылок' },
    { id: 'magnet', emoji: '🧲', label: 'Магнит', perk: 'Собирает железные детали' },
  ],
  color: [
    { id: '#f97316', label: 'Оранжевый' }, { id: '#8b5cf6', label: 'Фиолетовый' }, { id: '#22c55e', label: 'Зелёный' },
    { id: '#3b82f6', label: 'Синий' }, { id: '#ec4899', label: 'Розовый' }, { id: '#eab308', label: 'Жёлтый' },
  ],
};
export const DEFAULT_ROBOT = { name: 'Болт', head: 'face', move: 'wheels', tool: 'claw', color: '#f97316' };
export const FLY_ENERGY = 16;

// Клетки: . пол, # стена, ~ вода, ^ камень, % грязь, S старт, E финиш,
// C грядка (полить), I посылка (взять), H дом (отдать посылки), B железная деталь (магнитом)
export const MISSIONS = [
  { id: 'r1', emoji: '🏁', title: 'Первый выезд', task: 'Доедь до флажка.', dir: 'E', map: ['S....', '####.', '.....', '.####', '....E'] },
  { id: 'r2', emoji: '🌀', title: 'Лабиринт', task: 'Найди выход из лабиринта.', dir: 'E',
    map: ['S.#....', '#.#.##.', '#...#..', '###.#.#', '#...#..', '#.###.#', '#.....E'] },
  { id: 'r3', emoji: '📦', title: 'Доставка продуктов', task: 'Возьми пакет с продуктами и отнеси домой.', dir: 'E', tools: ['claw', 'basket'],
    map: ['S...#..', '.##.#.H', '.#I.#..', '.#..#..', '.####..', '.......'] },
  { id: 'r4', emoji: '🥕', title: 'Полей морковь', task: 'Полей все три грядки с морковью.', dir: 'E', tools: ['can'],
    map: ['S..C...', '.#####.', '.C...#.', '.###.#.', '...#C..'] },
  { id: 'r5', emoji: '🌊', title: 'Через реку', task: 'Доберись до флажка на том берегу.', dir: 'E', tip: 'Летающему роботу путь короче.',
    map: ['S..~...', '...~...', '...~..E', '...~...', '.......'] },
  { id: 'r6', emoji: '🪨', title: 'Каменистая тропа', task: 'Доберись до флажка.', dir: 'E', tip: 'Ноги перешагивают камни.',
    map: ['S.^^^.E', '.#####.', '.......'] },
  { id: 'r7', emoji: '🟫', title: 'Болото', task: 'Доберись до флажка.', dir: 'E', tip: 'Колёса в грязи застревают, а гусеницы и ноги нет.',
    map: ['S%%%%%.', '.#####%', '.....#E', '####.#.', '.......'] },
  { id: 'r8', emoji: '🔩', title: 'Магнитная уборка', task: 'Собери три железные детали и приедь к флажку.', dir: 'E', tools: ['magnet'],
    map: ['S..#B..', '.#.#.#.', '.#B..#.', '.#####.', 'B.....E'] },
  { id: 'r9', emoji: '🌙', title: 'Ночной лабиринт', task: 'Выберись из тёмного лабиринта. Карта видна пять секунд, запоминай!', dir: 'E', dark: true,
    tip: 'С фонарём видно всё.', map: ['S...#..', '###.#.#', '....#..', '.####.#', '...#...', '.#.#.#.', '.#...#E'] },
  { id: 'r10', emoji: '🚚', title: 'Большая доставка', task: 'Отнеси домой все три посылки.', dir: 'E', tools: ['claw', 'basket'], tip: 'В корзину помещается три посылки сразу.',
    map: ['I.....H', '.#.#.#.', 'S..I..I'] },
  { id: 'r11', emoji: '🌱', title: 'Сад за рекой', task: 'Полей обе грядки на том берегу.', dir: 'E', tools: ['can'],
    map: ['S.~~.C.', '..~~...', '..~~.C.', '.......'] },
  { id: 'r12', emoji: '🎓', title: 'Большой экзамен', task: 'Доберись до флажка через всё сразу.', dir: 'S',
    map: ['S.#~~~E', '..#~#..', '..^.#%.', '#.#.#%#', '..%...#', '.###.##', '.......'] },
];

const DIRS = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };

export function parseMission(m) {
  const cells = m.map.map((row) => row.split(''));
  const out = { h: cells.length, w: cells[0].length, cells, start: null, exit: null, targets: [], home: null };
  cells.forEach((row, r) => row.forEach((ch, c) => {
    if (ch === 'S') out.start = [r, c];
    else if (ch === 'E') out.exit = [r, c];
    else if (ch === 'H') out.home = [r, c];
    if ('CIB'.includes(ch)) out.targets.push({ r, c, t: ch });
  }));
  return out;
}

export function initState(g, m, robot) {
  return { r: g.start[0], c: g.start[1], d: m.dir, done: 0, carry: 0, delivered: 0, energy: robot.move === 'fly' ? FLY_ENERGY : Infinity };
}

const targetIdx = (g, r, c) => g.targets.findIndex((t) => t.r === r && t.c === c);

// почему робот не может войти в клетку (или null, если может)
export function blocker(ch, move) {
  if (ch === undefined || ch === '#') return 'wall';
  if (ch === '~' && move !== 'fly') return 'water';
  if (ch === '^' && move !== 'legs' && move !== 'fly') return 'rock';
  if (ch === '%' && move === 'wheels') return 'mud';
  return null;
}

// Один шаг вперёд. Возвращает { s, ev }: ev = null (ок) или причина остановки.
function forward(g, robot, s) {
  if (s.energy <= 0) return { s, ev: 'energy' };
  const [dr, dc] = DIRS[s.d];
  const r = s.r + dr;
  const c = s.c + dc;
  const ch = g.cells[r]?.[c];
  const b = blocker(ch, robot.move);
  if (b) return { s, ev: b, at: [r, c] };
  return { s: { ...s, r, c, energy: s.energy - 1 }, ev: null };
}

function act(g, robot, s) {
  const i = targetIdx(g, s.r, s.c);
  const bit = 1 << i;
  if (i >= 0 && !(s.done & bit)) {
    const t = g.targets[i].t;
    if (t === 'C') return robot.tool === 'can' ? { s: { ...s, done: s.done | bit }, ev: 'watered' } : { s, ev: 'notool', need: 'can' };
    if (t === 'B') return robot.tool === 'magnet' ? { s: { ...s, done: s.done | bit }, ev: 'collected' } : { s, ev: 'notool', need: 'magnet' };
    if (t === 'I') {
      const cap = robot.tool === 'basket' ? 3 : robot.tool === 'claw' ? 1 : 0;
      if (!cap) return { s, ev: 'notool', need: 'claw' };
      if (s.carry >= cap) return { s, ev: 'full' };
      return { s: { ...s, done: s.done | bit, carry: s.carry + 1 }, ev: 'picked' };
    }
  }
  if (g.home && s.r === g.home[0] && s.c === g.home[1] && s.carry) {
    return { s: { ...s, delivered: s.delivered + s.carry, carry: 0 }, ev: 'delivered' };
  }
  return { s, ev: 'nothing' };
}

// Команда программы -> последовательность элементарных шагов с событиями.
// { c: 'M', d: 'N'|'E'|'S'|'W', n } — повернуться в сторону карты и пройти n клеток; { c: 'A' } — действие.
export function* runCommand(g, robot, s, cmd) {
  if (cmd.c === 'M') {
    if (s.d !== cmd.d) { s = { ...s, d: cmd.d }; yield { s, ev: 'turn' }; }
    for (let i = 0; i < (cmd.n || 1); i++) { const x = forward(g, robot, s); s = x.s; yield x; if (x.ev) return; }
  } else if (cmd.c === 'A') {
    yield act(g, robot, s);
  }
}

// План на карте без учёта препятствий: куда ребёнок хочет отправить робота
export function plannedPath(g, program) {
  let [r, c] = g.start;
  const pts = [[r, c]];
  const acts = [];
  for (const p of program) {
    if (p.c === 'A') { acts.push([r, c]); continue; }
    const [dr, dc] = DIRS[p.d];
    for (let i = 0; i < p.n; i++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= g.h || nc >= g.w) break;
      r = nr; c = nc;
      pts.push([r, c]);
    }
  }
  return { pts, acts };
}

const STOP = new Set(['wall', 'water', 'rock', 'mud', 'energy']);
const allBits = (g) => (1 << g.targets.length) - 1;
const items = (g) => g.targets.filter((t) => t.t === 'I').length;

export function isWin(g, s) {
  if (s.done !== allBits(g) || s.delivered !== items(g)) return false;
  return !g.exit || (s.r === g.exit[0] && s.c === g.exit[1]);
}

// Выполнить программу целиком (без анимации)
export function simulate(g, m, robot, program) {
  let s = initState(g, m, robot);
  const trail = [[s.r, s.c]];
  for (let k = 0; k < program.length; k++) {
    for (const x of runCommand(g, robot, s, program[k])) {
      s = x.s;
      if (x.ev === null) trail.push([s.r, s.c]);
      if (STOP.has(x.ev)) return { s, trail, fail: x.ev, at: k, win: false };
    }
  }
  return { s, trail, fail: null, win: isWin(g, s) };
}

const BFS_CMDS = ['N', 'E', 'S', 'W'].flatMap((d) => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ c: 'M', d, n }))).concat([{ c: 'A' }]);

// Самая короткая программа (в командах: «➡ ×3» считается одной командой) из состояния s.
export function solve(g, m, robot, s0 = initState(g, m, robot)) {
  const cmds = BFS_CMDS;
  const key = (s) => `${s.r},${s.c},${s.done},${s.carry},${s.delivered},${s.energy}`;
  const seen = new Map([[key(s0), null]]);
  let frontier = [s0];
  if (isWin(g, s0)) return [];
  for (let depth = 0; depth < 40 && frontier.length; depth++) {
    const next = [];
    for (const s of frontier) {
      for (const cmd of cmds) {
        let t = s;
        let bad = false;
        let changed = false;
        for (const x of runCommand(g, robot, s, cmd)) {
          t = x.s;
          if (STOP.has(x.ev) || x.ev === 'nothing' || x.ev === 'notool' || x.ev === 'full') { bad = true; break; }
          changed = true;
        }
        if (bad || !changed) continue;
        const k = key(t);
        if (seen.has(k)) continue;
        seen.set(k, { prev: key(s), cmd, s: t });
        if (isWin(g, t)) {
          const path = [];
          for (let cur = k; seen.get(cur); cur = seen.get(cur).prev) path.unshift(seen.get(cur).cmd);
          return path;
        }
        next.push(t);
      }
    }
    frontier = next;
  }
  return null;
}

// ---------------------------------------------------------------- рисунок робота

let uidN = 0;
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
};

// mood: happy | cheer | oops. Робот смотрит на зрителя; flip разворачивает его влево.
export function robotSVG(robot, size = 120, mood = 'happy', flip = false) {
  const id = `rb${++uidN}`;
  const col = robot.color || '#f97316';
  const lite = shade(col, 0.45);
  const deep = shade(col, -0.3);
  const ink = '#1e293b';
  const fly = robot.move === 'fly';
  const lift = fly ? -8 : 0;
  const defs = `<defs>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lite}"/><stop offset=".55" stop-color="${col}"/><stop offset="1" stop-color="${deep}"/></linearGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient>
    <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset=".5" stop-color="#94a3b8"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient>
    <radialGradient id="${id}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#a5f3fc"/><stop offset="1" stop-color="#22d3ee"/></radialGradient>
    <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde047"/><stop offset=".6" stop-color="#fb923c"/><stop offset="1" stop-color="#ef4444" stop-opacity="0"/></linearGradient>
  </defs>`;

  const bottom = {
    wheels: `<rect x="46" y="140" width="68" height="8" rx="4" fill="#64748b"/>
      ${[50, 110].map((x) => `<circle cx="${x}" cy="152" r="18" fill="${ink}"/><circle cx="${x}" cy="152" r="11" fill="url(#${id}m)"/><circle cx="${x}" cy="152" r="4.5" fill="${col}"/>
        ${[0, 60, 120, 180, 240, 300].map((a) => `<rect x="${x - 2}" y="${152 - 18}" width="4" height="5" rx="1" fill="#475569" transform="rotate(${a} ${x} 152)"/>`).join('')}`).join('')}`,
    legs: `${[60, 100].map((x) => `<rect x="${x - 6}" y="140" width="12" height="14" rx="5" fill="url(#${id}m)"/><circle cx="${x}" cy="155" r="6" fill="#64748b"/>
      <rect x="${x - 5}" y="156" width="10" height="8" rx="3" fill="url(#${id}m)"/><path d="M${x - 15} 172 Q${x - 15} 162 ${x} 162 Q${x + 15} 162 ${x + 15} 172 Z" fill="${deep}"/>`).join('')}`,
    tracks: `<rect x="30" y="140" width="100" height="32" rx="16" fill="${ink}"/>
      ${Array.from({ length: 12 }, (_, i) => `<rect x="${36 + i * 8}" y="140" width="4" height="4" rx="1" fill="#475569"/><rect x="${36 + i * 8}" y="168" width="4" height="4" rx="1" fill="#475569"/>`).join('')}
      ${[46, 68, 92, 114].map((x) => `<circle cx="${x}" cy="156" r="${x === 46 || x === 114 ? 10 : 8}" fill="url(#${id}m)"/><circle cx="${x}" cy="156" r="3" fill="${col}"/>`).join('')}`,
    fly: `<path d="M68 138 L92 138 L86 150 L74 150 Z" fill="url(#${id}m)"/><path d="M72 150 L80 172 L88 150 Z" fill="url(#${id}f)"/>`,
  }[robot.move] || '';

  const toolHand = { x: 140, y: 120 };
  const tool = {
    can: `<g transform="translate(130 104)"><path d="M4 10 h22 v18 a6 6 0 0 1 -6 6 h-10 a6 6 0 0 1 -6 -6 z" fill="#3b82f6"/><path d="M8 10 q8 -12 16 0" fill="none" stroke="#1d4ed8" stroke-width="3"/>
      <path d="M26 16 L40 4" stroke="#1d4ed8" stroke-width="4" stroke-linecap="round"/><ellipse cx="42" cy="3" rx="4" ry="5" fill="#60a5fa" transform="rotate(-40 42 3)"/>
      <circle cx="46" cy="10" r="1.6" fill="#7dd3fc"/><circle cx="49" cy="5" r="1.6" fill="#7dd3fc"/><circle cx="45" cy="15" r="1.6" fill="#7dd3fc"/></g>`,
    claw: `<g transform="translate(134 106)"><rect x="0" y="8" width="10" height="12" rx="3" fill="#64748b"/>
      <path d="M8 10 Q22 0 24 12" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/><path d="M8 18 Q22 28 24 16" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/></g>`,
    basket: `<g transform="translate(128 108)"><path d="M10 6 Q20 -8 30 6" fill="none" stroke="#92400e" stroke-width="3"/><path d="M2 8 h36 l-5 22 h-26 z" fill="#d97706"/>
      <path d="M5 15 h30 M7 22 h26" stroke="#92400e" stroke-width="2"/><path d="M14 8 l-1 22 M26 8 l1 22 M20 8 v22" stroke="#b45309" stroke-width="1.5"/></g>`,
    magnet: `<g transform="translate(132 102)"><path d="M2 2 h10 v18 a8 8 0 0 0 16 0 v-18 h10 v18 a18 18 0 0 1 -36 0 z" fill="#ef4444"/>
      <rect x="2" y="0" width="10" height="7" fill="#e2e8f0"/><rect x="28" y="0" width="10" height="7" fill="#e2e8f0"/>
      <path d="M44 6 l5 -3 M45 14 l6 0 M44 22 l5 3" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/></g>`,
  }[robot.tool] || '';

  const headTop = {
    face: `<path d="M80 30 Q82 18 92 14" fill="none" stroke="#64748b" stroke-width="3" stroke-linecap="round"/><circle cx="93" cy="13" r="6" fill="${col}"/><circle cx="91" cy="11" r="2" fill="#fff" opacity=".8"/>`,
    brain: `<path d="M50 40 Q50 10 80 10 Q110 10 110 40 Z" fill="#e0f2fe" opacity=".75" stroke="#7dd3fc" stroke-width="2"/>
      <path d="M58 36 q-2 -14 10 -16 q4 -8 14 -4 q10 -4 14 6 q8 4 4 14 Z" fill="#f9a8d4" stroke="#db2777" stroke-width="1.5"/>
      <path d="M66 28 q6 -6 12 0 q6 6 12 0 M70 34 q5 -4 10 0" fill="none" stroke="#db2777" stroke-width="1.5"/><path d="M60 22 q6 -8 14 -8" stroke="#fff" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>`,
    lamp: `<path d="M80 22 L58 -6 L102 -6 Z" fill="#fef08a" opacity=".55"/><rect x="68" y="20" width="24" height="16" rx="6" fill="#475569"/><circle cx="80" cy="28" r="6.5" fill="#fde047" stroke="#fff" stroke-width="2"/>`,
    antenna: `${[[62, 54, 10], [98, 106, 10]].map(([x0, x1, y]) => `<path d="M${x0} 32 L${x1} ${y}" stroke="#64748b" stroke-width="3" stroke-linecap="round"/><circle cx="${x1}" cy="${y}" r="5.5" fill="#22d3ee"/><circle cx="${x1}" cy="${y}" r="9" fill="none" stroke="#22d3ee" stroke-width="1.5" opacity=".5"/>`).join('')}`,
  }[robot.head] || '';

  const prop = fly ? `<rect x="77" y="2" width="6" height="28" rx="3" fill="#64748b"/>
    <ellipse cx="56" cy="2" rx="28" ry="5" fill="#94a3b8" opacity=".85"/><ellipse cx="104" cy="2" rx="28" ry="5" fill="#94a3b8" opacity=".85"/>
    <ellipse cx="80" cy="2" rx="52" ry="7" fill="none" stroke="#cbd5e1" stroke-width="1.5" opacity=".6"/><circle cx="80" cy="2" r="6" fill="${col}"/>` : '';

  // глаза на экране-визоре
  const eye = (x) => (mood === 'cheer'
    ? `<path d="M${x - 9} 66 Q${x} 54 ${x + 9} 66" fill="none" stroke="url(#${id}g)" stroke-width="5" stroke-linecap="round"/>`
    : mood === 'oops'
      ? `<path d="M${x - 7} 56 l14 12 M${x + 7} 56 l-14 12" stroke="url(#${id}g)" stroke-width="4.5" stroke-linecap="round"/>`
      : `<rect x="${x - 7}" y="53" width="14" height="18" rx="7" fill="url(#${id}g)"/><circle cx="${x - 2}" cy="58" r="2.6" fill="#fff"/>`);
  const mouth = mood === 'oops'
    ? '<path d="M72 80 q8 -5 16 0" fill="none" stroke="#67e8f9" stroke-width="3" stroke-linecap="round"/>'
    : '<path d="M71 77 q9 8 18 0" fill="none" stroke="#67e8f9" stroke-width="3" stroke-linecap="round"/>';

  const svg = `${defs}
    <ellipse cx="80" cy="176" rx="${fly ? 30 : 44}" ry="${fly ? 4 : 6}" fill="#0f172a" opacity="${fly ? 0.1 : 0.16}"/>
    <g transform="translate(0 ${lift})">
      ${bottom}
      <path d="M44 118 Q24 118 22 136" fill="none" stroke="url(#${id}m)" stroke-width="10" stroke-linecap="round"/><circle cx="22" cy="138" r="8" fill="#64748b"/>
      <path d="M116 118 Q132 116 ${toolHand.x - 4} ${toolHand.y}" fill="none" stroke="url(#${id}m)" stroke-width="10" stroke-linecap="round"/>
      <rect x="40" y="94" width="80" height="50" rx="22" fill="url(#${id}b)"/>
      <ellipse cx="62" cy="104" rx="14" ry="5" fill="#fff" opacity=".35"/>
      <circle cx="80" cy="120" r="11" fill="#fff" opacity=".85"/><path d="M80 113 v6 M74 116 a8 8 0 1 0 12 0" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="72" y="86" width="16" height="10" rx="3" fill="url(#${id}m)"/>
      ${prop}${headTop}
      <circle cx="36" cy="62" r="7" fill="${col}"/><circle cx="124" cy="62" r="7" fill="${col}"/>
      <rect x="38" y="30" width="84" height="60" rx="26" fill="url(#${id}h)" stroke="#94a3b8" stroke-width="1.5"/>
      <rect x="47" y="42" width="66" height="40" rx="17" fill="#0f172a"/>
      <path d="M54 48 q10 -4 22 -2" stroke="#fff" stroke-width="2.5" opacity=".25" fill="none" stroke-linecap="round"/>
      ${eye(66)}${eye(94)}${mouth}
      <ellipse cx="52" cy="76" rx="5" ry="3" fill="#f472b6" opacity="${robot.head === 'face' ? 0.8 : 0.5}"/><ellipse cx="108" cy="76" rx="5" ry="3" fill="#f472b6" opacity="${robot.head === 'face' ? 0.8 : 0.5}"/>
      ${tool}
    </g>`;
  return `<svg class="robot-svg" viewBox="0 -12 190 194" width="${size}" height="${Math.round(size * 194 / 190)}" aria-hidden="true">${flip ? `<g transform="translate(180 0) scale(-1 1)">${svg}</g>` : svg}</svg>`;
}
