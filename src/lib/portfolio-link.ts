// رابط اختياري لكل صورة في معرض الأعمال (فيديو على يوتيوب، ألبوم Drive، Behance...).
// يُخزَّن داخل عنصر portfolio_urls نفسه كـ fragment: "<صورة>#link=<رابط مُرمَّز>"،
// فلا يحتاج عموداً جديداً، والمتصفح يتجاهل الـ fragment عند تحميل الصورة.
const MARK = "#link=";

export function splitPortfolioItem(item: string): { src: string; link: string | null } {
  const i = item.indexOf(MARK);
  if (i === -1) return { src: item, link: null };
  let link: string | null = null;
  try { link = decodeURIComponent(item.slice(i + MARK.length)); } catch { link = null; }
  return { src: item.slice(0, i), link: link && safeLink(link) };
}

export function joinPortfolioItem(src: string, link: string | null): string {
  const clean = link ? safeLink(link) : null;
  return clean ? `${src}${MARK}${encodeURIComponent(clean)}` : src;
}

/** يقبل روابط http(s) فقط، ويضيف https:// إن نُسيت. */
export function safeLink(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** اسم مختصر للمنصّة لعرضه على الشارة. */
export function linkLabel(link: string): string {
  const h = new URL(link).hostname.replace(/^www\./, "");
  if (/youtube\.com|youtu\.be/.test(h)) return "YouTube";
  if (/vimeo\.com/.test(h)) return "Vimeo";
  if (/drive\.google\.com/.test(h)) return "Drive";
  if (/behance\.net/.test(h)) return "Behance";
  if (/instagram\.com/.test(h)) return "Instagram";
  return h;
}
