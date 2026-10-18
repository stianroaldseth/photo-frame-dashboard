// Data-source adapters, tested against sample payloads in each API's documented format.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWeather, commuteVerdict, weatherUrl } from '../server/sources/weather.js';
import { loadElectricity, parseRecords, toHours, cheapestWindow, pricesUrl } from '../server/sources/electricity.js';
import { openMeteoSample, dayAheadSample } from '../server/mock.js';
import { createWidget } from '../server/cache.js';

const json = (body, status = 200) => async () => ({ ok: status < 400, status, json: async () => body });

test('weather URL asks for Birkerød in Copenhagen time and m/s', () => {
  const u = new URL(weatherUrl());
  assert.equal(u.searchParams.get('timezone'), 'Europe/Copenhagen');
  assert.equal(u.searchParams.get('wind_speed_unit'), 'ms');
  assert.match(u.searchParams.get('latitude'), /^55\.8/);
});

test('weather: parses Open-Meteo and picks the right commute day', async () => {
  const morning = new Date('2026-10-19T05:30:00Z'); // 07:30 Copenhagen
  const w = await loadWeather({ fetchImpl: json(openMeteoSample(morning)), now: morning });
  assert.equal(w.hourly.length, 48);
  assert.equal(w.hourly[0].time, '2026-10-18T22:00:00.000Z'); // 00:00 CEST
  assert.equal(w.commute.morning.day, 'today');
  assert.equal(w.commute.morning.verdict, 'good');
  assert.equal(w.commute.afternoon.verdict, 'bad');
  assert.match(w.commute.afternoon.text, /tag regntøj/);
  assert.equal(w.commute.morning.short, 'Fint');
  assert.equal(w.commute.afternoon.short, 'Regn 70 %');

  const evening = new Date('2026-10-19T17:00:00Z'); // 19:00 → both windows are tomorrow's
  const w2 = await loadWeather({ fetchImpl: json(openMeteoSample(evening)), now: evening });
  assert.equal(w2.commute.morning.day, 'tomorrow');
  assert.equal(w2.commute.afternoon.date, '2026-10-20');
});

test('weather: HTTP errors and odd payloads throw (so the cache serves stale data)', async () => {
  await assert.rejects(loadWeather({ fetchImpl: json({}, 502) }), /HTTP 502/);
  await assert.rejects(loadWeather({ fetchImpl: json({ hourly: {} }) }), /unexpected/);
});

test('commute verdicts', () => {
  const row = (o) => ({ temp: 10, wind: 3, gust: 5, precipProb: 0, precip: 0, code: 1, ...o });
  assert.equal(commuteVerdict([row(), row()]).verdict, 'good');
  assert.equal(commuteVerdict([row({ precipProb: 40 })]).verdict, 'meh');
  assert.equal(commuteVerdict([row({ precipProb: 80, precip: 0.6 }), row({ precip: 0.5 })]).verdict, 'bad');
  assert.equal(commuteVerdict([row({ wind: 8 })]).verdict, 'meh');
  assert.equal(commuteVerdict([row({ gust: 18 })]).verdict, 'bad');
  assert.equal(commuteVerdict([row({ temp: 1 })]).verdict, 'meh');
  assert.equal(commuteVerdict([row({ temp: -4 })]).verdict, 'bad');
  assert.equal(commuteVerdict([row({ code: 73 })]).verdict, 'bad');
  assert.equal(commuteVerdict([]), null);
});

test('prices URL filters DK2 and spans yesterday → day after tomorrow', () => {
  const u = new URL(pricesUrl('DayAheadPrices', '2026-10-18'));
  assert.equal(u.searchParams.get('filter'), '{"PriceArea":["DK2"]}');
  assert.equal(u.searchParams.get('start'), '2026-10-17');
  assert.equal(u.searchParams.get('end'), '2026-10-20');
});

test('electricity: 15-minute DayAheadPrices → hourly DKK/kWh and cheapest window', async () => {
  const now = new Date('2026-10-19T12:10:00Z'); // 14:10 Copenhagen
  const e = await loadElectricity({ fetchImpl: json(dayAheadSample(now)), now });
  assert.equal(e.dataset, 'DayAheadPrices');
  assert.equal(e.hours.length, 48);
  assert.equal(e.tomorrowAvailable, true);
  assert.equal(e.now, 1.33); // 14:00 slot: 1.3 DKK + quarter offsets averaged
  assert.equal(e.cheapest.start, '2026-10-20T00:00:00.000Z'); // 02:00 Copenhagen tomorrow
  assert.equal(e.cheapest.hours, 3);
});

test('electricity: falls back to Elspotprices and to EUR when DKK is missing', async () => {
  const now = new Date('2026-10-19T08:00:00Z');
  let calls = [];
  const fetchImpl = async (url) => {
    calls.push(new URL(url).pathname);
    if (url.includes('DayAheadPrices')) return { ok: true, status: 200, json: async () => ({ records: [] }) };
    // Old hourly format for 19 Oct (Copenhagen), EUR only.
    const records = Array.from({ length: 24 }, (_, h) => ({ HourUTC: new Date(Date.UTC(2026, 9, 18, 22 + h)).toISOString().slice(0, 19), SpotPriceDKK: null, SpotPriceEUR: 100 }));
    return { ok: true, status: 200, json: async () => ({ records }) };
  };
  const e = await loadElectricity({ fetchImpl, now });
  assert.deepEqual(calls, ['/dataset/DayAheadPrices', '/dataset/Elspotprices']);
  assert.equal(e.dataset, 'Elspotprices');
  assert.equal(e.hours.length, 24);
  assert.equal(e.hours[0].price, 0.746);
  assert.equal(e.tomorrowAvailable, false);
});

test('electricity: the DST day has 25 hours; gaps break a charging window', () => {
  const slots = parseRecords(Array.from({ length: 25 }, (_, h) => ({ TimeUTC: new Date(Date.UTC(2026, 9, 24, 22 + h)).toISOString().slice(0, 19), DayAheadPriceDKK: 1000 })));
  assert.equal(toHours(slots, '2026-10-25', '2026-10-26').length, 25);
  const hours = [0, 1, 3, 4].map((h) => ({ start: new Date(Date.UTC(2026, 9, 19, h)).toISOString(), price: h === 3 || h === 4 ? 0.1 : 1 }));
  const w = cheapestWindow(hours, 2, new Date(Date.UTC(2026, 9, 19, 0)));
  assert.equal(w.start, '2026-10-19T03:00:00.000Z');
  assert.equal(cheapestWindow(hours.slice(0, 2), 3, new Date(Date.UTC(2026, 9, 19, 0))), null);
});

test('a failing live source keeps serving the last good data, marked stale', async () => {
  let up = true;
  const w = createWidget({ name: 'weather', ttlMs: 1, load: async () => ({ data: await loadWeather({ fetchImpl: up ? json(openMeteoSample()) : json({}, 503) }), source: 'open-meteo' }) });
  assert.equal((await w.get()).stale, false);
  up = false;
  const s = await w.get(Date.now() + 1000);
  assert.equal(s.stale, true);
  assert.equal(s.data.hourly.length, 48);
  assert.match(s.error, /503/);
});
