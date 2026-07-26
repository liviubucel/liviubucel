// Romania Cyber Monitor - regenerates already-published article bodies with
// the current template (guidance sections, threat-group/sector context,
// contact CTA). Without this, template improvements only ever apply to
// newly-published incidents: persistIncident never re-marks an existing
// incident as newlyPublished, and persistGeneratedArticle's INSERT OR
// IGNORE never touches an existing row. Safe to call repeatedly - it only
// ever selects articles that don't yet contain the current template's CTA
// marker, so already-refreshed rows are skipped on the next run.

import type { ArticleSourceIncident } from './article-generation';
import { generateIncidentArticle } from './article-generation';
import { translateArticleToRomanian } from './translate';
import type { VerificationStatus } from './types';

interface ArticleContentRow {
  id: string;
  language: 'en' | 'ro';
  record_type: string;
  organisation_display_name: string | null;
  threat_group_id: string | null;
  discovered_date: string | null;
  incident_date: string | null;
  summary: string | null;
  verification_status: string;
  sector: string | null;
  dedup_key: string;
}

export interface ArticleContentBackfillResult {
  candidates: number;
  updated: number;
  failed: number;
}

const CTA_MARKER = 'get in touch';
const SUPPORTED_RECORD_TYPES = new Set(['ransomware_claim', 'verified_breach']);

export async function backfillArticleContent(
  db: D1Database,
  env: Record<string, unknown>,
  limit = 20
): Promise<ArticleContentBackfillResult> {
  const { results } = await db
    .prepare(
      `SELECT a.id, a.language, i.record_type, i.organisation_display_name, i.threat_group_id,
              i.discovered_date, i.incident_date, i.summary, i.verification_status, i.sector, i.dedup_key
       FROM articles a
       JOIN incidents i ON i.id = a.related_incident_id
       WHERE a.status = 'published' AND a.body NOT LIKE ?1
       ORDER BY a.published_at ASC
       LIMIT ?2`
    )
    .bind(`%${CTA_MARKER}%`, limit)
    .all<ArticleContentRow>();

  const candidates = (results ?? []).filter((row) => SUPPORTED_RECORD_TYPES.has(row.record_type));
  let updated = 0;
  let failed = 0;
  const nowIso = new Date().toISOString();

  for (const row of candidates) {
    const sourceIncident: ArticleSourceIncident = {
      recordType: row.record_type as ArticleSourceIncident['recordType'],
      organisationDisplayName: row.organisation_display_name,
      threatGroupId: row.threat_group_id,
      discoveredDate: row.discovered_date,
      incidentDate: row.incident_date,
      summary: row.summary,
      verificationStatus: row.verification_status as VerificationStatus,
      sector: row.sector,
      dedupKey: row.dedup_key,
    };

    const fresh = generateIncidentArticle(sourceIncident);
    if (!fresh) {
      failed += 1;
      continue;
    }

    if (row.language === 'en') {
      // eslint-disable-next-line no-await-in-loop
      await updateArticleContent(db, row.id, fresh, nowIso);
      updated += 1;
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const translated = await translateArticleToRomanian(env, fresh);
    if (!translated) {
      failed += 1;
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await updateArticleContent(
      db,
      row.id,
      { ...translated, body: translated.body.replaceAll('(/contact)', '(/ro/contact)') },
      nowIso
    );
    updated += 1;
  }

  return { candidates: candidates.length, updated, failed };
}

async function updateArticleContent(
  db: D1Database,
  articleId: string,
  content: { title: string; excerpt: string; body: string },
  nowIso: string
): Promise<void> {
  await db
    .prepare(`UPDATE articles SET title = ?1, excerpt = ?2, body = ?3, updated_at = ?4 WHERE id = ?5`)
    .bind(content.title, content.excerpt, content.body, nowIso, articleId)
    .run();
}
