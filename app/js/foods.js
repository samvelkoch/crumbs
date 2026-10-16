// Каталог продуктов, семейства для Радара и распознавание свободного ввода.

export const SECTORS = {
  veg: { label: 'Овощи', emoji: '🥦', color: 'var(--c-veg)' },
  prot: { label: 'Белок', emoji: '🍗', color: 'var(--c-prot)' },
  carb: { label: 'Гарнир', emoji: '🍚', color: 'var(--c-carb)' },
  fruit: { label: 'Фрукты', emoji: '🍏', color: 'var(--c-fruit)' },
  treat: { label: 'Сладкое и перекусы', emoji: '🍪', color: 'var(--c-treat)' },
  drink: { label: 'Напитки и молочное', emoji: '🥤', color: 'var(--c-drink)' },
};

// Семейства объединяют продукты, у которых общий компонент. Радар проверяет и их.
export const FAMILIES = {
  dairy: 'Всё молочное',
  wheat: 'Всё с пшеницей',
  egg: 'Всё с яйцом',
  nuts: 'Все орехи',
  cocoa: 'Всё с какао',
  citrus: 'Все цитрусовые',
  redberry: 'Красные ягоды',
  fish: 'Рыба и морепродукты',
};

// stems: начала слов, по которым узнаём продукт в тексте (без ё, в нижнем регистре)
export const FOODS = [
  // овощи
  { id: 'cucumber', label: 'Огурец', emoji: '🥒', sector: 'veg', stems: ['огур'] },
  { id: 'tomato', label: 'Помидор', emoji: '🍅', sector: 'veg', stems: ['помид', 'томат', 'черри'] },
  { id: 'carrot', label: 'Морковь', emoji: '🥕', sector: 'veg', stems: ['морко'] },
  { id: 'broccoli', label: 'Брокколи', emoji: '🥦', sector: 'veg', stems: ['брокк'] },
  { id: 'cabbage', label: 'Капуста', emoji: '🥬', sector: 'veg', stems: ['капуст'] },
  { id: 'pepper', label: 'Перец', emoji: '🫑', sector: 'veg', stems: ['перец', 'перц'] },
  { id: 'greens', label: 'Зелень, салат', emoji: '🌿', sector: 'veg', stems: ['салат', 'зелен', 'укроп', 'петруш', 'шпинат'] },
  { id: 'beet', label: 'Свёкла', emoji: '🟣', sector: 'veg', stems: ['свекл'] },
  { id: 'zucchini', label: 'Кабачок', emoji: '🥒', sector: 'veg', stems: ['кабач', 'цукин'] },
  { id: 'corn', label: 'Кукуруза', emoji: '🌽', sector: 'veg', stems: ['кукуруз'] },
  { id: 'peas', label: 'Горошек', emoji: '🫛', sector: 'veg', stems: ['горош'] },
  // белок
  { id: 'chicken', label: 'Курица', emoji: '🍗', sector: 'prot', stems: ['куриц', 'курин', 'наггетс'] },
  { id: 'turkey', label: 'Индейка', emoji: '🦃', sector: 'prot', stems: ['индей', 'индюш'] },
  { id: 'beef', label: 'Говядина', emoji: '🥩', sector: 'prot', stems: ['говяд', 'телят', 'мяс', 'стейк', 'фарш'] },
  { id: 'pork', label: 'Свинина', emoji: '🥓', sector: 'prot', stems: ['свин', 'бекон', 'ветчин'] },
  { id: 'sausage', label: 'Сосиски, колбаса', emoji: '🌭', sector: 'prot', stems: ['сосис', 'колбас', 'сардел'] },
  { id: 'fish', label: 'Рыба', emoji: '🐟', sector: 'prot', fam: ['fish'], stems: ['рыб', 'лосос', 'семг', 'треск', 'тунец', 'тунц', 'форел', 'минта'] },
  { id: 'shrimp', label: 'Креветки', emoji: '🦐', sector: 'prot', fam: ['fish'], stems: ['кревет', 'морепрод', 'кальмар'] },
  { id: 'egg', label: 'Яйца', emoji: '🥚', sector: 'prot', fam: ['egg'], stems: ['яйц', 'яйк', 'яичн', 'омлет'] },
  { id: 'cheese', label: 'Сыр', emoji: '🧀', sector: 'prot', fam: ['dairy'], stems: ['сыр', 'моцарел', 'пармез'] },
  { id: 'cottage', label: 'Творог', emoji: '🥣', sector: 'prot', fam: ['dairy'], stems: ['творо', 'творож'] },
  { id: 'beans', label: 'Фасоль, чечевица', emoji: '🫘', sector: 'prot', stems: ['фасол', 'чечев', 'нут', 'хумус'] },
  // гарнир
  { id: 'rice', label: 'Рис', emoji: '🍚', sector: 'carb', stems: ['рис'] },
  { id: 'buckwheat', label: 'Гречка', emoji: '🥣', sector: 'carb', stems: ['греч'] },
  { id: 'oats', label: 'Овсянка', emoji: '🥣', sector: 'carb', stems: ['овся', 'овес', 'гранол', 'мюсли'] },
  { id: 'pasta', label: 'Макароны', emoji: '🍝', sector: 'carb', fam: ['wheat'], stems: ['макар', 'паст', 'спагет', 'лапш', 'вермиш'] },
  { id: 'potato', label: 'Картофель', emoji: '🥔', sector: 'carb', stems: ['картоф', 'картош', 'пюре', 'фри'] },
  { id: 'bread', label: 'Хлеб', emoji: '🍞', sector: 'carb', fam: ['wheat'], stems: ['хлеб', 'тост', 'батон', 'булк', 'бутер', 'лаваш', 'багет'] },
  { id: 'semolina', label: 'Манка', emoji: '🥣', sector: 'carb', fam: ['wheat'], stems: ['манк', 'манн'] },
  { id: 'corncereal', label: 'Хлопья', emoji: '🥣', sector: 'carb', stems: ['хлопь', 'кукурузн'] },
  // фрукты
  { id: 'apple', label: 'Яблоко', emoji: '🍏', sector: 'fruit', stems: ['ябло'] },
  { id: 'pear', label: 'Груша', emoji: '🍐', sector: 'fruit', stems: ['груш'] },
  { id: 'banana', label: 'Банан', emoji: '🍌', sector: 'fruit', stems: ['банан'] },
  { id: 'orange', label: 'Апельсин', emoji: '🍊', sector: 'fruit', fam: ['citrus'], stems: ['апельс', 'мандар', 'клемент'] },
  { id: 'lemon', label: 'Лимон, лайм', emoji: '🍋', sector: 'fruit', fam: ['citrus'], stems: ['лимон', 'лайм', 'грейпф'] },
  { id: 'strawberry', label: 'Клубника', emoji: '🍓', sector: 'fruit', fam: ['redberry'], stems: ['клубн', 'земляни'] },
  { id: 'raspberry', label: 'Малина', emoji: '🫐', sector: 'fruit', fam: ['redberry'], stems: ['малин'] },
  { id: 'blueberry', label: 'Голубика, черника', emoji: '🫐', sector: 'fruit', stems: ['голуб', 'черник'] },
  { id: 'grape', label: 'Виноград', emoji: '🍇', sector: 'fruit', stems: ['виног', 'изюм'] },
  { id: 'kiwi', label: 'Киви', emoji: '🥝', sector: 'fruit', stems: ['киви'] },
  { id: 'peach', label: 'Персик', emoji: '🍑', sector: 'fruit', stems: ['персик', 'нектар', 'абрикос'] },
  { id: 'melon', label: 'Арбуз, дыня', emoji: '🍉', sector: 'fruit', stems: ['арбуз', 'дын'] },
  // сладкое и перекусы
  { id: 'chocolate', label: 'Шоколад', emoji: '🍫', sector: 'treat', fam: ['cocoa'], stems: ['шокол', 'нутелл', 'киндер'] },
  { id: 'candy', label: 'Конфеты', emoji: '🍬', sector: 'treat', stems: ['конфет', 'леденц', 'мармел', 'чупа', 'пастил', 'зефир'] },
  { id: 'cookies', label: 'Печенье', emoji: '🍪', sector: 'treat', fam: ['wheat'], stems: ['печен', 'крекер', 'вафл'] },
  { id: 'pastry', label: 'Выпечка, торт', emoji: '🧁', sector: 'treat', fam: ['wheat', 'egg', 'dairy'], stems: ['торт', 'пирож', 'кекс', 'маффин', 'круасс', 'булоч', 'выпеч', 'пончик'] },
  { id: 'icecream', label: 'Мороженое', emoji: '🍦', sector: 'treat', fam: ['dairy'], stems: ['морожен', 'пломб'] },
  { id: 'honey', label: 'Мёд', emoji: '🍯', sector: 'treat', stems: ['мед$', 'меда$', 'медом$', 'медов'] },
  { id: 'nuts', label: 'Орехи', emoji: '🥜', sector: 'treat', fam: ['nuts'], stems: ['орех', 'фундук', 'миндал', 'кешью', 'арахис', 'фисташ'] },
  { id: 'chips', label: 'Чипсы, снеки', emoji: '🥨', sector: 'treat', stems: ['чипс', 'снек', 'сухар', 'попкорн'] },
  { id: 'jam', label: 'Варенье, джем', emoji: '🍯', sector: 'treat', stems: ['варен', 'джем', 'конфитюр'] },
  // напитки
  { id: 'milk', label: 'Молоко', emoji: '🥛', sector: 'drink', fam: ['dairy'], stems: ['молок', 'молоч'] },
  { id: 'kefir', label: 'Кефир, йогурт', emoji: '🥛', sector: 'drink', fam: ['dairy'], stems: ['кефир', 'йогур', 'ряжен', 'айран', 'простокв'] },
  { id: 'sourcream', label: 'Сметана, сливки', emoji: '🥄', sector: 'drink', fam: ['dairy'], stems: ['сметан', 'сливк', 'сливоч'] },
  { id: 'cocoa', label: 'Какао', emoji: '☕', sector: 'drink', fam: ['cocoa', 'dairy'], stems: ['какао'] },
  { id: 'juice', label: 'Сок', emoji: '🧃', sector: 'drink', stems: ['сок'] },
  { id: 'compote', label: 'Компот, морс', emoji: '🍹', sector: 'drink', stems: ['компот', 'морс'] },
  { id: 'tea', label: 'Чай', emoji: '🍵', sector: 'drink', stems: ['чай', 'чаю'] },
  { id: 'soda', label: 'Газировка', emoji: '🥤', sector: 'drink', stems: ['газир', 'кола', 'лимонад', 'спрайт', 'фанта'] },
];

