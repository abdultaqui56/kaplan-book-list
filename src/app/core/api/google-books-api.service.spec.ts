import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { makeResponse } from '../../../testing/fixtures';
import { Book } from '../models/book.model';
import { GoogleBooksApiService, MAX_PAGES, PAGE_SIZE } from './google-books-api.service';

describe('GoogleBooksApiService', () => {
  let service: GoogleBooksApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GoogleBooksApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectPage(startIndex: number) {
    return http.expectOne(
      (req) =>
        req.url === environment.booksApiUrl &&
        req.params.get('q') === 'kaplan' &&
        req.params.get('startIndex') === String(startIndex) &&
        req.params.get('maxResults') === String(PAGE_SIZE),
    );
  }

  it('makes a single request when everything fits in one page', () => {
    let result: Book[] | undefined;
    service.fetchAll('kaplan').subscribe((b) => (result = b));

    expectPage(0).flush(makeResponse(['a', 'b'], 2));

    expect(result?.map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('follows pagination using totalItems and merges pages in order', () => {
    let result: Book[] | undefined;
    service.fetchAll('kaplan').subscribe((b) => (result = b));

    // totalItems = 90 → 3 pages of 40
    expectPage(0).flush(makeResponse(['p0'], 90));
    const page1 = expectPage(PAGE_SIZE);
    const page2 = expectPage(PAGE_SIZE * 2);
    page2.flush(makeResponse(['p2'], 90)); // out-of-order arrival
    page1.flush(makeResponse(['p1'], 90));

    expect(result?.map((b) => b.id)).toEqual(['p0', 'p1', 'p2']);
  });

  it('dedupes volumes that appear on more than one page', () => {
    let result: Book[] | undefined;
    service.fetchAll('kaplan').subscribe((b) => (result = b));

    expectPage(0).flush(makeResponse(['dup', 'a'], 41));
    expectPage(PAGE_SIZE).flush(makeResponse(['dup', 'b'], 41));

    expect(result?.map((b) => b.id)).toEqual(['dup', 'a', 'b']);
  });

  it('never requests more than MAX_PAGES pages', () => {
    service.fetchAll('kaplan').subscribe();

    expectPage(0).flush(makeResponse(['x'], 10_000));
    for (let i = 1; i < MAX_PAGES; i++) {
      expectPage(i * PAGE_SIZE).flush(makeResponse([`x${i}`], 10_000));
    }
    http.expectNone(() => true);
  });

  it('propagates HTTP errors', () => {
    let error: unknown;
    service.fetchAll('kaplan').subscribe({ error: (e) => (error = e) });

    expectPage(0).flush({ error: 'boom' }, { status: 503, statusText: 'Unavailable' });

    expect(error).toBeTruthy();
  });
});
