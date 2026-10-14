import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getPublicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type SearchSort = "featured" | "rating" | "price_asc" | "price_desc";

type SearchInput = {
  q?: string;
  city?: string;
  min_price?: number | null;
  max_price?: number | null;
  available_date?: string | null; // YYYY-MM-DD
  sort?: SearchSort;
  limit?: number;
};

export type SearchResultItem = {
  username: string;
  display_name: string;
  city: string | null;
  bio: string | null;
  tagline: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  is_featured: boolean;
  verification_status: string | null;
  min_price: number | null;
  avg_rating: number;
  review_count: number;
  is_demo?: boolean;
};

function validate(d: SearchInput): SearchInput {
  const out: SearchInput = {};
  if (typeof d?.q === "string") out.q = d.q.slice(0, 80);
  if (typeof d?.city === "string" && d.city.trim()) out.city = d.city.slice(0, 80);
  if (typeof d?.min_price === "number" && d.min_price >= 0) out.min_price = d.min_price;
  if (typeof d?.max_price === "number" && d.max_price >= 0) out.max_price = d.max_price;
  if (typeof d?.available_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.available_date)) {
    out.available_date = d.available_date;
  }
  const allowed: SearchSort[] = ["featured", "rating", "price_asc", "price_desc"];
  out.sort = allowed.includes(d?.sort as any) ? (d!.sort as SearchSort) : "featured";
  out.limit = Math.min(Math.max(Number(d?.limit) || 48, 1), 96);
  return out;
}

export const searchPhotographers = createServerFn({ method: "POST" })
  .inputValidator((d: SearchInput) => validate(d ?? {}))
  .handler(async ({ data }) => {
    const supabase = getPublicClient() as any;
    // The RPC's min_price is MIN over *all* pricing rules, add-ons included, so a
    // 50 JOD extra showed as "starts from 50" on a 100 JOD photographer. The real
    // starting price (cheapest bookable package) is recomputed below, and price
    // filters/sorts are applied on it here instead of in the RPC.
    const priceFiltered = data.min_price != null || data.max_price != null;
    const priceSorted = data.sort === "price_asc" || data.sort === "price_desc";
    const limit = data.limit ?? 48;
    const { data: rows, error } = await supabase.rpc("search_photographers", {
      _query: data.q || null,
      _city: data.city || null,
      _min_price: null,
      _max_price: null,
      _available_date: data.available_date || null,
      _sort: priceSorted ? "featured" : data.sort || "featured",
      _limit: priceFiltered || priceSorted ? 200 : limit,
    } as any);

    if (error) throw new Error(error.message);

    const names = (rows ?? []).map((r: any) => r.username);
    const demo = new Set<string>();
    const startFrom = new Map<string, number>();
    if (names.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username, is_demo").in("username", names);
      const byId = new Map<string, string>();
      for (const f of (profs ?? []) as any[]) {
        byId.set(f.id, f.username);
        if (f.is_demo) demo.add(f.username);
      }
      if (byId.size) {
        const { data: rules } = await supabase
          .from("pricing_rules")
          .select("photographer_id, price, package")
          .in("photographer_id", [...byId.keys()])
          .neq("package", "addon")
          .gt("price", 0);
        for (const r of (rules ?? []) as any[]) {
          const u = byId.get(r.photographer_id);
          const v = Number(r.price);
          if (u && (!startFrom.has(u) || v < startFrom.get(u)!)) startFrom.set(u, v);
        }
      }
    }

    let out: SearchResultItem[] = (rows ?? []).map((r: any) => ({
      is_demo: demo.has(r.username),
      username: r.username,
      display_name: r.display_name,
      city: r.city,
      bio: r.bio,
      tagline: r.tagline,
      avatar_url: r.avatar_url,
      cover_url: r.cover_url,
      is_featured: !!r.is_featured,
      verification_status: r.verification_status ?? null,
      min_price: startFrom.get(r.username) ?? null,
      avg_rating: r.avg_rating != null ? Number(Number(r.avg_rating).toFixed(1)) : 0,
      review_count: r.review_count != null ? Number(r.review_count) : 0,
    }));

    if (data.min_price != null) out = out.filter((r) => r.min_price != null && r.min_price >= data.min_price!);
    if (data.max_price != null) out = out.filter((r) => r.min_price != null && r.min_price <= data.max_price!);
    if (priceSorted) {
      const dir = data.sort === "price_asc" ? 1 : -1;
      out.sort((a, b) => (a.min_price == null ? 1 : b.min_price == null ? -1 : (a.min_price - b.min_price) * dir));
    }
    return out.slice(0, limit);
  });

export const listPublishedCities = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("city")
      .eq("is_published", true)
      .not("city", "is", null);
    if (error) throw new Error(error.message);
    const set = new Set<string>();
    for (const r of data ?? []) {
      const c = ((r as any).city as string)?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  });