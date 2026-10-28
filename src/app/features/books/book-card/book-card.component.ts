import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Book } from '../../../core/models/book.model';

/** Presentational card for a single book. Receives data, emits nothing. */
@Component({
  selector: 'app-book-card',
  templateUrl: './book-card.component.html',
  styleUrl: './book-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookCardComponent {
  readonly book = input.required<Book>();

  readonly authorsLabel = computed(() => {
    const authors = this.book().authors;
    return authors.length ? authors.join(', ') : 'Unknown';
  });
}
