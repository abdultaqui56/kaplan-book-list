import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BooksPageComponent } from './features/books/books-page/books-page.component';
import { ShellComponent } from './shared/shell/shell.component';

@Component({
  selector: 'app-root',
  imports: [ShellComponent, BooksPageComponent],
  template: `
    <app-shell>
      <app-books-page />
    </app-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
