// Mock payloads, one per widget, in the shapes the real sources will return in phase 4.
// Everything is relative to "today" in Copenhagen so the demo always looks current.
import { cphDate, cphAt, addDays, weekday, isoWeek, WEEKDAYS_DA, TZ } from './time.js';
import { family } from './family.js';
import { parseWeather } from './sources/weather.js';
import { parseRecords, summarize } from './sources/electricity.js';

const iso = (ymd, hm) => cphAt(ymd, hm).toISOString();
const isWeekend = (ymd) => [0, 6].includes(weekday(ymd));

export function clock(now = new Date()) {
  const today = cphDate(now);
  return { now: now.toISOString(), timezone: TZ, date: today, weekday: WEEKDAYS_DA[weekday(today)], week: isoWeek(today) };
}

// Icon-first plan for the kids. `icon` is a keyword the frontend maps to a picture.
export function kids(now = new Date()) {
  const today = cphDate(now);
  if (isWeekend(today)) {
    return {
      date: today, dayType: 'weekend',
      items: [
        { icon: 'weekend', label: 'Weekend', who: ['kid1', 'kid2'] },
        { icon: 'swimming', label: 'Svømning', who: ['kid1'], start: iso(today, '10:00'), end: iso(today, '10:45') },
        { icon: 'grandparents', label: 'Bedsteforældre', who: ['kid1', 'kid2'], start: iso(today, '14:00'), end: iso(today, '17:00') },
      ],
    };
  }
  return {
    date: today, dayType: 'weekday',
    items: [
      { icon: 'kindergarten', label: 'Børnehave', who: ['kid1'], start: iso(today, '07:45'), end: iso(today, '15:30') },
      { icon: 'nursery', label: 'Vuggestue', who: ['kid2'], start: iso(today, '07:45'), end: iso(today, '15:30') },
      { icon: 'dinner', label: 'Aftensmad', who: ['kid1', 'kid2'], start: iso(today, '17:30') },
    ],
  };
}

export function dropoff(now = new Date()) {
  const today = cphDate(now);
  if (isWeekend(today)) return { date: today, place: 'Pilegården', dropoff: null, pickup: null };
  const even = isoWeek(today) % 2 === 0;
  return {
    date: today, place: 'Pilegården',
    dropoff: { who: even ? 'stian' : 'ulrika', time: iso(today, '07:45') },
    pickup: { who: even ? 'ulrika' : 'stian', time: iso(today, '15:30') },
  };
}

export function calendar(now = new Date()) {
  const today = cphDate(now);
  const ev = (d, s, e, title, people, extra = {}) => ({ title, start: iso(addDays(today, d), s), end: iso(addDays(today, d), e), allDay: false, people, ...extra });
  const allDay = (d, title, people) => ({ title, start: addDays(today, d), end: addDays(today, d + 1), allDay: true, people });
  const events = [
    ev(0, '07:45', '08:00', 'Aflevering Pilegården', ['stian']),
    ev(0, '09:00', '10:00', 'Møde', ['ulrika'], { location: 'Kontoret' }),
    ev(0, '15:30', '15:45', 'Hentning Pilegården', ['ulrika']),
    ev(0, '17:30', '18:30', 'Aftensmad', ['stian', 'ulrika', 'kid1', 'kid2']),
    allDay(1, 'Skraldespand ud', ['stian']),
    ev(1, '16:30', '17:15', 'Svømning', ['kid1', 'ulrika'], { location: 'Birkerød Svømmehal' }),
    ev(2, '18:00', '20:00', 'Fodbold', ['stian']),
    ev(3, '14:00', '17:00', 'Mormor og morfar', ['kid1', 'kid2']),
  ].map((e, i) => ({ id: 'mock-' + i, ...e }));
  return {
    people: family(),
    days: [0, 1, 2, 3].map((d) => {
      const date = addDays(today, d);
      return { date, events: events.filter((e) => (e.allDay ? e.start : cphDate(new Date(e.start))) === date) };
    }),
  };
}

// Weather and prices go through the real parsers, fed with payloads in the sources' formats,
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

export function birthdays(now = new Date()) {
  const today = cphDate(now);
  return {
    month: today.slice(0, 7),
    items: [
      { date: addDays(today, 5), title: 'Mormors fødselsdag', type: 'birthday', age: 68 },
      { date: addDays(today, 9), title: 'Efterårsferie slut', type: 'event' },
      { date: addDays(today, 12), title: 'Fødselsdag i børnehaven', type: 'event' },
    ],
  };
}

export function photos() {
  return {
    items: ['birkerod-lake', 'beach-day', 'forest-walk', 'snow-day', 'garden'].map((seed, i) => ({
      id: seed, url: `https://picsum.photos/seed/${seed}/800/600`, caption: null, date: null, index: i,
    })),
  };
}
