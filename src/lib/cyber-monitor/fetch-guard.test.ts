import { afterEach, describe, expect, it, vi } from 'vitest';
import { guardedFetch } from './fetch-guard';

const allowedHosts = ['api.example-source.com'];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('guardedFetch', () => {
  it('never calls fetch for a non-allowlisted host (SSRF prevention)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await guardedFetch('https://attacker.example.com/', { allowedHosts });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('blocked_url');
  });

  it('returns the body on a successful response', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await guardedFetch('https://api.example-source.com/v1/data', { allowedHosts });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.body).toBe('{"ok":true}');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries once on a 500 and succeeds on the second attempt', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response('server error', { status: 500 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await guardedFetch('https://api.example-source.com/v1/data', {
      allowedHosts,
      maxRetries: 1,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    expect(result.body).toBe('ok');
  });

  it('gives up after exhausting retries and returns the last error', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('nope', { status: 503 }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await guardedFetch('https://api.example-source.com/v1/data', {
      allowedHosts,
      maxRetries: 1,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
  });

  it('honours a Retry-After header on 429 and eventually succeeds', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('rate limited', { status: 429, headers: { 'Retry-After': '0' } })
      )
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await guardedFetch('https://api.example-source.com/v1/data', {
      allowedHosts,
      maxRetries: 1,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it('returns a rate_limited error when 429 persists past the retry budget', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response('rate limited', { status: 429, headers: { 'Retry-After': '0' } })
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await guardedFetch('https://api.example-source.com/v1/data', {
      allowedHosts,
      maxRetries: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error).toBe('rate_limited');
  });

  it('rejects a response that exceeds the configured max size', async () => {
    const bigBody = 'x'.repeat(1000);
    const fetchSpy = vi.fn().mockResolvedValue(new Response(bigBody, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await guardedFetch('https://api.example-source.com/v1/data', {
      allowedHosts,
      maxResponseBytes: 10,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('response_too_large');
  });

  it('returns a non-retry 4xx error immediately without retrying', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('bad request', { status: 400 }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await guardedFetch('https://api.example-source.com/v1/data', {
      allowedHosts,
      maxRetries: 3,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });
});