// Блюда раскладываются на продукты. Ключ: начало слова.
export const DISHES = [
  { stems: ['борщ'], label: 'Борщ', foods: ['beet', 'cabbage', 'potato', 'carrot', 'beef'] },
  { stems: ['щи'], label: 'Щи', foods: ['cabbage', 'potato', 'carrot', 'beef'] },
  { stems: ['блин', 'олад', 'панкейк'], label: 'Блины', foods: ['bread', 'egg', 'milk'] },
  { stems: ['сырник'], label: 'Сырники', foods: ['cottage', 'egg', 'bread'] },
  { stems: ['запеканк'], label: 'Запеканка', foods: ['cottage', 'egg', 'semolina'] },
  { stems: ['пицц'], label: 'Пицца', foods: ['bread', 'cheese', 'tomato'] },
  { stems: ['пельмен', 'варени'], label: 'Пельмени', foods: ['bread', 'beef'] },
  { stems: ['котлет', 'тефтел', 'фрикад'], label: 'Котлеты', foods: ['beef', 'bread', 'egg'] },
  { stems: ['оливье'], label: 'Оливье', foods: ['potato', 'carrot', 'egg', 'peas', 'sausage', 'cucumber'] },
  { stems: ['винегрет'], label: 'Винегрет', foods: ['beet', 'potato', 'carrot', 'peas', 'cucumber'] },
  { stems: ['бургер', 'гамбург', 'чизбург'], label: 'Бургер', foods: ['bread', 'beef', 'cheese', 'tomato'] },
  { stems: ['шаурм'], label: 'Шаурма', foods: ['bread', 'chicken', 'cabbage', 'tomato'] },
  { stems: ['суши', 'ролл'], label: 'Суши', foods: ['rice', 'fish'] },
  { stems: ['плов'], label: 'Плов', foods: ['rice', 'beef', 'carrot'] },
  { stems: ['гуляш'], label: 'Гуляш', foods: ['beef', 'pepper', 'tomato', 'potato'] },
  { stems: ['лечо'], label: 'Лечо', foods: ['pepper', 'tomato'] },
  { stems: ['бульон', 'суп'], label: 'Суп', generic: true, foods: ['chicken', 'carrot', 'potato'] },
  { stems: ['каш'], label: 'Каша', generic: true, foods: ['oats', 'milk'] },
  { stems: ['смузи'], label: 'Смузи', foods: ['banana', 'strawberry', 'kefir'] },
  { stems: ['чизкейк'], label: 'Чизкейк', foods: ['cottage', 'cookies', 'egg'] },
  { stems: ['бутерброд'], label: 'Бутерброд', generic: true, foods: ['bread', 'cheese'] },
];

