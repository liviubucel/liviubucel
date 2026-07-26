import { describe, expect, it, vi } from 'vitest';
import { translateArticleToRomanian } from './translate';

const ARTICLE = { title: 'Acme SRL breach', excerpt: 'A short summary.', body: '## Executive summary\nDetails.' };

function aiEnv(run: (model: string) => Promise<unknown>) {
  return { AI: { run: vi.fn((model: string) => run(model)) } };
}

describe('translateArticleToRomanian', () => {
  it('returns null when the AI binding is not configured', async () => {
    await expect(translateArticleToRomanian({}, ARTICLE)).resolves.toBeNull();
  });

  it('parses a well-formed JSON response from the primary model', async () => {
    const env = aiEnv(async () => ({
      response: JSON.stringify({ title: 'Titlu', excerpt: 'Rezumat', body: 'Corp' }),
    }));

    const result = await translateArticleToRomanian(env, ARTICLE);

    expect(result).toEqual({ title: 'Titlu', excerpt: 'Rezumat', body: 'Corp' });
    expect(env.AI.run).toHaveBeenCalledTimes(1);
  });

  it('strips markdown code fences around the JSON response', async () => {
    const env = aiEnv(async () => ({
      response: '```json\n' + JSON.stringify({ title: 'T', excerpt: 'E', body: 'B' }) + '\n```',
    }));

    const result = await translateArticleToRomanian(env, ARTICLE);
    expect(result).toEqual({ title: 'T', excerpt: 'E', body: 'B' });
  });

  it('falls back to the secondary model when the primary returns unusable output', async () => {
    let call = 0;
    const env = aiEnv(async () => {
      call += 1;
      if (call === 1) return { response: 'not json at all' };
      return { response: JSON.stringify({ title: 'T', excerpt: 'E', body: 'B' }) };
    });

    const result = await translateArticleToRomanian(env, ARTICLE);

    expect(result).toEqual({ title: 'T', excerpt: 'E', body: 'B' });
    expect(env.AI.run).toHaveBeenCalledTimes(2);
  });

  it('returns null (never throws) when both models fail', async () => {
    const env = aiEnv(async () => {
      throw new Error('model unavailable');
    });

    await expect(translateArticleToRomanian(env, ARTICLE)).resolves.toBeNull();
  });

  it('returns null when the response is missing a required field', async () => {
    const env = aiEnv(async () => ({ response: JSON.stringify({ title: 'Only title' }) }));

    await expect(translateArticleToRomanian(env, ARTICLE)).resolves.toBeNull();
  });
});
