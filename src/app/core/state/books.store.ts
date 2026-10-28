import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, retry, switchMap, tap, timer } from 'rxjs';

import { ApiError, toApiError } from '../api/api-error';
import { GoogleBooksApiService } from '../api/google-books-api.service';
import { Book } from '../models/book.model';

export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/** The query the assignment asks for; kept here so the UI doesn't hard-code it. */
export const DEFAULT_QUERY = 'kaplan test prep';

/**
 * Single source of truth for the Books feature.
 *
 * Why a hand-rolled signal store rather than NgRx? The feature has one
 * async resource and one piece of derived state. Signals give us the same
 * guarantees (unidirectional data flow, derived state, components that
 * never mutate state directly) with far less ceremony. If the app grew,
 * this class maps 1:1 onto an `@ngrx/signals` `signalStore`.
 */
@Injectable({ providedIn: 'root' })
export class BooksStore {
  private readonly api = inject(GoogleBooksApiService);
  private readonly destroyRef = inject(DestroyRef);

  /* ---------- private writable state ---------- */
  private readonly _books = signal<Book[]>([]);
  private readonly _status = signal<LoadStatus>('idle');
  private readonly _error = signal<ApiError | null>(null);
  private readonly _searchTerm = signal('');

  /* ---------- public read-only selectors ---------- */
  readonly books = this._books.asReadonly();
  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();

  readonly isLoading = computed(() => this._status() === 'loading');

  /** Books matching the current search term (title, author or publisher). */
  readonly filteredBooks = computed(() => {
    const term = this._searchTerm().trim().toLowerCase();
    if (!term) {
      return this._books();
    }
    return this._books().filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.authors.some((a) => a.toLowerCase().includes(term)) ||
        (b.publisher?.toLowerCase().includes(term) ?? false),
    );
  });

  readonly totalCount = computed(() => this._books().length);
  readonly filteredCount = computed(() => this.filteredBooks().length);

  /* ---------- effects ---------- */
  private readonly load$ = new Subject<string>();

  constructor() {
    // switchMap guarantees that a retry fired while a request is in flight
    // cancels the stale request instead of racing it.
    this.load$
      .pipe(
        tap(() => {
          this._status.set('loading');
          this._error.set(null);
        }),
        switchMap((query) =>
          this.api.fetchAll(query).pipe(
            // Transient failures (network blip, 5xx) get two automatic retries
            // with a short back-off before we surface an error to the user.
            retry({ count: 2, delay: (_, attempt) => timer(300 * attempt) }),
            tap((books) => {
              this._books.set(books);
              this._status.set('loaded');
            }),
            catchError((err: unknown) => {
              this._error.set(toApiError(err));
              this._status.set('error');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /* ---------- actions ---------- */

  /** Load (or reload) books for `query`. */
  load(query: string = DEFAULT_QUERY): void {
    this.load$.next(query);
  }

  /** Update the client-side filter. */
  setSearchTerm(term: string): void {
    this._searchTerm.set(term);
  }

  clearSearch(): void {
    this._searchTerm.set('');
  }
}
