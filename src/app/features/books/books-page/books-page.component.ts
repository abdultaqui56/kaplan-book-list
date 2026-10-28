import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { BooksStore } from '../../../core/state/books.store';
import { BookCardComponent } from '../book-card/book-card.component';
import { BookSearchComponent } from '../book-search/book-search.component';

/**
 * Smart/container component for the Books page.
 * Reads from the store, dispatches actions; all rendering is delegated to
 * presentational children.
 */
@Component({
  selector: 'app-books-page',
  imports: [BookCardComponent, BookSearchComponent],
  templateUrl: './books-page.component.html',
  styleUrl: './books-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BooksPageComponent implements OnInit {
  readonly store = inject(BooksStore);

  /** Placeholder rows rendered while the first request is in flight. */
  readonly skeletons = Array.from({ length: 6 }, (_, i) => i);

  ngOnInit(): void {
    this.store.load();
  }

  onSearch(term: string): void {
    this.store.setSearchTerm(term);
  }

  retry(): void {
    this.store.load();
  }

  onCreate(): void {
    // Out of scope for this assignment; wired so the button is a real control.
    alert('Creating books is not part of this exercise.');
  }
}
