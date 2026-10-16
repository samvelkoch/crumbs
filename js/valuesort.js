// «Что для меня важно»: расклад карточек ценностей по колодам и бережный разбор для взрослых.
// Метод полюсов как в psychomirror (Personal Values Card Sort, Miller et al. 2011 + модель Шварца):
// очень важно 2, важно 1, не очень 0, «не знаю» не считается; индекс полюса = средний балл
// его карточек минус общий средний; пограничные ценности делятся между двумя полюсами пополам.

export const DECKS = [
  { id: 'v', emoji: '❤️', label: 'Очень важно', score: 2 },
  { id: 'i', emoji: '👍', label: 'Важно', score: 1 },
  { id: 'n', emoji: '🤷', label: 'Не очень', score: 0 },
  { id: 'u', emoji: '❓', label: 'Не знаю', score: null },
];
export const DECK_BY_ID = Object.fromEntries(DECKS.map((d) => [d.id, d]));

export const POLES = {
  OPENNESS: { label: 'Открытость новому', hint: 'самостоятельность, новые впечатления, удовольствие' },
  CONSERVATION: { label: 'Надёжность и порядок', hint: 'безопасность, правила, традиции' },
  SELF_ENHANCEMENT: { label: 'Свои успехи', hint: 'достижения, признание, вещи и влияние' },
  SELF_TRANSCENDENCE: { label: 'Забота о других', hint: 'дружба, доброта, природа, справедливость' },
};

// 19 ценностей Шварца -> полюса (как в psychomirror/value_cards.py)
export const SCHWARTZ = {
  'SD-T': ['Самостоятельность мысли', ['OPENNESS']],
  'SD-A': ['Самостоятельность действий', ['OPENNESS']],
  ST: ['Новые впечатления', ['OPENNESS']],
  HE: ['Удовольствие', ['OPENNESS', 'SELF_ENHANCEMENT']],
  AC: ['Достижения', ['SELF_ENHANCEMENT']],
  'PO-D': ['Влияние на людей', ['SELF_ENHANCEMENT']],
  'PO-R': ['Вещи и ресурсы', ['SELF_ENHANCEMENT']],
  FA: ['Репутация', ['SELF_ENHANCEMENT', 'CONSERVATION']],
  'SE-P': ['Личная безопасность', ['CONSERVATION']],
  'SE-S': ['Безопасность вокруг', ['CONSERVATION']],
  TR: ['Традиции', ['CONSERVATION']],
  'CO-R': ['Правила', ['CONSERVATION']],
  'CO-I': ['Не обижать других', ['CONSERVATION']],
  HU: ['Скромность', ['CONSERVATION', 'SELF_TRANSCENDENCE']],
  'BE-D': ['Надёжность для близких', ['SELF_TRANSCENDENCE']],
  'BE-C': ['Забота о близких', ['SELF_TRANSCENDENCE']],
  'UN-C': ['Справедливость', ['SELF_TRANSCENDENCE']],
  'UN-N': ['Природа', ['SELF_TRANSCENDENCE']],
  'UN-T': ['Принятие других', ['SELF_TRANSCENDENCE']],
  OUTSIDE: ['Вне модели', []],
};

// decks: { cardId: 'v'|'i'|'n'|'u' } -> { poleKey: { index, n } } или null, если данных мало
export function poleIndices(decks, cards) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const scored = [];
  for (const [id, d] of Object.entries(decks)) {
    const c = byId.get(id);
    const sc = DECK_BY_ID[d]?.score;
    if (!c || sc == null || !SCHWARTZ[c.s] || c.s === 'OUTSIDE') continue;
    scored.push({ c, sc });
  }
  if (scored.length < 8) return null;
  const mean = scored.reduce((a, x) => a + x.sc, 0) / scored.length;
  const acc = Object.fromEntries(Object.keys(POLES).map((p) => [p, { w: 0, sum: 0 }]));
  for (const { c, sc } of scored) {
    const poles = SCHWARTZ[c.s][1];
    for (const p of poles) {
      acc[p].w += 1 / poles.length;
      acc[p].sum += sc / poles.length;
    }
  }
  return Object.fromEntries(Object.entries(acc).map(([p, a]) => [p, { index: a.w ? a.sum / a.w - mean : 0, n: Math.round(a.w * 10) / 10 }]));
}

