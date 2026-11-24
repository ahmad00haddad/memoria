#!/usr/bin/env node
// Deploys the DEV worker (memoria-dev) bound to the DEV Supabase project. Never touches production.
//
//   npm run deploy:dev            build (--mode development) + deploy memoria-dev
//   npm run deploy:dev -- --dry-run   build + validate + `wrangler deploy --dry-run` (uploads nothing)
//
// Safety: the generated config is whitelisted (no prod vars, no cron, no payment links), and the script
// aborts if any production/legacy Supabase ref appears in the build output config or the client bundle.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PROJECTS, parseEnvFile, fail, assertOnlyProject } from "./lib/env-guard.mjs";

const dry = process.argv.includes("--dry-run");
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) fail(`${cmd} ${args.join(" ")} failed`);
};

// 1) env must be the dev project
const env = parseEnvFile(".env.development");
for (const k of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]) {
  if (!env[k]) fail(`.env.development is missing ${k}`);
}
assertOnlyProject(`${env.SUPABASE_URL}\n${env.VITE_SUPABASE_URL}`, "dev", ".env.development");

// 2) build in development mode (client bundle gets VITE_* from .env.development)
run("npx", ["vite", "build", "--mode", "development"]);

// 3) the client bundle must not reference prod
const assets = join(".output", "public", "assets");
for (const f of readdirSync(assets).filter((n) => n.endsWith(".js"))) {
  const txt = readFileSync(join(assets, f), "utf8");
  for (const ref of [PROJECTS.prod, PROJECTS.legacy]) {
    if (txt.includes(ref)) fail(`client bundle ${f} references a non-dev Supabase project (${ref}).`);
  }
}

// 4) derive a whitelisted dev config from the generated one
const gen = JSON.parse(readFileSync(".output/server/wrangler.json", "utf8"));
const prodUrl = new URL(JSON.parse(readFileSync("wrangler.jsonc", "utf8").replace(/^\s*\/\/.*$/gm, "")).vars.PUBLIC_APP_URL);
const sub = prodUrl.hostname.split(".").slice(1).join("."); // <account>.workers.dev
const name = "memoria-dev";
const cfg = {
  ...gen,
  name,
  vars: {
    EMAIL_FROM: gen.vars?.EMAIL_FROM ?? "onboarding@resend.dev",
    PUBLIC_APP_URL: `https://${name}.${sub}`,
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_PUBLISHABLE_KEY,
  },
};
delete cfg.triggers; // no cron on dev unless enabled deliberately
assertOnlyProject(JSON.stringify(cfg), "dev", "generated dev wrangler config");
if (cfg.name === "memoria-production") fail("refusing: worker name is memoria-production");

const out = ".output/server/wrangler.dev.json";
writeFileSync(out, JSON.stringify(cfg, null, 2));
console.log(`\n✔ dev config written: ${out}\n  name=${cfg.name}  url=${cfg.vars.PUBLIC_APP_URL}\n`);

// 5) deploy (or dry-run). Secrets are NOT copied; set them with:
//    npx wrangler secret put <NAME> --name memoria-dev   (use DEV Supabase service-role key only)
run("npx", ["wrangler", "deploy", "-c", out, ...(dry ? ["--dry-run"] : [])]);
