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
