// Romania Cyber Monitor - per-source enable/credential gating.
// Every optional source checks both its feature flag and its required
// secret(s) before attempting a fetch, so a missing credential produces a
// clear, specific error the scheduler can log to source_health instead of
// an opaque failure.

export function isSourceEnabled(env: Record<string, unknown>, flagName: string): boolean {
  return env[flagName] === 'true' || env[flagName] === true;
}

export function getRequiredSecret(env: Record<string, unknown>, secretName: string): string | null {
  const value = env[secretName];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export class SourceNotConfiguredError extends Error {
  constructor(sourceId: string, reason: string) {
    super(`${sourceId}_not_configured:${reason}`);
    this.name = 'SourceNotConfiguredError';
  }
}
