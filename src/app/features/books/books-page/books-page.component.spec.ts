import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { makeResponse } from '../../../../testing/fixtures';
import { BooksPageComponent } from './books-page.component';

/**
 * Integration test: real store + real API service + real child components,
 * with only the HTTP boundary stubbed.
 */
describe('BooksPageComponent (integration)', () => {
  let fixture: ComponentFixture<BooksPageComponent>;
  let http: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BooksPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BooksPageComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const booksRequest = () => http.expectOne((r) => r.url === environment.booksApiUrl);

  it('requests books on init and shows skeletons while loading', () => {
    expect(el.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    booksRequest().flush(makeResponse([]));
  });

  it('renders a card per book once loaded', async () => {
    booksRequest().flush(makeResponse(['a', 'b', 'c']));
    await fixture.whenStable();

    expect(el.querySelectorAll('app-book-card').length).toBe(3);
    expect(el.querySelector('.list__count')?.textContent).toContain('3 books');
    expect(el.querySelector('.skeleton')).toBeNull();
  });

  it('shows an empty state when the API returns nothing', async () => {
    booksRequest().flush(makeResponse([], 0));
    await fixture.whenStable();

    expect(el.querySelector('.state')?.textContent).toContain('No books found');
  });

  it('shows an error state with a working retry button', () => {
    vi.useFakeTimers();
    try {
      // Initial attempt + 2 automatic retries all fail.
      for (let i = 0; i < 3; i++) {
        booksRequest().flush({}, { status: 503, statusText: 'Unavailable' });
        vi.runAllTimers();
      }
      fixture.detectChanges();

      const alert = el.querySelector('[role="alert"]');
      expect(alert?.textContent).toContain("couldn't be loaded");

      alert?.querySelector('button')?.click();
      fixture.detectChanges();

      booksRequest().flush(makeResponse(['ok']));
      fixture.detectChanges();

      expect(el.querySelector('[role="alert"]')).toBeNull();
      expect(el.querySelectorAll('app-book-card').length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('filters the list from the search box', () => {
    vi.useFakeTimers();
    try {
      booksRequest().flush({
        kind: 'books#volumes',
        totalItems: 2,
        items: [
          { kind: 'books#volume', id: '1', volumeInfo: { title: 'GRE Prep' } },
          { kind: 'books#volume', id: '2', volumeInfo: { title: 'ACT Prep' } },
        ],
      });
      fixture.detectChanges();

      const input = el.querySelector<HTMLInputElement>('input[type=search]')!;
      input.value = 'gre';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(200);
      fixture.detectChanges();

      expect(el.querySelectorAll('app-book-card').length).toBe(1);
      expect(el.querySelector('.list__count')?.textContent).toContain('1 of 2 books');

      input.value = 'zzz';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(200);
      fixture.detectChanges();

      expect(el.querySelector('.state')?.textContent).toContain('No books match');
    } finally {
      vi.useRealTimers();
    }
  });
});
