import { describe, expect, it } from 'vitest';
import { sanitizeUpstreamHtml } from './sanitize';

describe('sanitizeUpstreamHtml', () => {
  it('strips script tags entirely, including their content', () => {
    const result = sanitizeUpstreamHtml('<p>Hello</p><script>alert(1)</script>');
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
    expect(result).toContain('Hello');
  });

  it('strips a hyperlink but keeps its text content', () => {
    const result = sanitizeUpstreamHtml('Visit <a href="https://evil.example">this link</a> now.');
    expect(result).not.toContain('<a');
    expect(result).not.toContain('href');
    expect(result).toContain('this link');
  });

  it('keeps basic formatting tags', () => {
    const result = sanitizeUpstreamHtml('<p>This is <strong>important</strong> and <em>emphasised</em>.</p>');
    expect(result).toContain('<strong>important</strong>');
    expect(result).toContain('<em>emphasised</em>');
  });

  it('strips an onerror attribute injection attempt', () => {
    const result = sanitizeUpstreamHtml('<img src=x onerror="alert(1)">');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('<img');
  });

  it('removes style tags and their contents', () => {
    const result = sanitizeUpstreamHtml('<style>body{display:none}</style><p>Text</p>');
    expect(result).not.toContain('display:none');
    expect(result).toContain('Text');
  });
});
