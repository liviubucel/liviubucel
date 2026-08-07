#!/usr/bin/env node
import { createClient } from '@sanity/client';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || '8atrdwjk';
const dataset = process.env.SANITY_DATASET || 'production';
const writeToken = process.env.SANITY_API_WRITE_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const PRIMARY_MODEL = process.env.WORKERS_AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const FALLBACK_MODEL = process.env.WORKERS_AI_FALLBACK_MODEL || '@cf/meta/llama-3.1-8b-instruct-fast';
const CHUNK_BUDGET = 2000;
const limitArgIndex = process.argv.indexOf('--limit');
const limit = limitArgIndex !== -1 ? Number(process.argv[limitArgIndex + 1]) || 10 : 10;

if (!writeToken || !accountId || !apiToken) {
  console.error('Missing Sanity or Cloudflare credentials.');
  process.exit(1);
}

const client = createClient({ projectId, dataset, useCdn: false, apiVersion: '2025-02-20', token: writeToken });

async function callAi(system, user, selectedModel = PRIMARY_MODEL) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${selectedModel}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!response.ok) {
    if (selectedModel !== FALLBACK_MODEL) return callAi(system, user, FALLBACK_MODEL);
    throw new Error(`Workers AI failed ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  const text = data.result?.response ?? data.result;
  return typeof text === 'string' ? text : JSON.stringify(text);
}

function extractJson(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.search(/[[{]/);
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  if (start < 0 || end < start) throw new Error('No JSON in AI output.');
  return JSON.parse(candidate.slice(start, end + 1));
}

function chunks(spans) {
  const output = [];
  let current = [];
  let chars = 0;
  for (const span of spans) {
    if (current.length && chars + span.text.length > CHUNK_BUDGET) {
      output.push(current); current = []; chars = 0;
    }
    current.push(span); chars += span.text.length;
  }
  if (current.length) output.push(current);
  return output;
}

async function translateFields(post) {
  const system = 'Translate this Romanian cybersecurity blog metadata into natural professional English. Preserve technical terms, names, acronyms and exact JSON keys. Do not add or remove facts. Return JSON only.';
  return extractJson(await callAi(system, JSON.stringify({
    title: post.title,
    description: post.description,
    metaDescription: post.metaDescription || '',
    keywords: post.keywords || [],
    tags: post.tags || [],
  })));
}

async function translateBody(body) {
  if (!Array.isArray(body)) return body;
  const clone = JSON.parse(JSON.stringify(body));
  const spans = [];
  for (const block of clone) {
    if (block?._type === 'block' && Array.isArray(block.children)) {
      for (const child of block.children) if (typeof child.text === 'string' && child.text.trim()) spans.push(child);
    }
  }
  const system = 'Translate every Romanian string in this JSON array into natural professional English. Preserve order and array length exactly. Do not summarize, shorten or add facts. Return a JSON array only.';
  for (const chunk of chunks(spans)) {
    const translated = extractJson(await callAi(system, JSON.stringify(chunk.map((span) => span.text))));
    if (!Array.isArray(translated) || translated.length !== chunk.length) throw new Error('Body translation shape mismatch.');
    chunk.forEach((span, index) => { span.text = translated[index]; });
  }
  return clone;
}

async function main() {
  const [roPosts, enSlugs] = await Promise.all([
    client.fetch(`*[_type == "post" && published == true && language == "ro"]{_id,title,description,metaDescription,keywords,tags,pubDate,"slug":slug.current,category,author,featuredImage,body}`),
    client.fetch(`*[_type == "post" && published == true && language == "en"].slug.current`),
  ]);
  const enSet = new Set(enSlugs);
  const candidates = roPosts.filter((post) => post.slug && !enSet.has(post.slug)).slice(0, limit);
  if (!candidates.length) {
    console.log('No Romanian-only posts need an English counterpart.');
    return;
  }

  let failed = 0;
  for (const post of candidates) {
    try {
      const fields = await translateFields(post);
      const body = await translateBody(post.body);
      await client.create({
        _type: 'post', title: fields.title, description: fields.description,
        metaDescription: fields.metaDescription || undefined,
        keywords: Array.isArray(fields.keywords) ? fields.keywords : undefined,
        tags: Array.isArray(fields.tags) ? fields.tags : undefined,
        language: 'en', slug: { _type: 'slug', current: post.slug }, pubDate: post.pubDate,
        category: post.category, author: post.author, featuredImage: post.featuredImage, body, published: true,
      });
      console.log(`Created EN counterpart for ${post.slug}`);
    } catch (error) {
      failed += 1;
      console.error(`Failed ${post.slug}: ${error.message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exit(1); });
