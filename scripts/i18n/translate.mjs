// Translate missing keys (scripts/i18n/keys.json) into src/i18n/en.json with a LOCAL Ollama model.
// usage: node scripts/i18n/translate.mjs [--model qwen2.5:14b] [--batch 20] [--limit N] [--file part]
import fs from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const MODEL = arg("--model", "qwen2.5:14b");
const BATCH = Number(arg("--batch", 20));
const LIMIT = Number(arg("--limit", Infinity));
const ONLY = arg("--file", "");
const SKIP = arg("--skip", "");
const EN = "src/i18n/en.json";

const keys = JSON.parse(fs.readFileSync("scripts/i18n/keys.json", "utf8"));
const en = JSON.parse(fs.readFileSync(EN, "utf8"));
const todo = Object.keys(keys).filter((k) => !(k in en) && (!ONLY || keys[k].some((f) => f.includes(ONLY))) && (!SKIP || !keys[k].every((f) => f.includes(SKIP)))).slice(0, LIMIT);
console.log(`${todo.length} strings to translate with ${MODEL}`);

const SYSTEM = `You translate the Arabic UI of "Memoria", a Jordanian platform for booking wedding and event photographers, into English.
Style: elegant, warm, concise — a luxury wedding brand. Natural English, not literal. UI labels stay short (buttons 1-3 words).
Casing: sentences and descriptions in normal sentence case ("Book a photographer in minutes."); Title Case only for short menu items, buttons and headings of 1-4 words.
Glossary: ميموريا = Memoria; مصوّرة/مصورة/مصوّر = photographer; العروس/عروس = bride; العميلة = client; عربون = deposit; حجز = booking; باقة = package; لوحة التحكم/لوحتي = dashboard; دينار/د.أ = JOD; الأردن = Jordan; CliQ stays CliQ.
Arabic often addresses the reader as feminine — use plain "you".
Rules: keep {0} {1}… placeholders exactly; keep emojis, numbers, URLs, brand names and Latin words; keep the punctuation role (· — : ?). Never add notes.
Answer ONLY a JSON object mapping each input id to its English text.`;

async function ask(batch) {
  const input = Object.fromEntries(batch.map((k, i) => [String(i), k]));
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      format: "json",
      options: { temperature: 0.2, num_ctx: 4096 },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(input, null, 1) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const out = JSON.parse((await res.json()).message.content);
  return out;
}

const ph = (s) => (s.match(/\{\d+\}/g) ?? []).sort().join();
const bad = [];
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  let out;
  for (let tries = 0; tries < 2 && !out; tries++) {
    try { out = await ask(batch); } catch (e) { console.error("batch failed:", e.message); }
  }
  if (!out) continue;
  batch.forEach((k, j) => {
    const v = out[String(j)];
    // reject: missing, still Arabic, placeholders changed
    if (typeof v !== "string" || !v.trim() || /[؀-ۿ]/.test(v) || ph(v) !== ph(k)) { bad.push(k); return; }
    en[k] = v.trim();
  });
  fs.writeFileSync(EN, JSON.stringify(en, null, 1) + "\n");
  console.log(`${Math.min(i + BATCH, todo.length)}/${todo.length}`);
}
fs.writeFileSync("scripts/i18n/rejected.json", JSON.stringify(bad, null, 1));
console.log(`done. rejected ${bad.length} (scripts/i18n/rejected.json) — rerun to retry them`);
