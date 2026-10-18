// DK2 day-ahead spot prices from Energi Data Service (free, no key). https://www.energidataservice.dk
// Since 1 Oct 2025 the market settles in 15-minute slots in the `DayAheadPrices` dataset; the old
// hourly `Elspotprices` dataset is kept as a fallback. Prices are DKK/MWh → shown as DKK/kWh,
// spot only: no VAT, taxes or grid tariffs.
import { cphDate, cphAt, addDays } from '../time.js';

const BASE = 'https://api.energidataservice.dk/dataset/';
const EUR_DKK = 7.46;

export function pricesUrl(dataset, today, area = 'DK2') {
  const sort = dataset === 'DayAheadPrices' ? 'TimeUTC asc' : 'HourUTC asc';
  const q = new URLSearchParams({
    start: addDays(today, -1), end: addDays(today, 2), filter: JSON.stringify({ PriceArea: [area] }), sort, limit: '1000',
  });
  return BASE + dataset + '?' + q;
}

// Records from either dataset → [{ start: Date, dkkPerMWh }].
export function parseRecords(records) {
  return records.map((r) => {
    const utc = r.TimeUTC || r.HourUTC;
    let dkk = r.DayAheadPriceDKK ?? r.SpotPriceDKK;
    const eur = r.DayAheadPriceEUR ?? r.SpotPriceEUR;
    if (dkk == null && eur != null) dkk = eur * EUR_DKK;
    return utc && dkk != null ? { start: new Date(utc.endsWith('Z') ? utc : utc + 'Z'), dkkPerMWh: dkk } : null;
  }).filter(Boolean);
}

// Average 15-minute slots into hours for the given Copenhagen days.
export function toHours(slots, fromYmd, toYmd) {
  const from = cphAt(fromYmd), to = cphAt(toYmd);
  const byHour = new Map();
  for (const s of slots) {
    if (s.start < from || s.start >= to) continue;
    const h = Math.floor(s.start / 36e5) * 36e5;
    const a = byHour.get(h) || [];
    a.push(s.dkkPerMWh);
    byHour.set(h, a);
  }
  return [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([h, v]) => ({
    start: new Date(h).toISOString(),
    price: Math.round((v.reduce((x, y) => x + y, 0) / v.length / 1000) * 1000) / 1000,
  }));
}

// Cheapest run of `n` consecutive hours starting at or after `now`'s hour.
export function cheapestWindow(hours, n, now = new Date()) {
  const cur = Math.floor(now / 36e5) * 36e5;
  const future = hours.filter((h) => Date.parse(h.start) >= cur);
  let best = null;
  for (let i = 0; i + n <= future.length; i++) {
    const run = future.slice(i, i + n);
    if (Date.parse(run[n - 1].start) - Date.parse(run[0].start) !== (n - 1) * 36e5) continue; // gap in data
    const avg = run.reduce((s, h) => s + h.price, 0) / n;
    if (!best || avg < best.avgPrice) best = { start: run[0].start, end: new Date(Date.parse(run[n - 1].start) + 36e5).toISOString(), avgPrice: Math.round(avg * 1000) / 1000, hours: n };
  }
  return best;
}

export function summarize(slots, { now = new Date(), chargeHours = 3, dataset } = {}) {
  const today = cphDate(now);
  const hours = toHours(slots, today, addDays(today, 2));
  if (!hours.length) throw new Error('no prices for today');
  const cur = Math.floor(now / 36e5) * 36e5;
  const nowHour = hours.find((h) => Date.parse(h.start) === cur);
  const tomorrow = cphAt(addDays(today, 1));
  return {
    area: 'DK2', unit: 'DKK/kWh', includesTariffs: false, includesVat: false, dataset,
    now: nowHour ? nowHour.price : null,
    tomorrowAvailable: hours.some((h) => Date.parse(h.start) >= tomorrow),
    hours,
    cheapest: cheapestWindow(hours, chargeHours, now),
  };
}

async function fetchDataset(fetchImpl, dataset, today) {
  const res = await fetchImpl(pricesUrl(dataset, today), { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Energi Data Service ${dataset} HTTP ${res.status}`);
  return parseRecords((await res.json()).records || []);
}

export async function loadElectricity({ fetchImpl = fetch, now = new Date(), chargeHours = 3 } = {}) {
  const today = cphDate(now);
  for (const dataset of ['DayAheadPrices', 'Elspotprices']) {
    const slots = await fetchDataset(fetchImpl, dataset, today);
    if (slots.some((s) => s.start >= cphAt(today))) return summarize(slots, { now, chargeHours, dataset });
  }
  throw new Error('no DK2 prices for today in DayAheadPrices or Elspotprices');
}
