import { Book, GoogleBooksVolume, GoogleBooksVolumesResponse } from '../models/book.model';

/**
 * Maps a single Google Books volume to our domain `Book`.
 * Pure function: easy to unit test, no Angular dependencies.
 */
export function toBook(volume: GoogleBooksVolume): Book {
  const info = volume.volumeInfo ?? {};

  // Google serves thumbnails over http; upgrade to https to avoid mixed content.
  const thumbnail = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;

  return {
    id: volume.id,
    title: info.title?.trim() || 'Untitled',
    authors: info.authors?.map((a) => a.trim()).filter(Boolean) ?? [],
    publisher: info.publisher?.trim() || null,
    publishedDate: info.publishedDate?.trim() || null,
    thumbnailUrl: thumbnail ? thumbnail.replace(/^http:\/\//, 'https://') : null,
    infoLink: info.infoLink ?? null,
  };
}

/**
 * Maps a full API page. Handles the API quirk where `items` is omitted
 * entirely (rather than `[]`) when a page is empty, and drops duplicate
 * volume ids that Google occasionally returns across pages.
 */
export function toBooks(response: GoogleBooksVolumesResponse): Book[] {
  const seen = new Set<string>();
  return (response.items ?? [])
    .filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)))
    .map(toBook);
}
