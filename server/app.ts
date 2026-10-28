import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import path from 'node:path';

import { type BooksQuery, fetchFromGoogle, fetchFromMock } from './books-client.js';

export interface AppOptions {
  /** 'google' | 'mock' | 'auto' (google with mock fallback). */
  dataSource: 'google' | 'mock' | 'auto';
  googleApiKey?: string;
  /** Absolute path to the built Angular app; omit to run API-only (dev). */
  staticDir?: string;
  cacheTtlMs?: number;
  fetchImpl?: typeof fetch;
}

interface CacheEntry {
  expires: number;
  body: unknown;
  source: 'google' | 'mock';
}

/**
 * Builds the Express app. Kept separate from `index.ts` (which just listens)
 * so integration tests can mount it with supertest-style requests.
 */
export function createApp(opts: AppOptions): Express {
  const app = express();
  const cache = new Map<string, CacheEntry>();
  const ttl = opts.cacheTtlMs ?? 5 * 60 * 1000;

  app.disable('x-powered-by');
  app.use(cors());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', dataSource: opts.dataSource });
  });

  app.get('/api/books', async (req: Request, res: Response) => {
    const query = parseQuery(req);
    if ('error' in query) {
      res.status(400).json({ error: query.error });
      return;
    }

    const key = JSON.stringify(query);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      res.set('X-Data-Source', cached.source).set('X-Cache', 'HIT').json(cached.body);
      return;
    }

    try {
      const { body, source } = await resolveBooks(query, opts);
      cache.set(key, { body, source, expires: Date.now() + ttl });
      res.set('X-Data-Source', source).set('X-Cache', 'MISS').json(body);
    } catch (err) {
      const status = err instanceof Error && 'status' in err ? Number(err.status) : 502;
      res.status(status >= 400 ? status : 502).json({
        error: err instanceof Error ? err.message : 'Failed to fetch books',
      });
    }
  });

  if (opts.staticDir) {
    app.use(express.static(opts.staticDir, { maxAge: '1h', index: false }));
    // SPA fallback — anything that isn't /api gets index.html.
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(opts.staticDir!, 'index.html'));
    });
  }

  return app;
}

function parseQuery(req: Request): BooksQuery | { error: string } {
  const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
  if (!q) return { error: 'Query parameter "q" is required.' };

  const startIndex = toInt(req.query['startIndex'], 0);
  const maxResults = toInt(req.query['maxResults'], 40);
  if (startIndex < 0) return { error: '"startIndex" must be >= 0.' };
  if (maxResults < 1 || maxResults > 40) return { error: '"maxResults" must be between 1 and 40.' };

  return { q, startIndex, maxResults };
}

function toInt(value: unknown, fallback: number): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isNaN(n) ? fallback : n;
}

async function resolveBooks(
  query: BooksQuery,
  opts: AppOptions,
): Promise<{ body: unknown; source: 'google' | 'mock' }> {
  if (opts.dataSource === 'mock') {
    return { body: await fetchFromMock(query), source: 'mock' };
  }
  try {
    const body = await fetchFromGoogle(query, {
      apiKey: opts.googleApiKey,
      fetchImpl: opts.fetchImpl,
    });
    return { body, source: 'google' };
  } catch (err) {
    if (opts.dataSource === 'google') throw err;
    console.warn(
      `[books] Google Books unavailable (${(err as Error).message}); serving mock data.`,
    );
    return { body: await fetchFromMock(query), source: 'mock' };
  }
}
