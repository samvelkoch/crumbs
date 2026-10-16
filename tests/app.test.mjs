// Запуск: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, fromZoned, toInputValue, fromInputValue, addDays, HOUR } from '../js/dates.js';
import { parseFreeText, expandParts, expandFamilies, plateSectors } from '../js/foods.js';
import { analyze, evaluateCase } from '../js/radar.js';
import { merge, emptyState } from '../js/store.js';
import { encryptState, decryptBackup, BackupError } from '../js/backup.js';
import { stars, plateOf } from '../js/game.js';
import { demoEntries } from '../js/demo.js';

test('день считается в Europe/Budapest, а не в UTC', () => {
  // 23:30 UTC 15 октября = 01:30 16 октября в Будапеште (летнее время, UTC+2)
  assert.equal(dayKey(Date.UTC(2026, 9, 15, 23, 30)), '2026-10-16');
  assert.equal(dayKey(Date.UTC(2026, 9, 15, 21, 59)), '2026-10-15');
});

test('fromZoned и поле времени переживают переход на зимнее время', () => {
  const ts = fromZoned(2026, 10, 25, 12, 0); // после перехода, UTC+1
  assert.equal(ts, Date.UTC(2026, 9, 25, 11, 0));
  assert.equal(fromInputValue(toInputValue(ts)), ts);
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
});

test('свободный ввод: блюда, длинный стем, свои продукты', () => {
  const p = parseFreeText('Борщ со сметаной, нутелла и драконий фрукт');
  assert.deepEqual(p[0].foods, ['borscht']);
  assert.deepEqual(expandParts(p[0].foods), ['borscht', 'beet', 'cabbage', 'potato', 'carrot', 'beef']);
  assert.deepEqual(p[1].foods, ['sourcream']);
  assert.deepEqual(p[2].foods, ['chocolate']);
  assert.equal(p[3].kind, 'custom');
  assert.deepEqual(parseFreeText('каша гречневая')[0].foods, ['buckwheat']);
  assert.deepEqual(parseFreeText('пельмени')[0].foods, ['pelmeni']);
  assert.deepEqual(parseFreeText('омлет')[0].foods, ['omelet']);
  assert.deepEqual(parseFreeText('варенье')[0].foods, ['jam']);
  assert.deepEqual(parseFreeText('баббл ти')[0].foods, ['bubbletea']);
  assert.deepEqual(parseFreeText('бутерброд с сыром').map((x) => x.foods), [['sandwich'], ['cheese']]);
});

test('блюда: семейства и клетки тарелки берутся из продуктов', () => {
  assert.deepEqual(expandFamilies(['omelet']).sort(), ['fam:dairy', 'fam:egg']);
  assert.deepEqual(plateSectors('pelmeni').sort(), ['carb', 'prot']);
  assert.deepEqual(plateSectors('porridge'), ['carb']);
  assert.deepEqual(plateSectors('apple'), ['fruit']);
});

function mk(entries) {
  return entries.map((e, i) => ({ id: 'e' + i, u: 1, ...e }));
}

test('Радар находит продукт, после которого кожа хуже, и не трогает остальные', () => {
  const es = [];
  const t0 = fromZoned(2026, 9, 1, 8, 0);
  for (let d = 0; d < 20; d++) {
    const base = t0 + d * 24 * HOUR;
    const choco = d % 3 === 0;
    es.push({ type: 'meal', ts: base, foods: ['oats', 'banana'] });
    es.push({ type: 'meal', ts: base + 5 * HOUR, foods: choco ? ['rice', 'chocolate'] : ['rice'] });
    es.push({ type: 'skin', ts: base + 12 * HOUR, zones: { face: 0, neck: 0, hands: choco ? 3 : 0 } });
  }
  const a = analyze(mk(es));
  assert.ok(a.ready);
  const keys = a.suspects.map((i) => i.key);
  assert.ok(keys.includes('chocolate') || keys.includes('fam:cocoa'), keys.join());
  assert.ok(!keys.includes('rice') && !keys.includes('banana'));
});

