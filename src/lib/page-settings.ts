// إعدادات الصفحة العامة للمصوّرة — قيم مقيّدة فقط (قوائم بيضاء وحدود طول).
// sanitizePageSettings تُستخدم عند الحفظ وعند العرض، فأي قيمة غريبة في القاعدة
// (حتى لو كُتبت مباشرة) ترجع للافتراضي ولا تكسر الصفحة.
//
// الثيم = لوحة كاملة (خلفية، بطاقات، نص، حدود، غلاف) تُبنى من صبغة واحدة بمعادلة
// ثابتة الإضاءة، فالتباين مضمون في الوضعين الفاتح والداكن مهما اختارت المصوّرة.

// ── اللوحات ──────────────────────────────────────────────────────────────
// h: صبغة الورق والحبر · c: تشبّع الورق · accent: اللمسة الافتراضية · mode: الوضع المقترح
export const THEMES = {
  ivory: { label: "عاج وذهب", h: 80, c: 0.012, accent: "champagne", mode: "light" },
  petra: { label: "حجر البتراء", h: 45, c: 0.022, accent: "terracotta", mode: "light" },
  rose: { label: "ورد مجفّف", h: 12, c: 0.016, accent: "rose", mode: "light" },
  olive: { label: "بستان زيتون", h: 112, c: 0.016, accent: "olive", mode: "light" },
  mineral: { label: "ملح البحر الميت", h: 205, c: 0.012, accent: "teal", mode: "light" },
  film: { label: "فيلم أبيض وأسود", h: 70, c: 0.003, accent: "graphite", mode: "light" },
  henna: { label: "ليلة الحنّاء", h: 40, c: 0.022, accent: "copper", mode: "dark" },
  velvet: { label: "مخمل عنّابي", h: 12, c: 0.03, accent: "champagne", mode: "dark" },
  navy: { label: "كحلي ملكي", h: 262, c: 0.028, accent: "champagne", mode: "dark" },
  ink: { label: "حبر وفضّة", h: 250, c: 0.006, accent: "silver", mode: "dark" },
} as const;

// لمسات منتقاة: L للوضع الفاتح (نص على ورق فاتح)، والداكن يُرفع تلقائياً
export const ACCENTS = {
  champagne: { label: "شمبانيا", l: 0.64, c: 0.09, h: 74 },
  terracotta: { label: "تيراكوتا", l: 0.56, c: 0.12, h: 42 },
  copper: { label: "نحاسي", l: 0.6, c: 0.11, h: 55 },
  rose: { label: "وردي مغبّر", l: 0.58, c: 0.09, h: 10 },
  plum: { label: "برقوقي", l: 0.5, c: 0.09, h: 345 },
  olive: { label: "زيتوني", l: 0.54, c: 0.08, h: 118 },
  teal: { label: "فيروزي", l: 0.54, c: 0.07, h: 200 },
  sapphire: { label: "ياقوتي", l: 0.5, c: 0.1, h: 258 },
  silver: { label: "فضّي", l: 0.55, c: 0.02, h: 250 },
  graphite: { label: "فحمي", l: 0.36, c: 0.01, h: 60 },
} as const;

// أزواج خطوط: عنوان + نص، عربي وإنجليزي (كلها قائمة في styles.css)
export const FONTS = {
  classic: { label: "دعوة كلاسيكية", sample: "أمسية لا تُنسى", arD: '"Amiri"', arDw: 700, arB: '"Cairo Variable"', enD: '"Cormorant Garamond Variable"', enDw: 500, enB: '"Jost Variable"' },
  couture: { label: "أزياء راقية", sample: "أمسية لا تُنسى", arD: '"El Messiri"', arDw: 600, arB: '"Readex Pro Variable"', enD: '"Bodoni Moda Variable"', enDw: 500, enB: '"Jost Variable"' },
  gallery: { label: "معرض فنّي", sample: "أمسية لا تُنسى", arD: '"Reem Kufi Variable"', arDw: 500, arB: '"Readex Pro Variable"', enD: '"Instrument Serif"', enDw: 400, enB: '"Geist Variable"' },
  calligraphy: { label: "خط الرقعة", sample: "أمسية لا تُنسى", arD: '"Aref Ruqaa"', arDw: 700, arB: '"Cairo Variable"', enD: '"DM Serif Display"', enDw: 400, enB: '"Jost Variable"' },
  editorial: { label: "مجلّة", sample: "أمسية لا تُنسى", arD: '"Noto Naskh Arabic Variable"', arDw: 600, arB: '"Alexandria Variable"', enD: '"Fraunces Variable"', enDw: 500, enB: '"Newsreader Variable"' },
  soft: { label: "هادئ وخفيف", sample: "أمسية لا تُنسى", arD: '"Alexandria Variable"', arDw: 300, arB: '"Alexandria Variable"', enD: '"EB Garamond Variable"', enDw: 500, enB: '"Geist Variable"' },
} as const;

