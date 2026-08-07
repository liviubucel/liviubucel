#!/usr/bin/env node
import { createClient } from '@sanity/client';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || '8atrdwjk';
const dataset = process.env.SANITY_DATASET || 'production';
const writeToken = process.env.SANITY_API_WRITE_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

const PRIMARY_MODEL = process.env.WORKERS_AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const FALLBACK_MODEL = process.env.WORKERS_AI_FALLBACK_MODEL || '@cf/meta/llama-3.1-8b-instruct-fast';
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const BODY_CHUNK_CHAR_BUDGET = 2000;

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

const client = createClient({ projectId, dataset, useCdn: false, apiVersion: '2025-02-20', token: writeToken });

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
      return callWorkersAi(systemPrompt, userPrompt, model, attempt + 1);
    }
    if (RETRYABLE_STATUSES.has(res.status) && model !== FALLBACK_MODEL) {
      return callWorkersAi(systemPrompt, userPrompt, FALLBACK_MODEL, 1);
    }
    throw new Error(`Workers AI request failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  const text = data.result?.response ?? data.result;
  return typeof text === 'string' ? text : JSON.stringify(text);
}

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
    'Translate the English JSON object into natural, professional Romanian while preserving the exact keys and JSON shape.',
    'Preserve technical terms, product names and acronyms when Romanian security writing normally uses the English form.',
    'Do not add, remove or embellish factual content.',
    'Respond with JSON only.',
  ].join(' ');
  return extractJson(await callWorkersAi(systemPrompt, JSON.stringify(fields)));
}

function chunkSpanRefs(spanRefs) {
  const chunks = [];
  let current = [];
  let chars = 0;

  for (const span of spanRefs) {
    const len = span.text.length;
    if (current.length > 0 && chars + len > BODY_CHUNK_CHAR_BUDGET) {
      chunks.push(current);
      current = [];
      chars = 0;
    }
    current.push(span);
    chars += len;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function translateBody(body) {
  if (!Array.isArray(body) || body.length === 0) return body;

  const spanRefs = [];
  for (const block of body) {
    if (block._type === 'block' && Array.isArray(block.children)) {
      for (const child of block.children) {
        if (typeof child.text === 'string' && child.text.trim()) spanRefs.push(child);
      }
    }
  }
  if (spanRefs.length === 0) return body;

  const systemPrompt = [
    'You are a professional Romanian translator for a cybersecurity blog.',
    'Translate every string in the JSON array from English to Romanian and preserve order and array length exactly.',
    'Preserve technical terms, product names and acronyms where appropriate.',
    'Do not summarize or shorten the text.',
    'Respond with one JSON array only.',
  ].join(' ');

  for (const chunk of chunkSpanRefs(spanRefs)) {
    const translated = extractJson(await callWorkersAi(systemPrompt, JSON.stringify(chunk.map((span) => span.text))));
    if (!Array.isArray(translated) || translated.length !== chunk.length) {
      throw new Error(`Body translation returned ${Array.isArray(translated) ? translated.length : 'non-array'} items, expected ${chunk.length}`);
    }
    chunk.forEach((span, index) => {
      if (typeof translated[index] !== 'string' || !translated[index].trim()) {
        throw new Error(`Body translation returned invalid text at index ${index}`);
      }
      span.text = translated[index];
    });
  }

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

  let translatedCount = 0;
  let failed = 0;

  for (const post of candidates) {
    try {
      console.log(`Translating ${post.slug}`);
      const fields = await translateFields({
        title: post.title,
        description: post.description,
        metaDescription: post.metaDescription ?? '',
        keywords: post.keywords ?? [],
        tags: post.tags ?? [],
      });
      const body = await translateBody(post.body ? JSON.parse(JSON.stringify(post.body)) : post.body);

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
      translatedCount += 1;
    } catch (error) {
      failed += 1;
      console.error(`Failed to translate ${post.slug}:`, error.message);
    }
  }

  console.log(`Done. Translated ${translatedCount}, failed ${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
