// Romania Cyber Monitor - which sources run on which cron trigger.
// Kept as a plain data map (not embedded in the scheduled() handler) so the
// schedule is easy to audit against wrangler.toml's [triggers] crons list
// and against docs/romania-cyber-monitor.md's documented rationale.

import type { SourceId } from './types';

export const CRON_SOURCE_MAP: Record<string, SourceId[]> = {
  // Every 6 hours: fast-moving claim/IOC feeds.
  '0 */6 * * *': ['ransomware_live', 'threatfox', 'urlhaus'],
  // Every 12 hours: HIBP latest-breach check + malware metadata.
  '0 */12 * * *': ['hibp', 'malwarebazaar'],
  // Once daily at 03:00 UTC: full catalogue refresh + slower-moving sources.
  '0 3 * * *': ['hibp', 'leakix', 'misp'],
  // Weekly, Monday 04:00 UTC: aggregate statistics + report generation trigger.
  '0 4 * * 1': ['enisa_ciras'],
};

export function sourcesForCron(cronExpression: string): SourceId[] {
  return CRON_SOURCE_MAP[cronExpression] ?? [];
}
