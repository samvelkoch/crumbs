// Робот: детали, миссии и правила. Чистая логика без DOM: её же используют поиск
// лучшего решения (par) и подсказки, поэтому робот на экране и в расчётах ведёт себя одинаково.

export const PARTS = {
  head: [
    { id: 'camera', emoji: '👀', label: 'Камера', perk: 'Показывает путь, пока пишешь программу' },
    { id: 'brain', emoji: '🧠', label: 'Умная голова', perk: 'Даёт до трёх подсказок в миссии' },
    { id: 'lamp', emoji: '🔦', label: 'Фонарь', perk: 'Видит в темноте' },
  ],
  move: [
    { id: 'wheels', emoji: '🛞', label: 'Колёса', perk: 'Команда «До упора»: едет, пока не упрётся. В грязи застревают' },
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
export const DEFAULT_ROBOT = { name: 'Болт', head: 'camera', move: 'wheels', tool: 'claw', color: '#f97316' };
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
const LEFT = { N: 'W', W: 'S', S: 'E', E: 'N' };
const RIGHT = { N: 'E', E: 'S', S: 'W', W: 'N' };

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

// Команда программы -> последовательность элементарных шагов с событиями
// cmd: { c: 'F'|'L'|'R'|'A'|'U', n }
export function* runCommand(g, robot, s, cmd) {
  const n = cmd.n || 1;
  if (cmd.c === 'L' || cmd.c === 'R') {
    for (let i = 0; i < n; i++) { s = { ...s, d: (cmd.c === 'L' ? LEFT : RIGHT)[s.d] }; yield { s, ev: 'turn' }; }
  } else if (cmd.c === 'F') {
    for (let i = 0; i < n; i++) { const x = forward(g, robot, s); s = x.s; yield x; if (x.ev) return; }
  } else if (cmd.c === 'U') {
    for (let i = 0; i < 30; i++) {
      const [dr, dc] = DIRS[s.d];
      if (blocker(g.cells[s.r + dr]?.[s.c + dc], robot.move)) { if (!i) yield { s, ev: 'stay' }; return; }
      const x = forward(g, robot, s); s = x.s; yield x; if (x.ev) return;
    }
  } else if (cmd.c === 'A') {
    for (let i = 0; i < n; i++) { const x = act(g, robot, s); s = x.s; yield x; }
  }
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

const BFS_CMDS = [
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ c: 'F', n })), { c: 'L', n: 1 }, { c: 'R', n: 1 }, { c: 'L', n: 2 }, { c: 'A', n: 1 },
];

