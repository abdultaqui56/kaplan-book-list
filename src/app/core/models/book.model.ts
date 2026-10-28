/**
 * Domain model used throughout the UI.
 * Deliberately flat and free of API-specific nesting so components never
 * need to know how Google Books structures its payload.
 */
export interface Book {
  id: string;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  thumbnailUrl: string | null;
  infoLink: string | null;
}

/* ------------------------------------------------------------------ */
/*  Google Books API — only the fields we actually consume are typed.  */
/*  https://developers.google.com/books/docs/v1/reference/volumes       */
/* ------------------------------------------------------------------ */

export interface GoogleBooksVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  infoLink?: string;
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
  };
}

export interface GoogleBooksVolume {
  kind: 'books#volume';
  id: string;
  volumeInfo?: GoogleBooksVolumeInfo;
}

export interface GoogleBooksVolumesResponse {
  kind: 'books#volumes';
  totalItems: number;
  /** Absent (not an empty array) when a page has no results. */
  items?: GoogleBooksVolume[];
}
