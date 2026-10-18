// Open-Meteo forecast for Birkerød (no API key). https://open-meteo.com/en/docs
import { cphAt, cphDate, cphTime, addDays } from '../time.js';

export const BIRKEROD = { name: 'Birkerød', lat: 55.8436, lon: 12.4282 };

// Bike-commute windows (Copenhagen time, end exclusive).
export const COMMUTE = [
  { key: 'morning', label: '07–09', from: 7, to: 9 },
  { key: 'afternoon', label: '15–17', from: 15, to: 17 },
];

export function weatherUrl(loc = BIRKEROD) {
  const q = new URLSearchParams({
    latitude: loc.lat, longitude: loc.lon, timezone: 'Europe/Copenhagen', wind_speed_unit: 'ms', forecast_days: '2',
    current: 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day',
    hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
  });
  return 'https://api.open-meteo.com/v1/forecast?' + q;
}

// Open-Meteo local time 'YYYY-MM-DDTHH:MM' (Copenhagen) → ISO instant.
const toIso = (local) => cphAt(local.slice(0, 10), local.slice(11, 16)).toISOString();
const round = (x, d = 0) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
const SNOW = [71, 73, 75, 77, 85, 86];

// Verdict for one commute window from its hourly rows.
export function commuteVerdict(rows) {
  if (!rows.length) return null;
  const max = (k) => Math.max(...rows.map((r) => r[k] ?? 0));
  const temp = Math.min(...rows.map((r) => r.temp));
  const wind = max('wind'), gust = max('gust'), precipProb = max('precipProb');
  const precip = round(rows.reduce((s, r) => s + (r.precip || 0), 0), 1);
  const snow = rows.some((r) => SNOW.includes(r.code));

  const bad = [], meh = [];
  if (snow) bad.push('Sne');
  if (precip >= 1 || (precipProb >= 60 && precip >= 0.3)) bad.push(`Regn ${precipProb} %`);
  else if (precipProb >= 30) meh.push(`Måske regn ${precipProb} %`);
  if (wind >= 11 || gust >= 17) bad.push(`Hård vind ${round(wind)} m/s`);
  else if (wind >= 7 || gust >= 12) meh.push(`Blæst ${round(wind)} m/s`);
  if (temp <= -3) bad.push(`Frost ${round(temp)}°`);
  else if (temp <= 2) meh.push(`Koldt ${round(temp)}° – evt. glat`);

  const verdict = bad.length ? 'bad' : meh.length ? 'meh' : 'good';
  const reasons = [...bad, ...meh];
  const text = verdict === 'good' ? 'Fint cykelvejr' : reasons.join(' · ') + (bad.some((r) => r.startsWith('Regn')) ? ' – tag regntøj' : '');
  const short = verdict === 'good' ? 'Fint' : reasons[0]; // fits a chip on the wall
  return { verdict, text, short, reasons, temp: round(temp), wind: round(wind), gust: round(gust), precipProb, precip };
}

export function parseWeather(json, now = new Date()) {
  const h = json.hourly, c = json.current, d = json.daily;
  if (!h?.time?.length || !c || !d?.time?.length) throw new Error('unexpected Open-Meteo response');
  const hourly = h.time.map((t, i) => ({
    time: toIso(t), temp: round(h.temperature_2m[i], 1), precipProb: h.precipitation_probability[i] ?? 0,
    precip: h.precipitation[i] ?? 0, wind: round(h.wind_speed_10m[i], 1), gust: round(h.wind_gusts_10m[i], 1),
    code: h.weather_code[i], isDay: h.is_day ? !!h.is_day[i] : null,
  }));

  const today = cphDate(now), nowHm = cphTime(now), nowHour = +nowHm.slice(0, 2);
  const commute = {};
  for (const w of COMMUTE) {
    const date = nowHour >= w.to ? addDays(today, 1) : today; // window over → show tomorrow's
    const rows = hourly.filter((r) => {
      const t = new Date(r.time), hr = +cphTime(t).slice(0, 2);
      return cphDate(t) === date && hr >= w.from && hr < w.to;
    });
    const v = commuteVerdict(rows);
    commute[w.key] = v && { label: w.label, date, day: date === today ? 'today' : 'tomorrow', ...v };
  }

  const ti = Math.max(0, d.time.indexOf(today));
  return {
    location: BIRKEROD.name,
    now: {
      temp: round(c.temperature_2m, 1), feelsLike: round(c.apparent_temperature, 1), code: c.weather_code,
      wind: round(c.wind_speed_10m, 1), gust: round(c.wind_gusts_10m, 1), precip: c.precipitation, isDay: c.is_day == null ? null : !!c.is_day,
    },
    today: { min: round(d.temperature_2m_min[ti], 1), max: round(d.temperature_2m_max[ti], 1), precipSum: d.precipitation_sum[ti], code: d.weather_code[ti] },
    hourly,
    commute,
  };
}

export async function loadWeather({ fetchImpl = fetch, now = new Date() } = {}) {
  const res = await fetchImpl(weatherUrl(), { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  return parseWeather(await res.json(), now);
}
