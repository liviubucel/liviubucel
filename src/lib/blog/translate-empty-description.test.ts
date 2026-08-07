import { describe, expect, it } from 'vitest';
import { translatePostFields } from './translate';

describe('translatePostFields legacy metadata', () => {
  it('allows an empty description when the title translation is valid', async () => {
    const env = {
      AI: {
        async run() {
          return {
            response: JSON.stringify({
              title: 'Titlu tradus',
              description: '',
              metaDescription: '',
              keywords: [],
              tags: [],
            }),
          };
        },
      },
    };

    const result = await translatePostFields(env, {
      title: 'Translated title',
      description: '',
      metaDescription: '',
      keywords: [],
      tags: [],
    });

    expect(result?.title).toBe('Titlu tradus');
    expect(result?.description).toBe('');
  });
});
