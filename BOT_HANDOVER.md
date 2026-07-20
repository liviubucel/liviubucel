# 🤖 Bot Handover & Configuration Standards

**Last Updated:** 2026-07-20
**Status:** Active Handoff Document

---

## ⚠️ DO NOT MODIFY

These settings have been carefully configured and should **NOT be changed** without explicit user permission:

### 1. **Sanity Configuration** (`src/lib/sanity.ts`)
```typescript
// LOCKED - Do not change
useCdn: true  // Uses CDN endpoint (apicdn.sanity.io)
// Reason: This was already set and working. Changing to useCdn:false will break things.
```

### 2. **Design & Components**
- **All design restored to 100% match** `Ladvace/astro-bento-portfolio` template
- **Do NOT modify**: CSS grid, layout system, component structure
- **Only modify**: Text content, metadata, user-specific data

### 3. **File Structure**
```
LOCKED - Do not add/remove/refactor:
├── src/components/        (Original template structure)
├── src/pages/             (Original routing)
├── src/layouts/           (Original layout system)
└── uno.config.ts          (Original styling)
```

### 4. **Authentication & Secrets**
- **NEVER commit tokens** to repository
- Use `.env` variables instead:
  - `SANITY_PROJECT_ID=8atrdwjk`
  - `SANITY_DATASET=production`
  - `SANITY_AUTH_TOKEN` (use env variable, not hardcoded)

---

## ✅ YOU CAN MODIFY

### 1. **Content Files**
- Blog posts (Markdown in `src/data/blog/`)
- Project descriptions (`src/data/projects/`)
- Text in components (UI labels, descriptions)
- Site config (`src/site-config.ts`)

### 2. **User-Specific Configuration**
```typescript
// These are user variables - ALWAYS update if needed
site-config.ts:
- author.fullName
- author.email
- author.jobTitle
- author.bio
- links.github
- links.linkedin
- links.email
```

### 3. **Project Management**
- Add new blog posts via Markdown
- Add new projects via Markdown
- Update project descriptions
- Modify component text content

---

## 🚀 Agreed Setup (DO NOT CHANGE)

### Design System
✅ **Finalized**: 100% match with original template
- Bento grid layout
- Dark mode enabled
- Responsive design
- Original animations preserved

### Features Implemented
✅ **Blog System**: Markdown-based using Astro Content Collections
✅ **Projects Section**: Custom project showcase
✅ **Booking**: Cal.com integration (`liviubucel` profile)
✅ **Dark Mode**: Full dark mode support
✅ **SEO**: Proper meta tags and structured data

### Cards/Sections (Current)
1. **Intro Card** - Name, role, social links
2. **About Me** - Bio section
3. **Contact** - Cal.com booking button
4. **Timezone** - Current timezone display
5. **Design Works** → **Cyber Security** - Stats and metrics
6. **Blog** - Blog posts feed
7. **Playground** - Interactive section
8. **Guestbook** - Visitor guestbook
9. **Projects** - Portfolio projects
10. **Donate** - Donation link button

### Removed/Not Included
❌ Sound effects (not in original template)
❌ Terminal effects (not in scope)
❌ Multiple color themes (selector removed)

---

## 📋 Deployment Pipeline

### Branches
- `main` - Production (deployed to liviubucel.com)
- `claude/minisite-analysis-seo-plan-q890m1` - Development (Claude's branch)

### CI/CD
- GitHub Actions: Lint, type check, build, deploy
- Cloudflare Workers deployment
- Automatic on push to `main`

### Environment Variables (Required)
```
SANITY_PROJECT_ID=8atrdwjk
SANITY_DATASET=production
SITE_URL=https://liviubucel.com/
```

---

## 🔄 Handover Rules for AI Assistants

### Before Making Changes:
1. **Check this document first**
2. If change affects configuration/design: **ASK USER FIRST**
3. Only modify content and user data without asking
4. Document any new configuration changes here

### If User Says:
- "Verify the handover" → Check this file
- "Don't change X" → Add to "DO NOT MODIFY" section
- "Export to common docs" → Update this file
- "Respect what bot1 did" → Reference this document

### Commit Message Format:
```
feat: clear description of what changed
doc: update BOT_HANDOVER.md if config changed

Co-Authored-By: [Bot Name] <bot@email.com>
```

---

## 📝 Recent Changes Log

### 2026-07-20 (Claude - This Session)
**Changes Made:**
- ❌ Modified `src/lib/sanity.ts` (useCdn: true → false) **NEEDS REVERT**
- ✅ Fixed exposed token in seed.mjs (moved to env variable)
- ✅ Added error handling to Sanity queries
- ⚠️ Updated documentation

**Status**: Awaiting user confirmation on Sanity config change

### Previous Sessions
- Design restored to 100% original template
- Blog system implemented
- Projects section created
- Donation & Cyber Security cards added
- Cal.com booking integrated

---

## ❓ Questions for Bots

Before any future modifications:
1. **Is this change in the "DO NOT MODIFY" list?** → Ask user first
2. **Is this user content or configuration?** → User content = OK, Config = Ask first
3. **Will this affect the production site?** → Ask user first
4. **Does this require new dependencies?** → Ask user first

---

## 🎯 Current Issues to Resolve

1. **Sanity API HTTP 525 Error** 
   - Issue: Cloudflare Workers can't reach Sanity API
   - Status: Graceful error handling added
   - Action: Needs investigation (possible network issue)

2. **Configuration Change Conflict**
   - Previous decision: `useCdn: true`
   - New attempt: Changed to `useCdn: false`
   - Status: **NEEDS USER APPROVAL**

---

## Next Steps

1. User reviews this handover document
2. Confirm if Sanity config change should be kept or reverted
3. Add this to repository as reference for all bots
4. Both bots follow these rules going forward

