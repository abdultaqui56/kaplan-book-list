import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const MOCK_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'mock-data',
  'kaplan-books.json',
);

export interface BooksQuery {
  q: string;
  startIndex: number;
  maxResults: number;
}

export interface BooksResult {
  /** Raw Google Books payload (or the mock equivalent). */
  body: unknown;
  /** Where the data came from — surfaced as a response header for debugging. */
  source: 'google' | 'mock';
}

export class UpstreamError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Fetches volumes from Google Books. Pure I/O, no Express types, so it can be
 * unit-tested with a stubbed `fetch`.
 */
export async function fetchFromGoogle(
  query: BooksQuery,
  options: { apiKey?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<unknown> {
  const { apiKey, fetchImpl = fetch, timeoutMs = 8000 } = options;

  const url = new URL(GOOGLE_BOOKS_URL);
  url.searchParams.set('q', query.q);
  url.searchParams.set('startIndex', String(query.startIndex));
  url.searchParams.set('maxResults', String(query.maxResults));
  if (apiKey) url.searchParams.set('key', apiKey);

  const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    throw new UpstreamError(res.status, `Google Books responded with ${res.status}`);
  }
  return res.json();
}

/** Load the bundled fixture; paginated the same way Google does it. */
export async function fetchFromMock(query: BooksQuery): Promise<unknown> {
  const raw = JSON.parse(await readFile(MOCK_PATH, 'utf8')) as {
    kind: string;
    totalItems: number;
    items: unknown[];
  };
  const items = raw.items.slice(query.startIndex, query.startIndex + query.maxResults);
  return { kind: raw.kind, totalItems: raw.items.length, ...(items.length ? { items } : {}) };
}
