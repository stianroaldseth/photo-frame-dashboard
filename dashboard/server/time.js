// Date helpers pinned to Europe/Copenhagen, whatever timezone the server runs in (Railway is UTC).
export const TZ = 'Europe/Copenhagen';

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function parts(d) {
  const p = {};
  for (const x of fmt.formatToParts(d)) p[x.type] = x.value;
  return p;
}

// 'YYYY-MM-DD' of the Copenhagen calendar day containing `d`.
export function cphDate(d = new Date()) {
  const p = parts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

// 'HH:MM' Copenhagen wall-clock time of `d`.
export function cphTime(d = new Date()) {
  const p = parts(d);
  return `${p.hour}:${p.minute}`;
}

// Milliseconds Copenhagen is ahead of UTC at instant `d` (3600000 or 7200000).
function offsetAt(d) {
  const p = parts(d);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(d / 1000) * 1000;
}

// The instant at Copenhagen wall-clock `hm` ('HH:MM') on day `ymd`.
export function cphAt(ymd, hm = '00:00') {
  const [y, m, d] = ymd.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - offsetAt(new Date(guess));
  t = guess - offsetAt(new Date(t)); // second pass settles DST-change days
  return new Date(t);
}

export function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// 0 = Sunday … 6 = Saturday, for a 'YYYY-MM-DD' day.
export function weekday(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// ISO 8601 week number (Danish "uge"), for a 'YYYY-MM-DD' day.
export function isoWeek(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const jan1 = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t - jan1) / 864e5 + 1) / 7);
}

export const WEEKDAYS_DA = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