export const MODES = { auto: "حسب الزائرة", light: "فاتح", dark: "داكن" } as const;
export const RADII = { sharp: { label: "حادّة", v: "0.125rem" }, soft: { label: "ناعمة", v: "0.75rem" }, round: { label: "دائرية", v: "1.25rem" } } as const;
export const HERO_TONES = { deep: "غلاف داكن", light: "غلاف فاتح" } as const;

export const LAYOUTS = {
  grid: { label: "مربعات متساوية" },
  wide: { label: "صور عريضة" },
  masonry: { label: "شبكة متداخلة" },
} as const;

export const GALLERY_COUNTS = [6, 9, 12] as const;
export const QUOTE_MAX = 80;
export const ANNOUNCE_MAX = 120;

type K<T> = keyof T;
export type PageSettings = {
  default_lang: "auto" | "ar" | "en";
  theme: K<typeof THEMES>;
  mode: K<typeof MODES> | "theme";
  accent: K<typeof ACCENTS> | "theme";
  font: K<typeof FONTS>;
  radius: K<typeof RADII>;
  hero_tone: K<typeof HERO_TONES>;
  gallery_layout: K<typeof LAYOUTS>;
  gallery_count: (typeof GALLERY_COUNTS)[number];
  section_order: "packages_first" | "gallery_first";
  bookings_per_day: "one" | "multi";
  show_gallery: boolean;
  show_reviews: boolean;
  show_stats: boolean;
  show_trust_badges: boolean;
  show_booking_notes: boolean;
  show_whatsapp: boolean;
  hero_quote: string;
  announcement: string;
};

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  default_lang: "auto",
  theme: "ivory",
  mode: "theme",
  accent: "theme",
  font: "classic",
  radius: "soft",
  hero_tone: "deep",
  gallery_layout: "grid",
  gallery_count: 12,
  section_order: "packages_first",
  bookings_per_day: "one",
  show_gallery: true,
  show_reviews: true,
  show_stats: true,
  show_trust_badges: true,
  show_booking_notes: true,
  show_whatsapp: true,
  hero_quote: "",
  announcement: "",
};

// قيم الإصدار الأول من الإعدادات → الجديدة
const LEGACY_THEME: Record<string, PageSettings["theme"]> = { classic: "ivory", sage: "olive", burgundy: "velvet", midnight: "navy" };
const LEGACY_FONT: Record<string, PageSettings["font"]> = { modern: "gallery", romantic: "calligraphy" };

const keysOf = <T extends object>(o: T) => Object.keys(o) as (keyof T)[];
const oneOf = <T extends string>(v: unknown, keys: readonly T[], d: T): T => (keys.includes(v as T) ? (v as T) : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
// نص عادي فقط: بلا روابط ولا أكواد ولا أسطر متعددة
const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[<>{}\r\n\t]/g, " ").replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim().slice(0, max) : "";

