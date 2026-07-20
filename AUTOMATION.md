# Automation & Deployment Guide

This document describes the automated scripts and CI/CD pipeline.

## 📋 Automation Scripts

### i18n Audit
```bash
npm run i18n:audit
```

Validates that all pages have both EN and RO translations. Runs automatically before build.

**What it checks:**
- Every page route has language-specific versions
- No missing translations
- Consistent file structure

### Security Scan
```bash
npm run security:scan
```

Scans codebase for common security issues.

**Detects:**
- `eval()` usage
- `innerHTML` assignments
- `dangerouslySetInnerHTML`
- Dynamic `require()` calls
- Dynamic URL fetches
- Hardcoded passwords/secrets

**Severity Levels:**
- 🔴 **Critical** - Blocks build
- 🟠 **High** - Warning only
- 🟡 **Medium** - Information only

### Sitemap Generation
```bash
npm run sitemap:generate
```

Creates `public/sitemap.xml` with all routes and language variants.

**Includes:**
- All pages with language prefixes
- Change frequency hints
- Priority scores
- Last modified dates

### Build Pipeline
```bash
npm run build
```

Full build process runs:
1. i18n audit
2. Security scan
3. Astro build

**Environment Variables:**
```bash
SANITY_PROJECT_ID=8atrdwjk
SANITY_DATASET=production
SITE_URL=https://liviubucel.com/
ASTRO_DB_REMOTE_URL=libsql://...
ASTRO_DB_APP_TOKEN=...
SENTRY_DSN=https://...  # Optional
```

## 🚀 CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and PR.

### Jobs

#### 1. Lint & Type Check
- ESLint validation
- TypeScript type checking
- ~3 minutes

#### 2. Build & Test
- Dependencies install
- i18n audit
- Security scan
- Astro build
- ~10 minutes

#### 3. Lighthouse Audit (PR only)
- Performance score
- SEO score
- Accessibility score
- Best practices score
- Reports uploaded as artifacts

### Required Secrets

Add these to GitHub repository settings:

```
SANITY_PROJECT_ID    = 8atrdwjk
SANITY_DATASET       = production
SITE_URL             = https://liviubucel.com/
ASTRO_DB_REMOTE_URL  = libsql://...
ASTRO_DB_APP_TOKEN   = ...
```

### Workflows

**On Push to main/develop:**
- Lint & type check
- Build & test
- Deploy (manual)

**On Pull Request:**
- Lint & type check
- Build & test
- Lighthouse audit
- Require all checks passing before merge

## 📊 Monitoring & Logging

### Sentry Error Tracking

Automatically captures and reports errors to Sentry dashboard.

**Setup:**
1. Create Sentry project: https://sentry.io
2. Set `SENTRY_DSN` in environment
3. Errors tracked automatically

**View:**
- Dashboard: https://sentry.io/organizations/liviu-bucel/issues/
- Filters by environment, date, etc.

### Build Logs

All logs available in GitHub Actions:
- https://github.com/liviubucel/liviubucel-website/actions

### Performance Monitoring

Lighthouse scores tracked in CI:
- Performance: Target 90+
- SEO: Target 95+
- Accessibility: Target 95+
- Best Practices: Target 95+

## 🔧 Local Development

### Pre-commit Hooks (Husky)

Automatically run on commit:
- ESLint with auto-fix
- Type checking

### Development Workflow

```bash
# Install dependencies
pnpm install

# Start dev server
npm run dev

# Type check
pnpm check

# Lint (with auto-fix)
pnpm eslint --fix

# Audit i18n
npm run i18n:audit

# Security scan
npm run security:scan

# Build for production
npm run build
```

## 🚢 Deployment

### Manual Deployment

```bash
npm run deploy
```

Requires Cloudflare credentials configured.

### Automated Deployment

Set up in repository settings:
1. Enable "Deployments" in GitHub
2. Configure Cloudflare integration
3. Set main branch for auto-deploy

### Staging vs Production

- **Staging**: Deploy from `develop` branch
- **Production**: Deploy from `main` branch

## 📈 Performance Targets

- **Build time**: < 5 minutes
- **Page size**: < 100KB (HTML)
- **Images**: Optimized WebP format
- **Lighthouse Performance**: 90+
- **Core Web Vitals**: Excellent

## 🔄 Regular Maintenance

### Weekly
- Check Sentry for new errors
- Monitor Lighthouse scores
- Update dependencies: `pnpm outdated`

### Monthly
- Full security audit
- Performance review
- Dependency updates: `pnpm update`

### Quarterly
- Major version updates
- Architecture review
- Roadmap planning
