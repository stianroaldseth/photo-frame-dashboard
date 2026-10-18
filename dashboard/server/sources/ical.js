// Shared Google Calendar(s) via their secret iCal addresses. Expands recurring events (with
// moved/cancelled instances) into plain events with people and #tags.
//
// CALENDAR_URLS is a comma-separated list. Prefix a URL with a person id to make that the
// default person for its events: "family=https://…/basic.ics,stian=https://…/basic.ics".
import ICAL from 'ical.js';
import { cphAt, cphDate, addDays } from '../time.js';
import { splitTags, EVERYONE } from '../tags.js';

export function parseCalendarUrls(value = '') {
  return value.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = s.match(/^([a-z0-9_-]+)=(.+)$/i);
    const url = (m ? m[2] : s).replace(/^webcal:/i, 'https:');
    return { owner: m ? m[1].toLowerCase() : null, url };
  });
}

const pad = (n) => String(n).padStart(2, '0');

// ical.js time → { date: Date, ymd } honouring its zone; floating or unknown zones are read as
// Copenhagen wall time (the server itself runs in UTC).
function toInstant(t) {
  const ymd = `${t.year}-${pad(t.month)}-${pad(t.day)}`;
  if (t.isDate) return { allDay: true, ymd };
  const zone = t.zone;
  const known = zone && (zone === ICAL.Timezone.utcTimezone || zone.tzid === 'UTC' || zone.component);
  return { allDay: false, date: known ? t.toJSDate() : cphAt(ymd, `${pad(t.hour)}:${pad(t.minute)}`) };
}

// People on an event: names or #name tags in the title, else the calendar's owner, else everyone.
export function detectPeople(rawTitle, tags, owner, people) {
  if (tags.some((t) => EVERYONE.includes(t))) return people.map((p) => p.id);
  const lower = rawTitle.toLowerCase();
  const named = people.filter((p) => {
    const n = p.name.toLowerCase();
    return tags.includes(n) || new RegExp(`(^|[^\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'u').test(lower);
  }).map((p) => p.id);
  if (named.length) return named;
  if (owner && people.some((p) => p.id === owner)) return [owner];
  return people.map((p) => p.id);
}

function toEvent(item, start, end, cal, people) {
  const s = toInstant(start), e = toInstant(end || start);
  const raw = item.summary || '(uden titel)';
  const { title, tags } = splitTags(raw);
  const base = {
    id: `${item.uid}@${s.allDay ? s.ymd : s.date.toISOString()}`, title, tags,
    people: detectPeople(raw, tags, cal.owner, people), location: item.location || null, calendar: cal.owner,
  };
  if (s.allDay) return { ...base, allDay: true, start: s.ymd, end: e.allDay && e.ymd > s.ymd ? e.ymd : addDays(s.ymd, 1) };
  return { ...base, allDay: false, start: s.date.toISOString(), end: (e.date || s.date).toISOString() };
}

const overlaps = (ev, fromYmd, toYmd) => ev.allDay
  ? ev.start < toYmd && ev.end > fromYmd
  : Date.parse(ev.start) < cphAt(toYmd) && Date.parse(ev.end) > cphAt(fromYmd);

// Parse one .ics text into events overlapping [fromYmd, toYmd) (Copenhagen days).
export function parseIcs(text, { cal = { owner: null }, people, fromYmd, toYmd }) {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const tz of root.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(tz);

  const masters = new Map(), exceptions = [];
  for (const c of root.getAllSubcomponents('vevent')) {
    if (c.hasProperty('recurrence-id')) exceptions.push(c);
    else masters.set(c.getFirstPropertyValue('uid'), c);
  }

  const events = [];
  const rangeEnd = ICAL.Time.fromDateString(addDays(toYmd, 1));
  for (const [uid, comp] of masters) {
    if ((comp.getFirstPropertyValue('status') || '').toUpperCase() === 'CANCELLED') continue;
    const ev = new ICAL.Event(comp);
    for (const x of exceptions) if (x.getFirstPropertyValue('uid') === uid) ev.relateException(x);
    if (!ev.isRecurring()) {
      events.push(toEvent(ev, ev.startDate, ev.endDate, cal, people));
      continue;
    }
    const it = ev.iterator();
    for (let next, n = 0; (next = it.next()) && next.compare(rangeEnd) < 0 && n < 2000; n++) {
      const occ = ev.getOccurrenceDetails(next);
      if ((occ.item.component.getFirstPropertyValue('status') || '').toUpperCase() === 'CANCELLED') continue;
      events.push(toEvent(occ.item, occ.startDate, occ.endDate, cal, people));
    }
  }
  return events.filter((e) => overlaps(e, fromYmd, toYmd));
}

// Fetch every calendar; one failing calendar fails the refresh (so the cache serves stale data
// rather than silently dropping someone's events).
export async function loadEvents({ calendars, people, fetchImpl = fetch, now = new Date(), days = 35 }) {
  const fromYmd = addDays(cphDate(now), -1), toYmd = addDays(cphDate(now), days);
  const lists = await Promise.all(calendars.map(async (cal) => {
    const res = await fetchImpl(cal.url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`calendar ${cal.owner || ''} HTTP ${res.status}`.replace('  ', ' '));
    return parseIcs(await res.text(), { cal, people, fromYmd, toYmd });
  }));
  const seen = new Set();
  return lists.flat().filter((e) => !seen.has(e.id) && seen.add(e.id))
    .sort((a, b) => (a.allDay === b.allDay ? 0 : a.allDay ? -1 : 1) || Date.parse(a.start) - Date.parse(b.start));
}
