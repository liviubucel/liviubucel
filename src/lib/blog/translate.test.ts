import { describe, expect, it, vi } from 'vitest';
import { translatePostFields, translatePostBody, type PortableTextBlock } from './translate';

const FIELDS = { title: 'Acme breach', description: 'A short summary.', metaDescription: 'Meta.', keywords: ['ransomware'], tags: ['breach'] };

function aiEnv(run: (model: string) => Promise<unknown>) {
  return { AI: { run: vi.fn((model: string) => run(model)) } };
}

describe('translatePostFields', () => {
  it('returns null when the AI binding is not configured', async () => {
    await expect(translatePostFields({}, FIELDS)).resolves.toBeNull();
  });

  it('parses a well-formed JSON response from the primary model', async () => {
    const env = aiEnv(async () => ({
      response: JSON.stringify({ title: 'Titlu', description: 'Rezumat', metaDescription: 'Meta RO', keywords: ['ransomware'], tags: ['breșă'] }),
    }));

    const result = await translatePostFields(env, FIELDS);

    expect(result).toEqual({ title: 'Titlu', description: 'Rezumat', metaDescription: 'Meta RO', keywords: ['ransomware'], tags: ['breșă'] });
    expect(env.AI.run).toHaveBeenCalledTimes(1);
  });

  it('strips markdown code fences around the JSON response', async () => {
    const env = aiEnv(async () => ({
      response: '```json\n' + JSON.stringify({ title: 'T', description: 'D' }) + '\n```',
    }));

    const result = await translatePostFields(env, FIELDS);
    expect(result).toEqual({ title: 'T', description: 'D', metaDescription: undefined, keywords: undefined, tags: undefined });
  });

  it('falls back to the secondary model when the primary returns unusable output', async () => {
    let call = 0;
    const env = aiEnv(async () => {
      call += 1;
      if (call === 1) return { response: 'not json at all' };
      return { response: JSON.stringify({ title: 'T', description: 'D' }) };
    });

    const result = await translatePostFields(env, FIELDS);

    expect(result).toEqual({ title: 'T', description: 'D', metaDescription: undefined, keywords: undefined, tags: undefined });
    expect(env.AI.run).toHaveBeenCalledTimes(2);
  });

  it('returns null (never throws) when both models fail', async () => {
    const env = aiEnv(async () => {
      throw new Error('model unavailable');
    });

    await expect(translatePostFields(env, FIELDS)).resolves.toBeNull();
  });

  it('returns null when the response is missing a required field', async () => {
    const env = aiEnv(async () => ({ response: JSON.stringify({ title: 'Only title' }) }));

    await expect(translatePostFields(env, FIELDS)).resolves.toBeNull();
  });
});

describe('translatePostBody', () => {
  const BODY: PortableTextBlock[] = [
    { _type: 'block', children: [{ _type: 'span', text: 'Hello world' }] },
    { _type: 'block', children: [{ _type: 'span', text: 'Second paragraph' }] },
  ];

  it('returns the body unchanged when empty', async () => {
    await expect(translatePostBody({ AI: { run: vi.fn() } }, [])).resolves.toEqual([]);
    await expect(translatePostBody({ AI: { run: vi.fn() } }, undefined)).resolves.toBeNull();
  });

  it('returns null when the AI binding is not configured', async () => {
    await expect(translatePostBody({}, BODY)).resolves.toBeNull();
  });

  it('translates each span text while preserving block structure', async () => {
    const env = aiEnv(async () => ({ response: JSON.stringify(['Salut lume', 'Al doilea paragraf']) }));

    const result = await translatePostBody(env, BODY);

    expect(result).toEqual([
      { _type: 'block', children: [{ _type: 'span', text: 'Salut lume' }] },
      { _type: 'block', children: [{ _type: 'span', text: 'Al doilea paragraf' }] },
    ]);
    // original body must not be mutated
    expect(BODY[0].children?.[0].text).toBe('Hello world');
  });

  it('returns null when the model returns the wrong number of items', async () => {
    const env = aiEnv(async () => ({ response: JSON.stringify(['only one']) }));

    await expect(translatePostBody(env, BODY)).resolves.toBeNull();
  });

  it('skips non-block/non-text content untouched', async () => {
    const bodyWithImage: PortableTextBlock[] = [
      { _type: 'image', asset: { _ref: 'image-abc' } },
      { _type: 'block', children: [{ _type: 'span', text: 'Caption text' }] },
    ];
    const env = aiEnv(async () => ({ response: JSON.stringify(['Text de captiune']) }));

    const result = await translatePostBody(env, bodyWithImage);

    expect(result?.[0]).toEqual({ _type: 'image', asset: { _ref: 'image-abc' } });
    expect(result?.[1]).toEqual({ _type: 'block', children: [{ _type: 'span', text: 'Text de captiune' }] });
  });
});
