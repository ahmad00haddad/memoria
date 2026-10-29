// Add t()/tr() string literals and Arabic "label"/"hint" values from given files to keys.json.
// usage: node scripts/i18n/add-keys.mjs <file...>
import fs from "node:fs";
const keys = JSON.parse(fs.readFileSync("scripts/i18n/keys.json", "utf8"));
let added = 0;
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, "utf8");
  const re = /\btr?\(\s*"((?:[^"\\]|\\.)*)"|(?:label|hint):\s*"((?:[^"\\]|\\.)*)"/g;
  for (const m of src.matchAll(re)) {
    const k = JSON.parse(`"${m[1] ?? m[2]}"`).trim();
    if (!/[؀-ۿ]/.test(k)) continue;
    if (!keys[k]) { keys[k] = []; added++; }
    if (!keys[k].includes(f)) keys[k].push(f);
  }
}
fs.writeFileSync("scripts/i18n/keys.json", JSON.stringify(keys, null, 1) + "\n");
console.log(`added ${added}`);
