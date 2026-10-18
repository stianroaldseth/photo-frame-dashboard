import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIcs, loadEvents, parseCalendarUrls, detectPeople } from '../server/sources/ical.js';
import { kidsView, dropoffView, calendarView, birthdaysView } from '../server/calendar-widgets.js';
import { splitTags } from '../server/tags.js';
import { family } from '../server/family.js';
import { events as sampleEvents, sampleIcs } from '../server/mock.js';
import { createWidgets } from '../server/widgets.js';

const people = family({ KID1_NAME: 'Alma', KID2_NAME: 'Bo' });
const wrap = (...ev) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...ev, 'END:VCALENDAR'].join('\r\n');
const vevent = (lines) => ['BEGIN:VEVENT', 'DTSTAMP:20260101T000000Z', ...lines, 'END:VEVENT'].join('\r\n');
const range = { people, fromYmd: '2026-10-19', toYmd: '2026-10-26' };

test('CALENDAR_URLS: owner prefixes and webcal://', () => {
  assert.deepEqual(parseCalendarUrls('family=webcal://a/x.ics, https://b/y.ics'), [
    { owner: 'family', url: 'https://a/x.ics' }, { owner: null, url: 'https://b/y.ics' },
  ]);
  assert.deepEqual(parseCalendarUrls(''), []);
});

test('tags are split off the title', () => {
  assert.deepEqual(splitTags('Svømning #svømning #Alma'), { title: 'Svømning', tags: ['svømning', 'alma'] });
  assert.deepEqual(splitTags('#fødselsdag'), { title: '#fødselsdag', tags: ['fødselsdag'] });
});

test('people come from names, #tags, the calendar owner, else everyone', () => {
  assert.deepEqual(detectPeople('Fodbold Stian', [], null, people), ['stian']);
  assert.deepEqual(detectPeople('Tandlæge #alma', ['alma'], null, people), ['kid1']);
  assert.deepEqual(detectPeople('Kristian kommer', [], null, people).length, 4); // no partial-word match
  assert.deepEqual(detectPeople('Møde', [], 'ulrika', people), ['ulrika']);
  assert.deepEqual(detectPeople('Aftensmad #alle', ['alle'], 'ulrika', people).length, 4);
});

test('recurring events: moved, cancelled and excluded instances; UTC, floating and all-day times', () => {
  const ics = wrap(
    vevent(['UID:swim', 'DTSTART:20261019T143000Z', 'DTEND:20261019T151500Z', 'RRULE:FREQ=DAILY;COUNT=7', 'EXDATE:20261021T143000Z', 'SUMMARY:Svømning Alma #svømning']),
    vevent(['UID:swim', 'RECURRENCE-ID:20261022T143000Z', 'DTSTART:20261022T160000Z', 'DTEND:20261022T164500Z', 'SUMMARY:Svømning Alma (flyttet) #svømning']),
    vevent(['UID:swim', 'RECURRENCE-ID:20261023T143000Z', 'DTSTART:20261023T143000Z', 'DTEND:20261023T151500Z', 'STATUS:CANCELLED', 'SUMMARY:Svømning Alma #svømning']),
    vevent(['UID:float', 'DTSTART:20261020T080000', 'DTEND:20261020T090000', 'SUMMARY:Lokal tid']),
    vevent(['UID:bday', 'DTSTART;VALUE=DATE:20261024', 'DTEND;VALUE=DATE:20261025', 'SUMMARY:Mormors fødselsdag']),
    vevent(['UID:old', 'DTSTART:20250101T100000Z', 'DTEND:20250101T110000Z', 'SUMMARY:Gammel']),
  );
  const ev = parseIcs(ics, range);
  const swims = ev.filter((e) => e.id.startsWith('swim')).map((e) => e.start.slice(0, 16));
  assert.deepEqual(swims, ['2026-10-19T14:30', '2026-10-20T14:30', '2026-10-22T16:00', '2026-10-24T14:30', '2026-10-25T14:30']);
  assert.equal(ev.find((e) => e.start.startsWith('2026-10-22')).title, 'Svømning Alma (flyttet)');
  assert.deepEqual(ev.find((e) => e.title === 'Svømning Alma').people, ['kid1']);
  assert.equal(ev.find((e) => e.title === 'Lokal tid').start, '2026-10-20T06:00:00.000Z'); // 08:00 Copenhagen
  assert.deepEqual(ev.find((e) => e.allDay), { ...ev.find((e) => e.allDay), start: '2026-10-24', end: '2026-10-25' });
  assert.equal(ev.some((e) => e.title === 'Gammel'), false);
});

