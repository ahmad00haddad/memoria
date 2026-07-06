import { createServerFn } from "@tanstack/react-start";

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, city, bio, tagline, avatar_url, cover_url, is_featured, verification_status")
      .eq("is_published", true)
      .limit(200);

    if (data.city) q = q.ilike("city", `%${data.city}%`);
    if (data.q) {
      const term = data.q.replace(/[,()]/g, " ").trim();
      if (term) {
        q = q.or(
          `username.ilike.%${term}%,display_name.ilike.%${term}%,city.ilike.%${term}%,tagline.ilike.%${term}%`,
        );
      }
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r: any) => r.id);
    if (ids.length === 0) return [] as SearchResultItem[];

    // Filter by subscription active in the same query path (RLS already enforces, but
    // we're on admin client). Use the helper RPC for correctness.
    const [{ data: subs }, { data: prices }, { data: reviews }, { data: busy }] = await Promise.all([
      supabaseAdmin
        .from("subscriptions")
        .select("photographer_id, status, trial_ends_at, current_period_end")
        .in("photographer_id", ids),
      supabaseAdmin
        .from("pricing_rules")
        .select("photographer_id, price, package")
        .in("photographer_id", ids),
      supabaseAdmin
        .from("reviews")
        .select("photographer_id, rating")
        .in("photographer_id", ids)
        .eq("is_published", true),
      data.available_date
        ? supabaseAdmin
            .from("photographer_unavailability")
            .select("photographer_id")
            .in("photographer_id", ids)
            .eq("date", data.available_date)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const now = Date.now();
    const activeIds = new Set(
      (subs ?? [])
        .filter((s: any) => {
          if (s.status === "trial") return s.trial_ends_at && new Date(s.trial_ends_at).getTime() > now;
          if (s.status === "active")
            return !s.current_period_end || new Date(s.current_period_end).getTime() > now;
          return false;
        })
        .map((s: any) => s.photographer_id),
    );

    const busyIds = new Set((busy ?? []).map((x: any) => x.photographer_id));

    const priceMap = new Map<string, number>();
    for (const r of prices ?? []) {
      if ((r as any).package === "addon") continue;
      const cur = priceMap.get((r as any).photographer_id);
      const p = Number((r as any).price);
      if (cur == null || p < cur) priceMap.set((r as any).photographer_id, p);
    }

    const ratingMap = new Map<string, { sum: number; count: number }>();
    for (const r of reviews ?? []) {
      const pid = (r as any).photographer_id;
      const v = ratingMap.get(pid) ?? { sum: 0, count: 0 };
      v.sum += Number((r as any).rating);
      v.count += 1;
      ratingMap.set(pid, v);
    }

    let items: SearchResultItem[] = (rows ?? [])
      .filter((r: any) => activeIds.has(r.id))
      .filter((r: any) => !busyIds.has(r.id))
      .map((r: any) => {
        const rv = ratingMap.get(r.id) ?? { sum: 0, count: 0 };
        return {
          username: r.username,
          display_name: r.display_name,
          city: r.city,
          bio: r.bio,
          tagline: r.tagline,
          avatar_url: r.avatar_url,
          cover_url: r.cover_url,
          is_featured: !!r.is_featured,
          verification_status: r.verification_status ?? null,
          min_price: priceMap.get(r.id) ?? null,
          avg_rating: rv.count > 0 ? Number((rv.sum / rv.count).toFixed(1)) : 0,
          review_count: rv.count,
        };
      });

    if (data.min_price != null)
      items = items.filter((x) => x.min_price != null && x.min_price >= (data.min_price as number));
    if (data.max_price != null)
      items = items.filter((x) => x.min_price != null && x.min_price <= (data.max_price as number));

    switch (data.sort) {
      case "rating":
        items.sort((a, b) => b.avg_rating - a.avg_rating || b.review_count - a.review_count);
        break;
      case "price_asc":
        items.sort((a, b) => (a.min_price ?? Infinity) - (b.min_price ?? Infinity));
        break;
      case "price_desc":
        items.sort((a, b) => (b.min_price ?? -Infinity) - (a.min_price ?? -Infinity));
        break;
      case "featured":
      default:
        items.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || b.avg_rating - a.avg_rating);
    }

    return items.slice(0, data.limit ?? 48);
  });

export const listPublishedCities = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
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