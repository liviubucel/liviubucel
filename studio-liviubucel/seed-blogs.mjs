// Blog seed script - reads recovered blog posts from git history and uploads them to Sanity.
// Requires SANITY_API_WRITE_TOKEN in the environment. Never hardcode credentials here.
import { execSync } from "child_process";

const PROJECT_ID = process.env.SANITY_PROJECT_ID || "8atrdwjk";
const DATASET = process.env.SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_WRITE_TOKEN;
const API_URL = `https://${PROJECT_ID}.api.sanity.io/v2024-03-15/data/mutate/${DATASET}`;
const GIT_PARENT_COMMIT = "217993f";

if (!TOKEN) {
  console.error("Missing SANITY_API_WRITE_TOKEN.");
  process.exit(1);
}

const blogFiles = [
  "brea-salesloft-drift-salesforce-impactul-asupra-cloudflare-cronologie-complet-i-ghid-de-rspuns.md",
  "cnd-brandingul-e-mai-puternic-dect-securitatea-cum-a-fost-compromis-the-real-world-platforma-lui-andrew-tate.md",
  "cum-s-te-protejezi-mpotriva-atacurilor-de-tip-phishing-n-2025.md",
  "how-to-stay-safe-online-essential-cybersecurity-tips-for-everyone.md",
  "mitre-i-programul-cve-ce-se-ntmpl-dup-expirarea-contractului-din-16-aprilie-2025.md",
  "top-5-essential-cybersecurity-blogs-you-should-follow-in-2025.md",
  "vulnerabilitate-critic-wordpress-cve-2026-23550-permite-preluarea-complet-a-site-urilor-prin-pluginul-modular-ds.md",
  "vulnerabilitate-instagram-postri-private-expuse-fr-autentificare.md",
];

async function mutate(mutations) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ mutations }),
  });
  const result = await response.json();
  if (!response.ok) {
    console.error("API Error:", JSON.stringify(result, null, 2));
    throw new Error(`API error: ${response.status}`);
  }
  return result;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { title: "Unknown", description: "", pubDate: null, body: raw };

  const frontmatter = {};
  match[1].split("\n").forEach((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^"(.*)"$/, "$1");
    frontmatter[key] = val;
  });

  const body = raw.slice(match[0].length).trim();
  return { ...frontmatter, body };
}

function filenameToSlug(filename) {
  return filename.replace(".md", "");
}

function detectLanguage(title, body, filename) {
  const text = `${title || ""} ${body || ""} ${filename || ""}`.toLowerCase();
  const diacritics = text.match(/[ăâîșşțţ]/g)?.length ?? 0;
  const words = text.match(/\b(și|este|pentru|despre|cum|care|din|în|securitate|vulnerabilitate|atac|ghid|după|fără)\b/g)?.length ?? 0;
  return diacritics + words >= 2 ? "ro" : "en";
}

function textToBlocks(text) {
  let cleaned = text;
  const odooMatch = text.match(/"en_US":\s*"([\s\S]*)"/);
  if (odooMatch) cleaned = odooMatch[1];

  const lines = cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== '"}');

  if (lines.length === 0) {
    return [{
      _type: "block",
      _key: "block-0",
      style: "normal",
      children: [{ _type: "span", _key: "span-0", text: text.slice(0, 500), marks: [] }],
      markDefs: [],
    }];
  }

  return lines.slice(0, 100).map((line, i) => {
    let style = "normal";
    let cleanLine = line;

    if (line.startsWith("### ")) { style = "h3"; cleanLine = line.slice(4); }
    else if (line.startsWith("## ")) { style = "h2"; cleanLine = line.slice(3); }
    else if (line.startsWith("# ")) { style = "h1"; cleanLine = line.slice(2); }
    else if (line.startsWith("##### ")) { style = "h5"; cleanLine = line.slice(6); }
    else if (line.startsWith("#### ")) { style = "h4"; cleanLine = line.slice(5); }

    cleanLine = cleanLine.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
    cleanLine = cleanLine.replace(/<[^>]+>/g, "");
    if (cleanLine.startsWith("![")) return null;

    cleanLine = cleanLine.trim();
    if (!cleanLine) return null;

    return {
      _type: "block",
      _key: `block-${i}`,
      style,
      children: [{ _type: "span", _key: `span-${i}`, text: cleanLine, marks: [] }],
      markDefs: [],
    };
  }).filter(Boolean);
}

async function seedBlogs() {
  console.log("Seeding recovered blog posts from git history...\n");

  for (const filename of blogFiles) {
    const slug = filenameToSlug(filename);
    console.log(`Processing: ${filename.slice(0, 60)}...`);

    let rawContent = "";
    try {
      rawContent = execSync(
        `git show "${GIT_PARENT_COMMIT}:src/data/blog/${filename}"`,
        { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
      );
    } catch {
      try {
        const commitHash = execSync(
          `git log --all --format="%H" -- "src/data/blog/${filename}" | head -1`,
          { encoding: "utf8" }
        ).trim();
        const parentHash = execSync(`git rev-parse ${commitHash}^`, { encoding: "utf8" }).trim();
        rawContent = execSync(
          `git show "${parentHash}:src/data/blog/${filename}"`,
          { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
        );
      } catch {
        console.log(`Could not recover ${filename}`);
        continue;
      }
    }

    const { title, description, pubDate, body } = parseFrontmatter(rawContent);
    const blocks = textToBlocks(body || "");
    const language = detectLanguage(title, body, filename);

    try {
      await mutate([{
        createOrReplace: {
          _id: `post-${slug.slice(0, 50)}`,
          _type: "post",
          title: title || "Untitled",
          slug: { _type: "slug", current: slug },
          description: description || "",
          language,
          published: true,
          pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          body: blocks,
        },
      }]);
      console.log(`Uploaded (${language.toUpperCase()}): "${title?.slice(0, 60)}"\n`);
    } catch (error) {
      console.error(`Failed to upload ${slug}:`, error.message);
    }
  }

  console.log("All recovered blog posts seeded.");
}

seedBlogs().catch((error) => {
  console.error(error);
  process.exit(1);
});
