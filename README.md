# kaplan-book-list
# Books list

An Angular 20 + Node.js app that lists Kaplan Test Prep books from the Google Books API, following the `Books-1.png` / `Books-2.png` mockups (collapsible sidebar, searchable two-column card grid).

Bonus items covered: **Docker**, **state management** (signal store), **error handling** (client + server), **unit & integration tests** (46 tests across both tiers).

---

## Quick start

### Option A — Docker (recommended, one command)

```bash
docker compose up --build
# open http://localhost:3000
```

### Option B — Local development

Requirements: Node 22.12+ (Angular 20), npm 10+.

```bash
npm install
npm start          # runs the API on :3000 and the Angular dev server on :4200
```

`npm start` launches both processes concurrently. The Angular dev server proxies `/api/*` to the Node API (`proxy.conf.json`), so the browser only ever talks to one origin.

### Running tests

```bash
npm run test:web   # Angular: 37 tests (Vitest + jsdom, no browser needed)
npm run test:api   # Node:    9 tests (Vitest + supertest)
npm run test:all   # both
```

### Production build without Docker

```bash
npm run build      # Angular → dist/browser, server → dist/server
npm run serve      # serves UI + API from one process on :3000
```

---

## How it works

```
Browser ──► Angular app ──► GET /api/books?q=…  ──► Node/Express ──► Google Books API
                                                        │
                                                        └──► bundled fixture (fallback / offline)
```

The browser never calls Google directly. A small Express layer sits in front of it because:

1. **Key hygiene** – an optional `GOOGLE_BOOKS_API_KEY` stays server-side.
2. **Resilience** – if Google is unreachable or rate-limits, the API falls back to a bundled fixture that mirrors the real response shape (`BOOKS_DATA_SOURCE=auto`, the default). The assignment mentioned attaching sample JSON; it wasn't in the upload, so the fixture was built from the API's documented shape and the titles shown in the mockup.
3. **Caching** – identical requests are cached in memory for 5 minutes (`X-Cache: HIT|MISS` header).
4. **Single deployable** – in production the same process serves the compiled Angular app.

Response headers tell you where data came from: `X-Data-Source: google|mock`.

> **Note:** at the time of submission, anonymous requests to the Google Books endpoint return HTTP 429 with `quota_limit_value: 0` — Google has effectively disabled unauthenticated access. Without an API key the app therefore serves the bundled fixture (`X-Data-Source: mock`). Set `GOOGLE_BOOKS_API_KEY` (a free key from a Google Cloud project with the Books API enabled; 1,000 queries/day) to fetch live data.

### Configuration

| Variable               | Default | Meaning                                                               |
| ---------------------- | ------- | --------------------------------------------------------------------- |
| `BOOKS_DATA_SOURCE`    | `auto`  | `auto` (Google, fall back to fixture), `google` (no fallback), `mock` |
| `GOOGLE_BOOKS_API_KEY` | —       | Optional. Raises Google's anonymous quota.                            |
| `PORT`                 | `3000`  | API / production port                                                 |

Copy `.env.example` to `.env` for Docker Compose.

---

## Project structure

```
src/app/
├─ core/                        # Framework-agnostic business logic
│  ├─ models/book.model.ts      #   Domain model + the slice of Google's DTO we use
│  ├─ api/
│  │  ├─ google-books-api.service.ts   # HTTP + pagination; returns Book[], never DTOs
│  │  ├─ book.mapper.ts         #   Pure DTO → Book mapping
│  │  └─ api-error.ts           #   HTTP error → user-facing message
│  └─ state/books.store.ts      #   Signal store: status / books / error / search
├─ features/books/
│  ├─ books-page/               # Container: reads store, dispatches actions
│  ├─ book-card/                # Presentational
│  └─ book-search/              # Presentational, debounced
└─ shared/shell/                # App chrome (sidebar + header)

server/
├─ index.ts                     # Entry point: env → createApp → listen
├─ app.ts                       # Express app factory (testable without a port)
├─ books-client.ts              # Google fetch + fixture loader
└─ mock-data/kaplan-books.json  # Fixture in Google Books response shape
```

**Separation of concerns.** Components only know about `Book` and the store's public signals. The API service only knows about HTTP and paging. The mapper is the single place that knows Google's payload shape, so an API change touches one file and one test.

---

## Design decisions

**Consuming the API properly.** Google Books caps `maxResults` at 40 and its `totalItems` is an estimate. `fetchAll` requests page 0, derives the page count, fetches the remaining pages in parallel, tolerates short/empty trailing pages (where `items` is omitted rather than `[]`), and dedupes by volume id across pages. A `MAX_PAGES` guard prevents a broad query fanning out into dozens of requests.

**State management.** A hand-rolled store built on Angular signals (`BooksStore`) rather than NgRx. The feature has one async resource and one piece of derived state; signals give unidirectional flow, read-only selectors, `computed` derived state and `switchMap`-based request cancellation with a fraction of the boilerplate. The class maps 1:1 onto an `@ngrx/signals` `signalStore` if the app grew. The app is fully **zoneless** (`provideZonelessChangeDetection`), and all components are `OnPush`.

**Error handling.**
- *Client:* transient failures (network, 429, 5xx) get two automatic retries with back-off before an error state is shown. Errors are normalised into `{ message, retryable, status }`; the UI shows a "Try again" button only when a retry can plausibly help.
- *Server:* input validation (400), upstream status propagation, fixture fallback, request timeouts (8 s), and a `/api/health` endpoint used by the Docker `HEALTHCHECK`.
- *UI states:* skeleton loading, error, empty result, and "no matches" for a search.

**Search.** Client-side filtering over title, authors and publisher (debounced 200 ms). The list is small and already fully loaded, so a round-trip per keystroke would add latency without adding value. If the dataset grew, `BookSearchComponent` emits a plain string so switching to server-side search is a one-line change in the store.

**Testing.** Vitest via Angular's unit-test builder (runs in jsdom, so no Chrome is required in CI). Pure logic (mapper, error mapping) is tested without Angular at all; the API service is tested against `HttpTestingController` including out-of-order page arrival; the store is tested with a stubbed API; `BooksPageComponent` has true integration tests (real store, real children, only HTTP stubbed) covering load → render → search → error → retry. The server is tested with supertest and an injected `fetch`.

**Fidelity to the mockup.** Layout, palette, type scale and the orange card accent follow the screenshots. Two deliberate deviations: the label is "Publisher" (capitalised to match its siblings; the mockup shows lowercase), and titles link to Google Books when a link exists. The "Create New Book" button is wired but out of scope for this exercise.

---
