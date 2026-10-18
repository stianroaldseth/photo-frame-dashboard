// Widgets 2, 3, 4 and 7 are views of the same calendar events (see sources/ical.js).
import { cphDate, cphAt, addDays, weekday } from './time.js';
import { KID_TAGS, WEEKEND, NO_INSTITUTION, DROPOFF, PICKUP, BIRTHDAY, FAMILY_EVENT_TAG } from './tags.js';

const onDay = (ev, ymd) => ev.allDay
  ? ev.start <= ymd && ev.end > ymd
  : Date.parse(ev.start) < cphAt(addDays(ymd, 1)) && Date.parse(ev.end) > cphAt(ymd);
const isWeekend = (ymd) => [0, 6].includes(weekday(ymd));

// Widget 4: today and the next 3 days.
export function calendarView(events, people, now = new Date()) {
  const today = cphDate(now);
  return {
    people,
    days: [0, 1, 2, 3].map((d) => {
      const date = addDays(today, d);
      return { date, events: events.filter((e) => onDay(e, date)) };
    }),
  };
}

// Widget 2: picture plan for the kids. Tagged events get their picture; on weekdays each kid
// also gets børnehave/vuggestue unless the day is tagged #fri, #ferie, #syg or #lukket for them.
export function kidsView(events, people, now = new Date()) {
  const today = cphDate(now);
  const kids = people.filter((p) => !p.adult);
  const todays = events.filter((e) => onDay(e, today));
  const items = [];
  const off = new Set();
  for (const e of todays) {
    const tag = e.tags.find((t) => KID_TAGS[t]);
    if (!tag) continue;
    const who = e.people.filter((id) => kids.some((k) => k.id === id));
    const forKids = who.length ? who : kids.map((k) => k.id);
    if (NO_INSTITUTION.includes(tag)) forKids.forEach((id) => off.add(id));
    items.push({ ...KID_TAGS[tag], tag, who: forKids, title: e.title, allDay: e.allDay, start: e.allDay ? null : e.start, end: e.allDay ? null : e.end });
  }
  if (isWeekend(today)) items.unshift({ ...WEEKEND, tag: 'weekend', who: kids.map((k) => k.id), allDay: true, start: null, end: null });
  else {
    const drop = todays.find((e) => DROPOFF.test(e.title) || e.tags.includes('aflevering'));
    const pick = todays.find((e) => PICKUP.test(e.title) || e.tags.includes('hentning'));
    for (const k of kids) {
      if (off.has(k.id) || items.some((i) => (i.tag === 'børnehave' || i.tag === 'vuggestue') && i.who.includes(k.id))) continue;
      const tag = k.age >= 3 ? 'børnehave' : 'vuggestue';
      items.unshift({ ...KID_TAGS[tag], tag, who: [k.id], allDay: false, start: drop ? drop.start : null, end: pick ? pick.end : null, auto: true });
    }
  }
  items.sort((a, b) => (a.start ? Date.parse(a.start) : 0) - (b.start ? Date.parse(b.start) : 0));
  return { date: today, dayType: isWeekend(today) ? 'weekend' : 'weekday', items };
}

// Widget 3: who takes them to Pilegården and who picks them up today.
export function dropoffView(events, people, now = new Date()) {
  const today = cphDate(now);
  const adults = people.filter((p) => p.adult).map((p) => p.id);
  const todays = events.filter((e) => !e.allDay && onDay(e, today));
  const pick = (re, tag) => {
    const e = todays.find((x) => re.test(x.title) || x.tags.includes(tag));
    if (!e) return null;
    const who = e.people.filter((id) => adults.includes(id));
    return { who: who.length === 1 ? who[0] : who.length ? who : null, time: e.start, title: e.title };
  };
  return { date: today, place: 'Pilegården', dropoff: pick(DROPOFF, 'aflevering'), pickup: pick(PICKUP, 'hentning') };
}

// Widget 7: birthdays and #familie events from today and 30 days on.
export function birthdaysView(events, now = new Date()) {
  const today = cphDate(now), until = addDays(today, 31);
  const items = events
    .filter((e) => (BIRTHDAY.test(e.title) || e.tags.includes('fødselsdag') || e.tags.includes(FAMILY_EVENT_TAG)))
    .map((e) => ({ date: e.allDay ? e.start : cphDate(new Date(e.start)), title: e.title, type: BIRTHDAY.test(e.title) || e.tags.includes('fødselsdag') ? 'birthday' : 'event', allDay: e.allDay, start: e.start }))
    .filter((i) => i.date >= today && i.date < until)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.start).localeCompare(String(b.start)));
  return { from: today, until, items };
}
