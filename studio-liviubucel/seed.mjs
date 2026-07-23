// Script to seed Sanity with existing site content
// Run with: SANITY_AUTH_TOKEN=your_token node seed.mjs

const PROJECT_ID = process.env.SANITY_PROJECT_ID || "8atrdwjk";
const DATASET = process.env.SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_AUTH_TOKEN;

if (!TOKEN) {
  throw new Error('SANITY_AUTH_TOKEN environment variable is required');
}

const API_URL = `https://${PROJECT_ID}.api.sanity.io/v2024-03-15/data/mutate/${DATASET}`;

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
    console.error("Error:", JSON.stringify(result, null, 2));
    throw new Error(`API error: ${response.status}`);
  }
  return result;
}

async function seed() {
  console.log("🌱 Seeding Sanity with existing site content...\n");

  // ── 1. Homepage Content ──────────────────────────────────────────────
  console.log("→ Creating Homepage Content...");
  await mutate([
    {
      createOrReplace: {
        _id: "homepage-singleton",
        _type: "homepage",
        fullName: "Liviu Bucel",
        role: "Cybersecurity | Ethical Hacking | Digital Investigation",
        tagline: "Open to junior/graduate cybersecurity roles and selected technical collaborations.",
        location: "United Kingdom",
        email: "contact@liviubucel.com",
        cvUrl: null,
        aboutText: [
          {
            _type: "block",
            _key: "about-1",
            style: "normal",
            children: [
              {
                _type: "span",
                _key: "span-1",
                text: "Hi, I'm Liviu, based in the United Kingdom and focused on cybersecurity, ethical hacking, and digital investigation.",
                marks: [],
              },
            ],
            markDefs: [],
          },
          {
            _type: "block",
            _key: "about-2",
            style: "normal",
            children: [
              {
                _type: "span",
                _key: "span-2",
                text: "My core focus areas are ethical hacking, digital investigation, incident response, and security testing.",
                marks: [],
              },
            ],
            markDefs: [],
          },
          {
            _type: "block",
            _key: "about-3",
            style: "normal",
            children: [
              {
                _type: "span",
                _key: "span-3",
                text: "I build hands-on experience through controlled labs, technical research, and practical security projects.",
                marks: [],
              },
            ],
            markDefs: [],
          },
        ],
      },
    },
  ]);
  console.log("  ✅ Homepage Content created\n");

  // ── 2. Tech Stack ────────────────────────────────────────────────────
  console.log("→ Creating Tech Stack items...");
  const techStack = [
    { name: "SolidJS", icon: "solid", order: 1 },
    { name: "JavaScript", icon: "javascript", order: 2 },
    { name: "Node.js", icon: "nodejs", order: 3 },
    { name: "React.js", icon: "react", order: 4 },
    { name: "Python", icon: "python", order: 5 },
    { name: "Astro", icon: "astro", order: 6 },
    { name: "Kali Linux", icon: "linux", order: 7 },
    { name: "Burp Suite", icon: "security", order: 8 },
  ];
  await mutate(
    techStack.map((t) => ({
      createOrReplace: {
        _id: `tech-${t.name.toLowerCase().replace(/[\s.]/g, "-")}`,
        _type: "techStack",
        ...t,
      },
    }))
  );
  console.log("  ✅ Tech Stack items created\n");

  // ── 3. Social Links ──────────────────────────────────────────────────
  console.log("→ Creating Social Links...");
  await mutate([
    {
      createOrReplace: {
        _id: "social-linkedin",
        _type: "socialLink",
        platform: "LinkedIn",
        url: "https://www.linkedin.com/in/liviubucel/",
        icon: "ri:linkedin-box-fill",
        order: 1,
      },
    },
    {
      createOrReplace: {
        _id: "social-github",
        _type: "socialLink",
        platform: "GitHub",
        url: "https://github.com/liviubucel",
        icon: "ri:github-fill",
        order: 2,
      },
    },
  ]);
  console.log("  ✅ Social Links created\n");

  // ── 4. Cyber Security Stats ──────────────────────────────────────────
  console.log("→ Creating Cyber Security Stats...");
  await mutate([
    {
      createOrReplace: {
        _id: "cyber-stats-singleton",
        _type: "cyberStats",
        title: "Cyber Security",
        stats: [
          { _key: "stat-1", label: "Focus", value: "DFIR & Security Testing" },
          { _key: "stat-2", label: "Work", value: "Labs, Research & Tooling" },
          { _key: "stat-3", label: "Project", value: "ZebraByte" },
        ],
        certifications: [],
      },
    },
  ]);
  console.log("  ✅ Cyber Security Stats created\n");

  // ── 5. Sample Projects ───────────────────────────────────────────────
  console.log("→ Creating Projects...");
  await mutate([
    {
      createOrReplace: {
        _id: "project-ssl-generator",
        _type: "project",
        title: "SSL Certificate Generator",
        slug: { _type: "slug", current: "ssl-certificate-generator" },
        pubDate: "2024-01-01T00:00:00Z",
        description: "A tool for generating SSL certificates quickly and easily.",
        tags: ["SSL", "Security", "Node.js"],
        body: [
          {
            _type: "block",
            _key: "proj-body-1",
            style: "normal",
            children: [{ _type: "span", _key: "s1", text: "A tool for generating SSL certificates quickly and easily.", marks: [] }],
            markDefs: [],
          },
        ],
      },
    },
    {
      createOrReplace: {
        _id: "project-zebrabyte",
        _type: "project",
        title: "Zebrabyte",
        slug: { _type: "slug", current: "zebrabyte" },
        pubDate: "2024-06-01T00:00:00Z",
        description: "Zebrabyte is a cyber security agency founded by Liviu Bucel, offering security assessments, penetration testing and consulting.",
        url: "https://zebrabyte.com",
        tags: ["Agency", "Cyber Security", "Consulting"],
        body: [
          {
            _type: "block",
            _key: "proj-body-2",
            style: "normal",
            children: [{ _type: "span", _key: "s2", text: "Zebrabyte is a cyber security agency founded by Liviu Bucel, offering security assessments, penetration testing and consulting.", marks: [] }],
            markDefs: [],
          },
        ],
      },
    },
  ]);
  console.log("  ✅ Projects created\n");

  console.log("🎉 All done! Go to https://liviubucel.sanity.studio/ to see and edit your content.");
}

seed().catch(console.error);
