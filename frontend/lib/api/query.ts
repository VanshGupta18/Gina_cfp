import { QueryPayload } from '@/types';

export interface SSEEvent {
  event: string;
  data: unknown;
}

/**
 * Async generator that streams query results via SSE (Server-Sent Events)
 * Uses fetch + ReadableStream since the backend POST /api/query is POST-only
 * (EventSource only supports GET)
 */
export async function* streamQuery(
  payload: QueryPayload,
  token: string
): AsyncGenerator<SSEEvent> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Query failed: ${response.status} ${error}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Flush any remaining buffer
        if (buffer.trim()) {
          const event = parseSSEMessage(buffer);
          if (event) yield event;
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const messages = buffer.split('\n\n');
      buffer = messages[messages.length - 1]; // Keep incomplete message in buffer

      for (let i = 0; i < messages.length - 1; i++) {
        const event = parseSSEMessage(messages[i]);
        if (event) yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse a single SSE message block into event/data components
 * Format: "event: step\ndata: {...}\n"
 */
function parseSSEMessage(message: string): SSEEvent | null {
  const lines = message.trim().split('\n');
  let event = '';
  let data = '';

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.substring('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      data = line.substring('data:'.length).trim();
    }
  }

  if (!event || !data) return null;

  try {
    return {
      event,
      data: JSON.parse(data),
    };
  } catch {
    // If data isn't JSON, return as string
    return {
      event,
      data,
    };
  }
}
