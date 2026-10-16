// Медок (плюшевый ёж) и Пуся (плюшевая обезьянка), нарисованы по фото настоящих игрушек.
// mood: 'happy' | 'calm' | 'think' | 'wow' | 'cheer'

let seq = 0;

// Детерминированный «случай», чтобы шерсть рисовалась одинаково при каждом рендере
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Пушистый контур: эллипс из мелких бугорков
// taper > 0 сужает верх: получается яйцо, как у настоящего Медка
function fuzz(cx, cy, rx, ry, n, amp, seed, taper = 0) {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const tx = (b) => 1 - taper * Math.max(0, -Math.sin(b));
    const x = cx + Math.cos(a) * rx * tx(a);
    const y = cy + Math.sin(a) * ry;
    if (i === 0) { d += `M${x.toFixed(1)},${y.toFixed(1)}`; continue; }
    const am = a - Math.PI / n;
    const k = 1 + amp * (0.6 + r() * 0.8);
    d += ` Q${(cx + Math.cos(am) * rx * k * tx(am)).toFixed(1)},${(cy + Math.sin(am) * ry * k).toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d + 'Z';
}

// open: глаза всегда открыты, как у игрушек (вышитые и бусинки не закрываются)
function eyes(mood, lx, rx, y, r, color = '#111', open = false) {
  if (open && (mood === 'happy' || mood === 'cheer')) return eyes('calm', lx, rx, y, r, color);
  if (mood === 'happy' || mood === 'cheer') {
    return `<g fill="none" stroke="${color}" stroke-width="${Math.max(2.2, r * 0.7)}" stroke-linecap="round">
      <path d="M${lx - r},${y + 1} Q${lx},${y - r - 1.5} ${lx + r},${y + 1}"/>
      <path d="M${rx - r},${y + 1} Q${rx},${y - r - 1.5} ${rx + r},${y + 1}"/></g>`;
  }
  const rr = mood === 'wow' ? r * 1.3 : r;
  const dx = mood === 'think' ? r * 0.35 : 0;
  const dy = mood === 'think' ? -r * 0.35 : 0;
  return `<g class="m-eyes">
    <circle cx="${lx + dx}" cy="${y + dy}" r="${rr}" fill="${color}"/>
    <circle cx="${rx + dx}" cy="${y + dy}" r="${rr}" fill="${color}"/>
    <circle cx="${lx + dx - rr * 0.35}" cy="${y + dy - rr * 0.4}" r="${rr * 0.32}" fill="#fff"/>
    <circle cx="${rx + dx - rr * 0.35}" cy="${y + dy - rr * 0.4}" r="${rr * 0.32}" fill="#fff"/></g>`;
}

function mouth(mood, cx, y, w, color, sw = 2) {
  switch (mood) {
    case 'cheer':
      return `<path d="M${cx - w},${y} Q${cx},${y + w * 1.2} ${cx + w},${y} Z" fill="#7f1d1d" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/>
        <ellipse cx="${cx}" cy="${y + w * 0.62}" rx="${w * 0.42}" ry="${w * 0.18}" fill="#f87171"/>`;
    case 'wow':
      return `<ellipse cx="${cx}" cy="${y + 2}" rx="${w * 0.28}" ry="${w * 0.36}" fill="#7f1d1d"/>`;
    case 'think':
      return `<path d="M${cx - w * 0.45},${y + 2} Q${cx},${y + 3} ${cx + w * 0.55},${y - 1}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
    case 'calm':
      return `<path d="M${cx - w * 0.7},${y} Q${cx},${y + w * 0.45} ${cx + w * 0.7},${y}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
    default:
      return `<path d="M${cx - w},${y - 1} Q${cx},${y + w * 0.7} ${cx + w},${y - 1}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
  }
}

function sparkles(show) {
  if (!show) return '';
  return `<g class="m-sparkles" fill="#facc15">
    <path d="M14,22 l3,-8 l3,8 l8,3 l-8,3 l-3,8 l-3,-8 l-8,-3z"/>
    <path d="M122,16 l2,-5 l2,5 l5,2 l-5,2 l-2,5 l-2,-5 l-5,-2z"/>
    <circle cx="128" cy="44" r="2.5"/></g>`;
}

