import { describe, expect, it } from 'vitest';
import { checkOutboundUrl } from './ssrf-guard';

const allowedHosts = ['api.example-source.com'];

describe('checkOutboundUrl', () => {
  it('allows an https URL on an allowlisted host', () => {
    const result = checkOutboundUrl('https://api.example-source.com/v1/data', { allowedHosts });
    expect(result.safe).toBe(true);
  });

  it('allows a subdomain of an allowlisted host', () => {
    const result = checkOutboundUrl('https://sub.api.example-source.com/v1/data', { allowedHosts });
    expect(result.safe).toBe(true);
  });

  it('rejects a host that is not allowlisted (SSRF via arbitrary upstream URL)', () => {
    const result = checkOutboundUrl('https://attacker.example.com/', { allowedHosts });
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('host_not_allowlisted');
  });

  it('rejects a plain http URL by default', () => {
    const result = checkOutboundUrl('http://api.example-source.com/v1/data', { allowedHosts });
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('https_required');
  });

  it('rejects file: scheme', () => {
    const result = checkOutboundUrl('file:///etc/passwd', { allowedHosts });
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('blocked_scheme:file:');
  });

  it('rejects ftp: scheme', () => {
    const result = checkOutboundUrl('ftp://api.example-source.com/file', { allowedHosts });
    expect(result.safe).toBe(false);
  });

  it('rejects data: scheme', () => {
    const result = checkOutboundUrl('data:text/plain;base64,SGVsbG8=', { allowedHosts });
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('blocked_scheme:data:');
  });

  it('rejects javascript: scheme', () => {
    const result = checkOutboundUrl('javascript:alert(1)', { allowedHosts });
    expect(result.safe).toBe(false);
  });

  it('rejects a .onion address even if allowlisted by name', () => {
    const result = checkOutboundUrl('https://example.onion/', { allowedHosts: ['example.onion'] });
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('onion_address_blocked');
  });

  it('rejects the Cloudflare/AWS metadata endpoint', () => {
    const result = checkOutboundUrl('https://169.254.169.254/latest/meta-data/', {
      allowedHosts: ['169.254.169.254'],
    });
    expect(result.safe).toBe(false);
    // metadata IP also matches the link-local pattern; either rejection reason is acceptable
    expect(result.safe).toBe(false);
  });

  it('rejects loopback 127.0.0.1', () => {
    const result = checkOutboundUrl('https://127.0.0.1/', { allowedHosts: ['127.0.0.1'] });
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('private_or_loopback_ip_blocked');
  });

  it('rejects localhost', () => {
    const result = checkOutboundUrl('https://localhost/', { allowedHosts: ['localhost'] });
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('private_or_loopback_ip_blocked');
  });

  it('rejects private 10.x.x.x address', () => {
    const result = checkOutboundUrl('https://10.0.0.5/', { allowedHosts: ['10.0.0.5'] });
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('private_or_loopback_ip_blocked');
  });

  it('rejects private 192.168.x.x address', () => {
    const result = checkOutboundUrl('https://192.168.1.1/', { allowedHosts: ['192.168.1.1'] });
    expect(result.safe).toBe(false);
  });

  it('rejects private 172.16-31.x.x address', () => {
    const result = checkOutboundUrl('https://172.20.0.1/', { allowedHosts: ['172.20.0.1'] });
    expect(result.safe).toBe(false);
  });

  it('rejects IPv6 loopback ::1', () => {
    const result = checkOutboundUrl('https://[::1]/', { allowedHosts: ['[::1]'] });
    expect(result.safe).toBe(false);
  });

  it('rejects an invalid URL string', () => {
    const result = checkOutboundUrl('not a url', { allowedHosts });
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('not_a_valid_url');
  });

  it('never trusts a URL taken from an upstream record just because it looks https', () => {
    // Simulates "do not follow links contained in threat-actor records" -
    // even a syntactically valid https URL must be rejected if its host
    // isn't the adapter's own fixed, allowlisted source host.
    const upstreamSuppliedUrl = 'https://leak-site.example/stolen-data.zip';
    const result = checkOutboundUrl(upstreamSuppliedUrl, { allowedHosts: ['api.ransomware.live'] });
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('host_not_allowlisted');
  });
});
