# Bypassing Cloudflare Bot Fight Mode for cyber-monitor trigger workflows

The three manual `workflow_dispatch` workflows that call the Romania Cyber
Monitor admin endpoints (`trigger-cyber-monitor-sync.yml`,
`trigger-cyber-monitor-translations.yml`,
`trigger-cyber-monitor-content-backfill.yml`) run from GitHub Actions
runners. Cloudflare's Bot Fight Mode can fingerprint that traffic as
automated and serve a JS/managed challenge page (HTML, not JSON) instead of
forwarding the request to the origin — the app-level `Authorization: Bearer`
token never even gets checked, because Cloudflare stops the request at the
edge.

Each workflow now also sends a secret header:

```
X-Cyber-Monitor-Bypass: <CF_WAF_BYPASS_TOKEN>
```

This header does nothing on its own — the Astro app does not read or
validate it. It only works once paired with a Cloudflare WAF Custom Rule
that skips Bot Fight Mode when the header is present and correct.

## Setup (one-time)

1. **Generate a token.** Any long random string works, e.g.:
   ```
   openssl rand -hex 32
   ```

2. **Add it as a GitHub Actions repository secret:**
   Settings → Secrets and variables → Actions → New repository secret
   - Name: `CF_WAF_BYPASS_TOKEN`
   - Value: the token from step 1

3. **Create a Cloudflare WAF Custom Rule** (Security → WAF → Custom rules):
   - **When incoming requests match:**
     `http.request.uri.path starts_with "/api/cyber-monitor/"` AND
     `http.request.headers["x-cyber-monitor-bypass"][0] eq "<same token as step 1>"`
   - **Then take action:** Skip
   - **Skip these settings:** check **Bot Fight Mode** (this is the setting
     that actually matters here — a plain WAF "Block"-rule skip alone does
     not bypass Bot Fight Mode challenges). Also check "WAF managed rules"
     if a managed rule is separately blocking these requests.

4. Re-run the failing workflow. If it still 403s with an HTML challenge
   page in the response body, double-check the header name Cloudflare
   received matches exactly (`x-cyber-monitor-bypass`, case-insensitive)
   and that the rule is enabled and ordered before any blocking rule.

## Why not just widen the existing path-based rule?

A rule that only matches on URL path (e.g. `/api/cyber-monitor/*`) still
lets Bot Fight Mode's automatic heuristics challenge the request based on
TLS/HTTP fingerprint and User-Agent, regardless of path. A shared-secret
header is the mechanism Cloudflare documents for reliably distinguishing
trusted automation from anonymous bot traffic, independent of IP or
User-Agent (both of which GitHub Actions runners rotate constantly).
