import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';

import { makeBook } from '../../../testing/fixtures';
import { GoogleBooksApiService } from '../api/google-books-api.service';
import { Book } from '../models/book.model';
import { BooksStore, DEFAULT_QUERY } from './books.store';

describe('BooksStore', () => {
  let store: BooksStore;
  let api: { fetchAll: ReturnType<typeof vi.fn> };

  const books: Book[] = [
    makeBook({ id: '1', title: 'ACT Prep 2019' }),
    makeBook({ id: '2', title: 'GRE Prep 2019', publisher: 'Kaplan Publishing' }),
    makeBook({ id: '3', title: 'MCAT Biochemistry', authors: ['Jane Doe'] }),
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    api = { fetchAll: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: GoogleBooksApiService, useValue: api }],
    });
    store = TestBed.inject(BooksStore);
  });

  afterEach(() => vi.useRealTimers());

  it('starts idle and empty', () => {
    expect(store.status()).toBe('idle');
    expect(store.books()).toEqual([]);
    expect(store.error()).toBeNull();
  });

  it('loads the default query and exposes the books', () => {
    api.fetchAll.mockReturnValue(of(books));

    store.load();

    expect(api.fetchAll).toHaveBeenCalledWith(DEFAULT_QUERY);
    expect(store.status()).toBe('loaded');
    expect(store.books()).toEqual(books);
    expect(store.totalCount()).toBe(3);
  });

  it('reports loading while a request is in flight', () => {
    const pending = new Subject<Book[]>();
    api.fetchAll.mockReturnValue(pending.asObservable());

    store.load();
    expect(store.isLoading()).toBe(true);

    pending.next(books);
    pending.complete();
    expect(store.isLoading()).toBe(false);
  });

  it('retries transient failures before giving up', () => {
    api.fetchAll.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503, statusText: 'Unavailable' })),
    );

    store.load();
    vi.runAllTimers(); // flush retry back-off timers

    expect(api.fetchAll).toHaveBeenCalledTimes(1); // retry re-subscribes the same observable
    expect(store.status()).toBe('error');
    expect(store.error()?.retryable).toBe(true);
    expect(store.books()).toEqual([]);
  });

  it('clears the previous error when reloading succeeds', () => {
    api.fetchAll.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'x' })),
    );
    store.load();
    vi.runAllTimers();
    expect(store.status()).toBe('error');

    api.fetchAll.mockReturnValueOnce(of(books));
    store.load();

    expect(store.status()).toBe('loaded');
    expect(store.error()).toBeNull();
  });

  it('cancels an in-flight request when a new load is triggered', () => {
    const slow = new Subject<Book[]>();
    api.fetchAll.mockReturnValueOnce(slow.asObservable()).mockReturnValueOnce(of(books));

    store.load();
    store.load();
    slow.next([makeBook({ id: 'stale' })]); // should be ignored

    expect(store.books()).toEqual(books);
  });

  describe('filteredBooks', () => {
    beforeEach(() => {
      api.fetchAll.mockReturnValue(of(books));
      store.load();
    });

    it('returns everything when the search term is blank', () => {
      store.setSearchTerm('   ');
      expect(store.filteredBooks()).toEqual(books);
    });

    it('matches title, author and publisher case-insensitively', () => {
      store.setSearchTerm('gre');
      expect(store.filteredBooks().map((b) => b.id)).toEqual(['2']);

      store.setSearchTerm('jane');
      expect(store.filteredBooks().map((b) => b.id)).toEqual(['3']);

      store.setSearchTerm('KAPLAN PUBLISHING');
      expect(store.filteredBooks().map((b) => b.id)).toEqual(['2']);
    });

    it('exposes filtered vs total counts', () => {
      store.setSearchTerm('prep');
      expect(store.filteredCount()).toBe(2);
      expect(store.totalCount()).toBe(3);

      store.clearSearch();
      expect(store.filteredCount()).toBe(3);
    });
  });
});
