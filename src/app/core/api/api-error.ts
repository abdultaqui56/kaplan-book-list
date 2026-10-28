import { HttpErrorResponse } from '@angular/common/http';

/** A normalised, user-presentable error. */
export interface ApiError {
  /** Short, plain-language explanation shown in the UI. */
  message: string;
  /** Whether a retry is likely to help (vs. a bad request that will fail again). */
  retryable: boolean;
  /** HTTP status when available, for logging/debugging. */
  status: number | null;
}

/**
 * Convert whatever the HTTP layer throws into something the UI can show.
 * Keeps error-wording decisions in one place instead of scattered in templates.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return {
        message: 'Could not reach the books service. Check your connection and try again.',
        retryable: true,
        status: 0,
      };
    }
    if (error.status === 429) {
      return {
        message: 'The books service is rate-limiting requests. Wait a moment and try again.',
        retryable: true,
        status: 429,
      };
    }
    if (error.status >= 500) {
      return {
        message: 'The books service is temporarily unavailable. Try again shortly.',
        retryable: true,
        status: error.status,
      };
    }
    if (error.status >= 400) {
      return {
        message: `The request was rejected by the books service (HTTP ${error.status}).`,
        retryable: false,
        status: error.status,
      };
    }
  }

  return {
    message: 'Something went wrong while loading books.',
    retryable: true,
    status: null,
  };
}
