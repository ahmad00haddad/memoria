// List every place the brand name appears -> docs/brand-name-locations.md
// usage: node scripts/brand-locations.mjs   (rerun any time to refresh the list)
import fs from "node:fs";
import path from "node:path";

const NAME = /ميموريا|memoria/gi;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".output", ".wrangler", "graphify-out", ".venv", "tools", ".tanstack", ".claude", "Lost videos"]);
const SKIP_FILES = /package-lock\.json$|routeTree\.gen\.ts$|brand-name-locations\.md$|\.(png|jpe?g|webp|gif|ico|mp4|woff2?|ttf|zip|pdf)$/i;

const hits = {};
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const rel = path.relative(".", p).split(path.sep).join("/");
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(f)) walk(p); continue; }
    if (SKIP_FILES.test(f) || st.size > 2_000_000) continue;
    fs.readFileSync(p, "utf8").split(/\r?\n/).forEach((line, i) => {
      if (line.match(NAME)) (hits[rel] ??= []).push(`${i + 1}: ${line.trim().slice(0, 160)}`);
    });
  }
})(".");

const files = Object.keys(hits).sort();
const total = files.reduce((n, f) => n + hits[f].length, 0);
let md = `# أماكن اسم "ميموريا / Memoria"\n\nتاريخ التوليد: ${new Date().toISOString().slice(0, 10)} · ${files.length} ملف · ${total} سطر\n\nللتحديث: \`node scripts/brand-locations.mjs\`\n\n`;
md += `> ملاحظة: أماكن خارج الكود لازم تتغيّر يدوياً أيضاً: الدومين، Cloudflare (اسم الـ Worker)، Supabase (أسماء المشاريع، قوالب الإيميل)، Google OAuth (اسم التطبيق)، Zbooni، حسابات السوشال.\n\n`;
for (const f of files) md += `## ${f}\n\n\`\`\`\n${hits[f].join("\n")}\n\`\`\`\n\n`;
fs.writeFileSync("docs/brand-name-locations.md", md);
console.log(`${files.length} files, ${total} lines`);
