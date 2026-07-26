#!/usr/bin/env node
// Romania Cyber Monitor / main blog - auto-translates every published
// English Sanity `post` document into Romanian via Cloudflare Workers AI,
// and publishes the result as a sibling document (same slug, language:'ro').
// Safe to run repeatedly/on a schedule: it only ever selects EN posts whose
// slug has no published RO counterpart yet.
//
// Usage: node scripts/translate-blog-posts.mjs [--limit N]
//
// Env required:
//   PUBLIC_SANITY_PROJECT_ID / SANITY_PROJECT_ID - already used across the project
//   SANITY_DATASET            - defaults to "production"
//   SANITY_API_WRITE_TOKEN    - Sanity Editor token (write access)
//   CLOUDFLARE_ACCOUNT_ID     - account that hosts Workers AI
//   CLOUDFLARE_API_TOKEN      - needs "Workers AI" read/edit permission
//
// Designed to run unattended from .github/workflows/translate-blog-posts.yml.

import { createClient } from '@sanity/client';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || '8atrdwjk';
const dataset = process.env.SANITY_DATASET || 'production';
const writeToken = process.env.SANITY_API_WRITE_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

const PRIMARY_MODEL = process.env.WORKERS_AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const FALLBACK_MODEL = process.env.WORKERS_AI_FALLBACK_MODEL || '@cf/meta/llama-3.1-8b-instruct-fast';
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const limitArgIndex = process.argv.indexOf('--limit');
const limit = limitArgIndex !== -1 ? Number(process.argv[limitArgIndex + 1]) || 10 : 10;

if (!writeToken) {
  console.error('Missing SANITY_API_WRITE_TOKEN.');
  process.exit(1);
}
if (!accountId || !apiToken) {
  console.error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN.');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  useCdn: false,
  apiVersion: '2025-02-20',
  token: writeToken,
});

async function callWorkersAi(systemPrompt, userPrompt, model = PRIMARY_MODEL, attempt = 1) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (RETRYABLE_STATUSES.has(res.status) && attempt < 3) {
      console.warn(`Workers AI error ${res.status} (attempt ${attempt}, model ${model}), retrying: ${body}`);
      return callWorkersAi(systemPrompt, userPrompt, model, attempt + 1);
    }
    if (RETRYABLE_STATUSES.has(res.status) && model !== FALLBACK_MODEL) {
      console.warn(`Workers AI error ${res.status}: ${body}\nFalling back to ${FALLBACK_MODEL} after exhausting retries on ${model}.`);
      return callWorkersAi(systemPrompt, userPrompt, FALLBACK_MODEL, 1);
    }
    throw new Error(`Workers AI request failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  const text = data.result?.response ?? data.result;
  return typeof text === 'string' ? text : JSON.stringify(text);
}

// Strips ```json fences and any leading/trailing prose some models still add.
function extractJson(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.search(/[[{]/);
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  if (start === -1 || end === -1 || end < start) throw new Error(`No JSON found in model output:\n${raw}`);
  return JSON.parse(candidate.slice(start, end + 1));
}

async function translateFields(fields) {
  const systemPrompt = [
    'You are a professional Romanian translator for a cybersecurity blog.',
    'Translate the given English JSON object into natural, professional Romanian, keeping the exact same JSON shape and keys.',
    'Preserve technical terms, product names, and acronyms unchanged where a literal translation would be non-standard.',
    'Respond with the JSON object only, nothing else.',
  ].join(' ');

  const raw = await callWorkersAi(systemPrompt, JSON.stringify(fields));
  return extractJson(raw);
}

// Portable Text is an array of blocks; each block's translatable content
// lives in `children[].text` (for text blocks) or `code`/`caption` for other
// block types we don't expect here. We only ever send the raw strings to the
// model - never the block structure - so translation can't corrupt marks,
// list nesting, or block ordering.
async function translateBody(body) {
  if (!Array.isArray(body) || body.length === 0) return body;

  const spanRefs = [];
  for (const block of body) {
    if (block._type === 'block' && Array.isArray(block.children)) {
      for (const child of block.children) {
        if (typeof child.text === 'string' && child.text.trim()) {
          spanRefs.push(child);
        }
      }
    }
  }
  if (spanRefs.length === 0) return body;

  const systemPrompt = [
    'You are a professional Romanian translator for a cybersecurity blog.',
    'Translate each string in this JSON array from English to Romanian, preserving order.',
    'Preserve technical terms, product names, and acronyms unchanged where a literal translation would be non-standard.',
    'Respond with a JSON array of the same length containing only the translated strings, nothing else.',
  ].join(' ');

  const raw = await callWorkersAi(systemPrompt, JSON.stringify(spanRefs.map((s) => s.text)));
  const translated = extractJson(raw);

  if (!Array.isArray(translated) || translated.length !== spanRefs.length) {
    throw new Error(`Body translation returned ${Array.isArray(translated) ? translated.length : 'non-array'} items, expected ${spanRefs.length}`);
  }

  spanRefs.forEach((span, i) => {
    span.text = translated[i];
  });

  return body;
}

async function main() {
  const [enPosts, roSlugs] = await Promise.all([
    client.fetch(`*[_type == "post" && published == true && language == "en"]{
      _id, title, description, metaDescription, keywords, tags, pubDate,
      "slug": slug.current, category, author, featuredImage, body
    }`),
    client.fetch(`*[_type == "post" && published == true && language == "ro"].slug.current`),
  ]);

  const roSlugSet = new Set(roSlugs);
  const candidates = enPosts.filter((post) => post.slug && !roSlugSet.has(post.slug)).slice(0, limit);

  if (candidates.length === 0) {
    console.log('No untranslated posts found.');
    return;
  }

  console.log(`Translating ${candidates.length} post(s) to Romanian...`);

  let translated = 0;
  let failed = 0;

  for (const post of candidates) {
    try {
      console.log(`- ${post.slug}`);
      // eslint-disable-next-line no-await-in-loop
      const fields = await translateFields({
        title: post.title,
        description: post.description,
        metaDescription: post.metaDescription ?? '',
        keywords: post.keywords ?? [],
        tags: post.tags ?? [],
      });
      // eslint-disable-next-line no-await-in-loop
      const body = await translateBody(post.body ? JSON.parse(JSON.stringify(post.body)) : post.body);

      // eslint-disable-next-line no-await-in-loop
      await client.create({
        _type: 'post',
        title: fields.title,
        description: fields.description,
        metaDescription: fields.metaDescription || undefined,
        keywords: Array.isArray(fields.keywords) ? fields.keywords : undefined,
        tags: Array.isArray(fields.tags) ? fields.tags : undefined,
        language: 'ro',
        slug: { _type: 'slug', current: post.slug },
        pubDate: post.pubDate,
        category: post.category,
        author: post.author,
        featuredImage: post.featuredImage,
        body,
        published: true,
      });

      translated += 1;
    } catch (error) {
      failed += 1;
      console.error(`  Failed to translate ${post.slug}:`, error.message);
    }
  }

  console.log(`Done. Translated ${translated}, failed ${failed}.`);
  if (failed > 0 && translated === 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
