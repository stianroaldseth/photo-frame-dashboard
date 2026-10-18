// Request handler shared by the production server (server/index.js) and the Vite dev server
// (vite.config.js). Order: health check → token → /api → static files (or Vite in dev).
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';
import { authorize } from './auth.js';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

function send(res, status, body, type) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.end(body);
}
const sendJson = (res, status, obj) => { res.setHeader('Cache-Control', 'no-store'); send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8'); };

async function serveStatic(res, distDir, pathname) {
  const rel = normalize(decodeURIComponent(pathname === '/' ? '/index.html' : pathname)).replace(/^([/\\])+/, '');
  const file = join(distDir, rel);
  if (!file.startsWith(distDir + sep)) return send(res, 404, 'Not found', 'text/plain');
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    // Hashed bundles never change; everything else must revalidate so a deploy shows up on the next reload.
    res.setHeader('Cache-Control', rel.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    send(res, 200, await readFile(file), TYPES[extname(file)] || 'application/octet-stream');
  } catch {
    send(res, 404, 'Not found', 'text/plain');
  }
}

export function createApp({ token, widgets, distDir = null }) {
  return async function handle(req, res, next) {
    const url = new URL(req.url, 'http://localhost');
    // The token rides in the page URL; never leak it to fonts/photos via the Referer header.
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (url.pathname === '/healthz') return send(res, 200, 'ok', 'text/plain');

    if (!authorize(req, res, url, token)) {
      if (url.pathname.startsWith('/api/')) return sendJson(res, 401, { error: 'unauthorized' });
      return send(res, 401, '<!doctype html><meta charset="utf-8"><title>Ingen adgang</title><p style="font:24px sans-serif;margin:2em">Ingen adgang.</p>', 'text/html; charset=utf-8');
    }

    if (url.pathname === '/api' || url.pathname === '/api/') return sendJson(res, 200, { widgets: [...widgets.keys()] });
    if (url.pathname.startsWith('/api/')) {
      const w = widgets.get(url.pathname.slice(5));
      if (!w) return sendJson(res, 404, { error: 'unknown widget' });
      const out = await w.get();
      return sendJson(res, out.data == null ? 503 : 200, { widget: w.name, ...out });
    }

    if (next) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain');
    return serveStatic(res, distDir, url.pathname);
  };
}
