// Romania Cyber Monitor - one-time (repeatable) backfill of Romanian article
// translations for incidents that were published before the auto-translate
// step existed, or whose translation attempt failed at publish time. Safe to
// call repeatedly: it only ever selects EN articles with no matching
// published RO article yet, so already-translated incidents are skipped.

import type { GeneratedArticle } from './article-generation';
import { buildRomanianArticle, persistGeneratedArticle } from './article-generation';
import { translateArticleToRomanian } from './translate';

interface UntranslatedArticleRow {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  article_type: GeneratedArticle['articleType'];
  related_incident_id: string;
  dedup_key: string;
}

export interface BackfillResult {
  candidates: number;
  translated: number;
  failed: number;
}

export async function backfillRomanianTranslations(
  db: D1Database,
  env: Record<string, unknown>,
  limit = 20
): Promise<BackfillResult> {
  const { results } = await db
    .prepare(
      `SELECT a.id, a.title, a.excerpt, a.body, a.article_type, a.related_incident_id, i.dedup_key
       FROM articles a
       JOIN incidents i ON i.id = a.related_incident_id
       WHERE a.language = 'en' AND a.status = 'published'
         AND NOT EXISTS (
           SELECT 1 FROM articles ro
           WHERE ro.related_incident_id = a.related_incident_id
             AND ro.language = 'ro' AND ro.status = 'published'
         )
       ORDER BY a.published_at ASC
       LIMIT ?1`
    )
    .bind(limit)
    .all<UntranslatedArticleRow>();

  const candidates = results ?? [];
  let translated = 0;
  let failed = 0;
  const nowIso = new Date().toISOString();

  for (const row of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const translatedFields = await translateArticleToRomanian(env, {
      title: row.title,
      excerpt: row.excerpt ?? '',
      body: row.body,
    });

    if (!translatedFields) {
      failed += 1;
      continue;
    }

    const roArticle = buildRomanianArticle(
      { articleType: row.article_type } as GeneratedArticle,
      translatedFields,
      row.dedup_key
    );

    // eslint-disable-next-line no-await-in-loop
    await persistGeneratedArticle(db, roArticle, row.related_incident_id, nowIso);
    translated += 1;
  }

  return { candidates: candidates.length, translated, failed };
}
