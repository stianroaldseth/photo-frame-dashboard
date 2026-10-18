// Mock payloads, one per widget, in the shapes the real sources will return in phase 4.
// Everything is relative to "today" in Copenhagen so the demo always looks current.
import { cphDate, cphAt, addDays, weekday, isoWeek, WEEKDAYS_DA, TZ } from './time.js';
import { family } from './family.js';

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

export function weather(now = new Date()) {
  const today = cphDate(now);
  const temps = [7, 7, 6, 6, 6, 6, 7, 8, 9, 10, 11, 12, 13, 13, 13, 12, 11, 10, 9, 9, 8, 8, 7, 7];
  const rain = [0, 0, 0, 0, 0, 0, 0, 10, 20, 10, 5, 5, 10, 20, 30, 60, 70, 50, 20, 10, 0, 0, 0, 0];
  const hourly = temps.map((t, h) => ({
    time: iso(today, String(h).padStart(2, '0') + ':00'),
    temp: t, precipProb: rain[h], precip: rain[h] >= 50 ? 0.8 : 0, wind: 5 + (h % 6), code: rain[h] >= 50 ? 61 : 3,
  }));
  return {
    location: 'Birkerød',
    now: { temp: 11, feelsLike: 9, code: 3, wind: 6, gust: 11, precip: 0 },
    today: { min: 6, max: 13, precipSum: 2.4, code: 61 },
    hourly,
    commute: {
      morning: { from: '07:00', to: '09:00', verdict: 'good', temp: 8, wind: 7, precipProb: 20, text: 'Fint cykelvejr' },
      afternoon: { from: '15:00', to: '17:00', verdict: 'bad', temp: 12, wind: 9, precipProb: 70, text: 'Regn – tag regntøj' },
    },
  };
}

export function electricity(now = new Date()) {
  const today = cphDate(now);
  // DKK/kWh incl. typical shape: cheap at night, peak 17–20.
  const shape = [1.2, 1.1, 1.0, 0.9, 0.9, 1.0, 1.4, 2.0, 2.1, 1.8, 1.5, 1.3, 1.2, 1.2, 1.3, 1.6, 2.2, 3.1, 3.4, 2.8, 2.0, 1.7, 1.5, 1.3];
  const hours = [0, 1].flatMap((d) => shape.map((p, h) => ({
    start: iso(addDays(today, d), String(h).padStart(2, '0') + ':00'),
    price: Math.round((p + d * 0.1) * 100) / 100,
  })));
  return {
    area: 'DK2', unit: 'DKK/kWh', includesTariffs: false, hours,
    cheapest: { start: iso(addDays(today, 1), '02:00'), end: iso(addDays(today, 1), '05:00'), avgPrice: 1.03, hours: 3 },
  };
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
