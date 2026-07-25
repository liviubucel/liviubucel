import { describe, expect, it } from 'vitest';
import { CRON_SOURCE_MAP, sourcesForCron } from './cron-schedule';

describe('sourcesForCron', () => {
  it('matches the 6-hourly schedule to fast-moving feeds', () => {
    expect(sourcesForCron('0 */6 * * *')).toEqual(['ransomware_live', 'threatfox', 'urlhaus']);
  });

  it('matches the 12-hourly schedule', () => {
    expect(sourcesForCron('0 */12 * * *')).toEqual(['hibp', 'malwarebazaar']);
  });

  it('matches the daily schedule', () => {
    expect(sourcesForCron('0 3 * * *')).toEqual(['hibp', 'leakix', 'misp']);
  });

  it('matches the weekly schedule', () => {
    expect(sourcesForCron('0 4 * * 1')).toEqual(['enisa_ciras']);
  });

  it('returns an empty array for an unrecognised cron expression', () => {
    expect(sourcesForCron('* * * * *')).toEqual([]);
  });

  it('every cron entry in wrangler.toml has a corresponding map entry', () => {
    // Mirrors the [triggers] crons list in wrangler.toml - if that list
    // changes, this test should be updated to match.
    const wranglerCrons = ['0 */6 * * *', '0 */12 * * *', '0 3 * * *', '0 4 * * 1'];
    for (const cron of wranglerCrons) {
      expect(CRON_SOURCE_MAP[cron]).toBeDefined();
    }
  });
});
