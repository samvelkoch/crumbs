// Медок (плюшевый ёж) и Пуся (плюшевая обезьянка), нарисованы по фото настоящих игрушек.
// mood: 'happy' | 'calm' | 'think' | 'wow' | 'cheer'

let seq = 0;

// Детерминированный «случай», чтобы шерсть рисовалась одинаково при каждом рендере
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Пушистый контур: эллипс из мелких бугорков
function fuzz(cx, cy, rx, ry, n, amp, seed) {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i === 0) { d += `M${x.toFixed(1)},${y.toFixed(1)}`; continue; }
    const am = a - Math.PI / n;
    const k = 1 + amp * (0.6 + r() * 0.8);
    d += ` Q${(cx + Math.cos(am) * rx * k).toFixed(1)},${(cy + Math.sin(am) * ry * k).toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d + 'Z';
}

function eyes(mood, lx, rx, y, r, color = '#111') {
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
  for (let i = 0; i < 120; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.95;
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    const ang = a + (r() - 0.5) * 1.6;
    const len = 3 + r() * 5;
    const seg = `M${x.toFixed(1)},${y.toFixed(1)} l${(Math.cos(ang) * len).toFixed(1)},${(Math.sin(ang) * len).toFixed(1)}`;
    if (i % 3 === 0) dark += seg; else light += seg;
  }
  return `<path d="${light}" stroke="#b5aa76" stroke-width="1.5" stroke-linecap="round" opacity=".75"/>
    <path d="${dark}" stroke="#1f1d19" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`;
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

export function medokSVG(mood = 'happy', size = 120) {
  const id = 'mk' + ++seq;
  const blush = mood === 'happy' || mood === 'cheer';
  return `<svg class="mascot medok mood-${mood}" width="${size}" height="${size * 120 / 140}" viewBox="0 0 140 120" role="img" aria-label="Ёж Медок">
  <defs>
    <radialGradient id="${id}b" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#6b6a52"/><stop offset=".55" stop-color="#46443a"/><stop offset="1" stop-color="#2c2a24"/></radialGradient>
    <radialGradient id="${id}n" cx="35%" cy="30%" r="65%"><stop offset="0" stop-color="#4b4b4b"/><stop offset=".5" stop-color="#111"/><stop offset="1" stop-color="#000"/></radialGradient>
    <radialGradient id="${id}f" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="#dcc6a6"/><stop offset="1" stop-color="#c4ab88"/></radialGradient>
  </defs>
  <ellipse cx="70" cy="112" rx="50" ry="6" fill="rgba(0,0,0,.13)"/>
  ${sparkles(mood === 'cheer')}
  <g class="m-body">
    <path d="${fuzz(70, 60, 54, 48, 34, 0.07, 3)}" fill="url(#${id}b)"/>
    ${medokFur(70, 56, 50, 44)}
    <path d="M118,86 l7,4 l-3,6 l-6,-3z" fill="#1c1917"/>
    <path d="${fuzz(70, 84, 26, 22, 22, 0.06, 11)}" fill="url(#${id}f)"/>
    ${curls(70, 84, 24, 20, 30, 5)}
    ${blush ? '<ellipse cx="54" cy="93" rx="4.5" ry="2.6" fill="#f4a3a3" opacity=".7"/><ellipse cx="86" cy="93" rx="4.5" ry="2.6" fill="#f4a3a3" opacity=".7"/>' : ''}
    ${eyes(mood, 58, 82, 81, 3.4)}
    <ellipse cx="70" cy="86" rx="9" ry="8" fill="url(#${id}n)"/>
    <ellipse cx="66.7" cy="82.8" rx="3" ry="2" fill="#fff" opacity=".85"/>
    ${mouth(mood, 70, 99, 5, '#7a6248', 1.8)}
  </g>
  ${mood === 'think' ? `<g class="m-prop"><circle cx="118" cy="40" r="11" fill="rgba(186,230,253,.55)" stroke="#78350f" stroke-width="4"/><path d="M110,49 L101,59" stroke="#78350f" stroke-width="6" stroke-linecap="round"/><path d="M113,35 q4,-3 8,0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></g>` : ''}
