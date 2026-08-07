#!/usr/bin/env node
import { createClient } from '@sanity/client';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || '8atrdwjk';
const dataset = process.env.SANITY_DATASET || 'production';
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!token) {
  console.error('Missing SANITY_API_WRITE_TOKEN.');
  process.exit(1);
}

const client = createClient({ projectId, dataset, useCdn: false, apiVersion: '2025-02-20', token });

function bodyText(body) {
  if (!Array.isArray(body)) return '';
  return body
    .filter((block) => block?._type === 'block' && Array.isArray(block.children))
    .flatMap((block) => block.children)
    .map((child) => child?.text || '')
    .join(' ');
}

function detectLanguage(title = '', body = '') {
  const sample = ` ${title} ${body} `.toLowerCase();
  const roSignals = [' și ', ' este ', ' pentru ', ' fără ', ' după ', ' securitate', ' vulnerabil', ' atac', ' datele ', ' utilizator'];
  const enSignals = [' the ', ' and ', ' for ', ' security', ' vulnerability', ' attack', ' users ', ' data ', ' with ', ' from '];
  const ro = roSignals.reduce((score, token) => score + (sample.includes(token) ? 1 : 0), 0);
  const en = enSignals.reduce((score, token) => score + (sample.includes(token) ? 1 : 0), 0);
  return ro > en ? 'ro' : 'en';
}

async function main() {
  const posts = await client.fetch(`*[_type == "post" && (!defined(language) || !defined(published))]{_id,title,body,language,published}`);
  if (!posts.length) {
    console.log('All blog posts already have language and published metadata.');
    return;
  }

  const tx = client.transaction();
  for (const post of posts) {
    const patch = {};
    if (!post.language) patch.language = detectLanguage(post.title, bodyText(post.body));
    if (typeof post.published !== 'boolean') patch.published = true;
    tx.patch(post._id, (builder) => builder.set(patch));
    console.log(`Normalizing ${post._id}: ${JSON.stringify(patch)}`);
  }
  await tx.commit();
  console.log(`Normalized ${posts.length} legacy post(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
