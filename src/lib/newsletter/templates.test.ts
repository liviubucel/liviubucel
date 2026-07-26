import { describe, expect, it } from 'vitest';
import { newsletterConfirmationEmail, newsletterDigestEmail } from './templates';

describe('newsletterConfirmationEmail', () => {
  it('includes the confirm link in both html and text', () => {
    const url = 'https://liviubucel.com/api/newsletter/confirm?token=abc123';
    const email = newsletterConfirmationEmail(url);
    expect(email.html).toContain(url);
    expect(email.text).toContain(url);
    expect(email.subject).toContain('Confirm');
  });
});

describe('newsletterDigestEmail', () => {
  const items = [
    {
      title: 'Acme SRL: ransomware group listing (unconfirmed claim)',
      excerpt: 'A group listed Acme SRL on a leak site.',
      url: 'https://liviubucel.com/romania-cyber-monitor/incidents/acme-abc123',
      badge: 'Ransomware claim',
      date: '2026-07-20',
    },
    {
      title: 'Example Breach: entry added to the breach catalogue',
      excerpt: 'Example Breach was added to the HIBP catalogue.',
      url: 'https://liviubucel.com/romania-cyber-monitor/incidents/example-breach-def456',
      badge: 'Verified breach',
      date: null,
    },
  ];
  const unsubscribeUrl = 'https://liviubucel.com/api/newsletter/unsubscribe?token=xyz';
  const monitorUrl = 'https://liviubucel.com/romania-cyber-monitor';

  it('titles the subject with the count for multiple items, the title itself for one', () => {
    expect(newsletterDigestEmail(items, unsubscribeUrl, monitorUrl).subject).toContain('2 new Romania-linked updates');
    expect(newsletterDigestEmail([items[0]], unsubscribeUrl, monitorUrl).subject).toBe(
      `Romania Cyber Monitor: ${items[0].title}`,
    );
  });

  it('renders every item title, badge, excerpt, and link', () => {
    const { html, text } = newsletterDigestEmail(items, unsubscribeUrl, monitorUrl);
    for (const item of items) {
      expect(html).toContain(item.title);
      expect(html).toContain(item.badge);
      expect(html).toContain(item.excerpt);
      expect(html).toContain(item.url);
      expect(text).toContain(item.title);
      expect(text).toContain(item.url);
    }
  });

  it('shows a reported date only when one is available', () => {
    const { html } = newsletterDigestEmail(items, unsubscribeUrl, monitorUrl);
    expect(html).toContain('Reported 20 July 2026');
  });

  it('includes the unsubscribe link and a link back to the monitor', () => {
    const { html, text } = newsletterDigestEmail(items, unsubscribeUrl, monitorUrl);
    expect(html).toContain(unsubscribeUrl);
    expect(html).toContain(monitorUrl);
    expect(text).toContain(unsubscribeUrl);
    expect(text).toContain(monitorUrl);
  });

  it('escapes HTML in titles and excerpts instead of injecting it raw', () => {
    const malicious = [
      {
        title: '<script>alert(1)</script>',
        excerpt: '<img src=x onerror=alert(1)>',
        url: 'https://liviubucel.com/romania-cyber-monitor/incidents/x',
        badge: 'Ransomware claim',
        date: null,
      },
    ];
    const { html } = newsletterDigestEmail(malicious, unsubscribeUrl, monitorUrl);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });
});
