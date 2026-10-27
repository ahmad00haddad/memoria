import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie, getRequest } from "@tanstack/react-start/server";
import en from "./en.json";

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

/** Translate Arabic source text; {0}, {1}… are filled from args. */
export function t(ar: string, args?: unknown[]): string {
  if (getLang() === "ar") return fill(ar, args);
  const key = norm(ar);
  const hit = dict[key];
  if (hit === undefined) return fill(ar, args);
  // keep the source's leading/trailing spaces (JSX text next to other nodes)
  const lead = ar.match(/^\s*/)![0] ? " " : "";
  const trail = ar.match(/\s*$/)![0] ? " " : "";
  // Arabic values passed in (a city, a status) get translated too when we know them
  return lead + fill(hit, args?.map(tx)) + trail;
}

/** Translate a value rendered from data defined elsewhere; non-strings pass through. */
export function tx<T>(v: T): T {
  return (typeof v === "string" && /[؀-ۿ]/.test(v) ? t(v) : v) as T;
}

/** Locale for dates/numbers: the Arabic one passed in, or English (Latin digits). */
export function locale(ar = "ar-JO") {
  return getLang() === "ar" ? ar : "en-GB";
}
