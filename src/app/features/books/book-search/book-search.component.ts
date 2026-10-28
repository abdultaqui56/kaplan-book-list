import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

/**
 * Debounced search box. Owns only its text input; the parent decides what
 * "searching" means (here: client-side filtering in the store).
 */
@Component({
  selector: 'app-book-search',
  imports: [ReactiveFormsModule],
  templateUrl: './book-search.component.html',
  styleUrl: './book-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookSearchComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly placeholder = input('Search');
  readonly debounceMs = input(200);

  readonly termChange = output<string>();

  readonly control = new FormControl('', { nonNullable: true });

  constructor() {
    this.control.valueChanges
      .pipe(
        debounceTime(this.debounceMs()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((term) => this.termChange.emit(term));
  }

  clear(): void {
    this.control.setValue('');
  }
}
