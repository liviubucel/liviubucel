// Romania Cyber Monitor - EN -> RO article translation via Cloudflare Workers
// AI, using the native `env.AI` binding (no separate API token needed, unlike
// a REST-based translation script). Translation is always a best-effort
// follow-up to publishing the English article, never a precondition of it:
// any failure here is logged and swallowed so a model outage never blocks
// the sync run.

const PRIMARY_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
// Retried on if the primary model errors or times out - a smaller, faster
// model so one model family's outage doesn't leave every article untranslated.
const FALLBACK_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

const SYSTEM_PROMPT = [
  'You are a professional Romanian translator for a cybersecurity threat-intelligence publication.',
  'Translate the given English article fields into natural, professional Romanian.',
  'Preserve Markdown formatting (##, -, links) exactly. Preserve organisation names, threat actor names, and',
  'technical terms (e.g. ransomware, breach, CVE identifiers) unchanged where a literal translation would be',
  'confusing or non-standard in Romanian security writing.',
  'Do not add, remove, or embellish any factual content - translate only what is present in the source.',
  'Respond with a single JSON object shaped exactly as {"title":"...","excerpt":"...","body":"..."} and nothing else.',
].join(' ');

export interface TranslatableArticle {
  title: string;
  excerpt: string;
  body: string;
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
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  return candidate.slice(start, end + 1);
}

function parseTranslatedArticle(raw: unknown): TranslatableArticle | null {
  const json = extractJson(raw);
  if (!json) return null;

  try {
    const parsed = JSON.parse(json) as Partial<TranslatableArticle>;
    if (
      typeof parsed.title !== 'string' ||
      typeof parsed.excerpt !== 'string' ||
      typeof parsed.body !== 'string' ||
      !parsed.title.trim() ||
      !parsed.excerpt.trim() ||
      !parsed.body.trim()
    ) {
      return null;
    }
    return { title: parsed.title, excerpt: parsed.excerpt, body: parsed.body };
  } catch {
    return null;
  }
}

async function runTranslation(ai: AiBinding, model: string, article: TranslatableArticle): Promise<TranslatableArticle | null> {
  const response = await ai.run(model, {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(article) },
    ],
  });
  return parseTranslatedArticle(response);
}

/** Translates a generated article's title/excerpt/body into Romanian.
 * Returns null (never throws) if the AI binding isn't configured, or if both
 * the primary and fallback model fail or return unusable output - callers
 * should treat that as "no RO version yet" and keep serving the English
 * article. */
export async function translateArticleToRomanian(
  env: Record<string, unknown>,
  article: TranslatableArticle
): Promise<TranslatableArticle | null> {
  const ai = env.AI as AiBinding | undefined;
  if (!ai) {
    console.warn('[cyber-monitor] AI binding is not configured, skipping Romanian translation.');
    return null;
  }

  try {
    const primary = await runTranslation(ai, PRIMARY_MODEL, article);
    if (primary) return primary;

    console.warn('[cyber-monitor] primary translation model returned unusable output, trying fallback');
    return await runTranslation(ai, FALLBACK_MODEL, article);
  } catch (error) {
    console.error('[cyber-monitor] translation to Romanian failed:', error);
    return null;
  }
}