test('Google-style TZID events convert correctly across the DST change', () => {
  const ev = sampleEvents(new Date('2026-10-23T08:00:00Z'), { KID1_NAME: 'Alma' });
  const drops = ev.filter((e) => e.title.startsWith('Aflevering')).map((e) => e.start);
  assert.ok(drops.includes('2026-10-23T05:45:00.000Z')); // Fri 07:45 CEST
  assert.ok(drops.includes('2026-10-26T06:45:00.000Z')); // Mon 07:45 CET
});

test('kids view: default institution, tagged pictures, #fri and weekends', () => {
  const ics = sampleIcs(new Date('2026-10-21T05:00:00Z'), { KID1_NAME: 'Alma', KID2_NAME: 'Bo' });
  const ev = parseIcs(ics, { people, fromYmd: '2026-10-20', toYmd: '2026-11-01' });
  const wed = kidsView(ev, people, new Date('2026-10-21T05:00:00Z'));
  assert.deepEqual(wed.items.map((i) => [i.label, i.who]), [['Vuggestue', ['kid2']], ['Børnehave', ['kid1']], ['Svømning', ['kid1']]]);
  assert.equal(wed.items[1].start, '2026-10-21T05:45:00.000Z'); // from today's drop-off

  const off = [...ev, { id: 'x', title: 'Hjemme', tags: ['fri'], people: ['kid2'], allDay: true, start: '2026-10-21', end: '2026-10-22' }];
  // all-day pictures come first, then by time
  assert.deepEqual(kidsView(off, people, new Date('2026-10-21T05:00:00Z')).items.map((i) => i.label), ['Hjemme', 'Børnehave', 'Svømning']);

  const sat = kidsView(ev, people, new Date('2026-10-24T08:00:00Z'));
  assert.equal(sat.dayType, 'weekend');
  assert.deepEqual(sat.items.map((i) => i.emoji), ['🏠', '👵']);
});

test('drop-off / pick-up, 4-day calendar and birthdays', () => {
  const now = new Date('2026-10-22T05:00:00Z'); // Thursday
  const ev = sampleEvents(now, { KID1_NAME: 'Alma' });
  const d = dropoffView(ev, people, now);
  assert.equal(d.dropoff.who, 'stian');
  assert.equal(d.pickup.who, 'stian');
  assert.equal(d.pickup.time, '2026-10-22T13:00:00.000Z');
  assert.equal(dropoffView([], people, now).dropoff, null);

  const cal = calendarView(ev, people, now);
  assert.deepEqual(cal.days.map((x) => x.date), ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
  assert.ok(cal.days[1].events.some((e) => e.title === 'Fodbold Stian')); // sample: football is tomorrow

  const b = birthdaysView(ev, now);
  assert.deepEqual(b.items.filter((i) => i.type === 'birthday').map((i) => i.title), ['Mormors fødselsdag', 'Fødselsdag i børnehaven']);
  assert.ok(b.items.every((i, k, a) => !k || a[k - 1].date <= i.date));
});

test('a failing calendar fails the refresh (cache then serves stale data)', async () => {
  const fetchImpl = async (url) => url.includes('bad') ? { ok: false, status: 404 } : { ok: true, status: 200, text: async () => wrap() };
  await assert.rejects(loadEvents({ calendars: parseCalendarUrls('a=https://ok/x.ics,b=https://bad/y.ics'), people, fetchImpl }), /calendar b HTTP 404/);
});

test('without CALENDAR_URLS the calendar widgets serve the sample calendar', async () => {
  const w = createWidgets({});
  for (const name of ['kids', 'dropoff', 'calendar', 'birthdays']) {
    const out = await w.get(name).get();
    assert.equal(out.source, 'mock', name);
    assert.ok(out.data, name);
  }
});
