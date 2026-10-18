// Production entry point: `npm start` (Railway runs this). Serves dist/ and /api, behind the token.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { resolveToken } from './auth.js';
import { createWidgets } from './widgets.js';

const distDir = fileURLToPath(new URL('../dist', import.meta.url));
if (!existsSync(distDir)) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

let token;
try { token = resolveToken(process.env); } catch (e) { console.error(e.message); process.exit(1); }

const app = createApp({ token, widgets: createWidgets(), distDir });
const port = Number(process.env.PORT) || 3000;
createServer((req, res) => app(req, res).catch((e) => {
  console.error(e);
  if (!res.headersSent) { res.statusCode = 500; res.end('Server error'); }
})).listen(port, () => console.log(`Dashboard on http://localhost:${port}/?token=…`));
