// One entry per widget → served at /api/<name>. Each `load` is a real source or mock data;
// the cache keeps the last good result if a source fails.
// MOCK=1 forces mock data everywhere (offline development).
import { createWidget } from './cache.js';
import * as mock from './mock.js';
import { family } from './family.js';
import { loadWeather } from './sources/weather.js';
import { loadElectricity } from './sources/electricity.js';
import { loadEvents, parseCalendarUrls } from './sources/ical.js';
import { calendarView, kidsView, dropoffView, birthdaysView } from './calendar-widgets.js';

const MIN = 60 * 1000;
const fromMock = (fn) => async () => ({ data: fn(), source: 'mock' });
const live = (fn, source) => async () => ({ data: await fn(), source });

// A widget computed from another cached widget's data (same freshness and stale marking).
function derive(name, base, fn) {
  return {
    name,
    async get() {
      const b = await base.get();
      return { ...b, data: b.data == null ? null : fn(b.data) };
    },
  };
}

export function createWidgets(env = process.env) {
  const useMock = env.MOCK === '1';
  const chargeHours = Number(env.CHARGE_HOURS) || 3;
  const people = family(env);
  const calendars = parseCalendarUrls(env.CALENDAR_URLS);

  // Widgets 2, 3, 4 and 7 share one calendar fetch.
  const events = createWidget({
    name: 'events', ttlMs: 5 * MIN,
    load: useMock || !calendars.length
      ? fromMock(() => mock.events(new Date(), env))
      : live(() => loadEvents({ calendars, people }), 'ical'),
  });

  const widgets = [
    createWidget({ name: 'clock', ttlMs: 0, load: fromMock(mock.clock) }),
    derive('kids', events, (ev) => kidsView(ev, people)),
    derive('dropoff', events, (ev) => dropoffView(ev, people)),
    derive('calendar', events, (ev) => calendarView(ev, people)),
    createWidget({ name: 'weather', ttlMs: 15 * MIN, load: useMock ? fromMock(mock.weather) : live(() => loadWeather(), 'open-meteo') }),
    createWidget({ name: 'electricity', ttlMs: 30 * MIN, load: useMock ? fromMock(mock.electricity) : live(() => loadElectricity({ chargeHours }), 'energidataservice') }),
    derive('birthdays', events, (ev) => birthdaysView(ev)),
    createWidget({ name: 'photos', ttlMs: 60 * MIN, load: fromMock(mock.photos) }),
  ];
  return new Map(widgets.map((w) => [w.name, w]));
}
