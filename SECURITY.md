# Security & Performance Guide

This document describes the security and performance features implemented in this project.

## 🔒 Security Headers

All responses include the following security headers:

### Content Security Policy (CSP)
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; ...
```

**What it does:**
- Prevents inline script injection attacks
- Restricts resources to same-origin by default
- Allows specific third-party CDNs

### X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
- Prevents MIME type sniffing attacks
- Forces browsers to respect Content-Type header

### X-Frame-Options
```
X-Frame-Options: DENY
```
- Prevents clickjacking attacks
- Disallows embedding in iframes

### X-XSS-Protection
```
X-XSS-Protection: 1; mode=block
```
- Enables browser XSS filtering

### Referrer-Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
- Limits referrer information sent to external sites

### Permissions-Policy
```
Permissions-Policy: geolocation=(), microphone=(), camera=(), ...
```
- Disables unused browser APIs

## 📊 Performance Headers

### Cache-Control Strategy

**Static Assets (1 year cache)**
- Images, fonts, stylesheets
- `Cache-Control: public, max-age=31536000, immutable`

**HTML Pages (1 hour client, 1 day CDN)**
- `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`

**API Routes (1 hour cache)**
- `Cache-Control: public, max-age=3600`

## 🚨 Error Tracking with Sentry

Sentry integration provides:
- **Client-side error tracking** - JavaScript errors, crashes
- **Performance monitoring** - Page load times, LCP, CLS
- **Session replay** - Debug user sessions
- **Breadcrumb tracking** - User interaction trails

### Setup

1. Create Sentry account: https://sentry.io
2. Create project for liviubucel.com
3. Set `SENTRY_DSN` environment variable
4. Errors will be tracked automatically

Example:
```bash
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

## 🖼️ Image Optimization

### Built-in Optimization
- **Format conversion** - WebP, AVIF with fallbacks
- **Responsive sizes** - Multiple density variants
- **Lazy loading** - Images load on-demand
- **Quality tuning** - Format-specific quality settings

### Usage

```astro
---
import { Image } from 'astro:assets';
import { getHeroImageProps } from '../lib/image';

const props = getHeroImageProps(imageSource);
---

<Image {...props} />
```

## 🌍 Multi-Language Security

- Language detection via `Accept-Language` header
- No user-tracking cookies
- Privacy-respecting language preferences

## 📱 HTTPS & TLS

- HTTPS enforced via `upgrade-insecure-requests` CSP directive
- All external resources loaded via HTTPS
- Cloudflare automatic HTTPS

## 🔑 Environment Variables

Sensitive data is managed via environment variables:
- Never commit `.env` to git (use `.env.example`)
- Sentry DSN is optional
- Database tokens are per-environment

## 🛡️ Regular Audits

Check security regularly:
- **Lighthouse Security Audit** - `npm run build && npm run preview`
- **Sentry Issues** - Monitor error trends
- **Dependency Updates** - `pnpm outdated`

## 🚀 Deploy Safely

1. Test in staging: `npm run build && npm run preview`
2. Check Lighthouse scores (Performance, Security, SEO)
3. Review environment variables before deploy
4. Monitor Sentry errors in production

## 📞 Report Security Issues

If you find a security vulnerability, please email: security@liviubucel.com

**Do not** create public GitHub issues for security vulnerabilities.
