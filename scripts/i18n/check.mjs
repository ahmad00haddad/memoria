// Validate en.json against keys.json. --fix drops suspect entries so translate.mjs redoes them.
import fs from "node:fs";

const fix = process.argv.includes("--fix");
const keys = JSON.parse(fs.readFileSync("scripts/i18n/keys.json", "utf8"));
const en = JSON.parse(fs.readFileSync("src/i18n/en.json", "utf8"));
const ph = (s) => (s.match(/\{\d+\}/g) ?? []).sort().join();

const missing = Object.keys(keys).filter((k) => !(k in en));
const suspect = [];
for (const [k, v] of Object.entries(en)) {
  const words = v.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  const why =
    /[؀-ۿ]/.test(v) ? "arabic" :
    ph(k) !== ph(v) ? "placeholders" :
    words.length >= 6 && words.filter((w) => /^[A-Z]/.test(w)).length / words.length > 0.75 ? "title-case" :
    /Memoria\W+Memoria/.test(v) ? "double-brand" :
    k.length > 20 && (v.length < k.length * 0.35 || v.length > k.length * 3.5) ? "length" :
    null;
  if (why && v !== "") suspect.push([why, k, v]);
}
console.log(`keys ${Object.keys(keys).length} · translated ${Object.keys(en).length} · missing ${missing.length} · suspect ${suspect.length}`);
for (const [why, k, v] of suspect) console.log(`[${why}] ${k.slice(0, 60)} => ${v.slice(0, 90)}`);
if (fix) {
  for (const [, k] of suspect) delete en[k];
  fs.writeFileSync("src/i18n/en.json", JSON.stringify(en, null, 1) + "\n");
  console.log(`dropped ${suspect.length}; rerun translate.mjs`);
}
