import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookSearchComponent } from './book-search.component';

describe('BookSearchComponent', () => {
  let fixture: ComponentFixture<BookSearchComponent>;
  let input: HTMLInputElement;
  let emitted: string[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BookSearchComponent] }).compileComponents();
    fixture = TestBed.createComponent(BookSearchComponent);
    emitted = [];
    fixture.componentInstance.termChange.subscribe((t) => emitted.push(t));
    await fixture.whenStable();
    input = fixture.nativeElement.querySelector('input');
    // Fake timers only after the async setup; whenStable() relies on real ones.
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  const type = (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('debounces keystrokes and emits the final term once', () => {
    type('g');
    type('gr');
    type('gre');
    expect(emitted).toEqual([]);

    vi.advanceTimersByTime(200);
    expect(emitted).toEqual(['gre']);
  });

  it('does not re-emit an unchanged term', () => {
    type('act');
    vi.advanceTimersByTime(200);
    type('act');
    vi.advanceTimersByTime(200);
    expect(emitted).toEqual(['act']);
  });

  it('clears the input and emits an empty term', () => {
    type('mcat');
    vi.advanceTimersByTime(200);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.search__clear').click();
    vi.advanceTimersByTime(200);

    expect(input.value).toBe('');
    expect(emitted).toEqual(['mcat', '']);
  });
});
