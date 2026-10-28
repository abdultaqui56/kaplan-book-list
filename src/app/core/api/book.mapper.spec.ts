import { toBook, toBooks } from './book.mapper';
import { makeResponse, makeVolume } from '../../../testing/fixtures';

describe('book.mapper', () => {
  describe('toBook', () => {
    it('maps the fields the UI needs', () => {
      const book = toBook(
        makeVolume({
          id: 'x1',
          volumeInfo: {
            title: 'GRE Prep 2019',
            authors: ['Kaplan Test Prep'],
            publisher: 'Simon and Schuster',
            publishedDate: '2018-06-05',
            infoLink: 'https://example.com',
            imageLinks: { thumbnail: 'http://img/x1.jpg' },
          },
        }),
      );

      expect(book).toEqual({
        id: 'x1',
        title: 'GRE Prep 2019',
        authors: ['Kaplan Test Prep'],
        publisher: 'Simon and Schuster',
        publishedDate: '2018-06-05',
        thumbnailUrl: 'https://img/x1.jpg',
        infoLink: 'https://example.com',
      });
    });

    it('tolerates a volume with no volumeInfo at all', () => {
      const book = toBook({ kind: 'books#volume', id: 'bare' });
      expect(book.title).toBe('Untitled');
      expect(book.authors).toEqual([]);
      expect(book.publisher).toBeNull();
      expect(book.publishedDate).toBeNull();
      expect(book.thumbnailUrl).toBeNull();
    });

    it('trims whitespace and drops empty author entries', () => {
      const book = toBook(
        makeVolume({ id: 'w', volumeInfo: { title: '  Spaced  ', authors: [' A ', '', 'B'] } }),
      );
      expect(book.title).toBe('Spaced');
      expect(book.authors).toEqual(['A', 'B']);
    });

    it('falls back to smallThumbnail when thumbnail is missing', () => {
      const book = toBook(
        makeVolume({ id: 's', volumeInfo: { imageLinks: { smallThumbnail: 'http://small' } } }),
      );
      expect(book.thumbnailUrl).toBe('https://small');
    });
  });

  describe('toBooks', () => {
    it('returns an empty list when the API omits "items"', () => {
      expect(toBooks(makeResponse([], 0))).toEqual([]);
    });

    it('removes duplicate volume ids within a page', () => {
      const books = toBooks(makeResponse(['a', 'b', 'a']));
      expect(books.map((b) => b.id)).toEqual(['a', 'b']);
    });
  });
});