export const FAMILY_EMOJI = { dairy: '🥛', wheat: '🌾', egg: '🥚', nuts: '🥜', cocoa: '🍫', citrus: '🍊', redberry: '🍓', fish: '🐟' };

export const FOOD_BY_ID = Object.fromEntries(FOODS.map((f) => [f.id, f]));

export const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').trim();

// id продукта -> подпись для показа. Свой продукт хранится как 'x:текст'.
export function foodLabel(id) {
  if (FOOD_BY_ID[id]) return FOOD_BY_ID[id].label;
  if (id.startsWith('x:')) return id.slice(2).replace(/^./, (c) => c.toUpperCase());
  if (id.startsWith('fam:')) return FAMILIES[id.slice(4)] || id;
  return id;
}

export function foodEmoji(id) {
  return FOOD_BY_ID[id]?.emoji || (id.startsWith('fam:') ? FAMILY_EMOJI[id.slice(4)] || '🧺' : '🍽️');
}

export function foodFamilies(id) {
  return FOOD_BY_ID[id]?.fam || [];
}

export function foodSector(id) {
  return FOOD_BY_ID[id]?.sector || null;
}

// Стем 'xxx$' означает слово целиком, остальные — начало слова.
function stemHit(word, stem) {
  return stem.endsWith('$') ? word === stem.slice(0, -1) : word.startsWith(stem);
}

