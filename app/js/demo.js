// Демо-данные: 3 недели выдуманной семьи. В них спрятан след (шоколад и какао),
// чтобы было видно, как работает Радар. С настоящими данными не смешиваются.
import { addDays, fromZoned } from './dates.js';
import { uid } from './store.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const BREAKFASTS = [['oats', 'banana', 'milk'], ['egg', 'bread', 'cucumber'], ['cottage', 'apple', 'tea'], ['buckwheat', 'milk'], ['semolina', 'pear']];
const LUNCHES = [['chicken', 'rice', 'carrot', 'tomato'], ['beef', 'potato', 'cabbage'], ['fish', 'rice', 'broccoli'], ['turkey', 'pasta', 'cucumber'], ['beet', 'cabbage', 'potato', 'carrot', 'beef']];
const DINNERS = [['turkey', 'buckwheat', 'greens'], ['egg', 'potato', 'tomato'], ['chicken', 'pasta', 'peas'], ['fish', 'potato', 'zucchini'], ['cottage', 'pear']];
const SNACKS = [['apple'], ['banana'], ['cookies', 'kefir'], ['grape'], ['strawberry'], ['chips'], ['blueberry', 'kefir']];

export function demoEntries(today, days = 21) {
  const r = rng(16);
  const out = [];
  const at = (key, hh, mm) => {
    const [y, m, d] = key.split('-').map(Number);
    return fromZoned(y, m, d, hh, mm);
  };
  const add = (e) => out.push({ id: uid(), u: Date.now(), demo: true, ...e });
  const choco = new Set();
  for (let i = days; i >= 1; i--) {
    const k = addDays(today, -i);
    add({ type: 'meal', ts: at(k, 8, 10), kind: 'breakfast', foods: BREAKFASTS[Math.floor(r() * 5)].slice(), text: '' });
    add({ type: 'meal', ts: at(k, 13, 0), kind: 'lunch', foods: LUNCHES[Math.floor(r() * 5)].slice(), text: '' });
    const snack = SNACKS[Math.floor(r() * SNACKS.length)].slice();
    const hasChoco = r() < 0.35;
    if (hasChoco) { snack.push(r() < 0.5 ? 'chocolate' : 'cocoa'); choco.add(k); }
    add({ type: 'meal', ts: at(k, 16, 30), kind: 'snack', foods: snack, text: '' });
    add({ type: 'meal', ts: at(k, 19, 0), kind: 'dinner', foods: DINNERS[Math.floor(r() * 5)].slice(), text: '' });
    const w = 2 + Math.floor(r() * 5);
    for (let j = 0; j < w; j++) add({ type: 'water', ts: at(k, 9 + j * 2, 15), n: 1 });
    if (r() < 0.12) add({ type: 'factor', ts: at(k, 17, 0), factors: [r() < 0.5 ? 'pool' : 'sport'], note: '' });
    // След: на следующий день после шоколада руки и шея хуже
    const yday = addDays(k, -1);
    const base = () => (r() < 0.25 ? 1 : 0);
    const level = (bad, lo) => (bad ? lo + Math.floor(r() * 2) : base());
    const am = choco.has(yday);
    add({ type: 'skin', ts: at(k, 8, 0), zones: { face: base(), neck: level(am, 1), hands: level(am, 1) }, itch: false, note: '' });
    const pm = am || hasChoco;
    const hands = level(pm, 2);
    add({ type: 'skin', ts: at(k, 20, 30), zones: { face: base(), neck: level(pm, 1), hands }, itch: hands >= 3, note: '' });
  }
  return out;
}
