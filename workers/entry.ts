// Romania Cyber Monitor - final Worker entry point.
//
// wrangler.toml's `main` points here instead of Astro's default generated
// entry. The @astrojs/cloudflare adapter's Vite plugin bundles this file as
// part of the normal `astro build`, resolving its own internal virtual
// modules correctly - so fetch() is delegated to the adapter's own
// entrypoint module (the same one Astro would otherwise use by default),
// and scheduled() is Romania Cyber Monitor's own code, dispatching
// whichever sources are due for the cron expression that fired (see
// cron-schedule.ts). This file is intentionally outside `src/` and outside
// the root `*.ts` glob in tsconfig.json's `include`, so `astro check`
// never tries to type-check it independently of the Astro build.
//
// Per Workers requirements, the scheduled event's ctx.waitUntil is called
// as a method (never destructured) so the platform can track the promise.

import astroWorker from '@astrojs/cloudflare/entrypoints/server.js';
import { sourcesForCron } from '../src/lib/cyber-monitor/cron-schedule';
import { runScheduledSources } from '../src/lib/cyber-monitor/scheduled-handler';

interface Env {
  ROMANIA_MONITOR_DB: D1Database;
  [key: string]: unknown;
}

export default {
  fetch: astroWorker.fetch,

  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
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
