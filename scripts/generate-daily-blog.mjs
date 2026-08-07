#!/usr/bin/env node
import { createClient } from '@sanity/client';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || '8atrdwjk';
const dataset = process.env.SANITY_DATASET || 'production';
const writeToken = process.env.SANITY_API_WRITE_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const model = process.env.WORKERS_AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const fallbackModel = process.env.WORKERS_AI_FALLBACK_MODEL || '@cf/meta/llama-3.1-8b-instruct-fast';
const MIN_WORDS = 900;
const MAX_WORDS = 1700;

if (!writeToken || !accountId || !apiToken) {
  console.error('Missing SANITY_API_WRITE_TOKEN, CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN.');
  process.exit(1);
}

const sanity = createClient({ projectId, dataset, useCdn: false, apiVersion: '2025-02-20', token: writeToken });

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'liviubucel-blog-generator/1.0' } });
  if (!response.ok) throw new Error(`Source request failed ${response.status}: ${url}`);
  return response.json();
}

async function callAi(system, user, selectedModel = model) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${selectedModel}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!response.ok) {
    const body = await response.text();
    if (selectedModel !== fallbackModel) return callAi(system, user, fallbackModel);
    throw new Error(`Workers AI failed ${response.status}: ${body}`);
  }
  const data = await response.json();
  const text = data.result?.response ?? data.result;
  return typeof text === 'string' ? text : JSON.stringify(text);
}

function extractJson(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI output did not contain a JSON object.');
  return JSON.parse(candidate.slice(start, end + 1));
}

