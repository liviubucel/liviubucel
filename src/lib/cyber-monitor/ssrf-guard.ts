// Romania Cyber Monitor - SSRF guard.
//
// This module is the only place allowed to decide whether an outbound fetch
// target is safe. Adapters must NEVER fetch a URL taken directly from an
// upstream record (threat-actor listing, HIBP description, LeakIX record,
// IOC reference, MISP event, etc.) without passing it through here first -
// and in practice, adapters should only ever fetch their own fixed,
// allowlisted base host, never a URL discovered in third-party data.

export interface SsrfGuardOptions {
  /** Exact hostnames (or their subdomains) this fetch is allowed to target. */
  allowedHosts: readonly string[];
  /** Defaults to true: only https is allowed. */
  requireHttps?: boolean;
}

export interface SsrfGuardResult {
  safe: boolean;
  reason?: string;
}

const BLOCKED_SCHEMES = new Set(['file:', 'ftp:', 'data:', 'javascript:']);

const CLOUDFLARE_METADATA_HOSTS = new Set(['169.254.169.254', 'metadata.google.internal']);

const PRIVATE_OR_LOOPBACK_PATTERNS: RegExp[] = [
  /^127\./, // IPv4 loopback
  /^10\./, // IPv4 private
  /^192\.168\./, // IPv4 private
  /^172\.(1[6-9]|2\d|3[01])\./, // IPv4 private (172.16.0.0/12)
  /^169\.254\./, // IPv4 link-local
  /^0\.0\.0\.0$/,
  /^::1$/, // IPv6 loopback
  /^fe80:/i, // IPv6 link-local
  /^f[cd][0-9a-f]{2}:/i, // IPv6 unique local (fc00::/7)
];

function isPrivateOrLoopbackHost(hostname: string): boolean {
  // WHATWG URL keeps IPv6 hostnames bracket-wrapped, e.g. "[::1]".
  const normalised = hostname.replace(/^\[/, '').replace(/\]$/, '');
  if (normalised === 'localhost') return true;
  return PRIVATE_OR_LOOPBACK_PATTERNS.some((pattern) => pattern.test(normalised));
}

function isHostAllowlisted(hostname: string, allowedHosts: readonly string[]): boolean {
  return allowedHosts.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );
}

/**
 * Validates a URL before it may be fetched. Returns `{ safe: false, reason }`
 * for anything that isn't an explicitly allowlisted HTTPS host.
 */
export function checkOutboundUrl(rawUrl: string, options: SsrfGuardOptions): SsrfGuardResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'not_a_valid_url' };
  }

  if (BLOCKED_SCHEMES.has(url.protocol)) {
    return { safe: false, reason: `blocked_scheme:${url.protocol}` };
  }

  const requireHttps = options.requireHttps ?? true;
  if (requireHttps && url.protocol !== 'https:') {
    return { safe: false, reason: 'https_required' };
  }

  if (url.hostname.toLowerCase().endsWith('.onion')) {
    return { safe: false, reason: 'onion_address_blocked' };
  }

  if (CLOUDFLARE_METADATA_HOSTS.has(url.hostname)) {
    return { safe: false, reason: 'metadata_endpoint_blocked' };
  }

  if (isPrivateOrLoopbackHost(url.hostname)) {
    return { safe: false, reason: 'private_or_loopback_ip_blocked' };
  }

  if (!isHostAllowlisted(url.hostname, options.allowedHosts)) {
    return { safe: false, reason: 'host_not_allowlisted' };
  }

  return { safe: true };
}
