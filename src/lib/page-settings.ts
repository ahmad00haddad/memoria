import type React from "react";

// إعدادات الصفحة العامة للمصوّرة — قيم مقيّدة فقط (قوائم بيضاء وحدود طول).
// sanitizePageSettings تُستخدم عند الحفظ وعند العرض، فأي قيمة غريبة في القاعدة
// (حتى لو كُتبت مباشرة) ترجع للافتراضي ولا تكسر الصفحة.

export const THEMES = {
  classic: { label: "ذهبي كلاسيكي", gold: "oklch(0.67 0.085 72)", charcoal: "oklch(0.22 0.012 55)" },
  rose: { label: "وردي ناعم", gold: "oklch(0.66 0.09 15)", charcoal: "oklch(0.24 0.02 10)" },
  sage: { label: "أخضر زيتوني", gold: "oklch(0.62 0.06 140)", charcoal: "oklch(0.23 0.015 150)" },
  burgundy: { label: "عنّابي", gold: "oklch(0.58 0.11 20)", charcoal: "oklch(0.2 0.03 15)" },
  midnight: { label: "كحلي ليلي", gold: "oklch(0.7 0.07 80)", charcoal: "oklch(0.21 0.03 260)" },
  pearl: { label: "لؤلؤي", gold: "oklch(0.62 0.03 250)", charcoal: "oklch(0.26 0.01 250)" },
} as const;

export const FONTS = {
  classic: { label: "كلاسيكي", hint: "عناوين بخط مزخرف أنيق" },
  modern: { label: "عصري", hint: "عناوين بسيطة ونظيفة" },
  romantic: { label: "رومانسي", hint: "عناوين مائلة ناعمة" },
} as const;

export const LAYOUTS = {
  grid: { label: "مربعات متساوية" },
  wide: { label: "صور عريضة" },
  masonry: { label: "شبكة متداخلة" },
} as const;

export const GALLERY_COUNTS = [6, 9, 12] as const;
export const QUOTE_MAX = 80;
export const ANNOUNCE_MAX = 120;

export type PageSettings = {
  default_lang: "auto" | "ar" | "en";
  theme: keyof typeof THEMES;
  font: keyof typeof FONTS;
  gallery_layout: keyof typeof LAYOUTS;
  gallery_count: (typeof GALLERY_COUNTS)[number];
  section_order: "packages_first" | "gallery_first";
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
  theme: "classic",
  font: "classic",
  gallery_layout: "grid",
  gallery_count: 12,
  section_order: "packages_first",
  show_gallery: true,
  show_reviews: true,
  show_stats: true,
  show_trust_badges: true,
  show_booking_notes: true,
  show_whatsapp: true,
  hero_quote: "",
  announcement: "",
};

const oneOf = <T extends string>(v: unknown, keys: readonly T[], d: T): T => (keys.includes(v as T) ? (v as T) : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
// نص عادي فقط: بلا روابط ولا أكواد ولا أسطر متعددة
const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[<>{}\r\n\t]/g, " ").replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim().slice(0, max) : "";

export function sanitizePageSettings(raw: unknown): PageSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_PAGE_SETTINGS;
  const count = Number(r.gallery_count);
  return {
    default_lang: oneOf(r.default_lang, ["auto", "ar", "en"] as const, d.default_lang),
    theme: oneOf(r.theme, Object.keys(THEMES) as (keyof typeof THEMES)[], d.theme),
    font: oneOf(r.font, Object.keys(FONTS) as (keyof typeof FONTS)[], d.font),
    gallery_layout: oneOf(r.gallery_layout, Object.keys(LAYOUTS) as (keyof typeof LAYOUTS)[], d.gallery_layout),
    gallery_count: (GALLERY_COUNTS as readonly number[]).includes(count) ? (count as PageSettings["gallery_count"]) : d.gallery_count,
    section_order: oneOf(r.section_order, ["packages_first", "gallery_first"] as const, d.section_order),
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

/** متغيّرات CSS للثيم — تُطبّق على غلاف الصفحة العامة فقط. */
export function themeStyle(s: PageSettings): React.CSSProperties {
  const t = THEMES[s.theme];
  return { ["--gold" as string]: t.gold, ["--charcoal" as string]: t.charcoal } as React.CSSProperties;
}
