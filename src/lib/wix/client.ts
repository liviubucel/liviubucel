import { createClient, OAuthStrategy } from '@wix/sdk';
import { items } from '@wix/data';

/**
 * Public Headless client for the existing `liviubucel` Wix site.
 *
 * The OAuth client ID is intentionally public: visitor OAuth clients are
 * designed to be embedded in headless frontends and do not use a client
 * secret. Collection permissions remain the authorization boundary.
 */
export const WIX_SITE_ID = 'a6445237-56e0-4f67-9469-31e8e807c3b3';
export const WIX_CLIENT_ID =
  import.meta.env.PUBLIC_WIX_CLIENT_ID || 'fa19f377-c994-45c3-935b-235f41858d0f';

export const wixPublicClient = createClient({
  modules: { items },
  auth: OAuthStrategy({ clientId: WIX_CLIENT_ID }),
});