export function sanitizePageSettings(raw: unknown): PageSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_PAGE_SETTINGS;
  const count = Number(r.gallery_count);
  const theme = typeof r.theme === "string" ? (LEGACY_THEME[r.theme] ?? r.theme) : r.theme;
  const font = typeof r.font === "string" ? (LEGACY_FONT[r.font] ?? r.font) : r.font;
  return {
    default_lang: oneOf(r.default_lang, ["auto", "ar", "en"] as const, d.default_lang),
    theme: oneOf(theme, keysOf(THEMES), d.theme),
    mode: oneOf(r.mode, ["theme", ...keysOf(MODES)] as const, d.mode),
    accent: oneOf(r.accent, ["theme", ...keysOf(ACCENTS)] as const, d.accent),
    font: oneOf(font, keysOf(FONTS), d.font),
    radius: oneOf(r.radius, keysOf(RADII), d.radius),
    hero_tone: oneOf(r.hero_tone, keysOf(HERO_TONES), d.hero_tone),
    gallery_layout: oneOf(r.gallery_layout, keysOf(LAYOUTS), d.gallery_layout),
    gallery_count: (GALLERY_COUNTS as readonly number[]).includes(count) ? (count as PageSettings["gallery_count"]) : d.gallery_count,
    section_order: oneOf(r.section_order, ["packages_first", "gallery_first"] as const, d.section_order),
    bookings_per_day: oneOf(r.bookings_per_day, ["one", "multi"] as const, d.bookings_per_day),
    show_gallery: bool(r.show_gallery, d.show_gallery),
    show_reviews: bool(r.show_reviews, d.show_reviews),
    show_stats: bool(r.show_stats, d.show_stats),
    show_trust_badges: bool(r.show_trust_badges, d.show_trust_badges),
    show_booking_notes: bool(r.show_booking_notes, d.show_booking_notes),
    show_whatsapp: bool(r.show_whatsapp, d.show_whatsapp),
    hero_quote: text(r.hero_quote, QUOTE_MAX),
    announcement: text(r.announcement, ANNOUNCE_MAX),
  };
}

// ── بناء اللوحة ─────────────────────────────────────────────────────────
const ok = (l: number, c: number, h: number) => `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h})`;

export function resolveMode(s: PageSettings, siteDark: boolean): "light" | "dark" {
  if (s.mode === "light" || s.mode === "dark") return s.mode;
  if (s.mode === "auto") return siteDark ? "dark" : "light";
  return THEMES[s.theme].mode;
}

/** كل متغيّرات الألوان التي تستخدمها الصفحة، لثيم ووضع محدّدين. */
export function paletteVars(s: PageSettings, mode: "light" | "dark"): Record<string, string> {
  const t = THEMES[s.theme];
  const a = ACCENTS[s.accent === "theme" ? t.accent : s.accent];
  const { h, c } = t;
  const dark = mode === "dark";
  const accent = dark ? ok(Math.min(a.l + 0.14, 0.8), Math.max(a.c - 0.02, 0.01), a.h) : ok(a.l, a.c, a.h);
  const paper = dark ? ok(0.165, c * 0.9, h) : ok(0.972, c, h);
  const card = dark ? ok(0.205, c * 0.9, h) : ok(0.99, c * 0.5, h);
  const raised = dark ? ok(0.245, c, h) : ok(0.94, c * 1.2, h);
  const inkC = Math.min(c, 0.02);
  const ink = dark ? ok(0.95, inkC * 0.6, h) : ok(0.21, inkC, h);
  // الغلاف: عمق من نفس الصبغة، أو ورق فاتح بنص الحبر
  const deep = ok(dark ? 0.13 : 0.2, Math.min(c * 1.4, 0.04), h);
  const lightCover = ok(0.93, c * 1.3, h);
  const heroLight = s.hero_tone === "light";
  return {
    "--background": paper,
    "--foreground": ink,
    "--card": card,
    "--card-foreground": ink,
    "--popover": card,
    "--popover-foreground": ink,
    "--secondary": raised,
    "--secondary-foreground": ink,
    "--muted": raised,
    "--muted-foreground": dark ? ok(0.74, inkC * 0.6, h) : ok(0.46, inkC, h),
    "--border": dark ? ok(0.31, c * 0.8, h) : ok(0.87, c * 1.2, h),
    "--input": dark ? ok(0.34, c * 0.8, h) : ok(0.86, c * 1.2, h),
    "--gold": accent,
    "--gold-foreground": dark ? ok(0.16, 0.01, h) : ok(0.98, 0.005, h),
    "--accent": accent,
    "--accent-foreground": ink,
    "--ring": accent,
    "--primary": dark ? accent : ink,
    "--primary-foreground": dark ? ok(0.16, 0.01, h) : paper,
    "--charcoal": heroLight ? lightCover : deep,
    "--ivory": heroLight ? ok(0.21, inkC, h) : ok(0.97, c * 0.6, h),
    "--radius": RADII[s.radius].v,
  };
}

