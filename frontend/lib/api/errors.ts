/**
 * User-facing messages for failed API calls (connectivity, auth, HTTP errors).
 */
export function formatApiFailure(
  err: unknown,
  context: { url: string; method?: string }
): string {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return (
      `Cannot reach the API (${context.method ?? 'GET'} ${context.url}). ` +
      'Check that the backend is running, NEXT_PUBLIC_API_BASE_URL matches it, and CORS allows this origin.'
    );
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Request failed';
}

/**
 * Turn backend JSON `{ error, details? }` (e.g. Zod flatten) into one line — shared by REST and query pre-stream errors.
 */
export function messageFromApiErrorPayload(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('error' in data)) {
    return null;
  }
  let errorMessage = String((data as { error: string }).error);
  const details = (data as { details?: { fieldErrors?: Record<string, string[]> } }).details;
  if (details?.fieldErrors) {
    const first = Object.values(details.fieldErrors).flat()[0];
    if (first) errorMessage = `${errorMessage}: ${first}`;
  }
  return errorMessage;
}

/** Build a clear Error for failed `POST /api/query` before the SSE body starts. */
export function queryHttpError(status: number, bodyText: string, url: string): Error {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText) as unknown;
  } catch {
    parsed = null;
  }
  const fromJson = parsed !== null ? messageFromApiErrorPayload(parsed) : null;
  if (fromJson) {
    return new Error(`Query failed (${status}): ${fromJson}`);
  }
  const trimmed = bodyText.trim().slice(0, 400);
  if (trimmed) {
    return new Error(`Query failed (${status}): ${trimmed}`);
  }
  return new Error(`Query failed (${status}). ${url}`);
}