// Шерсть Медка: тёмно-серая основа с оливково-золотистым ворсом
function medokFur(cx, cy, rx, ry) {
  const r = rng(7);
  let light = '';
  let dark = '';
  for (let i = 0; i < 190; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.95;
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    const ang = a + (r() - 0.5) * 1.6;
    const len = 2.5 + r() * 3.5;
    const seg = `M${x.toFixed(1)},${y.toFixed(1)} l${(Math.cos(ang) * len).toFixed(1)},${(Math.sin(ang) * len).toFixed(1)}`;
    if (i % 3 === 0) dark += seg; else light += seg;
  }
  return `<path d="${light}" stroke="#bfb27c" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>
    <path d="${dark}" stroke="#1f1d19" stroke-width="2" stroke-linecap="round" opacity=".5"/>`;
}

// Кудрявая мордочка: мелкие колечки по бежевому
function curls(cx, cy, rx, ry, n, seed) {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const k = Math.sqrt(r()) * 0.92;
    const x = cx + Math.cos(a) * rx * k;
    const y = cy + Math.sin(a) * ry * k;
    d += `M${(x + 1.6).toFixed(1)},${y.toFixed(1)} a1.6,1.6 0 1,0 0.01,0`;
  }
  return `<path d="${d}" fill="none" stroke="#b39c7c" stroke-width=".9" opacity=".8"/>`;
}

// style: 'plush' (как игрушки) | 'toon' (мультик) | 'detective' (игрушки в костюмах сыщиков)
export const STYLES = [
  { id: 'plush', label: 'Как игрушки' },
  { id: 'toon', label: 'Мультик' },
  { id: 'detective', label: 'Сыщики' },
];

