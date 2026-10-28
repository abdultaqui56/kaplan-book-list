import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from './app.js';

const googleBody = {
  kind: 'books#volumes',
  totalItems: 1,
  items: [{ kind: 'books#volume', id: 'g1' }],
};

const okFetch = () =>
  vi.fn(
    async () => new Response(JSON.stringify(googleBody), { status: 200 }),
  ) as unknown as typeof fetch;
const failingFetch = (status = 500) =>
  vi.fn(async () => new Response('nope', { status })) as unknown as typeof fetch;

describe('GET /api/books', () => {
  it('rejects a missing query', async () => {
    const res = await request(createApp({ dataSource: 'mock' })).get('/api/books');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/"q"/);
  });

  it('validates paging parameters', async () => {
    const app = createApp({ dataSource: 'mock' });
    expect((await request(app).get('/api/books?q=x&maxResults=41')).status).toBe(400);
    expect((await request(app).get('/api/books?q=x&startIndex=-1')).status).toBe(400);
  });

  it('proxies to Google Books and forwards the query', async () => {
    const fetchImpl = okFetch();
    const res = await request(
      createApp({ dataSource: 'google', fetchImpl, googleApiKey: 'KEY' }),
    ).get('/api/books?q=kaplan%20test%20prep&startIndex=40&maxResults=40');

    expect(res.status).toBe(200);
    expect(res.headers['x-data-source']).toBe('google');
    expect(res.body).toEqual(googleBody);

    const url = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as URL;
    expect(url.searchParams.get('q')).toBe('kaplan test prep');
    expect(url.searchParams.get('startIndex')).toBe('40');
    expect(url.searchParams.get('key')).toBe('KEY');
  });

  it('serves the bundled fixture in mock mode, paginated like Google', async () => {
    const app = createApp({ dataSource: 'mock' });
    const res = await request(app).get('/api/books?q=kaplan&startIndex=6&maxResults=40');

    expect(res.status).toBe(200);
    expect(res.headers['x-data-source']).toBe('mock');
    expect(res.body.totalItems).toBe(8);
    expect(res.body.items).toHaveLength(2);
  });

  it('omits "items" for an empty mock page, mirroring the real API', async () => {
    const res = await request(createApp({ dataSource: 'mock' })).get(
      '/api/books?q=kaplan&startIndex=100',
    );
    expect(res.body.items).toBeUndefined();
  });

  it('falls back to mock data in auto mode when Google fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const res = await request(createApp({ dataSource: 'auto', fetchImpl: failingFetch(503) })).get(
      '/api/books?q=kaplan',
    );
    expect(res.status).toBe(200);
    expect(res.headers['x-data-source']).toBe('mock');
  });

  it('surfaces upstream errors in google-only mode', async () => {
    const res = await request(
      createApp({ dataSource: 'google', fetchImpl: failingFetch(429) }),
    ).get('/api/books?q=kaplan');
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/429/);
  });

  it('caches identical requests', async () => {
    const fetchImpl = okFetch();
    const app = createApp({ dataSource: 'google', fetchImpl });

    const first = await request(app).get('/api/books?q=kaplan');
    const second = await request(app).get('/api/books?q=kaplan');

    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/health', () => {
  it('reports the configured data source', async () => {
    const res = await request(createApp({ dataSource: 'mock' })).get('/api/health');
    expect(res.body).toEqual({ status: 'ok', dataSource: 'mock' });
  });
});
