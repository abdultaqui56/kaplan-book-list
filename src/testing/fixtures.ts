import { Book, GoogleBooksVolume, GoogleBooksVolumesResponse } from '../app/core/models/book.model';

export function makeVolume(
  overrides: Partial<GoogleBooksVolume> & { id: string },
): GoogleBooksVolume {
  return {
    kind: 'books#volume',
    volumeInfo: {
      title: `Book ${overrides.id}`,
      authors: ['Kaplan Test Prep'],
      publisher: 'Simon and Schuster',
      publishedDate: '2018-06-05',
      infoLink: `https://books.google.com/books?id=${overrides.id}`,
    },
    ...overrides,
  };
}

export function makeResponse(ids: string[], totalItems = ids.length): GoogleBooksVolumesResponse {
  return {
    kind: 'books#volumes',
    totalItems,
    ...(ids.length ? { items: ids.map((id) => makeVolume({ id })) } : {}),
  };
}

export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'abc',
    title: 'ACT Prep 2019',
    authors: ['Kaplan Test Prep'],
    publisher: 'Simon and Schuster',
    publishedDate: '2018-06-05',
    thumbnailUrl: null,
    infoLink: 'https://books.google.com/books?id=abc',
    ...overrides,
  };
}