const MAGNIFIER = (x, y, s = 1) => `<g class="m-prop" transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="0" r="11" fill="rgba(186,230,253,.55)" stroke="#78350f" stroke-width="4"/><path d="M-8,9 L-17,19" stroke="#78350f" stroke-width="6" stroke-linecap="round"/><path d="M-5,-5 q4,-3 8,0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;

// Шляпа сыщика (охотничья, в клетку) для Медка
const DEERSTALKER = `<g class="m-hat"><path d="M40,30 Q42,4 70,2 Q98,4 100,30 Z" fill="#b45309" stroke="#78350f" stroke-width="2"/>
  <path d="M50,28 Q52,8 70,6 M90,28 Q88,8 70,6 M44,18 H96 M42,25 H98" stroke="#92400e" stroke-width="1.6" fill="none" opacity=".7"/>
  <ellipse cx="70" cy="30" rx="36" ry="6" fill="#92400e"/><circle cx="70" cy="3" r="3.5" fill="#78350f"/></g>`;

// Медок по фото игрушки: пушистый купол-капюшон, большая бежевая мордочка до самого низа,
// крупный блестящий нос-бусина и маленькие глаза-бусины по бокам от него.
// Ниже и меньше Пуси. Общий viewBox с запасом сверху под шляпу.
const MEDOK_VB = '0 -14 140 120';
const medokH = (size) => (size * 120) / 140;

export function medokSVG(mood = 'happy', size = 120, style = 'plush') {
  if (style === 'toon') return medokToon(mood, size);
  const det = style === 'detective';
  const id = 'mk' + ++seq;
  const blush = mood === 'happy' || mood === 'cheer';
  return `<svg class="mascot medok mood-${mood}" width="${size}" height="${medokH(size)}" viewBox="${MEDOK_VB}" role="img" aria-label="Ёж Медок">
  <defs>
    <radialGradient id="${id}b" cx="50%" cy="28%" r="78%"><stop offset="0" stop-color="#7a7556"/><stop offset=".5" stop-color="#4c493b"/><stop offset="1" stop-color="#2a2822"/></radialGradient>
    <radialGradient id="${id}n" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#555"/><stop offset=".45" stop-color="#111"/><stop offset="1" stop-color="#000"/></radialGradient>
    <radialGradient id="${id}f" cx="50%" cy="45%" r="62%"><stop offset="0" stop-color="#e2cfb1"/><stop offset="1" stop-color="#c7b08e"/></radialGradient>
  </defs>
  <ellipse cx="70" cy="101" rx="46" ry="5" fill="rgba(0,0,0,.13)"/>
  ${sparkles(mood === 'cheer')}
  <g class="m-body">
    <ellipse cx="38" cy="98" rx="8" ry="4.5" fill="#3a2c22"/><ellipse cx="102" cy="98" rx="8" ry="4.5" fill="#3a2c22"/>
    <clipPath id="${id}c"><path d="${fuzz(70, 60, 46, 39, 36, 0.08, 3, 0.14)}"/></clipPath>
    <path d="${fuzz(70, 60, 46, 39, 36, 0.08, 3, 0.14)}" fill="url(#${id}b)"/>
    <g clip-path="url(#${id}c)">${medokFur(70, 50, 44, 34)}</g>
    <path d="${fuzz(70, 76, 29, 23, 22, 0.05, 11, 0.1)}" fill="url(#${id}f)"/>
    ${curls(70, 76, 26, 19, 30, 5)}
    <circle cx="70" cy="53.5" r="1.8" fill="#dc2626"/>
    ${blush ? '<ellipse cx="50" cy="86" rx="4.5" ry="2.4" fill="#f4a3a3" opacity=".6"/><ellipse cx="90" cy="86" rx="4.5" ry="2.4" fill="#f4a3a3" opacity=".6"/>' : ''}
    ${eyes(mood, 54, 86, 75, 4, '#111', true)}
    <ellipse cx="70" cy="80" rx="10" ry="9" fill="url(#${id}n)"/>
    <ellipse cx="66.5" cy="76.5" rx="3.2" ry="2" fill="#fff" opacity=".85"/>
    ${mouth(mood, 70, 92, 4, '#7a6248', 1.5)}
  </g>
  ${det ? `<g transform="translate(0 -6)">${DEERSTALKER}</g>` : ''}
  ${mood === 'think' ? MAGNIFIER(124, 34) : det ? MAGNIFIER(124, 76, 0.8) : ''}
</svg>`;
}

function medokToon(mood, size) {
  const ink = '#3b3127';
  return `<svg class="mascot medok mood-${mood}" width="${size}" height="${medokH(size)}" viewBox="${MEDOK_VB}" role="img" aria-label="Ёж Медок">
  <ellipse cx="70" cy="85" rx="46" ry="5" fill="rgba(0,0,0,.13)"/>
  ${sparkles(mood === 'cheer')}
  <g class="m-body" stroke-linejoin="round">
    <polygon points="${toonSpikes(70, 52, 48, 32, 13, 0.22)}" fill="#6f6250" stroke="${ink}" stroke-width="2.5"/>
    <ellipse cx="70" cy="50" rx="40" ry="22" fill="#8a7b63"/>
    <path d="M44,44 q6,-7 12,0 M64,36 q6,-7 12,0 M84,44 q6,-7 12,0" stroke="#a89878" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="54" cy="82" rx="9" ry="5" fill="#f0dcbf" stroke="${ink}" stroke-width="2.2"/>
    <ellipse cx="86" cy="82" rx="9" ry="5" fill="#f0dcbf" stroke="${ink}" stroke-width="2.2"/>
    <ellipse cx="70" cy="63" rx="24" ry="18" fill="#f0dcbf" stroke="${ink}" stroke-width="2.5"/>
    <ellipse cx="53" cy="69" rx="5" ry="3" fill="#fb9fb1" opacity=".8"/><ellipse cx="87" cy="69" rx="5" ry="3" fill="#fb9fb1" opacity=".8"/>
    ${eyes(mood, 59, 81, 58, 4.4, '#1c1410')}
    <ellipse cx="70" cy="65" rx="7" ry="5.5" fill="#111" stroke="${ink}" stroke-width="1"/>
    <ellipse cx="67.5" cy="63.2" rx="2.4" ry="1.5" fill="#fff"/>
    ${mouth(mood, 70, 74, 5, ink, 2.2)}
  </g>
  ${mood === 'think' ? MAGNIFIER(122, 22) : ''}
