import { ComponentFixture, TestBed } from '@angular/core/testing';

import { makeBook } from '../../../../testing/fixtures';
import { BookCardComponent } from './book-card.component';

describe('BookCardComponent', () => {
  let fixture: ComponentFixture<BookCardComponent>;

  const render = async (book = makeBook()) => {
    fixture = TestBed.createComponent(BookCardComponent);
    fixture.componentRef.setInput('book', book);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [BookCardComponent] }));

  it('renders title, authors, publisher and date', async () => {
    const el = await render();
    expect(el.querySelector('.card__title')?.textContent).toContain('ACT Prep 2019');
    const rows = Array.from(el.querySelectorAll('dd')).map((d) => d.textContent?.trim());
    expect(rows).toEqual(['Kaplan Test Prep', 'Simon and Schuster', '2018-06-05']);
  });

  it('links the title to Google Books when infoLink exists', async () => {
    const el = await render();
    const link = el.querySelector<HTMLAnchorElement>('.card__title a');
    expect(link?.href).toBe('https://books.google.com/books?id=abc');
    expect(link?.rel).toContain('noopener');
  });

  it('shows plain text and "Unknown" placeholders when data is missing', async () => {
    const el = await render(
      makeBook({ infoLink: null, authors: [], publisher: null, publishedDate: null }),
    );
    expect(el.querySelector('.card__title a')).toBeNull();
    const rows = Array.from(el.querySelectorAll('dd')).map((d) => d.textContent?.trim());
    expect(rows).toEqual(['Unknown', 'Unknown', 'Unknown']);
  });

  it('joins multiple authors with commas', async () => {
    const el = await render(makeBook({ authors: ['A', 'B'] }));
    expect(el.querySelector('dd')?.textContent?.trim()).toBe('A, B');
  });
});