</svg>`;
}

export function pusyaSVG(mood = 'happy', size = 120) {
  const blush = mood === 'happy' || mood === 'cheer';
  const up = mood === 'cheer';
  const think = mood === 'think';
  const brown = '#94562b';
  const brownD = '#7a4522';
  const mask = '#d3c8b6';
  const maskD = '#bcae99';
  const armL = up ? 'M54,94 Q38,74 30,54' : think ? 'M54,94 Q40,98 56,74' : 'M54,94 Q38,104 34,128';
  const armR = up ? 'M86,94 Q102,74 110,54' : 'M86,94 Q102,104 106,128';
  const pawL = up ? [29, 50, -20] : think ? [58, 70, 30] : [33, 132, 10];
  const pawR = up ? [111, 50, 20] : [107, 132, -10];
  return `<svg class="mascot pusya mood-${mood}" width="${size}" height="${size * 160 / 140}" viewBox="0 0 140 160" role="img" aria-label="Обезьянка Пуся">
  <ellipse cx="70" cy="154" rx="46" ry="5.5" fill="rgba(0,0,0,.12)"/>
  ${sparkles(up)}
  <g class="m-body">
    <path d="M62,124 Q56,136 50,146" stroke="${brown}" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M78,124 Q84,136 92,146" stroke="${brown}" stroke-width="10" stroke-linecap="round" fill="none"/>
    <ellipse cx="46" cy="148" rx="11" ry="8" transform="rotate(-18 46 148)" fill="${mask}" stroke="${maskD}"/>
    <ellipse cx="96" cy="148" rx="11" ry="8" transform="rotate(18 96 148)" fill="${mask}" stroke="${maskD}"/>
    <path d="M70,82 C54,82 48,98 49,112 C50,124 58,130 70,130 C82,130 90,124 91,112 C92,98 86,82 70,82Z" fill="${brown}"/>
    <path d="M60,98 Q70,94 80,98" stroke="${brownD}" stroke-width="1.2" fill="none" opacity=".5"/>
    <path d="M89,110 l5,-1 l-1,10 l-4,0z" fill="#1c1917"/>
    <path class="m-arm-l" d="${armL}" fill="none" stroke="${brown}" stroke-width="8.5" stroke-linecap="round"/>
    <path class="m-arm-r" d="${armR}" fill="none" stroke="${brown}" stroke-width="8.5" stroke-linecap="round"/>
    <ellipse cx="${pawL[0]}" cy="${pawL[1]}" rx="6.5" ry="8.5" transform="rotate(${pawL[2]} ${pawL[0]} ${pawL[1]})" fill="${mask}" stroke="${maskD}"/>
    <ellipse cx="${pawR[0]}" cy="${pawR[1]}" rx="6.5" ry="8.5" transform="rotate(${pawR[2]} ${pawR[0]} ${pawR[1]})" fill="${mask}" stroke="${maskD}"/>
    <circle cx="35" cy="50" r="10.5" fill="${mask}" stroke="${maskD}"/><circle cx="36.5" cy="50" r="5.5" fill="${maskD}" opacity=".6"/>
    <circle cx="105" cy="50" r="10.5" fill="${mask}" stroke="${maskD}"/><circle cx="103.5" cy="50" r="5.5" fill="${maskD}" opacity=".6"/>
    <ellipse cx="70" cy="46" rx="34" ry="35" fill="${brown}"/>
    <path d="M58,16 Q70,12 82,16" stroke="${brownD}" stroke-width="1.5" fill="none" opacity=".5"/>
    <path d="M70,34 C65,23 47,22 45,37 C44,47 51,53 60,53 L80,53 C89,53 96,47 95,37 C93,22 75,23 70,34Z" fill="${mask}"/>
    <ellipse cx="70" cy="65" rx="25" ry="17" fill="${mask}"/>
    ${think ? `<path d="M77,29 Q84,25 91,29" fill="none" stroke="${brownD}" stroke-width="2.2" stroke-linecap="round"/>` : ''}
    ${eyes(mood, 58, 82, 40, 3.6, '#1a1410')}
    ${blush ? '<ellipse cx="49" cy="62" rx="5" ry="3" fill="#f4a3a3" opacity=".7"/><ellipse cx="91" cy="62" rx="5" ry="3" fill="#f4a3a3" opacity=".7"/>' : ''}
    <path d="M66,56 l-1.5,4 M74,56 l1.5,4" stroke="#2b2b2b" stroke-width="1.8" stroke-linecap="round"/>
    ${mouth(mood, 70, 67, 16, '#4a4a4a', 1.8)}
  </g>
  ${think ? '<g class="m-prop" fill="#7c3aed" font-family="system-ui,sans-serif" font-weight="800"><text x="106" y="22" font-size="20">?</text></g>' : ''}
</svg>`;
}

export const MASCOTS = {
  medok: { name: 'Медок', svg: medokSVG },
  pusya: { name: 'Пуся', svg: pusyaSVG },
};
