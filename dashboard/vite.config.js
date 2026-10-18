import { defineConfig, loadEnv } from 'vite';
import { createApp } from './server/app.js';
import { resolveToken } from './server/auth.js';
import { createWidgets } from './server/widgets.js';

// `npm run dev` runs the same token check and /api endpoints as the production server, inside Vite.
function dashboardApi(env) {
  return {
    name: 'dashboard-api',
    configureServer(server) {
      const app = createApp({ token: resolveToken(env, { allowDevDefault: true }), widgets: createWidgets() });
      server.middlewares.use((req, res, next) => app(req, res, next).catch(next));
    },
  };
}

// The wall tablet runs Android WebView 106 — keep JS output within Chromium 106.
// CSS targets chrome61 on purpose: the tablet's WebView rejects 4/8-digit hex colours (#0000,
// #ffffffbf) even though Chrome 106 should support them, and a newer target lets the minifier
// rewrite transparent/rgba() into that form. Verified on-device with CSS.supports().
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
  Object.assign(process.env, env); // server modules read KID1_NAME etc. from process.env
  return {
    plugins: [dashboardApi(env)],
    build: {
      target: 'chrome106',
      cssTarget: 'chrome61',
    },
    server: { host: true },
  };
});
