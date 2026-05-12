const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function callAI(opts: {
  system?: string;
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY غير مهيّأ");
  const messages: any[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.prompt });
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "raw-fetch",
    },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3-flash-preview",
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 800,
    }),
  });
  if (res.status === 429) throw new Error("تم تجاوز حد الاستخدام، حاول لاحقًا");
  if (res.status === 402) throw new Error("نفدت أرصدة Lovable AI، أضف أرصدة من الإعدادات");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
  }
  const json: any = await res.json();
  return (json?.choices?.[0]?.message?.content ?? "").trim();
}