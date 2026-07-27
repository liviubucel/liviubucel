# Automatic blog post translation (Worker-native)

`/api/blog/translate` runs entirely inside the deployed Cloudflare Worker,
using the Workers AI binding already configured in `wrangler.toml` (`[ai]`)
and a Sanity write token passed as a secret. It doesn't depend on GitHub
Actions at all, unlike `scripts/translate-blog-posts.mjs` + the daily
`translate-blog-posts.yml` cron this endpoint is meant to replace as the
primary path (that script/workflow can stay as a fallback).

On each call it selects every published English `post` document with no
published Romanian counterpart yet, translates the title/description/
metaDescription/keywords/tags and the Portable Text body via Workers AI,
and publishes the result as a sibling Sanity document (same slug,
`language: 'ro'`). Safe to call repeatedly - already-translated posts are
skipped.

## One-time setup

1. **Generate a trigger token** (any long random string), e.g.:
   ```
   openssl rand -hex 32
   ```
2. **Set it as a Cloudflare Worker secret:**
   ```
   wrangler secret put BLOG_TRANSLATE_TRIGGER_TOKEN
   ```
3. **Set a Sanity write token as a Worker secret.** Create one in
   [manage.sanity.io](https://manage.sanity.io) → your project → API →
   Tokens → Add API token, with **Editor** permissions (write access), then:
   ```
   wrangler secret put SANITY_API_WRITE_TOKEN
   ```
   (If `SANITY_API_WRITE_TOKEN` is already set as a GitHub Actions repo
   secret for `translate-blog-posts.yml`, reuse the same token value here -
   it's a separate storage location, not a separate credential.)

## Calling it manually (backfill / one-off)

```
curl -X POST "https://www.liviubucel.com/api/blog/translate?limit=10" \
  -H "Authorization: Bearer <BLOG_TRANSLATE_TRIGGER_TOKEN>"
```
Response: `{"candidates": N, "translated": N, "failed": N, "failedSlugs": [...]}`.

If Cloudflare's Bot Fight Mode blocks this with a 403 challenge page, follow
the same shared-secret WAF bypass approach documented in
`docs/cyber-monitor-waf-bypass.md` (add an `X-...-Bypass` header + a
matching WAF Custom Rule scoped to `/api/blog/*`).

## Automatic translation on publish (Sanity webhook)

To translate every new post automatically the moment it's published,
without waiting on a cron or a manual call:

1. [manage.sanity.io](https://manage.sanity.io) → your project → API →
   Webhooks → Create webhook.
2. **URL:** `https://www.liviubucel.com/api/blog/translate`
3. **Dataset:** `production`
4. **Trigger on:** Create, Update
5. **Filter:** `_type == "post" && language == "en" && published == true`
6. **HTTP method:** POST
7. **HTTP Headers:** add `Authorization: Bearer <BLOG_TRANSLATE_TRIGGER_TOKEN>`
   (same value as the Worker secret above)
8. Save and enable the webhook.

The endpoint ignores the webhook payload body and just re-runs the same
"translate anything untranslated" scan, so it works correctly even though
Sanity webhooks don't carry document content by default - no extra payload
configuration needed.
