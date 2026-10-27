// List source files with Arabic that no phase list covers yet -> scripts/i18n/phaseC.txt
import fs from "node:fs";
import path from "node:path";

const done = new Set(["phaseA.txt", "phaseB.txt"].flatMap((f) => fs.readFileSync(`scripts/i18n/${f}`, "utf8").split(/\s+/)));
const SKIP = /i18n\/|\.server\.ts|routeTree|email|whatsapp|sitemap|robots|\/api\/|lib\/tests/;
const out = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f).split(path.sep).join("/");
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p) && !SKIP.test(p) && !done.has(p) && /[؀-ۿ]/.test(fs.readFileSync(p, "utf8"))) out.push(p);
  }
})("src");
fs.writeFileSync("scripts/i18n/phaseC.txt", out.join(" "));
console.log(out.length);
