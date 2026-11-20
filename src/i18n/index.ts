import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie, getRequest } from "@tanstack/react-start/server";
import en from "./en.json";
import { secondToMale, thirdToMale, thirdToMaleEn } from "@/lib/gender-text";

/**
 * Site language (Arabic source, English translation).
 *
 * Arabic text in the code is the key: t("نص") returns the English entry from
 * en.json when the page is in English, else the Arabic as written. A missing
 * entry falls back to Arabic, so nothing ever renders empty.
 *
 * The language comes from ?lang= or the memoria_lang cookie, so the server
 * renders the right lang/dir with no flash. Switching sets the cookie and
 * reloads (see setLang) — no component has to re-render on a language change.
 * Later: a photographer's public page may default to her chosen language.
 */
export type Lang = "ar" | "en";
export const LANG_COOKIE = "memoria_lang";

const dict = en as Record<string, string>;

function parse(v: string | null | undefined): Lang | null {
  return v === "en" || v === "ar" ? v : null;
}

export const getLang = createIsomorphicFn()
  .server((): Lang => {
    try {
      return (
        parse(new URL(getRequest().url).searchParams.get("lang")) ??
        parse(getCookie(LANG_COOKIE)) ??
        "ar"
      );
    } catch {
      return "ar";
    }
  })
  .client((): Lang => (document.documentElement.lang === "en" ? "en" : "ar"));

export function dirOf(lang: Lang) {
  return lang === "ar" ? "rtl" : "ltr";
}

export function setLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  const url = new URL(window.location.href);
  url.searchParams.delete("lang");
  window.location.replace(url.toString());
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function fill(s: string, args?: unknown[]) {
  if (!args?.length) return s;
  return s.replace(/\{(\d+)\}/g, (m, i) => (i < args.length ? String(args[i] ?? "") : m));
}

// مَن تخاطبه الواجهة الآن: لوحة المصوّر/ة تضبطها من جنس الحساب (المتصفح فقط؛ الخادم يبقى مؤنّثاً).
// النصوص مكتوبة بالمؤنّث، وعند «male» تُحوَّل تلقائياً بقاموس gender-text — لا حاجة لـ g() لكل نص.
let addressee: "female" | "male" = "female";
export function setAddresseeGender(g: string | null | undefined) {
  if (typeof window === "undefined") return;
  addressee = g === "male" ? "male" : "female";
}
// مَن تتحدث عنه الواجهة بضمير الغائب في صفحات العروس: المصوّر/ة صاحب/ة الصفحة.
let subject: "female" | "male" = "female";
export function setSubjectGender(g: string | null | undefined) {
  if (typeof window === "undefined") return;
  subject = g === "male" ? "male" : "female";
}
// رسائل جاهزة تُرسل للعروس من لوحة المصوّر (واتساب) تبقى بمخاطبة المؤنّث
const toBride = (ar: string) => ar.startsWith("مرحباً {0}");

/** Translate Arabic source text; {0}, {1}… are filled from args. */
export function t(ar: string, args?: unknown[]): string {
  if (getLang() === "ar") {
    let src = addressee === "male" && !toBride(ar) ? secondToMale(ar) : ar;
    if (subject === "male") src = thirdToMale(src);
    return fill(src, args);
  }
  const key = norm(ar);
  const hit = dict[key];
  if (hit === undefined) return fill(ar, args);
  // keep the source's leading/trailing spaces (JSX text next to other nodes)
  const lead = ar.match(/^\s*/)![0] ? " " : "";
  const trail = ar.match(/\s*$/)![0] ? " " : "";
  // Arabic values passed in (a city, a status) get translated too when we know them
  return lead + fill(subject === "male" ? thirdToMaleEn(hit) : hit, args?.map(tx)) + trail;
}

/** Translate a value rendered from data defined elsewhere; non-strings pass through. */
export function tx<T>(v: T): T {
  return (typeof v === "string" && /[؀-ۿ]/.test(v) ? t(v) : v) as T;
}

/** Locale for dates/numbers: the Arabic one passed in, or English (Latin digits). */
export function locale(ar = "ar-JO") {
  return getLang() === "ar" ? ar : "en-GB";
}
