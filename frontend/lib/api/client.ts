import { createBrowserClient } from '@supabase/ssr';

/**
 * Typed fetch wrapper that automatically attaches JWT from Supabase session
 * Used for all non-SSE requests
 */

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is required');
}

/**
 * Typed fetch wrapper with JWT authentication
 * Automatically attaches Authorization header from Supabase session
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit & { method?: string } = {}
): Promise<T> {
  try {
    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    // Build request headers
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${session.access_token}`);

    // Don't override Content-Type if already set (e.g., for multipart)
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    // Make the request
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Parse response
    const contentType = response.headers.get('content-type');
    let data: unknown;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle errors
    if (!response.ok) {
      const errorMessage =
        typeof data === 'object' && data !== null && 'error' in data
          ? (data as { error: string }).error
          : `HTTP ${response.status}`;

      throw new Error(`API Error: ${errorMessage}`);
    }

    return data as T;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`API request failed: ${String(err)}`);
  }
}

/**
 * Helper to create FormData for multipart requests
 * Useful for file uploads without Content-Type header
 */
export function createFormData(data: Record<string, string | File | Blob>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }
  return formData;
}

export { supabase };