// Что поменялось между двумя раскладами: подняла выше / опустила ниже (колоду «не знаю» не сравниваем)
export function sortDiff(prev, cur) {
  const up = [];
  const down = [];
  for (const [id, d] of Object.entries(cur)) {
    const a = DECK_BY_ID[prev[id]]?.score;
    const b = DECK_BY_ID[d]?.score;
    if (a == null || b == null || a === b) continue;
    (b > a ? up : down).push(id);
  }
  return { up, down };
}

const fmt = (x) => (Math.abs(x) < 0.005 ? '0.00' : (x > 0 ? '+' : '') + x.toFixed(2));

// Текст для вставки в Claude: расклад + бережное задание. Имени ребёнка в тексте нет.
export function claudePrompt(sorts, cards, age = '9') {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const cur = sorts[sorts.length - 1];
  const deckText = DECKS.map((d) => {
    const l = Object.entries(cur.decks).filter(([, x]) => x === d.id).map(([id]) => byId.get(id)).filter(Boolean);
    return `### ${d.label} (${l.length})\n${l.map((c) => `- ${c.n}: ${c.d} [${c.s}]`).join('\n') || '- пусто'}`;
  }).join('\n\n');
  const pi = poleIndices(cur.decks, cards);
  const poleText = pi ? Object.entries(pi).map(([p, v]) => `- ${POLES[p].label} (${p}): ${fmt(v.index)}`).join('\n') : 'Недостаточно данных.';
  let diffText = '';
  if (sorts.length > 1) {
    const prev = sorts[sorts.length - 2];
    const { up, down } = sortDiff(prev.decks, cur.decks);
    const names = (ids) => ids.map((id) => byId.get(id)?.n).filter(Boolean).join(', ') || 'нет';
    diffText = `\n\n## Изменения с прошлого расклада (${new Date(prev.ts).toLocaleDateString('ru-RU')})\nСтало важнее: ${names(up)}\nСтало менее важно: ${names(down)}`;
  }
  return `# Задание: бережный взгляд на детский расклад ценностей

Я родитель. Моя дочь (${age} лет) в детском приложении разложила карточки «Что для меня важно» по колодам: «Очень важно», «Важно», «Не очень», «Не знаю». Это адаптация Personal Values Card Sort (Miller и соавт., 2011) для детей; привязка карточек к ценностям Шварца экспертная и не валидирована. В детстве ценности только формируются и меняются, ребёнок мог выбирать по настроению или из желания «правильно ответить».

## Что мне нужно
1. Коротко (5–7 предложений): какие склонности и интересы видны в раскладе.
2. Сильные стороны, на которые можно опираться.
3. Что может быть интересно обсудить: 3–5 тем и мягкие вопросы, которые я могу задать дочери (на её языке, без допроса).
4. Если есть сочетания, на которые взрослому стоит обратить внимание (например, сильная важность одобрения других или «быть лучшей»), опиши их спокойно и предложи, как поддержать.
5. Идеи занятий, игр, кружков, которые откликаются на её выбор.

## Ограничения
- Никаких диагнозов, ярлыков и типов личности. Формулировки «может говорить о», «похоже, ей интересно».
- Не оценивай ребёнка как хорошего или плохого; все ценности нормальны.
- Индексы полюсов ниже грубые, на одном раскладе выводов не строить.
- Ответ на русском, тёплым и простым языком, 500–900 слов.

## Данные расклада (${new Date(cur.ts).toLocaleDateString('ru-RU')})

${deckText}

## Индексы полюсов Шварца
Метод: очень важно 2, важно 1, не очень 0, «не знаю» не учитывается; индекс = средний балл карточек полюса минус общий средний; пограничные ценности делятся между полюсами; карточки вне модели не учитываются. Положительный индекс значит «важнее среднего».
${poleText}${diffText}
`;
}
