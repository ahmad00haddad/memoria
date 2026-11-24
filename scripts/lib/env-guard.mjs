// Shared guards for deploy scripts. Project refs are public identifiers (they appear in URLs).
import { readFileSync } from "node:fs";

export const PROJECTS = {
  prod: "qrpkfanblpjiqgkufnrb", // memoria (production)
  dev: "ysqpmqulbeawzcatauqq", // EliteCapture (development)
  legacy: "ukjkgiahtpnevqdoguiq", // old Lovable Cloud project referenced by .env, status unknown
};

export function parseEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

export function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

/** Throws (exit 1) unless every Supabase reference in `text` points to `expected` and none to the others. */
export function assertOnlyProject(text, expected, label) {
  for (const [name, ref] of Object.entries(PROJECTS)) {
    if (name !== expected && text.includes(ref)) fail(`${label}: found ${name} project ref (${ref}), expected only ${expected}.`);
  }
  if (!text.includes(PROJECTS[expected])) fail(`${label}: expected project ref for ${expected} not found.`);
}