</svg>`;
}

function toonSpikes(cx, cy, rx, ry, n, depth) {
  const pts = [];
  for (let i = 0; i <= n * 2; i++) {
    const a = Math.PI + (Math.PI * 1.15 * i) / (n * 2) - 0.08 * Math.PI;
    const k = i % 2 ? 1 + depth : 1;
    pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(1)},${(cy + Math.sin(a) * ry * k).toFixed(1)}`);
  }
  pts.push(`${cx + rx * 0.95},${cy + ry * 0.7}`, `${cx - rx * 0.95},${cy + ry * 0.7}`);
  return pts.join(' ');
}

// Кепка и бабочка сыщика для Пуси
const NEWSBOY = `<g class="m-hat"><path d="M38,30 Q40,6 70,6 Q100,6 102,30 Q70,22 38,30Z" fill="#475569" stroke="#1e293b" stroke-width="2"/>
  <path d="M48,26 Q50,10 70,9 M92,26 Q90,10 70,9 M42,20 Q70,14 98,20" stroke="#94a3b8" stroke-width="1.4" fill="none" opacity=".8"/>
  <path d="M60,28 Q74,24 96,30 Q86,36 62,32Z" fill="#334155"/><circle cx="70" cy="8" r="3" fill="#1e293b"/></g>`;
const BOWTIE = '<g><path d="M70,87 L59,82 L59,92Z M70,87 L81,82 L81,92Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.2"/><circle cx="70" cy="87" r="2.8" fill="#b91c1c"/></g>';
const NOTEBOOK = (x, y) => `<g transform="translate(${x} ${y}) rotate(-12)"><rect x="-9" y="-12" width="18" height="24" rx="2" fill="#fde68a" stroke="#92400e" stroke-width="1.5"/><path d="M-5,-6 H5 M-5,-1 H5 M-5,4 H3" stroke="#92400e" stroke-width="1.2"/></g>`;

