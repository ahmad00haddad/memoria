// روابط خارجية داخل رسائل المحادثة: نُظهر اسم الموقع وتحذيراً هادئاً (حماية من روابط التصيّد)
const URL_RE = /\bhttps?:\/\/[^\s<>"']+|\bwww\.[^\s<>"']+/gi;

export function externalHosts(body: string | null | undefined): string[] {
  const out = new Set<string>();
  for (const m of String(body ?? "").match(URL_RE) ?? []) {
    try {
      const host = new URL(m.startsWith("http") ? m : `https://${m}`).hostname.replace(/^www\./, "");
      if (host && !/(^|\.)workers\.dev$/.test(host)) out.add(host);
    } catch { /* ignore malformed */ }
  }
  return [...out];
}
