import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { createWidget } from '../server/cache.js';
import { createWidgets } from '../server/widgets.js';
import { resolveToken } from '../server/auth.js';
import { isoWeek, cphAt, cphDate, cphTime } from '../server/time.js';

const TOKEN = 'test-token-123';
let server, base;

before(async () => {
  const dist = mkdtempSync(join(tmpdir(), 'dist-'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Dash</title>');
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'assets', 'app-abc.js'), 'console.log(1)');
  const app = createApp({ token: TOKEN, widgets: createWidgets({ MOCK: '1' }), distDir: dist });
  server = createServer((q, s) => app(q, s));
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

test('health check needs no token', async () => {
  assert.equal((await fetch(base + '/healthz')).status, 200);
});

test('page and api are refused without a valid token', async () => {
  assert.equal((await fetch(base + '/')).status, 401);
  assert.equal((await fetch(base + '/?token=wrong')).status, 401);
  assert.equal((await fetch(base + '/api/clock')).status, 401);
  assert.equal((await fetch(base + '/assets/app-abc.js')).status, 401);
});

test('token in URL serves the page and sets a cookie that authorises later requests', async () => {
  const r = await fetch(base + '/?token=' + TOKEN);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  const cookie = r.headers.get('set-cookie');
  assert.match(cookie, /dash_token=.*HttpOnly/);
  const asset = await fetch(base + '/assets/app-abc.js', { headers: { cookie: cookie.split(';')[0] } });
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('cache-control'), /immutable/);
  const api = await fetch(base + '/api/weather', { headers: { cookie: cookie.split(';')[0] } });
  assert.equal(api.status, 200);
});

test('every widget endpoint returns the envelope with data', async () => {
  const { widgets } = await (await fetch(base + '/api?token=' + TOKEN)).json();
  assert.deepEqual(widgets, ['clock', 'kids', 'dropoff', 'calendar', 'weather', 'electricity', 'birthdays', 'photos']);
  for (const w of widgets) {
    const body = await (await fetch(`${base}/api/${w}?token=${TOKEN}`)).json();
    assert.equal(body.widget, w);
    assert.equal(body.stale, false);
    assert.equal(body.source, 'mock');
    assert.ok(body.data, w + ' has data');
    assert.ok(body.updatedAt);
  }
});

test('unknown widget is 404, path traversal is refused', async () => {
  assert.equal((await fetch(`${base}/api/nope?token=${TOKEN}`)).status, 404);
  assert.equal((await fetch(`${base}/..%2f..%2fetc%2fpasswd?token=${TOKEN}`)).status, 404);
});

test('a failing source serves the last good data marked stale', async () => {
  let fail = false;
  const w = createWidget({ name: 't', ttlMs: 1000, load: async () => { if (fail) throw new Error('down'); return { data: { v: 1 }, source: 'x' }; } });
  const ok = await w.get();
  assert.deepEqual([ok.data, ok.stale], [{ v: 1 }, false]);
  fail = true;
  const stale = await w.get(Date.now() + 5000);
  assert.deepEqual([stale.data, stale.stale, stale.error], [{ v: 1 }, true, 'down']);
  const never = await createWidget({ name: 'n', ttlMs: 0, load: async () => { throw new Error('x'); } }).get();
  assert.deepEqual([never.data, never.stale], [null, true]);
});

test('token is required outside dev', () => {
  assert.throws(() => resolveToken({}), /DASHBOARD_TOKEN/);
  assert.equal(resolveToken({ DASHBOARD_TOKEN: ' abc ' }), 'abc');
});

test('ISO week numbers and Copenhagen time', () => {
  assert.equal(isoWeek('2026-10-18'), 42);
  assert.equal(isoWeek('2026-01-01'), 1);
  assert.equal(isoWeek('2027-01-01'), 53);
  assert.equal(isoWeek('2024-12-30'), 1);
  // Summer (UTC+2) and winter (UTC+1), incl. the day DST ends (2026-10-25).
  assert.equal(cphAt('2026-07-01', '08:00').toISOString(), '2026-07-01T06:00:00.000Z');
  assert.equal(cphAt('2026-12-01', '08:00').toISOString(), '2026-12-01T07:00:00.000Z');
  assert.equal(cphAt('2026-10-25', '12:00').toISOString(), '2026-10-25T11:00:00.000Z');
  const t = new Date('2026-10-17T22:30:00Z');
  assert.equal(cphDate(t), '2026-10-18');
  assert.equal(cphTime(t), '00:30');
});