// Вышитая улыбка Пуси: широкая тонкая дуга через всю мордочку
function pusyaMouth(mood) {
  const c = '#4d4d4d';
  switch (mood) {
    case 'cheer':
      return `<path d="M48,67 Q70,88 92,67 Q70,73 48,67Z" fill="#6b1d1d" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/><ellipse cx="70" cy="77" rx="8" ry="3" fill="#f87171"/>`;
    case 'wow':
      return '<ellipse cx="70" cy="72" rx="4.5" ry="5.5" fill="#6b1d1d"/>';
    case 'think':
      return `<path d="M54,71 Q68,75 86,68" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'calm':
      return `<path d="M50,69 Q70,77 90,69" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`;
    default:
      return `<path d="M47,67 Q70,81 93,67" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`;
  }
}

export function pusyaSVG(mood = 'happy', size = 120, style = 'plush') {
  if (style === 'toon') return pusyaToon(mood, size);
  const det = style === 'detective';
  const up = mood === 'cheer';
  const think = mood === 'think';
  const brown = '#8d5228';
  const brownD = '#6f3f1e';
  const cream = '#eee6d8';
  const creamD = '#d6cbb8';
  const armL = up ? 'M54,94 Q38,74 30,54' : think ? 'M54,94 Q40,98 56,76' : 'M54,94 Q38,104 34,128';
  const armR = up ? 'M86,94 Q102,74 110,54' : 'M86,94 Q102,104 106,128';
  const pawL = up ? [29, 50, -20] : think ? [58, 74, 30] : [33, 132, 10];
  const pawR = up ? [111, 50, 20] : [107, 132, -10];
  return `<svg class="mascot pusya mood-${mood}" width="${size}" height="${size * 160 / 140}" viewBox="0 0 140 160" role="img" aria-label="Обезьянка Пуся">
  <ellipse cx="70" cy="154" rx="46" ry="5.5" fill="rgba(0,0,0,.12)"/>
  ${sparkles(up)}
  <g class="m-body">
    <path d="M84,124 Q118,134 124,114" fill="none" stroke="${brown}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="124" cy="113" r="4.5" fill="${cream}"/>
    <path d="M62,124 Q56,136 50,146" stroke="${brown}" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M78,124 Q84,136 92,146" stroke="${brown}" stroke-width="10" stroke-linecap="round" fill="none"/>
    <ellipse cx="46" cy="148" rx="11" ry="8" transform="rotate(-18 46 148)" fill="${cream}" stroke="${creamD}"/>
    <ellipse cx="96" cy="148" rx="11" ry="8" transform="rotate(18 96 148)" fill="${cream}" stroke="${creamD}"/>
    <path d="M70,80 C54,80 48,98 49,112 C50,124 58,130 70,130 C82,130 90,124 91,112 C92,98 86,80 70,80Z" fill="${brown}"/>
    <path d="M89,110 l5,-1 l-1,10 l-4,0z" fill="#1c1917"/>
    <path class="m-arm-l" d="${armL}" fill="none" stroke="${brown}" stroke-width="8.5" stroke-linecap="round"/>
    <path class="m-arm-r" d="${armR}" fill="none" stroke="${brown}" stroke-width="8.5" stroke-linecap="round"/>
    <ellipse cx="${pawL[0]}" cy="${pawL[1]}" rx="6.5" ry="8.5" transform="rotate(${pawL[2]} ${pawL[0]} ${pawL[1]})" fill="${cream}" stroke="${creamD}"/>
    <ellipse cx="${pawR[0]}" cy="${pawR[1]}" rx="6.5" ry="8.5" transform="rotate(${pawR[2]} ${pawR[0]} ${pawR[1]})" fill="${cream}" stroke="${creamD}"/>
    <ellipse cx="36" cy="44" rx="8" ry="10" transform="rotate(-15 36 44)" fill="${cream}" stroke="${creamD}"/>
    <ellipse cx="104" cy="44" rx="8" ry="10" transform="rotate(15 104 44)" fill="${cream}" stroke="${creamD}"/>
    <circle cx="70" cy="46" r="33" fill="${brown}"/>
    <path d="M60,16 Q70,13 80,16" stroke="${brownD}" stroke-width="1.4" fill="none" opacity=".45"/>
    <path d="M70,33 C66,23 54,19 46,25 C38,31 38,44 42,52 Q70,60 98,52 C102,44 102,31 94,25 C86,19 74,23 70,33Z" fill="${cream}"/>
    <ellipse cx="70" cy="64" rx="29" ry="19" fill="${cream}"/>
    <path d="M46,51 Q70,45 94,51" stroke="${creamD}" stroke-width="1.4" fill="none" opacity=".8"/>
    ${think ? `<path d="M77,31 Q83,28 89,31" fill="none" stroke="${brownD}" stroke-width="2" stroke-linecap="round"/>` : ''}
    ${eyes(mood, 58, 82, 40, 3.5, '#141414', true)}
    <path d="M66,58 l-0.8,2.8 M74,58 l0.8,2.8" stroke="#333" stroke-width="1.5" stroke-linecap="round"/>
    ${pusyaMouth(mood)}
    ${det ? BOWTIE + `<g transform="translate(0 -8)">${NEWSBOY}</g>` : ''}
    ${det && !up ? NOTEBOOK(pawR[0] + 4, pawR[1] - 10) : ''}
  </g>
  ${think ? '<g class="m-prop" fill="#7c3aed" font-family="system-ui,sans-serif" font-weight="800"><text x="106" y="22" font-size="20">?</text></g>' : ''}
</svg>`;
}

function pusyaToon(mood, size) {
  const ink = '#4a2a14';
  const brown = '#a8622f';
  const mask = '#efe2cc';
  const up = mood === 'cheer';
  const think = mood === 'think';
  const armL = up ? 'M54,112 Q40,96 36,80' : think ? 'M54,112 Q44,110 56,96' : 'M54,112 Q42,120 40,134';
  const armR = up ? 'M86,112 Q100,96 104,80' : 'M86,112 Q98,120 100,134';
  const pL = up ? [36, 78] : think ? [58, 94] : [40, 136];
  const pR = up ? [104, 78] : [100, 136];
  return `<svg class="mascot pusya mood-${mood}" width="${size}" height="${size * 160 / 140}" viewBox="0 0 140 160" role="img" aria-label="Обезьянка Пуся">
  <ellipse cx="70" cy="154" rx="40" ry="5.5" fill="rgba(0,0,0,.12)"/>
  ${sparkles(up)}
  <g class="m-body" stroke-linejoin="round" stroke-linecap="round">
    <path d="M90,136 Q118,140 118,118 Q118,106 108,108" fill="none" stroke="${ink}" stroke-width="9"/>
    <path d="M90,136 Q118,140 118,118 Q118,106 108,108" fill="none" stroke="${brown}" stroke-width="5"/>
    <ellipse cx="56" cy="146" rx="12" ry="7" fill="${mask}" stroke="${ink}" stroke-width="2.4"/>
    <ellipse cx="84" cy="146" rx="12" ry="7" fill="${mask}" stroke="${ink}" stroke-width="2.4"/>
    <ellipse cx="70" cy="124" rx="24" ry="22" fill="${brown}" stroke="${ink}" stroke-width="2.5"/>
    <ellipse cx="70" cy="128" rx="13" ry="12" fill="${mask}"/>
    <path d="${armL}" fill="none" stroke="${ink}" stroke-width="11"/><path d="${armL}" fill="none" stroke="${brown}" stroke-width="6.5"/>
    <path d="${armR}" fill="none" stroke="${ink}" stroke-width="11"/><path d="${armR}" fill="none" stroke="${brown}" stroke-width="6.5"/>
    <circle cx="${pL[0]}" cy="${pL[1]}" r="7" fill="${mask}" stroke="${ink}" stroke-width="2.2"/>
    <circle cx="${pR[0]}" cy="${pR[1]}" r="7" fill="${mask}" stroke="${ink}" stroke-width="2.2"/>
    <circle cx="25" cy="58" r="13" fill="${mask}" stroke="${ink}" stroke-width="2.5"/><circle cx="26" cy="58" r="6.5" fill="#e6c9a8"/>
    <circle cx="115" cy="58" r="13" fill="${mask}" stroke="${ink}" stroke-width="2.5"/><circle cx="114" cy="58" r="6.5" fill="#e6c9a8"/>
    <ellipse cx="70" cy="54" rx="44" ry="42" fill="${brown}" stroke="${ink}" stroke-width="2.5"/>
    <path d="M70,40 C64,24 38,24 37,44 C36,58 46,64 58,64 L82,64 C94,64 104,58 103,44 C102,24 76,24 70,40Z" fill="${mask}"/>
    <ellipse cx="70" cy="76" rx="29" ry="18" fill="${mask}"/>
    ${think ? `<path d="M78,34 Q86,29 94,34" fill="none" stroke="${ink}" stroke-width="2.6"/>` : ''}
    ${eyes(mood, 55, 85, 48, 5.6, '#1a1008', true)}
    <ellipse cx="45" cy="72" rx="6" ry="3.6" fill="#fb9fb1" opacity=".8"/><ellipse cx="95" cy="72" rx="6" ry="3.6" fill="#fb9fb1" opacity=".8"/>
    <path d="M65,68 l-1.5,4 M75,68 l1.5,4" stroke="${ink}" stroke-width="2.4"/>
    ${mouth(mood, 70, 79, 15, ink, 2.4)}
  </g>
  ${think ? '<g class="m-prop" fill="#7c3aed" font-family="system-ui,sans-serif" font-weight="800"><text x="108" y="20" font-size="20">?</text></g>' : ''}
</svg>`;
}

export const MASCOTS = {
  medok: { name: 'Медок', svg: medokSVG },
  pusya: { name: 'Пуся', svg: pusyaSVG },
};
