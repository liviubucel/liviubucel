import { afterEach, describe, expect, it, vi } from 'vitest';
import { enisaCirasAdapter } from './enisa-ciras';
import type { SyncContext } from '../types';

afterEach(() => {
  vi.unstubAllGlobals();
});

function context(env: Record<string, unknown> = {}): SyncContext {
  return { db: {} as D1Database, env, now: () => new Date(), triggerType: 'manual' };
}

describe('enisaCirasAdapter.fetchUpdates (disabled and unconfigured by default)', () => {
  it('throws when the feature flag is off', async () => {
    await expect(enisaCirasAdapter.fetchUpdates(context({ SOURCE_ENISA_CIRAS_ENABLED: 'false' }))).rejects.toThrow(
      'enisa_ciras_not_configured:disabled'
    );
  });

  it('throws when enabled but no export URL/host is configured', async () => {
    await expect(enisaCirasAdapter.fetchUpdates(context({ SOURCE_ENISA_CIRAS_ENABLED: 'true' }))).rejects.toThrow(
      'enisa_ciras_not_configured:missing_export_url'
    );
  });

  it('never calls fetch when unconfigured', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(enisaCirasAdapter.fetchUpdates(context())).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('enisaCirasAdapter.normalise (aggregate-only, never an individual incident)', () => {
  const row = {
    dataset: 'incident-counts',
    scope: 'eu' as const,
    period_label: '2026 H1',
    period_start: '2026-01-01',
    period_end: '2026-06-30',
    sector: 'finance',
    metric_name: 'reported_incidents',
    metric_value: 42,
  };

  it('produces a shape with no organisation/victim/individual-incident field', async () => {
    const result = await enisaCirasAdapter.normalise(row);
    expect(result).not.toHaveProperty('organisation');
    expect(result).not.toHaveProperty('organisationId');
    expect(result).not.toHaveProperty('victim');
    expect(result?.metricValue).toBe(42);
  });

  it('preserves the scope (romania vs eu) rather than inferring one', async () => {
    const result = await enisaCirasAdapter.normalise({ ...row, scope: 'romania' });
    expect(result?.scope).toBe('romania');
  });

  it('produces a deterministic dedup key for identical rows', async () => {
    const a = await enisaCirasAdapter.normalise(row);
    const b = await enisaCirasAdapter.normalise(row);
    expect(a?.dedupKey).toBe(b?.dedupKey);
  });
});

describe('enisaCirasAdapter.validateRecord', () => {
  it('rejects a row with an invalid scope value', () => {
    expect(
      enisaCirasAdapter.validateRecord({
        dataset: 'x',
        scope: 'not-a-real-scope',
        period_label: 'x',
        period_start: 'x',
        period_end: 'x',
        metric_name: 'x',
        metric_value: 1,
      })
    ).toBe(false);
  });

  it('accepts a well-formed row', () => {
    expect(
      enisaCirasAdapter.validateRecord({
        dataset: 'x',
        scope: 'eu',
        period_label: 'x',
        period_start: 'x',
        period_end: 'x',
        metric_name: 'x',
        metric_value: 1,
      })
    ).toBe(true);
  });
});
