#!/usr/bin/env node
// Bundle report + budget. Run after `vite build --sourcemap`.
//   node scripts/bundle-report.mjs            report, fail if the entry chunk exceeds the budget
//   node scripts/bundle-report.mjs --top 40   show more rows
// Budget lives in scripts/bundle-budget.json (entryGzipBytes). Lower it as optimizations land.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SourceMapConsumer } = require("source-map-js");
const dir = ".output/public/assets";
if (!existsSync(dir)) { console.error("No build output. Run: npx vite build --sourcemap"); process.exit(1); }
const topN = Number(process.argv[process.argv.indexOf("--top") + 1]) || 25;
const budget = JSON.parse(readFileSync("scripts/bundle-budget.json", "utf8"));

const js = readdirSync(dir).filter((f) => f.endsWith(".js"));
const sizes = js.map((f) => {
  const buf = readFileSync(join(dir, f));
  return { f, raw: buf.length, gz: gzipSync(buf, { level: 9 }).length };
}).sort((a, b) => b.raw - a.raw);

console.log("\nLargest JS chunks (raw / gzip):");
for (const s of sizes.slice(0, 12)) console.log(`${String(s.raw).padStart(9)} ${String(s.gz).padStart(8)}  ${s.f}`);
console.log(`\nTotal JS: ${sizes.reduce((a, s) => a + s.raw, 0)} raw, ${sizes.reduce((a, s) => a + s.gz, 0)} gzip (${sizes.length} files)`);

const entry = sizes[0];
if (existsSync(join(dir, entry.f + ".map"))) {
  const code = readFileSync(join(dir, entry.f), "utf8").split("\n");
  const c = new SourceMapConsumer(JSON.parse(readFileSync(join(dir, entry.f + ".map"), "utf8")));
  const segs = [];
  c.eachMapping((m) => segs.push(m));
  const per = {};
  segs.forEach((m, i) => {
    const n = segs[i + 1];
    const len = n && n.generatedLine === m.generatedLine ? n.generatedColumn - m.generatedColumn : (code[m.generatedLine - 1] || "").length - m.generatedColumn;
    const s = m.source || "?";
    const pkg = s.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
    const k = pkg ? `pkg:${pkg[1]}` : s.replace(/^(\.\.\/)+/, "").replace(/\?.*$/, "");
    per[k] = (per[k] || 0) + len;
  });
  console.log(`\nEntry chunk ${entry.f} — contributors (minified bytes; note: JSON modules may be attributed to a neighbouring file):`);
  Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, topN).forEach(([k, v]) => console.log(`${String(v).padStart(9)}  ${k}`));
} else {
  console.log("\n(no .map files: rebuild with `npx vite build --sourcemap` for per-package detail)");
}

console.log(`\nEntry gzip: ${entry.gz} bytes   budget: ${budget.entryGzipBytes}`);
if (entry.gz > budget.entryGzipBytes) {
  console.error(`✖ entry chunk exceeds budget by ${entry.gz - budget.entryGzipBytes} bytes`);
  process.exit(1);
}
console.log("✔ within budget");