// Самая короткая программа (в командах, множитель ×N считается одной командой) из состояния s.
export function solve(g, m, robot, s0 = initState(g, m, robot)) {
  const cmds = robot.move === 'wheels' ? [...BFS_CMDS, { c: 'U' }] : BFS_CMDS;
  const key = (s) => `${s.r},${s.c},${s.d},${s.done},${s.carry},${s.delivered},${s.energy}`;
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
          if (STOP.has(x.ev) || x.ev === 'nothing' || x.ev === 'notool' || x.ev === 'full' || x.ev === 'stay') { bad = true; break; }
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

export function robotSVG(robot, size = 120, mood = 'happy') {
  const c = robot.color;
  const dark = '#334155';
  const head = {
    camera: `<rect x="52" y="10" width="16" height="12" rx="3" fill="${dark}"/><circle cx="60" cy="16" r="4.5" fill="#38bdf8"/><circle cx="58.5" cy="14.5" r="1.4" fill="#fff"/>`,
    brain: `<path d="M38 27 Q40 6 60 6 Q80 6 82 27 Z" fill="#f9a8d4" stroke="#db2777" stroke-width="1.5"/><path d="M48 18 q5 -6 10 0 q5 6 10 0 M52 24 q4 -4 8 0" fill="none" stroke="#db2777" stroke-width="1.5"/>`,
    lamp: `<path d="M60 14 L44 -6 L76 -6 Z" fill="#fde68a" opacity=".55"/><rect x="53" y="10" width="14" height="12" rx="3" fill="#facc15" stroke="#a16207" stroke-width="1.5"/><rect x="55" y="12" width="10" height="4" rx="2" fill="#fff"/>`,
  }[robot.head] || '';
  const tool = {
    can: `<rect x="104" y="80" width="18" height="16" rx="4" fill="#60a5fa" stroke="#1d4ed8" stroke-width="1.5"/><path d="M122 84 L132 76" stroke="#1d4ed8" stroke-width="3" stroke-linecap="round"/><circle cx="134" cy="74" r="3" fill="#93c5fd"/>`,
    claw: `<path d="M106 72 q14 -4 16 8 M106 88 q14 4 16 -8" fill="none" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>`,
    basket: `<path d="M102 82 L126 82 L122 100 L106 100 Z" fill="#d97706" stroke="#92400e" stroke-width="1.5"/><path d="M106 88 L122 88 M108 94 L120 94" stroke="#92400e" stroke-width="1.2"/><path d="M106 82 Q114 70 122 82" fill="none" stroke="#92400e" stroke-width="2"/>`,
    magnet: `<path d="M104 72 L104 88 Q104 98 114 98 Q124 98 124 88 L124 72 L118 72 L118 88 Q118 92 114 92 Q110 92 110 88 L110 72 Z" fill="#ef4444" stroke="#991b1b" stroke-width="1.2"/><rect x="104" y="70" width="6" height="5" fill="#cbd5e1"/><rect x="118" y="70" width="6" height="5" fill="#cbd5e1"/>`,
  }[robot.tool] || '';
  const fly = robot.move === 'fly';
  const bottom = {
    wheels: `<circle cx="40" cy="126" r="12" fill="#1f2937"/><circle cx="40" cy="126" r="5" fill="#9ca3af"/><circle cx="80" cy="126" r="12" fill="#1f2937"/><circle cx="80" cy="126" r="5" fill="#9ca3af"/>`,
    legs: `<rect x="38" y="114" width="10" height="16" fill="#94a3b8"/><rect x="72" y="114" width="10" height="16" fill="#94a3b8"/><rect x="31" y="128" width="22" height="9" rx="4" fill="${dark}"/><rect x="67" y="128" width="22" height="9" rx="4" fill="${dark}"/>`,
    tracks: `<rect x="22" y="115" width="76" height="22" rx="11" fill="#374151"/>${[34, 50, 70, 86].map((x) => `<circle cx="${x}" cy="126" r="5" fill="#9ca3af"/>`).join('')}`,
    fly: `<path d="M50 114 L70 114 L64 124 L56 124 Z" fill="#94a3b8"/><path d="M56 124 L60 132 L64 124 Z" fill="#fb923c"/><ellipse cx="60" cy="138" rx="22" ry="3" fill="#000" opacity=".12"/>`,
  }[robot.move] || '';
  const prop = fly ? `<rect x="58" y="-8" width="4" height="18" fill="${dark}"/><ellipse cx="44" cy="-9" rx="18" ry="3.5" fill="#64748b"/><ellipse cx="76" cy="-9" rx="18" ry="3.5" fill="#64748b"/><circle cx="60" cy="-9" r="3.5" fill="${dark}"/>` : '';
  const mouth = mood === 'oops' ? '<path d="M52 54 q8 -5 16 0" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>'
    : '<path d="M50 51 q10 8 20 0" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>';
  return `<svg class="robot-svg" viewBox="-6 -14 146 156" width="${size}" height="${Math.round(size * 156 / 146)}" aria-hidden="true">
    ${prop}${head}
    <rect x="30" y="22" width="60" height="40" rx="12" fill="#e5e7eb" stroke="#475569" stroke-width="2"/>
    <circle cx="47" cy="40" r="6.5" fill="#0f172a"/><circle cx="73" cy="40" r="6.5" fill="#0f172a"/>
    <circle cx="45" cy="38" r="2" fill="#fff"/><circle cx="71" cy="38" r="2" fill="#fff"/>${mouth}
    <rect x="54" y="62" width="12" height="7" fill="#94a3b8"/>
    <rect x="10" y="74" width="16" height="9" rx="4.5" fill="#94a3b8"/><circle cx="10" cy="78.5" r="6" fill="${dark}"/>
    <rect x="94" y="74" width="14" height="9" rx="4.5" fill="#94a3b8"/>
    <rect x="24" y="68" width="72" height="46" rx="11" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    <rect x="42" y="77" width="36" height="20" rx="5" fill="#fff" opacity=".55"/>
    <circle cx="51" cy="87" r="3" fill="#22c55e"/><circle cx="60" cy="87" r="3" fill="#facc15"/><circle cx="69" cy="87" r="3" fill="#ef4444"/>
    ${tool}${bottom}
  </svg>`;
}
