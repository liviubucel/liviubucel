import { describe, expect, it } from 'vitest';
import { defangDomain, defangIp, defangUrl, maskIpv4 } from './defang';

describe('defangUrl', () => {
  it('defangs the exact spec example', () => {
    expect(defangUrl('https://malicious.example/path')).toBe('hxxps://malicious[.]example/path');
  });

  it('defangs http scheme too', () => {
    expect(defangUrl('http://evil.example/x')).toBe('hxxp://evil[.]example/x');
  });

  it('wraps every dot in brackets, leaving no unbracketed dot', () => {
    const result = defangUrl('https://sub.domain.example.co.uk/a.b.c');
    const withBracketedDotsRemoved = result.replace(/\[\.\]/g, '');
    expect(withBracketedDotsRemoved).not.toContain('.');
  });

  it('never leaves a clickable https:// or http:// prefix', () => {
    const result = defangUrl('https://evil.example/');
    expect(result.startsWith('http://')).toBe(false);
    expect(result.startsWith('https://')).toBe(false);
  });
});

describe('defangDomain', () => {
  it('replaces every dot with [.]', () => {
    expect(defangDomain('evil.example.com')).toBe('evil[.]example[.]com');
  });
});

describe('defangIp', () => {
  it('replaces every dot in an IPv4 address', () => {
    expect(defangIp('198.51.100.23')).toBe('198[.]51[.]100[.]23');
  });
});

describe('maskIpv4', () => {
  it('keeps only the first octet visible', () => {
    expect(maskIpv4('81.180.22.9')).toBe('81.x.x.x');
  });

  it('falls back to a fully masked placeholder for a malformed address', () => {
    expect(maskIpv4('not-an-ip')).toBe('x.x.x.x');
  });
});
