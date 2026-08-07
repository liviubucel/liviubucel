import { describe, expect, it } from 'vitest';
import {
  automaticLanguage,
  countryFromRequest,
  getManualLanguage,
  hasRomanianPrefix,
  withLanguage,
} from './language-routing';

function requestWithCountry(country?: string, cookie?: string): Request {
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  const request = new Request('https://www.liviubucel.com/', { headers });
  if (country) {
    Object.defineProperty(request, 'cf', {
      value: { country },
      configurable: true,
    });
  }
  return request;
}

describe('country based language routing', () => {
  it('routes Romania to Romanian', () => {
    expect(automaticLanguage(requestWithCountry('RO'))).toBe('ro');
  });

  it('routes Moldova to Romanian', () => {
    expect(automaticLanguage(requestWithCountry('MD'))).toBe('ro');
  });

  it('routes the UK and unknown countries to English', () => {
    expect(automaticLanguage(requestWithCountry('GB'))).toBe('en');
    expect(automaticLanguage(requestWithCountry())).toBe('en');
  });

  it('uses CF-IPCountry as a defensive fallback', () => {
    const request = new Request('https://www.liviubucel.com/', {
      headers: { 'cf-ipcountry': 'RO' },
    });
    expect(countryFromRequest(request)).toBe('RO');
    expect(automaticLanguage(request)).toBe('ro');
  });

  it('does not treat Cloudflare unknown/Tor codes as countries', () => {
    expect(countryFromRequest(requestWithCountry('XX'))).toBeNull();
    expect(countryFromRequest(requestWithCountry('T1'))).toBeNull();
  });
});

describe('locale path handling', () => {
  it('never strips the ro letters from romania-cyber-monitor', () => {
    expect(withLanguage('/romania-cyber-monitor', 'ro')).toBe('/ro/romania-cyber-monitor');
    expect(withLanguage('/ro/romania-cyber-monitor', 'en')).toBe('/romania-cyber-monitor');
  });

  it('handles home and nested paths consistently', () => {
    expect(withLanguage('/', 'ro')).toBe('/ro');
    expect(withLanguage('/ro', 'en')).toBe('/');
    expect(withLanguage('/blog/example', 'ro')).toBe('/ro/blog/example');
  });

  it('recognises only a real Romanian path prefix', () => {
    expect(hasRomanianPrefix('/ro')).toBe(true);
    expect(hasRomanianPrefix('/ro/blog')).toBe(true);
    expect(hasRomanianPrefix('/romania-cyber-monitor')).toBe(false);
  });
});

describe('manual preference', () => {
  it('reads only the new explicit-preference cookie', () => {
    expect(getManualLanguage(requestWithCountry('RO', 'lb_lang_pref=en'))).toBe('en');
    expect(getManualLanguage(requestWithCountry('RO', 'lb_lang=en'))).toBeNull();
  });
});
