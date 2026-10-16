// Все даты приложения считаются в часовом поясе семьи, а не устройства и не UTC.
export const TZ = 'Europe/Budapest';
export const HOUR = 3600e3;
export const DAY = 24 * HOUR;

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

// epoch ms -> {y, m, d, hh, mm} в TZ
export function zoned(ts) {
  const p = {};
  for (const { type, value } of partsFmt.formatToParts(new Date(ts))) p[type] = value;
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour, mm: +p.minute };
}

const pad = (n) => String(n).padStart(2, '0');

// epoch ms -> 'YYYY-MM-DD' (ключ дня в TZ)
export function dayKey(ts) {
  const z = zoned(ts);
  return `${z.y}-${pad(z.m)}-${pad(z.d)}`;
}

export function timeStr(ts) {
  const z = zoned(ts);
  return `${pad(z.hh)}:${pad(z.mm)}`;
}

// значение для <input type="datetime-local">
export function toInputValue(ts) {
  const z = zoned(ts);
  return `${dayKey(ts)}T${pad(z.hh)}:${pad(z.mm)}`;
}

// локальное время в TZ -> epoch ms (учитывает переход на летнее время)
export function fromZoned(y, m, d, hh = 0, mm = 0) {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let ts = guess;
  for (let i = 0; i < 3; i++) {
    const z = zoned(ts);
    const diff = Date.UTC(z.y, z.m - 1, z.d, z.hh, z.mm) - guess;
    if (diff === 0) break;
    ts -= diff;
  }
  return ts;
}

export function fromInputValue(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v || '');
  if (!m) return NaN;
  return fromZoned(+m[1], +m[2], +m[3], +m[4], +m[5]);
}

// 'YYYY-MM-DD' -> epoch ms полуночи этого дня в TZ
export function dayStart(key) {
  const [y, m, d] = key.split('-').map(Number);
  return fromZoned(y, m, d, 0, 0);
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY);
}

// 0 = понедельник
export function weekday(key) {
  const [y, m, d] = key.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const WEEKDAYS_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];

export function humanDay(key, today) {
  const diff = daysBetween(key, today);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  const [, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS_GEN[m - 1]}, ${WEEKDAYS_FULL[weekday(key)]}`;
}

export function shortDay(key) {
  const [, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS_GEN[m - 1]}`;
}
