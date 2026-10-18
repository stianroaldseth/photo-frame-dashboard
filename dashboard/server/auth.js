// Secret-URL-token access. The tablet opens /?token=…; a valid token is then remembered in an
// HttpOnly cookie so scripts, styles and /api calls are authorised without repeating it.
import { createHash, timingSafeEqual } from 'node:crypto';

export const COOKIE = 'dash_token';
const ONE_YEAR = 365 * 24 * 3600;

const digest = (s) => createHash('sha256').update(String(s)).digest();

export function tokenMatches(given, expected) {
  if (!given || !expected) return false;
  return timingSafeEqual(digest(given), digest(expected));
}

function cookieToken(req) {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

// Returns true if the request is authorised. Sets the cookie when the token came in the URL.
export function authorize(req, res, url, expected) {
  const q = url.searchParams.get('token');
  if (tokenMatches(q, expected)) {
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(q)}; Path=/; Max-Age=${ONE_YEAR}; HttpOnly; SameSite=Strict${secure}`);
    return true;
  }
  return tokenMatches(cookieToken(req), expected);
}

// DASHBOARD_TOKEN from the environment. Only `npm run dev` may fall back to "dev".
export function resolveToken(env, { allowDevDefault = false } = {}) {
  const t = (env.DASHBOARD_TOKEN || '').trim();
  if (t) return t;
  if (allowDevDefault) {
    console.warn('[auth] DASHBOARD_TOKEN not set; dev server uses token "dev" → http://localhost:5173/?token=dev');
    return 'dev';
  }
  throw new Error('DASHBOARD_TOKEN is not set. Generate one with: openssl rand -hex 24');
}
