// One entry per widget → served at /api/<name>. Phase 4 swaps each `load` from mock to a real
// source, one at a time; the cache keeps the last good result if that source fails.
// MOCK=1 forces mock data everywhere (offline development).
import { createWidget } from './cache.js';
import * as mock from './mock.js';
import { loadWeather } from './sources/weather.js';
import { loadElectricity } from './sources/electricity.js';

const MIN = 60 * 1000;
const fromMock = (fn) => async () => ({ data: fn(), source: 'mock' });
const live = (fn, source) => async () => ({ data: await fn(), source });

export function createWidgets(env = process.env) {
  const useMock = env.MOCK === '1';
  const chargeHours = Number(env.CHARGE_HOURS) || 3;
  const defs = [
    { name: 'clock', ttlMs: 0, load: fromMock(mock.clock) },
    { name: 'kids', ttlMs: 5 * MIN, load: fromMock(mock.kids) },
    { name: 'dropoff', ttlMs: 5 * MIN, load: fromMock(mock.dropoff) },
    { name: 'calendar', ttlMs: 5 * MIN, load: fromMock(mock.calendar) },
    { name: 'weather', ttlMs: 15 * MIN, load: useMock ? fromMock(mock.weather) : live(() => loadWeather(), 'open-meteo') },
    { name: 'electricity', ttlMs: 30 * MIN, load: useMock ? fromMock(mock.electricity) : live(() => loadElectricity({ chargeHours }), 'energidataservice') },
    { name: 'birthdays', ttlMs: 60 * MIN, load: fromMock(mock.birthdays) },
    { name: 'photos', ttlMs: 60 * MIN, load: fromMock(mock.photos) },
  ];
  return new Map(defs.map((d) => [d.name, createWidget(d)]));
}
