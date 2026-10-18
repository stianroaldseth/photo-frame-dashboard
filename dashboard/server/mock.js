// Mock payloads, one per widget, in the shapes the real sources will return in phase 4.
// Everything is relative to "today" in Copenhagen so the demo always looks current.
import { cphDate, cphAt, addDays, weekday, isoWeek, WEEKDAYS_DA, TZ } from './time.js';
import { family } from './family.js';
import { parseWeather } from './sources/weather.js';
import { parseRecords, summarize } from './sources/electricity.js';
import { parseIcs } from './sources/ical.js';

export function clock(now = new Date()) {
  const today = cphDate(now);
  return { now: now.toISOString(), timezone: TZ, date: today, weekday: WEEKDAYS_DA[weekday(today)], week: isoWeek(today) };
}

// Calendar, weather and prices go through the real parsers, fed with payloads in the sources' formats,
// so mock and live data always have the same shape.
export function openMeteoSample(now = new Date()) {
  const today = cphDate(now), tomorrow = addDays(today, 1);
  const temps = [7, 7, 6, 6, 6, 6, 7, 8, 9, 10, 11, 12, 13, 13, 13, 12, 11, 10, 9, 9, 8, 8, 7, 7];
  const rain = [0, 0, 0, 0, 0, 0, 0, 10, 20, 10, 5, 5, 10, 20, 30, 60, 70, 50, 20, 10, 0, 0, 0, 0];
  const time = [], hourly = { temperature_2m: [], precipitation_probability: [], precipitation: [], weather_code: [], wind_speed_10m: [], wind_gusts_10m: [], is_day: [] };
  for (const day of [today, tomorrow]) {
    temps.forEach((t, h) => {
      time.push(`${day}T${String(h).padStart(2, '0')}:00`);
      hourly.temperature_2m.push(t);
      hourly.precipitation_probability.push(rain[h]);
      hourly.precipitation.push(rain[h] >= 50 ? 0.8 : 0);
      hourly.weather_code.push(rain[h] >= 50 ? 61 : h > 9 && h < 14 ? 2 : 3);
      hourly.wind_speed_10m.push(4 + (h % 6));
      hourly.wind_gusts_10m.push(8 + (h % 6));
      hourly.is_day.push(h >= 8 && h < 18 ? 1 : 0);
    });
  }
  return {
    current: { temperature_2m: 11, apparent_temperature: 9, precipitation: 0, weather_code: 3, wind_speed_10m: 6, wind_gusts_10m: 11, is_day: 1 },
    hourly: { time, ...hourly },
    daily: { time: [today, tomorrow], temperature_2m_max: [13, 12], temperature_2m_min: [6, 5], precipitation_sum: [2.4, 1.1], weather_code: [61, 61] },
  };
}

export function weather(now = new Date()) {
  return parseWeather(openMeteoSample(now), now);
}

// DayAheadPrices-style records: 15-minute slots, DKK/MWh, cheap at night, peak 17–20.
export function dayAheadSample(now = new Date()) {
  const today = cphDate(now);
  const shape = [1.2, 1.1, 1.0, 0.9, 0.9, 1.0, 1.4, 2.0, 2.1, 1.8, 1.5, 1.3, 1.2, 1.2, 1.3, 1.6, 2.2, 3.1, 3.4, 2.8, 2.0, 1.7, 1.5, 1.3];
  const records = [];
  [0, 1].forEach((d) => shape.forEach((p, h) => [0, 15, 30, 45].forEach((m, q) => {
    const t = cphAt(addDays(today, d), `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    records.push({ TimeUTC: t.toISOString().slice(0, 19), PriceArea: 'DK2', DayAheadPriceDKK: (p + d * 0.1) * 1000 + q * 20 });
  })));
  return { records };
}

export function electricity(now = new Date()) {
  return summarize(parseRecords(dayAheadSample(now).records), { now, chargeHours: 3, dataset: 'mock' });
}

export function photos() {
  return {
    items: ['birkerod-lake', 'beach-day', 'forest-walk', 'snow-day', 'garden'].map((seed, i) => ({
      id: seed, url: `https://picsum.photos/seed/${seed}/800/600`, caption: null, date: null, index: i,
    })),
  };
}

// A family calendar in Google's iCal format, following the conventions in tags.js.
const VTIMEZONE = `BEGIN:VTIMEZONE
TZID:Europe/Copenhagen
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE`;

export function sampleIcs(now = new Date(), env = process.env) {
  const kid1 = family(env)[2].name;
  const today = cphDate(now);
  // Monday of this week, so weekly events land on the same weekdays every week.
  const monday = addDays(today, -((weekday(today) + 6) % 7));
  const d = (ymd) => ymd.replaceAll('-', '');
  let n = 0;
  const vevent = (dates, summary, extra = []) => ['BEGIN:VEVENT', `UID:sample-${++n}@dashboard`, 'DTSTAMP:20260101T000000Z', ...dates, `SUMMARY:${summary}`, ...extra, 'END:VEVENT'].join('\n');
  const timed = (day, from, to, summary, extra) => vevent([
    `DTSTART;TZID=Europe/Copenhagen:${d(day)}T${from.replace(':', '')}00`,
    `DTEND;TZID=Europe/Copenhagen:${d(day)}T${to.replace(':', '')}00`,
  ], summary, extra);
  const allDay = (day, summary) => vevent([`DTSTART;VALUE=DATE:${d(day)}`, `DTEND;VALUE=DATE:${d(addDays(day, 1))}`], summary);
  const weekly = (days, interval = 1) => [`RRULE:FREQ=WEEKLY;INTERVAL=${interval};BYDAY=${days}`];

  const events = [
    timed(monday, '07:45', '08:00', 'Aflevering Stian', weekly('MO,TU,TH')),
    timed(addDays(monday, 2), '07:45', '08:00', 'Aflevering Ulrika', weekly('WE,FR')),
    timed(monday, '15:30', '15:45', 'Hentning Ulrika', weekly('MO,TU,WE')),
    timed(addDays(monday, 3), '15:00', '15:15', 'Hentning Stian', weekly('TH,FR')),
    timed(addDays(monday, 2), '16:30', '17:15', `Svømning ${kid1} #svømning`, ['LOCATION:Birkerød Svømmehal', ...weekly('WE')]),
    timed(addDays(monday, 5), '10:00', '13:00', 'Mormor og morfar #mormor #familie', weekly('SA', 2)),
    timed(today, '09:00', '10:00', 'Møde med banken Ulrika'),
    timed(today, '17:30', '18:30', 'Aftensmad #alle'),
    timed(addDays(today, 1), '18:00', '20:00', 'Fodbold Stian'),
    timed(addDays(today, 2), '08:30', '09:00', `Tandlæge ${kid1} #tandlæge`),
    allDay(addDays(today, 3), 'Skraldespand ud Stian'),
    allDay(addDays(today, 5), 'Mormors fødselsdag #fødselsdag'),
    allDay(addDays(today, 12), 'Fødselsdag i børnehaven #fødselsdag'),
    allDay(addDays(today, 16), 'Sommerhus #familie'),
  ];
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//dashboard//mock//DA', VTIMEZONE, ...events, 'END:VCALENDAR'].join('\n');
}

export function events(now = new Date(), env = process.env) {
  const today = cphDate(now);
  return parseIcs(sampleIcs(now, env), { cal: { owner: 'family' }, people: family(env), fromYmd: addDays(today, -1), toYmd: addDays(today, 35) });
}