/** متغيّرات الخطوط — تقرؤها قواعد html[data-pfont] في styles.css. */
export function fontVars(s: PageSettings): Record<string, string> {
  const f = FONTS[s.font];
  return {
    "--pf-ar-display": `${f.arD}, "Amiri", serif`,
    "--pf-ar-display-w": String(f.arDw),
    "--pf-ar-body": `${f.arB}, "Cairo Variable", system-ui, sans-serif`,
    "--pf-en-display": `${f.enD}, "Cormorant Garamond Variable", serif`,
    "--pf-en-display-w": String(f.enDw),
    "--pf-en-body": `${f.enB}, "Jost Variable", system-ui, sans-serif`,
  };
}

/**
 * يطبّق الثيم على <html> (يشمل النوافذ المنبثقة والخلفية) ويُرجع دالة التراجع.
 * الوضع الثابت يضبط صنف dark ليتطابق مع اللوحة، ويعيده كما كان عند الخروج.
 */
export function applyPageTheme(s: PageSettings): () => void {
  const root = document.documentElement;
  const hadDark = root.classList.contains("dark");
  let applied: string[] = [];
  const paint = () => {
    const mode = resolveMode(s, root.classList.contains("dark"));
    if (s.mode !== "auto") root.classList.toggle("dark", mode === "dark");
    const vars = { ...paletteVars(s, mode), ...fontVars(s) };
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    applied = Object.keys(vars);
  };
  paint();
  root.dataset.pfont = s.font;
  // «حسب الزائرة»: نتبع زر الوضع الليلي في الموقع
  const mo = s.mode === "auto" ? new MutationObserver(paint) : null;
  mo?.observe(root, { attributes: true, attributeFilter: ["class"] });
  return () => {
    mo?.disconnect();
    for (const k of applied) root.style.removeProperty(k);
    delete root.dataset.pfont;
    root.classList.toggle("dark", hadDark);
  };
}

// ── اقتراح من صورة الغلاف ───────────────────────────────────────────────
/** يقرأ الصبغة الغالبة في صورة ويقترح ثيماً ولمسة قريبين منها. */
export async function suggestFromImage(url: string): Promise<{ theme: PageSettings["theme"]; accent: PageSettings["accent"] } | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = 48; cv.height = 48;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 48, 48);
    const px = ctx.getImageData(0, 0, 48, 48).data;
    // متوسط اتجاهي للصبغة مرجّح بالتشبّع، ومتوسط الإضاءة
    let x = 0, y = 0, light = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx - mn;
      light += (mx + mn) / 2; n++;
      if (sat < 0.08) continue;
      let hue = mx === r ? ((g - b) / sat) % 6 : mx === g ? (b - r) / sat + 2 : (r - g) / sat + 4;
      hue *= 60;
      x += Math.cos((hue * Math.PI) / 180) * sat;
      y += Math.sin((hue * Math.PI) / 180) * sat;
    }
    const avgLight = light / n;
    const strength = Math.hypot(x, y) / n;
    const hsl = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    // صبغة HSL → قريبة من صبغة OKLCH بإزاحة تقريبية
    const okH = (hsl + 25) % 360;
    const dist = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    const dark = avgLight < 0.38;
    if (strength < 0.02) return { theme: dark ? "ink" : "film", accent: dark ? "silver" : "graphite" };
    const themes = keysOf(THEMES).filter((k) => (THEMES[k].mode === "dark") === dark && THEMES[k].c > 0.008);
    const theme = themes.reduce((best, k) => (dist(THEMES[k].h, okH) < dist(THEMES[best].h, okH) ? k : best), themes[0]);
    const accents = keysOf(ACCENTS).filter((k) => ACCENTS[k].c > 0.03);
    const accent = accents.reduce((best, k) => (dist(ACCENTS[k].h, okH) < dist(ACCENTS[best].h, okH) ? k : best), accents[0]);
    return { theme, accent };
  } catch {
    return null;
  }
}