function wordCount(markdown) {
  return markdown.replace(/[#*_`>[\]()!-]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

function markdownToPortableText(markdown) {
  const blocks = [];
  let key = 0;
  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    let style = 'normal';
    let text = line;
    let listItem;
    if (line.startsWith('### ')) { style = 'h3'; text = line.slice(4); }
    else if (line.startsWith('## ')) { style = 'h2'; text = line.slice(3); }
    else if (line.startsWith('# ')) { style = 'h1'; text = line.slice(2); }
    else if (/^[-*] /.test(line)) { listItem = 'bullet'; text = line.slice(2); }
    else if (/^\d+\. /.test(line)) { listItem = 'number'; text = line.replace(/^\d+\. /, ''); }
    text = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
    blocks.push({
      _type: 'block', _key: `generated-${key++}`, style,
      ...(listItem ? { listItem, level: 1 } : {}),
      children: [{ _type: 'span', _key: `span-${key}`, text, marks: [] }], markDefs: [],
    });
  }
  return blocks;
}

async function selectTopic() {
  const kev = await fetchJson('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
  const vulnerabilities = Array.isArray(kev.vulnerabilities) ? kev.vulnerabilities : [];
  vulnerabilities.sort((a, b) => String(b.dateAdded).localeCompare(String(a.dateAdded)));

  for (const item of vulnerabilities.slice(0, 30)) {
    const cve = item.cveID;
    if (!cve) continue;
    const exists = await sanity.fetch('count(*[_type == "post" && published == true && ($cve in keywords || title match $pattern)])', {
      cve,
      pattern: `*${cve}*`,
    });
    if (exists > 0) continue;

    let nvd = null;
    try {
      const nvdResponse = await fetchJson(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cve)}`);
      nvd = nvdResponse?.vulnerabilities?.[0]?.cve ?? null;
    } catch (error) {
      console.warn(`NVD enrichment unavailable for ${cve}: ${error.message}`);
    }
    return { cisa: item, nvd };
  }
  return null;
}

function buildEvidence(topic) {
  const cisa = topic.cisa;
  const nvd = topic.nvd;
  const nvdDescription = nvd?.descriptions?.find((item) => item.lang === 'en')?.value ?? null;
  const cvss = nvd?.metrics?.cvssMetricV31?.[0]?.cvssData ?? nvd?.metrics?.cvssMetricV30?.[0]?.cvssData ?? null;
  const refs = Array.isArray(nvd?.references) ? nvd.references.slice(0, 12).map((ref) => ref.url).filter(Boolean) : [];
  return {
    cve: cisa.cveID,
    vendor: cisa.vendorProject,
    product: cisa.product,
    vulnerabilityName: cisa.vulnerabilityName,
    cisaDescription: cisa.shortDescription,
    requiredAction: cisa.requiredAction,
    dateAddedToKev: cisa.dateAdded,
    dueDate: cisa.dueDate,
    knownRansomwareCampaignUse: cisa.knownRansomwareCampaignUse,
    notes: cisa.notes,
    nvdDescription,
    cvssBaseScore: cvss?.baseScore ?? null,
    cvssSeverity: cvss?.baseSeverity ?? null,
    attackVector: cvss?.attackVector ?? null,
    references: refs,
    authoritativeSources: [
      `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${encodeURIComponent(cisa.cveID)}`,
      `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cisa.cveID)}`,
    ],
  };
}

async function generateArticle(evidence, expansion = false) {
  const system = [
    'You are an experienced cybersecurity technical writer producing a factual long-form article for a professional portfolio.',
    'Use ONLY the evidence supplied by the user. Never invent affected versions, exploitation mechanics, victims, patches, IOCs, CVSS data or vendor statements.',
    'When evidence does not establish something, say that it is not established by the supplied sources.',
    'Write for defenders, SOC analysts, sysadmins and security-conscious technical readers.',
    `The body must contain ${MIN_WORDS}-${MAX_WORDS} words and must be substantive, not padded.`,
    'Required sections: Executive summary; What the vulnerability is; Why defenders should care; What is confirmed; Exploitation status; Detection and triage; Mitigation and remediation; Practical checklist; Limitations; References.',
    'References must identify CISA KEV and NVD using only URLs supplied in the evidence.',
    'Return JSON only with keys: title, description, metaDescription, keywords, tags, bodyMarkdown.',
    'description and metaDescription must each be <=160 characters. keywords and tags must be arrays of strings.',
  ].join(' ');

  const user = `${expansion ? 'The previous attempt was too short. Produce the complete version now and satisfy the minimum word count without repetition.\n' : ''}Evidence:\n${JSON.stringify(evidence, null, 2)}`;
  return extractJson(await callAi(system, user));
}

function validateArticle(article) {
  if (!article || typeof article.title !== 'string' || typeof article.bodyMarkdown !== 'string') throw new Error('Generated article is missing required fields.');
  if (!article.description || article.description.length > 160) throw new Error('Generated description is missing or longer than 160 characters.');
  if (article.metaDescription && article.metaDescription.length > 160) throw new Error('Generated meta description is longer than 160 characters.');
  const words = wordCount(article.bodyMarkdown);
  if (words < MIN_WORDS) return { valid: false, words };
  if (words > 2200) throw new Error(`Generated article is unexpectedly long (${words} words).`);
  const requiredHeadings = ['Executive summary', 'What the vulnerability is', 'Why defenders should care', 'Mitigation and remediation', 'References'];
  for (const heading of requiredHeadings) {
    if (!article.bodyMarkdown.toLowerCase().includes(heading.toLowerCase())) throw new Error(`Missing required section: ${heading}`);
  }
  return { valid: true, words };
}

async function main() {
  const topic = await selectTopic();
  if (!topic) {
    console.log('No new CISA KEV topic found that is not already published.');
    return;
  }

  const evidence = buildEvidence(topic);
  let article = await generateArticle(evidence, false);
  let validation = validateArticle(article);
  if (!validation.valid) {
    console.warn(`First draft was only ${validation.words} words; requesting a complete rewrite.`);
    article = await generateArticle(evidence, true);
    validation = validateArticle(article);
  }
  if (!validation.valid) throw new Error(`Article still below ${MIN_WORDS} words after retry.`);

  const cve = evidence.cve;
  const slug = `${slugify(article.title)}-${cve.toLowerCase()}`;
  const keywords = Array.from(new Set([cve, ...(Array.isArray(article.keywords) ? article.keywords : [])])).slice(0, 12);
  const tags = Array.from(new Set(['Cybersecurity', 'Vulnerability', 'CISA KEV', ...(Array.isArray(article.tags) ? article.tags : [])])).slice(0, 10);

  await sanity.create({
    _type: 'post',
    title: article.title,
    slug: { _type: 'slug', current: slug },
    language: 'en',
    pubDate: new Date().toISOString(),
    description: article.description,
    metaDescription: article.metaDescription || article.description,
    keywords,
    tags,
    body: markdownToPortableText(article.bodyMarkdown),
    published: true,
  });

  console.log(`Published ${cve}: ${article.title} (${validation.words} words)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
