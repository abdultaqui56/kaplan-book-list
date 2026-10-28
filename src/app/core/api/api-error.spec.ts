import { HttpErrorResponse } from '@angular/common/http';

import { toApiError } from './api-error';

describe('toApiError', () => {
  const http = (status: number) => new HttpErrorResponse({ status, statusText: 'x' });

  it('treats status 0 as a network problem that can be retried', () => {
    const err = toApiError(http(0));
    expect(err.retryable).toBe(true);
    expect(err.message).toMatch(/connection/i);
  });

  it('treats 429 and 5xx as retryable', () => {
    expect(toApiError(http(429)).retryable).toBe(true);
    expect(toApiError(http(500)).retryable).toBe(true);
    expect(toApiError(http(503)).retryable).toBe(true);
  });

  it('treats other 4xx as not retryable and includes the status', () => {
    const err = toApiError(http(400));
    expect(err.retryable).toBe(false);
    expect(err.status).toBe(400);
    expect(err.message).toContain('400');
  });

  it('handles unknown error shapes', () => {
    const err = toApiError(new Error('weird'));
    expect(err.status).toBeNull();
    expect(err.retryable).toBe(true);
  });
});
