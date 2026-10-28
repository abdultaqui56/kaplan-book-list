import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from './app.js';

const port = Number(process.env['PORT'] ?? 3000);
const dataSource = (process.env['BOOKS_DATA_SOURCE'] ?? 'auto') as 'google' | 'mock' | 'auto';
const serveStatic = process.env['SERVE_STATIC'] === 'true';

const here = path.dirname(fileURLToPath(import.meta.url));
// In the Docker image the compiled server lives in /app/server and the
// Angular build in /app/browser; in local dev we only serve the API.
const staticDir = serveStatic ? path.resolve(here, '..', 'browser') : undefined;

const app = createApp({
  dataSource,
  googleApiKey: process.env['GOOGLE_BOOKS_API_KEY'],
  staticDir,
});

app.listen(port, () => {
  console.log(`[books] API listening on http://localhost:${port} (data source: ${dataSource})`);
  if (staticDir) console.log(`[books] Serving UI from ${staticDir}`);
});
