// Blog post EN -> RO translation via Cloudflare Workers AI, using the
// native `env.AI` binding. Metadata and Portable Text body are translated
// separately so long-form bodies can be chunked without corrupting structure.

const PRIMARY_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const FALLBACK_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

const FIELDS_SYSTEM_PROMPT = [
  'You are a professional Romanian translator for a cybersecurity blog.',
  'Translate the given English JSON object into natural, professional Romanian, keeping the exact same JSON shape and keys.',
  'Preserve technical terms, product names, and acronyms unchanged where a literal translation would be non-standard.',
  'Do not add, remove, summarize, or embellish factual content - translate only what is present.',
  'Empty strings must remain empty strings.',
  'Respond with the JSON object only, nothing else.',
].join(' ');

const BODY_SYSTEM_PROMPT = [
  'You are a professional Romanian translator for a cybersecurity blog.',
  'Translate each string in this JSON array from English to Romanian, preserving order and array length exactly.',
  'Preserve technical terms, product names, commands, CVE identifiers, URLs, acronyms, and code unchanged where appropriate.',
  'Do not summarize, shorten, expand, or add information.',
  'Respond with a JSON array of the same length containing only the translated strings, nothing else.',
].join(' ');

export interface TranslatablePostFields {
  title: string;
  description: string;
  metaDescription?: string;
  keywords?: string[];
  tags?: string[];
}

export interface PortableTextSpan {
  text?: string;
  [key: string]: unknown;
}

export interface PortableTextBlock {
  _type: string;
  children?: PortableTextSpan[];
  [key: string]: unknown;
}

interface AiBinding {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

function extractJson(raw: unknown): string | null {
  const text =
    typeof raw === 'string'
      ? raw
      : typeof (raw as { response?: unknown })?.response === 'string'
        ? ((raw as { response: string }).response as string)
        : null;
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.search(/[[{]/);
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  if (start === -1 || end === -1 || end < start) return null;
  return candidate.slice(start, end + 1);
}

async function runModel(ai: AiBinding, model: string, systemPrompt: string, userContent: string): Promise<unknown> {
  return ai.run(model, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });
}

async function runWithFallback(ai: AiBinding, systemPrompt: string, userContent: string): Promise<string | null> {
  try {
    const primary = await runModel(ai, PRIMARY_MODEL, systemPrompt, userContent);
    const primaryJson = extractJson(primary);
    if (primaryJson) return primaryJson;

    const fallback = await runModel(ai, FALLBACK_MODEL, systemPrompt, userContent);
    return extractJson(fallback);
  } catch (error) {
    console.error('[blog] translation model call failed:', error);
    return null;
  }
}

export async function translatePostFields(
  env: Record<string, unknown>,
  fields: TranslatablePostFields
): Promise<TranslatablePostFields | null> {
  const ai = env.AI as AiBinding | undefined;
  if (!ai) {
    console.warn('[blog] AI binding is not configured, skipping Romanian translation.');
    return null;
  }

  const json = await runWithFallback(ai, FIELDS_SYSTEM_PROMPT, JSON.stringify(fields));
  if (!json) return null;

  try {
    const parsed = JSON.parse(json) as Partial<TranslatablePostFields>;
    if (typeof parsed.title !== 'string' || !parsed.title.trim() || typeof parsed.description !== 'string') {
      return null;
    }
    return {
      title: parsed.title,
      description: parsed.description,
      metaDescription: typeof parsed.metaDescription === 'string' ? parsed.metaDescription : undefined,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter((k): k is string => typeof k === 'string') : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t): t is string => typeof t === 'string') : undefined,
    };
  } catch {
    return null;
  }
}

const BODY_CHUNK_CHAR_BUDGET = 2000;

function chunkSpansByCharBudget(spans: PortableTextSpan[]): PortableTextSpan[][] {
  const chunks: PortableTextSpan[][] = [];
  let current: PortableTextSpan[] = [];
  let currentChars = 0;

  for (const span of spans) {
    const len = (span.text ?? '').length;
    if (current.length > 0 && currentChars + len > BODY_CHUNK_CHAR_BUDGET) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(span);
    currentChars += len;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

async function translateSpanChunk(ai: AiBinding, chunk: PortableTextSpan[]): Promise<boolean> {
  const json = await runWithFallback(ai, BODY_SYSTEM_PROMPT, JSON.stringify(chunk.map((s) => s.text)));
  if (!json) return false;

  try {
    const translated = JSON.parse(json) as unknown;
    if (!Array.isArray(translated) || translated.length !== chunk.length) {
      console.error(
        `[blog] body chunk translation returned ${Array.isArray(translated) ? translated.length : 'non-array'} items, expected ${chunk.length}`
      );
      return false;
    }
    chunk.forEach((span, i) => {
      const value = translated[i];
      span.text = typeof value === 'string' ? value : String(span.text ?? '');
    });
    return true;
  } catch {
    return false;
  }
}

export async function translatePostBody(
  env: Record<string, unknown>,
  body: PortableTextBlock[] | undefined
): Promise<PortableTextBlock[] | null> {
  if (!body || body.length === 0) return body ?? null;

  const ai = env.AI as AiBinding | undefined;
  if (!ai) {
    console.warn('[blog] AI binding is not configured, skipping Romanian body translation.');
    return null;
  }

  const clone = JSON.parse(JSON.stringify(body)) as PortableTextBlock[];
  const spanRefs: PortableTextSpan[] = [];
  for (const block of clone) {
    if (block._type === 'block' && Array.isArray(block.children)) {
      for (const child of block.children) {
        if (typeof child.text === 'string' && child.text.trim()) {
          spanRefs.push(child);
        }
      }
    }
  }
  if (spanRefs.length === 0) return clone;

  const chunks = chunkSpansByCharBudget(spanRefs);
  for (const chunk of chunks) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await translateSpanChunk(ai, chunk);
    if (!ok) return null;
  }

  return clone;
}
