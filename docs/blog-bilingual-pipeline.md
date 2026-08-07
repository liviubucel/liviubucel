# Bilingual blog pipeline

The public blog uses paired Sanity `post` documents that share the same slug and differ by `language` (`en` or `ro`). Keeping the slug identical is intentional so the site language switcher can preserve the article path.

## Repair and translation workflow

`.github/workflows/translate-blog-posts.yml` runs daily and can also be started manually. It:

1. enables the repository-pinned pnpm version with Corepack;
2. normalizes safe legacy post metadata;
3. creates or repairs missing English counterparts from Romanian source posts;
4. creates or repairs missing Romanian counterparts from English source posts.

Long Portable Text bodies are translated in bounded chunks. A target post whose body is identical to the source or whose detected body language disagrees with its Sanity `language` field is treated as needing repair.

## Required secrets

- `SANITY_API_WRITE_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

`SANITY_PROJECT_ID` and `SANITY_DATASET` may be set as repository variables. The scripts fall back to the production project/dataset currently used by the site.

## Publication integrity

Romanian routes render only real Romanian Sanity documents. They do not silently fall back to English content.

The Worker-native EN -> RO webhook path also refuses to publish a Romanian document if body translation fails. This prevents mixed-language posts with Romanian metadata and an English body.

## Legacy seed credential

The historical seed script now reads `SANITY_API_WRITE_TOKEN` from the environment. Any token that was previously committed in Git history must be revoked/rotated in Sanity; removing it from the current file does not invalidate the old credential.
