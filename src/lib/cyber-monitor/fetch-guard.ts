// Romania Cyber Monitor - allowlisted fetch wrapper.
//
// Every source adapter's outbound HTTP call goes through this function:
// SSRF-checked, timed out, size-bounded, and retried with exponential
// backoff and jitter. 429 responses honour Retry-After / X-Limited-For.

import { checkOutboundUrl } from './ssrf-guard';

export interface GuardedFetchOptions {
  allowedHosts: readonly string[];
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxRetries?: number;
  maxResponseBytes?: number;
}

export interface GuardedFetchResult {
  ok: boolean;
  status?: number;
  body?: string;
  headers?: Headers;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Cryptographically secure random integer in [0, max). Never Math.random(). */
function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function backoffWithJitter(attempt: number): number {
  const base = 500 * 2 ** attempt;
  return base + secureRandomInt(base);
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return null;
}

function concatChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function readBoundedBody(
  response: Response,
  maxResponseBytes: number
): Promise<{ ok: true; body: string } | { ok: false; error: 'response_too_large' }> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (text.length > maxResponseBytes) {
      return { ok: false, error: 'response_too_large' };
    }
    return { ok: true, body: text };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > maxResponseBytes) {
        await reader.cancel();
        return { ok: false, error: 'response_too_large' };
      }
      chunks.push(value);
    }
  }

  return { ok: true, body: new TextDecoder().decode(concatChunks(chunks, totalBytes)) };
}

/**
 * Fetches an allowlisted HTTPS host with SSRF protection, a timeout, a
 * bounded response size, and retry/backoff on 429 and 5xx responses.
 */
export async function guardedFetch(url: string, options: GuardedFetchOptions): Promise<GuardedFetchResult> {
  const safety = checkOutboundUrl(url, { allowedHosts: options.allowedHosts });
  if (!safety.safe) {
    return { ok: false, error: `blocked_url:${safety.reason}` };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

  let lastError = 'unknown_error';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfterMs =
          parseRetryAfterMs(response.headers.get('retry-after')) ??
          parseRetryAfterMs(response.headers.get('x-limited-for')) ??
          backoffWithJitter(attempt);

        if (attempt < maxRetries) {
          await sleep(retryAfterMs);
          continue;
        }
        return { ok: false, status: 429, error: 'rate_limited' };
      }

      if (!response.ok) {
        if (response.status >= 500 && attempt < maxRetries) {
          await sleep(backoffWithJitter(attempt));
          continue;
        }
        return { ok: false, status: response.status, error: `http_${response.status}` };
      }

      const bodyResult = await readBoundedBody(response, maxResponseBytes);
      if (!bodyResult.ok) {
        return { ok: false, status: response.status, error: bodyResult.error };
      }

      return { ok: true, status: response.status, body: bodyResult.body, headers: response.headers };
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error.message : 'fetch_failed';
      if (attempt < maxRetries) {
        await sleep(backoffWithJitter(attempt));
        continue;
      }
    }
  }

  return { ok: false, error: lastError };
}
