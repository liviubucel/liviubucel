import { ApiKeyStrategy, createClient } from '@wix/sdk';

export const WIX_SITE_ID = 'a6445237-56e0-4f67-9469-31e8e807c3b3';

let cachedApiKey: string | null = null;
let cachedClient: ReturnType<typeof createClient> | null = null;

function readApiKey(env: Record<string, unknown>): string | null {
  const value = env.WIX_API_KEY;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Returns an admin-authenticated Wix client for server-only jobs.
 *
 * WIX_API_KEY must be provisioned as a runtime secret. Never expose it via
 * PUBLIC_* variables or browser bundles.
 */
export function getWixAdminClient(env: Record<string, unknown>) {
  const apiKey = readApiKey(env);
  if (!apiKey) return null;

  if (cachedClient && cachedApiKey === apiKey) return cachedClient;

  cachedApiKey = apiKey;
  cachedClient = createClient({
    auth: ApiKeyStrategy({
      apiKey,
      siteId: WIX_SITE_ID,
    }),
  });

  return cachedClient;
}