// Самый длинный подходящий стем побеждает: «нутелла» — шоколад, а не нут.
function bestFood(word) {
  let best = null;
  let len = 0;
  for (const f of FOODS) {
    for (const s of f.stems) {
      if (s.length > len && stemHit(word, s)) { best = f; len = s.length; }
    }
  }
  return best;
}

// «Борщ и хлеб, клубника с йогуртом» -> [{text, kind, label?, foods:[id]}]
export function parseFreeText(text) {
  const chunks = norm(text)
    .split(/[,;\n+]|\s+и\s+|\s+с\s+|\s+со\s+/)
    .map((c) => c.replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const out = [];
  for (const chunk of chunks) {
    const words = chunk.split(' ');
    const dish = DISHES.find((d) => words.some((w) => d.stems.some((s) => stemHit(w, s))));
    const foods = [];
    for (const w of words) {
      if (w.length < 3 || (dish && dish.stems.some((s) => stemHit(w, s)))) continue;
      const f = bestFood(w);
      if (f && !foods.includes(f.id)) foods.push(f.id);
    }
    if (dish && !(dish.generic && foods.length)) {
      const all = [...new Set([...dish.foods, ...foods])];
      out.push({ text: chunk, kind: 'dish', label: dish.label, foods: all });
    } else if (foods.length) {
      out.push({ text: chunk, kind: 'food', foods });
    } else if (chunk.length >= 2) {
      out.push({ text: chunk, kind: 'custom', foods: ['x:' + chunk.slice(0, 40)] });
    }
  }
  return out;
}

// Семейства и сектора тарелки для набора продуктов
export function expandFamilies(foodIds) {
  const fams = new Set();
  for (const id of foodIds) for (const f of foodFamilies(id)) fams.add('fam:' + f);
  return [...fams];
}

// Внешние улики: не еда, но тоже могут влиять на кожу. В Радаре идут с префиксом 'f:'.
export const FACTORS = [
  { id: 'cream', label: 'Новый крем или мыло', emoji: '🧴' },
  { id: 'pool', label: 'Бассейн', emoji: '🏊' },
  { id: 'sport', label: 'Спорт, было жарко', emoji: '🏃' },
  { id: 'heat', label: 'Жара, солнце', emoji: '🌞' },
  { id: 'cold', label: 'Мороз, ветер', emoji: '🥶' },
  { id: 'sleep', label: 'Мало сна', emoji: '😴' },
  { id: 'stress', label: 'Волнение', emoji: '💭' },
  { id: 'pet', label: 'Гладили животных', emoji: '🐈' },
  { id: 'wool', label: 'Шерсть, новая одежда', emoji: '🧶' },
  { id: 'plants', label: 'Трава, цветы', emoji: '🌼' },
  { id: 'sick', label: 'Простуда', emoji: '🤧' },
  { id: 'meds', label: 'Лекарство', emoji: '💊' },
];
export const FACTOR_BY_ID = Object.fromEntries(FACTORS.map((f) => [f.id, f]));

// Подпись для любого ключа Радара: продукт, семейство или улика
export function itemLabel(key) {
  if (key.startsWith('f:')) return FACTOR_BY_ID[key.slice(2)]?.label || key.slice(2);
  return foodLabel(key);
}
export function itemEmoji(key) {
  if (key.startsWith('f:')) return FACTOR_BY_ID[key.slice(2)]?.emoji || '🔎';
  return foodEmoji(key);
}
