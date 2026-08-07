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
  it('routes Romania and Moldova to Romanian', () => {
    expect(automaticLanguage(requestWithCountry('RO'))).toBe('ro');
    expect(automaticLanguage(requestWithCountry('MD'))).toBe('ro');
  });

  it('routes the UK and unknown locations to English', () => {
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

  it('ignores Cloudflare unknown and Tor pseudo-country codes', () => {
    expect(countryFromRequest(requestWithCountry('XX'))).toBeNull();
    expect(countryFromRequest(requestWithCountry('T1'))).toBeNull();
  });
});

describe('locale paths', () => {
  it('preserves romania-cyber-monitor when changing language', () => {
    expect(withLanguage('/romania-cyber-monitor', 'ro')).toBe('/ro/romania-cyber-monitor');
    expect(withLanguage('/ro/romania-cyber-monitor', 'en')).toBe('/romania-cyber-monitor');
  });

  it('handles root and nested routes', () => {
    expect(withLanguage('/', 'ro')).toBe('/ro');
    expect(withLanguage('/ro', 'en')).toBe('/');
    expect(withLanguage('/blog/example', 'ro')).toBe('/ro/blog/example');
  });

  it('recognises only a real /ro prefix', () => {
    expect(hasRomanianPrefix('/ro')).toBe(true);
    expect(hasRomanianPrefix('/ro/blog')).toBe(true);
    expect(hasRomanianPrefix('/romania-cyber-monitor')).toBe(false);
  });
});

describe('manual preference', () => {
  it('uses only the explicit-preference cookie and ignores the old auto cookie', () => {
    expect(getManualLanguage(requestWithCountry('RO', 'lb_lang_pref=en'))).toBe('en');
    expect(getManualLanguage(requestWithCountry('RO', 'lb_lang=en'))).toBeNull();
  });
});
