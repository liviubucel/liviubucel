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
const MAX_CHUNK_CHARS = 4500;
const MAX_CHUNK_ITEMS = 40;

function cliValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const targetLanguage = cliValue('--to', 'ro');
if (!['en', 'ro'].includes(targetLanguage)) {
  console.error('Invalid --to language. Expected en or ro.');
  process.exit(1);
}

const sourceLanguage = targetLanguage === 'ro' ? 'en' : 'ro';
const limit = Number(cliValue('--limit', '10')) || 10;
const languageNames = { en: 'English', ro: 'Romanian' };

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
      console.warn(`Workers AI error ${res.status} (attempt ${attempt}, model ${model}), retrying.`);
      return callWorkersAi(systemPrompt, userPrompt, model, attempt + 1);
    }
    if (RETRYABLE_STATUSES.has(res.status) && model !== FALLBACK_MODEL) {
      console.warn(`Workers AI error ${res.status}; falling back to ${FALLBACK_MODEL}.`);
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
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON found in model output: ${raw.slice(0, 500)}`);
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function translationSystemPrompt(shape) {
  return [
    `You are a professional ${languageNames[targetLanguage]} translator for a cybersecurity blog.`,
    `Translate from ${languageNames[sourceLanguage]} to ${languageNames[targetLanguage]}.`,
    'Preserve cybersecurity terminology, CVE identifiers, product names, company names, commands, URLs, code, acronyms and technical values.',
    'Do not summarize, shorten, expand, fact-check, or add information. Translate faithfully and naturally.',
    shape,
  ].join(' ');
}

async function translateFields(fields) {
  const raw = await callWorkersAi(
    translationSystemPrompt('Keep the exact same JSON object shape and keys. Return JSON only.'),
    JSON.stringify(fields)
  );
  const translated = extractJson(raw);
  if (!translated || Array.isArray(translated) || typeof translated !== 'object') {
    throw new Error('Metadata translation did not return a JSON object.');
  }
  return translated;
}

function collectSpanRefs(body) {
  const refs = [];
  if (!Array.isArray(body)) return refs;
  for (const block of body) {
    if (block?._type !== 'block' || !Array.isArray(block.children)) continue;
    for (const child of block.children) {
      if (typeof child?.text === 'string' && child.text.trim()) refs.push(child);
    }
  }
  return refs;
}

function bodyPlainText(body) {
  return collectSpanRefs(body).map((span) => span.text).join(' ').replace(/\s+/g, ' ').trim();
}

function looksRomanian(text) {
  const lower = text.toLowerCase();
  const diacritics = lower.match(/[ăâîșşțţ]/g)?.length ?? 0;
  const words = lower.match(/\b(și|este|sunt|pentru|despre|cum|care|din|în|împotriva|securitate|vulnerabilitate|atac|ghid|după|fără|utilizatori|organizații|date|amenințare|risc)\b/g)?.length ?? 0;
  return diacritics + words >= 2;
}

function targetNeedsRepair(sourcePost, targetPost) {
  if (!targetPost) return true;

  const sourceText = bodyPlainText(sourcePost.body);
  const targetText = bodyPlainText(targetPost.body);

  if (sourceText && !targetText) return true;
  if (sourceText && targetText && sourceText === targetText) return true;

  // For substantive bodies, verify that the actual content language agrees
  // with the Sanity `language` field. This catches historical RO documents
  // whose title was translated but whose English body was copied unchanged.
  if (targetText.length >= 160) {
    const romanian = looksRomanian(targetText);
    if (targetLanguage === 'ro' && !romanian) return true;
    if (targetLanguage === 'en' && romanian) return true;
  }

  return false;
}

function chunkRefs(refs) {
  const chunks = [];
  let current = [];
  let chars = 0;

  for (const ref of refs) {
    const nextChars = ref.text.length;
    if (current.length > 0 && (current.length >= MAX_CHUNK_ITEMS || chars + nextChars > MAX_CHUNK_CHARS)) {
      chunks.push(current);
      current = [];
      chars = 0;
    }
    current.push(ref);
    chars += nextChars;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function translateBody(body) {
  if (!Array.isArray(body) || body.length === 0) return body;

  const spanRefs = collectSpanRefs(body);
  if (spanRefs.length === 0) return body;

  const chunks = chunkRefs(spanRefs);
  console.log(`  Translating body in ${chunks.length} chunk(s), ${spanRefs.length} text span(s).`);

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const chunk = chunks[chunkIndex];
    const sourceTexts = chunk.map((span) => span.text);
    const raw = await callWorkersAi(
      translationSystemPrompt('Input is a JSON array of strings. Preserve array order and length. Return the translated JSON array only.'),
      JSON.stringify(sourceTexts)
    );
    const translated = extractJson(raw);

    if (!Array.isArray(translated) || translated.length !== chunk.length) {
      throw new Error(`Body chunk ${chunkIndex + 1} returned ${Array.isArray(translated) ? translated.length : 'non-array'} items, expected ${chunk.length}.`);
    }

    chunk.forEach((span, index) => {
      if (typeof translated[index] !== 'string') {
        throw new Error(`Body chunk ${chunkIndex + 1} item ${index + 1} was not a string.`);
      }
      span.text = translated[index];
    });
  }

  return body;
}

async function main() {
  const [sourcePosts, targetPosts] = await Promise.all([
    client.fetch(
      `*[_type == "post" && published == true && language == $language] | order(pubDate desc) {
        _id, title, description, metaDescription, keywords, tags, pubDate,
        "slug": slug.current, category, author, featuredImage, body
      }`,
      { language: sourceLanguage }
    ),
    client.fetch(
      `*[_type == "post" && published == true && language == $language] {
        _id, "slug": slug.current, body
      }`,
      { language: targetLanguage }
    ),
  ]);

  const targetBySlug = new Map(targetPosts.filter((post) => post.slug).map((post) => [post.slug, post]));
  const candidates = sourcePosts
    .filter((post) => post.slug && targetNeedsRepair(post, targetBySlug.get(post.slug)))
    .slice(0, limit);

  if (candidates.length === 0) {
    console.log(`No ${sourceLanguage.toUpperCase()} posts need a ${targetLanguage.toUpperCase()} counterpart or repair.`);
    return;
  }

  console.log(`Processing ${candidates.length} ${targetLanguage.toUpperCase()} counterpart(s) from ${sourceLanguage.toUpperCase()} source posts.`);

  let translatedCount = 0;
  let repairedCount = 0;
  let failed = 0;

  for (const post of candidates) {
    const existingTarget = targetBySlug.get(post.slug);
    try {
      console.log(`- ${post.slug}${existingTarget ? ' (repair existing)' : ' (create)'}`);
      const fields = await translateFields({
        title: post.title,
        description: post.description ?? '',
        metaDescription: post.metaDescription ?? '',
        keywords: post.keywords ?? [],
        tags: post.tags ?? [],
      });

      const bodyClone = post.body ? JSON.parse(JSON.stringify(post.body)) : post.body;
      const translatedBody = await translateBody(bodyClone);
      const translatedDocument = {
        title: fields.title,
        description: fields.description || '',
        metaDescription: fields.metaDescription || undefined,
        keywords: Array.isArray(fields.keywords) ? fields.keywords : undefined,
        tags: Array.isArray(fields.tags) ? fields.tags : undefined,
        language: targetLanguage,
        slug: { _type: 'slug', current: post.slug },
        pubDate: post.pubDate,
        category: post.category,
        author: post.author,
        featuredImage: post.featuredImage,
        body: translatedBody,
        published: true,
      };

      if (existingTarget) {
        await client.patch(existingTarget._id).set(translatedDocument).commit();
        repairedCount += 1;
      } else {
        await client.create({ _type: 'post', ...translatedDocument });
        translatedCount += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(`  Failed to translate ${post.slug}:`, error?.message ?? String(error));
    }
  }

  console.log(`Done. Created ${translatedCount}, repaired ${repairedCount}, failed ${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
