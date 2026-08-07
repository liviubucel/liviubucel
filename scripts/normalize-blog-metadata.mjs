#!/usr/bin/env node
import { createClient } from '@sanity/client';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || '8atrdwjk';
const dataset = process.env.SANITY_DATASET || 'production';
const writeToken = process.env.SANITY_API_WRITE_TOKEN;

if (!writeToken) {
  console.error('Missing SANITY_API_WRITE_TOKEN.');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  useCdn: false,
  apiVersion: '2025-02-20',
  token: writeToken,
});

function bodyText(body) {
  if (!Array.isArray(body)) return '';
  return body
    .filter((block) => block?._type === 'block' && Array.isArray(block.children))
    .flatMap((block) => block.children)
    .map((child) => (typeof child?.text === 'string' ? child.text : ''))
    .join(' ');
}

function detectLanguage(post) {
  const text = `${post.title ?? ''} ${post.description ?? ''} ${bodyText(post.body)}`.toLowerCase();
  const romanianSignals = [
    /[ăâîșşțţ]/g,
    /\b(și|este|sunt|pentru|despre|cum|care|din|în|împotriva|securitate|vulnerabilitate|atac|ghid|după|fără|site-uri|utilizatori)\b/g,
  ];

  let score = 0;
  for (const pattern of romanianSignals) {
    const matches = text.match(pattern);
    score += matches?.length ?? 0;
  }
  return score >= 2 ? 'ro' : 'en';
}

async function main() {
  const posts = await client.fetch(`*[_type == "post" && (!defined(language) || !defined(published))]{
    _id, title, description, body, pubDate, language, published
  }`);

  if (!posts.length) {
    console.log('No legacy blog metadata to normalize.');
    return;
  }

  let patched = 0;
  for (const post of posts) {
    const patch = {};

    if (!post.language) {
      patch.language = detectLanguage(post);
    }

    // The historical seed script created recovered public blog documents with
    // IDs prefixed by `post-` but omitted `published`. Only those known legacy
    // documents are promoted automatically; arbitrary drafts remain untouched.
    if (typeof post.published !== 'boolean' && post._id.startsWith('post-') && post.pubDate && Array.isArray(post.body) && post.body.length > 0) {
      patch.published = true;
    }

    if (Object.keys(patch).length === 0) {
      console.log(`Skipping ${post._id}: no safe automatic patch.`);
      continue;
    }

    await client.patch(post._id).set(patch).commit();
    patched += 1;
    console.log(`Patched ${post._id}: ${JSON.stringify(patch)}`);
  }

  console.log(`Done. Patched ${patched} legacy post(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
