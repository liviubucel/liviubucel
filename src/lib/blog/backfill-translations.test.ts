import { describe, expect, it, vi } from 'vitest';
import type { SanityClient } from '@sanity/client';
import { backfillBlogTranslations } from './backfill-translations';

const EN_POST = {
  _id: 'post-1',
  title: 'Acme breach',
  description: 'A short summary.',
  metaDescription: 'Meta.',
  keywords: ['ransomware'],
  tags: ['breach'],
  slug: 'acme-breach',
  pubDate: '2026-01-01T00:00:00.000Z',
  category: { _type: 'reference', _ref: 'category-1' },
  author: { _type: 'reference', _ref: 'author-1' },
  featuredImage: { asset: { _ref: 'image-1' } },
  body: [{ _type: 'block', children: [{ _type: 'span', text: 'Hello world' }] }],
};

function fakeClient(overrides: { fetch?: unknown; create?: unknown } = {}): SanityClient {
  return {
    fetch: vi.fn(async (query: string) => (query.includes('language == "en"') ? [EN_POST] : [])),
    create: vi.fn(async (doc: unknown) => doc),
    ...overrides,
  } as unknown as SanityClient;
}

function aiEnv() {
  return {
    AI: {
      run: vi.fn(async (_model: string, inputs: { messages: { content: string }[] }) => {
        const userContent = inputs.messages[1].content;
        // fields call sends an object; body call sends an array
        if (userContent.trim().startsWith('[')) {
          return { response: JSON.stringify(['Salut lume']) };
        }
        return { response: JSON.stringify({ title: 'Breșă Acme', description: 'Un rezumat scurt.' }) };
      }),
    },
  };
}

describe('backfillBlogTranslations', () => {
  it('returns an empty result when no Sanity write client is configured', async () => {
    const result = await backfillBlogTranslations({}, 10, null);
    expect(result).toEqual({ candidates: 0, translated: 0, partial: [], failed: 0, failedSlugs: [] });
  });

  it('skips EN posts that already have a published RO counterpart', async () => {
    const client = fakeClient({
      fetch: vi.fn(async (query: string) => (query.includes('language == "en"') ? [EN_POST] : ['acme-breach'])),
    });

    const result = await backfillBlogTranslations(aiEnv(), 10, client);

    expect(result).toEqual({ candidates: 0, translated: 0, partial: [], failed: 0, failedSlugs: [] });
    expect(client.create).not.toHaveBeenCalled();
  });

  it('translates and persists an untranslated EN post as a RO sibling document', async () => {
    const client = fakeClient();
    const env = aiEnv();

    const result = await backfillBlogTranslations(env, 10, client);

    expect(result).toEqual({ candidates: 1, translated: 1, partial: [], failed: 0, failedSlugs: [] });
    expect(client.create).toHaveBeenCalledTimes(1);
    expect(client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: 'post',
        title: 'Breșă Acme',
        description: 'Un rezumat scurt.',
        language: 'ro',
        slug: { _type: 'slug', current: 'acme-breach' },
        category: { _type: 'reference', _ref: 'category-1' },
        author: { _type: 'reference', _ref: 'author-1' },
        body: [{ _type: 'block', children: [{ _type: 'span', text: 'Salut lume' }] }],
        published: true,
      })
    );
  });

  it('counts a post as failed when field translation fails, without persisting anything', async () => {
    const client = fakeClient();
    const env = { AI: { run: vi.fn(async () => ({ response: 'not json' })) } };

    const result = await backfillBlogTranslations(env, 10, client);

    expect(result).toEqual({
      candidates: 1,
      translated: 0,
      partial: [],
      failed: 1,
      failedSlugs: [{ slug: 'acme-breach', reason: 'fields_translation_failed' }],
    });
    expect(client.create).not.toHaveBeenCalled();
  });

  it('still publishes with the English body (as a partial success) when only body translation fails', async () => {
    const client = fakeClient();
    let call = 0;
    const env = {
      AI: {
        run: vi.fn(async () => {
          call += 1;
          if (call === 1) return { response: JSON.stringify({ title: 'Breșă Acme', description: 'Un rezumat scurt.' }) };
          throw new Error('model unavailable');
        }),
      },
    };

    const result = await backfillBlogTranslations(env, 10, client);

    expect(result).toEqual({ candidates: 1, translated: 1, partial: ['acme-breach'], failed: 0, failedSlugs: [] });
    expect(client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Breșă Acme',
        body: EN_POST.body, // fell back to the untranslated English body
      })
    );
  });

  it('counts a post as failed when persisting to Sanity throws', async () => {
    const client = fakeClient({ create: vi.fn(async () => { throw new Error('conflict'); }) });

    const result = await backfillBlogTranslations(aiEnv(), 10, client);

    expect(result).toEqual({
      candidates: 1,
      translated: 0,
      partial: [],
      failed: 1,
      failedSlugs: [{ slug: 'acme-breach', reason: 'persist_failed' }],
    });
  });

  it('respects the limit parameter', async () => {
    const manyPosts = Array.from({ length: 5 }, (_, i) => ({ ...EN_POST, _id: `post-${i}`, slug: `post-${i}` }));
    const client = fakeClient({
      fetch: vi.fn(async (query: string) => (query.includes('language == "en"') ? manyPosts : [])),
    });

    const result = await backfillBlogTranslations(aiEnv(), 2, client);

    expect(result.candidates).toBe(2);
    expect(client.create).toHaveBeenCalledTimes(2);
  });
});
