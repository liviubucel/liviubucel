# Production deployment

Production is deployed as the Cloudflare Worker `liviubucel-website` using the root `wrangler.toml` configuration.

## GitHub Actions

`.github/workflows/deploy-cloudflare.yml` is the authoritative GitHub-to-Cloudflare deployment path.

Required GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN` — token with permission to deploy/update the Worker and its configured bindings.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID that owns the Worker.

Optional:

- `CF_WAF_BYPASS_TOKEN` — used only by post-deploy smoke requests if the production WAF requires the existing bypass header.

The workflow runs tests, Astro type checks, the production build, `wrangler deploy`, and production smoke checks. A successful Git merge is not treated as proof of deployment; the deploy workflow must also pass.

The Worker secrets already stored in Cloudflare (for example Sanity write/trigger tokens) are not committed to GitHub or this file.