test('еда после замера не попадает в его окно', () => {
  const t = fromZoned(2026, 9, 1, 12, 0);
  const es = mk([
    { type: 'meal', ts: t - 3 * HOUR, foods: ['apple'] },
    { type: 'skin', ts: t, zones: { face: 2, neck: 0, hands: 0 } },
    { type: 'meal', ts: t + 10 * 60e3, foods: ['chocolate'] },
  ]);
  const a = analyze(es);
  assert.ok(a.items.some((i) => i.key === 'apple'));
  assert.ok(!a.items.some((i) => i.key === 'chocolate' && i.nExp > 0));
});

test('демо-данные: Радар видит спрятанный след', () => {
  const a = analyze(demoEntries('2026-10-16'));
  assert.ok(a.suspects.some((i) => i.key === 'fam:cocoa'));
});

test('дело: сравнение до и во время', () => {
  const es = [];
  for (let d = -10; d < 10; d++) {
    const k = addDays('2026-10-01', d);
    const [y, m, dd] = k.split('-').map(Number);
    es.push({ type: 'skin', ts: fromZoned(y, m, dd, 20, 0), zones: { face: 0, neck: 0, hands: d < 0 ? 3 : 0 } });
  }
  const r = evaluateCase(mk(es), { food: 'chocolate', start: '2026-10-01', days: 10 }, '2026-10-12');
  assert.equal(r.done, true);
  assert.equal(r.outcome, 'better');
});

test('слияние копий: свежая правка побеждает, удалённое не воскресает', () => {
  const a = { ...emptyState(), entries: [{ id: '1', ts: 1, u: 5, type: 'water', n: 1 }, { id: '2', ts: 2, u: 1, type: 'water', n: 1 }], tombstones: { 3: 10 } };
  const b = { ...emptyState(), entries: [{ id: '1', ts: 1, u: 9, type: 'water', n: 2 }, { id: '3', ts: 3, u: 4, type: 'water', n: 1 }], tombstones: { 2: 7 } };
  const m = merge(a, b);
  assert.deepEqual(m.entries.map((e) => [e.id, e.n]), [['1', 2]]);
});

test('бэкап шифруется и не открывается чужим паролем', async () => {
  const s = { ...emptyState(), entries: [{ id: 'x', ts: 1, u: 1, type: 'water', n: 1 }] };
  const text = await encryptState(s, 'secret-pass');
  assert.ok(!text.includes('water'));
  assert.deepEqual((await decryptBackup(text, 'secret-pass')).entries, s.entries);
  await assert.rejects(decryptBackup(text, 'wrong'), BackupError);
});

test('звёзды не зависят от текущего дня, супер-тарелка даёт бонус', () => {
  const ts = fromZoned(2026, 9, 1, 12, 0);
  const s = { ...emptyState(), entries: mk([{ type: 'meal', ts, foods: ['cucumber', 'chicken', 'rice', 'apple'] }]) };
  assert.equal(plateOf(s.entries).size, 4);
  assert.equal(stars(s), 30);
});

test('напитки: вода и без сахара в цель, сладкие отдельно и в Радаре', async () => {
  const { waterOf, sweetOf, stars } = await import('../js/game.js');
  const { entryKeys } = await import('../js/radar.js');
  const day = [
    { type: 'water', n: 1 }, { type: 'water', drink: 'plain', n: 1 },
    { type: 'water', drink: 'sweet', n: 1, foods: ['bubbletea'] },
  ].map((e, i) => ({ id: 'w' + i, u: 1, ts: fromZoned(2026, 9, 1, 10 + i, 0), ...e }));
  assert.equal(waterOf(day), 2);
  assert.equal(sweetOf(day).length, 1);
  assert.equal(stars({ entries: day, cases: [] }), 4);
  assert.deepEqual(entryKeys(day[2]), ['bubbletea', 'fam:dairy']);
  assert.ok(entryKeys({ type: 'meal', foods: ['soup'], place: 'school' }).includes('f:school'));
});
