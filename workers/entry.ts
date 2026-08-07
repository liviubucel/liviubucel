// Cloudflare Worker entry point for the Astro site, Romania Cyber Monitor
// schedules, and a lightweight bilingual-blog repair cron.
//
// fetch() is delegated to Astro's generated Worker. scheduled() routes the
// dedicated blog-translation cron separately, while all existing cyber-monitor
// cron expressions continue through the source scheduler unchanged.

import astroWorker from '@astrojs/cloudflare/entrypoints/server.js';
import { backfillBlogTranslations } from '../src/lib/blog/backfill-translations';
import { sourcesForCron } from '../src/lib/cyber-monitor/cron-schedule';
import { runScheduledSources } from '../src/lib/cyber-monitor/scheduled-handler';

const BLOG_TRANSLATION_CRON = '30 * * * *';

interface Env {
  ROMANIA_MONITOR_DB: D1Database;
  [key: string]: unknown;
}

export default {
  fetch: astroWorker.fetch,

  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (event.cron === BLOG_TRANSLATION_CRON) {
      console.log(JSON.stringify({ event: 'blog_translation_backfill_started', cron: event.cron }));

      ctx.waitUntil(
        backfillBlogTranslations(env, 10).then(
          (result) => {
            console.log(
              JSON.stringify({
                event: 'blog_translation_backfill_completed',
                cron: event.cron,
                normalized: result.normalized,
                candidates: result.candidates,
                translated: result.translated,
                repaired: result.repaired,
                failed: result.failed,
                failedSlugs: result.failedSlugs,
              })
            );
          },
          (error) => {
            console.error(
              JSON.stringify({
                event: 'blog_translation_backfill_failed',
                cron: event.cron,
                message: error?.message ?? String(error),
              })
            );
          }
        )
      );
      return;
    }

    const sourceIds = sourcesForCron(event.cron);
    if (sourceIds.length === 0) {
      console.error(JSON.stringify({ event: 'source_schema_changed', reason: 'unrecognised_cron', cron: event.cron }));
      return;
    }

    console.log(JSON.stringify({ event: 'sync_started', cron: event.cron, sourceIds }));

    ctx.waitUntil(
      runScheduledSources(sourceIds, env.ROMANIA_MONITOR_DB, env, () => new Date(event.scheduledTime), event.cron).then(
        (result) => {
          console.log(
            JSON.stringify({
              event: 'sync_completed',
              cron: result.cron,
              results: result.results.map((r) => ({ sourceId: r.sourceId, status: r.status, inserted: r.recordsInserted })),
            })
          );
        },
        (error) => {
          console.error(JSON.stringify({ event: 'sync_failed', cron: event.cron, message: error?.message ?? String(error) }));
        }
      )
    );
  },
};
