// One entry per widget → served at /api/<name>. Phase 4 swaps each `load` from mock to a real
// source, one at a time; the cache keeps the last good result if that source fails.
import { createWidget } from './cache.js';
import * as mock from './mock.js';

const MIN = 60 * 1000;
const fromMock = (fn) => async () => ({ data: fn(), source: 'mock' });

export function createWidgets() {
  const defs = [
    { name: 'clock', ttlMs: 0, load: fromMock(mock.clock) },
    { name: 'kids', ttlMs: 5 * MIN, load: fromMock(mock.kids) },
    { name: 'dropoff', ttlMs: 5 * MIN, load: fromMock(mock.dropoff) },
    { name: 'calendar', ttlMs: 5 * MIN, load: fromMock(mock.calendar) },
    { name: 'weather', ttlMs: 15 * MIN, load: fromMock(mock.weather) },
    { name: 'electricity', ttlMs: 30 * MIN, load: fromMock(mock.electricity) },
    { name: 'birthdays', ttlMs: 60 * MIN, load: fromMock(mock.birthdays) },
    { name: 'photos', ttlMs: 60 * MIN, load: fromMock(mock.photos) },
  ];
  return new Map(defs.map((d) => [d.name, createWidget(d)]));
}
