import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Book, GoogleBooksVolumesResponse } from '../models/book.model';
import { toBooks } from './book.mapper';

/** Google Books caps a single page at 40 results. */
export const PAGE_SIZE = 40;
/** Safety valve so a very broad query cannot fan out into dozens of requests. */
export const MAX_PAGES = 5;

/**
 * Thin data-access layer. Knows about URLs, paging and payload shape;
 * knows nothing about UI state. Returns domain `Book`s, never raw DTOs.
 */
@Injectable({ providedIn: 'root' })
export class GoogleBooksApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.booksApiUrl;

  /** Fetch a single page of volumes for `query`. */
  fetchPage(query: string, startIndex = 0): Observable<GoogleBooksVolumesResponse> {
    const params = new HttpParams()
      .set('q', query)
      .set('startIndex', startIndex)
      .set('maxResults', PAGE_SIZE);

    return this.http.get<GoogleBooksVolumesResponse>(this.baseUrl, { params });
  }

  /**
   * Fetch *all* volumes for `query`, following pagination.
   *
   * Strategy: request page 0, read `totalItems`, then request the remaining
   * pages in parallel. `totalItems` is only an estimate on Google's side, so
   * we tolerate short/empty trailing pages and dedupe by volume id.
   */
  fetchAll(query: string): Observable<Book[]> {
    return this.fetchPage(query, 0).pipe(
      switchMap((first) => {
        const pageCount = Math.min(MAX_PAGES, Math.ceil(first.totalItems / PAGE_SIZE));
        if (pageCount <= 1) {
          return of([first]);
        }
        const rest = Array.from({ length: pageCount - 1 }, (_, i) =>
          this.fetchPage(query, (i + 1) * PAGE_SIZE),
        );
        return forkJoin([of(first), ...rest]);
      }),
      map((pages) => mergePages(pages)),
    );
  }
}

/** Concatenate pages into one book list, removing cross-page duplicates. */
function mergePages(pages: GoogleBooksVolumesResponse[]): Book[] {
  const byId = new Map<string, Book>();
  for (const page of pages) {
    for (const book of toBooks(page)) {
      if (!byId.has(book.id)) {
        byId.set(book.id, book);
      }
    }
  }
  return [...byId.values()];
}
