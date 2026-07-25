// Romania Cyber Monitor - defanging utilities.
//
// Any malicious/malware-distribution URL, domain or IP that ends up in a
// public response MUST be passed through one of these first, so it can
// never become a clickable link or an accidentally-copyable live target.

/**
 * Defangs a full URL: http/https schemes become hxxp/hxxps and every literal
 * dot becomes `[.]`. Example: `https://malicious.example/path` becomes
 * `hxxps://malicious[.]example/path`.
 */
export function defangUrl(url: string): string {
  return url
    .replace(/^http:\/\//i, 'hxxp://')
    .replace(/^https:\/\//i, 'hxxps://')
    .replace(/\./g, '[.]');
}

/** Defangs a bare domain/hostname, e.g. `evil.example` -> `evil[.]example`. */
export function defangDomain(domain: string): string {
  return domain.replace(/\./g, '[.]');
}

/** Defangs an IPv4 address, e.g. `1.2.3.4` -> `1[.]2[.]3[.]4`. */
export function defangIp(ip: string): string {
  return ip.replace(/\./g, '[.]');
}

/**
 * Masks an IPv4 address for aggregated public display, keeping only the
 * first octet visible, e.g. `81.180.22.9` -> `81.x.x.x`. IPv6 addresses are
 * never partially shown - callers should omit them entirely from public
 * output instead of calling this function.
 */
export function maskIpv4(ip: string): string {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return 'x.x.x.x';
  }
  return `${parts[0]}.x.x.x`;
}
