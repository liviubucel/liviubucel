# 🌍 Translation Guide

This project supports English and Romanian with automated translation capabilities.

## URL Structure

```
English (Default):  liviubucel.com/
                   liviubucel.com/blog
                   liviubucel.com/projects

Romanian:          liviubucel.com/ro/
                   liviubucel.com/ro/blog
                   liviubucel.com/ro/projects
```

## Language Switcher

The globe icon (🌐) appears in the top-right corner of every page. Click to switch languages instantly.

## Automated Translation

### Quick Start

1. **Get Claude API Key**
   - Visit https://console.anthropic.com
   - Create API key

2. **Set Environment Variable**
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-your-key-here"
   ```

3. **Use Translation Script**
   ```bash
   # Translate English to Romanian
   node scripts/translate-to-ro.mjs "Welcome to my blog"
   
   # Output:
   # Translated: Bine ați venit pe blogul meu
   ```

### Translation Workflow

#### When Adding New English Content:

1. **Create English page**
   ```bash
   # Create: src/pages/new-page.astro
   # Add your English content
   ```

2. **Generate Romanian version**
   ```bash
   # Translate strings
   node scripts/translate-to-ro.mjs "My English text here"
   
   # Copy your English page to /ro/ and replace text with translations
   cp src/pages/new-page.astro src/pages/ro/new-page.astro
   ```

3. **Update Romanian page**
   - Replace all English strings with Romanian translations
   - Keep code structure identical
   - Update metadata (title, description)

#### Example Translation

**English (`src/pages/example.astro`)**
```astro
const description = "Software developer focused on web development";
const title = "Projects";
```

**Romanian (`src/pages/ro/example.astro`)**
```astro
const description = "Dezvoltator de software focusat pe web development";
const title = "Proiecte";
```

### Translation Guidelines

✅ **DO:**
- Preserve HTML tags and formatting
- Keep variable names in English
- Maintain code structure exactly
- Update meta descriptions
- Translate UI text (buttons, labels, etc.)

❌ **DON'T:**
- Translate code comments unless needed
- Change variable or function names
- Modify CSS classes or IDs
- Alter file paths or imports

### Components That Need Translation

**Text to translate:**
- Page titles (`title` prop)
- Descriptions (in frontmatter/props)
- UI labels ("Back", "Posts", "Blog", etc.)
- Headings and paragraphs
- Button text
- Alt text

**Code that stays the same:**
- Variable names
- Function names
- CSS classes
- File paths
- Imports/exports
- Component props (unless content)

### Language Support

```typescript
// lib/i18n.ts
export const LANGUAGES = {
  en: 'English',
  ro: 'Română',
} as const;
```

Currently supporting: **English** and **Romanian**

To add a new language:
1. Add to `LANGUAGES` in `src/lib/i18n.ts`
2. Create corresponding `/xx/` pages
3. Update middleware if needed

## Checking Translation Status

Run the i18n audit:
```bash
npm run i18n:audit
```

This checks that all English pages have Romanian counterparts.

## Environment Setup

```bash
# Set API key for translations
export ANTHROPIC_API_KEY="sk-ant-..."

# Verify it's set
echo $ANTHROPIC_API_KEY
```

## Automatic Translation (Future)

For fully automated translations on every edit, you could:

1. **Git Pre-commit Hook**
   - Auto-translate new pages before commit
   - Requires approval for translations

2. **CI/CD Integration**
   - GitHub Actions runs translation
   - Creates PR with Romanian pages

3. **IDE Extension**
   - Real-time translation in editor
   - Side-by-side comparison

## Resources

- [Claude API Documentation](https://anthropic.com/docs)
- [Astro i18n Guide](https://docs.astro.build/en/guides/internationalization/)
- [Romanian Language Resources](https://www.duolingo.com/course/en/ro/Learn-Romanian)

## Questions?

For translation issues or questions about adding new languages, check:
- `src/lib/i18n.ts` - Language configuration
- `src/pages/` - English pages (root)
- `src/pages/ro/` - Romanian pages
- `scripts/translate-to-ro.mjs` - Translation helper
