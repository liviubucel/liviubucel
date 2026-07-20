#!/usr/bin/env node
/**
 * Translation Helper Script
 * Translates text content from English to Romanian
 * Usage: node scripts/translate-to-ro.mjs "Your English text here"
 *
 * For automatic translations, integrate with Claude API:
 * export ANTHROPIC_API_KEY="your-api-key-here"
 */

import fetch from 'node-fetch';

const SUPPORTED_LANGUAGES = {
  en: 'English',
  ro: 'Română',
};

async function translateWithClaude(text, targetLang = 'ro') {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('⚠️  ANTHROPIC_API_KEY not set');
    console.log('Set it with: export ANTHROPIC_API_KEY="your-key-here"');
    process.exit(1);
  }

  const prompt = `Translate the following ${targetLang === 'ro' ? 'English to Romanian' : 'Romanian to English'} text, preserving HTML tags, markdown, and special formatting:

${text}

Only provide the translated text, no explanations.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const translated = data.content[0].text;

    return translated.trim();
  } catch (error) {
    console.error('Translation failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('📝 Translation Helper Script');
    console.log('');
    console.log('Usage: node scripts/translate-to-ro.mjs [text]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/translate-to-ro.mjs "Hello world"');
    console.log('  node scripts/translate-to-ro.mjs "Welcome to my blog"');
    console.log('');
    console.log('Setup:');
    console.log('  1. Get API key from: https://console.anthropic.com');
    console.log('  2. Set: export ANTHROPIC_API_KEY="sk-ant-..."');
    console.log('  3. Run: node scripts/translate-to-ro.mjs "text to translate"');
    process.exit(0);
  }

  const text = args.join(' ');
  console.log('🌐 Translating EN → RO...\n');
  console.log('Original:', text);
  console.log('');

  const translation = await translateWithClaude(text, 'ro');

  console.log('Translated:', translation);
  console.log('');
  console.log('✅ Translation complete!');
}

main();
