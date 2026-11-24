#!/usr/bin/env node
// Guarded production deploy. Replaces a bare `npx wrangler deploy`.
//
//   npm run deploy:prod              checks + build + deploy memoria-production
//   npm run deploy:prod -- --dry-run checks + build + `wrangler deploy --dry-run`
//
// Refuses unless: on main, tracked files clean, HEAD == origin/main, tsc + vitest pass,
// and the built worker config targets the production Supabase project only.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { assertOnlyProject, fail } from "./lib/env-guard.mjs";

const dry = process.argv.includes("--dry-run");
const sh = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32" && cmd === "npx", ...opts });
const must = (cmd, args) => {
  const r = sh(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) fail(`${cmd} ${args.join(" ")} failed`);
};
const out = (cmd, args) => (sh(cmd, args).stdout || "").trim();

// 1) git state
const branch = out("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
if (branch !== "main") fail(`on branch "${branch}", production deploys come from main only.`);
// graphify-out/ is generated and tracked; it must not block a deploy
const dirty = out("git", ["status", "--porcelain", "--untracked-files=no"])
  .split("\n").filter((l) => l && !l.includes("graphify-out/"));
if (dirty.length) fail(`tracked files have uncommitted changes:\n${dirty.join("\n")}`);
sh("git", ["fetch", "origin", "main", "--quiet"]);
const head = out("git", ["rev-parse", "HEAD"]);
const remote = out("git", ["rev-parse", "origin/main"]);
if (head !== remote) fail(`HEAD (${head.slice(0, 7)}) differs from origin/main (${remote.slice(0, 7)}). Push or pull first.`);

// 2) tests
must("npx", ["tsc", "--noEmit"]);
must("npx", ["vitest", "run"]);

// 3) build (production mode) and verify target
must("npx", ["vite", "build"]);
const gen = JSON.parse(readFileSync(".output/server/wrangler.json", "utf8"));
if (gen.name !== "memoria-production") fail(`built worker name is "${gen.name}", expected memoria-production.`);
assertOnlyProject(JSON.stringify(gen.vars ?? {}), "prod", "built worker vars");

console.log(`\n✔ checks passed at ${head.slice(0, 7)}${dry ? " (dry run)" : ""}\n`);
must("npx", ["wrangler", "deploy", ...(dry ? ["--dry-run"] : [])]);
