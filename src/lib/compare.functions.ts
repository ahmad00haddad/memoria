import { createServerFn } from "@tanstack/react-start";
import { t } from "@/i18n";

// Everything the side-by-side comparison needs, for up to 3 published
// photographers. Public data only (no contact details).

export type CompareDetails = {
  username: string;
  display_name: string;
  city: string | null;
  avatar_url: string | null;
  verified: boolean;
  is_demo: boolean;
  member_since: string | null;
  packages: { label: string; price: number; service: string }[];
  min_price: number | null;
  max_price: number | null;
  services: string[]; // "photo" | "video"
  deposit_label: string; // what's due to book, as shown on the profile
  deposit_on_min: number | null; // JOD due on the cheapest package
  free_km: number | null;
  travel_fee_per_km: number | null;
  portfolio_count: number;
  avg_rating: number | null;
  review_count: number;
  completed_count: number;
};

export const getCompareDetails = createServerFn({ method: "GET" })
  .inputValidator((d: { usernames: string[] }) => {
    const u = (d?.usernames ?? []).filter((x) => typeof x === "string" && /^[a-z0-9_.-]{2,40}$/i.test(x)).slice(0, 3);
    return { usernames: u };
  })
  .handler(async ({ data }): Promise<CompareDetails[]> => {
    if (!data.usernames.length) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, city, avatar_url, verification_status, is_demo, created_at, deposit_percent, fixed_deposit, free_km, travel_fee_per_km, portfolio_urls")
      .in("username", data.usernames)
      .eq("is_published", true)
      .is("deleted_at", null);
    const ps = (profiles ?? []) as any[];
    if (!ps.length) return [];
    const ids = ps.map((p) => p.id);
    const [pricing, reviews, completed] = await Promise.all([
      supabaseAdmin.from("pricing_rules").select("photographer_id, label, price, service, package").in("photographer_id", ids),
      supabaseAdmin.from("reviews").select("photographer_id, rating").in("photographer_id", ids).eq("is_published", true),
      supabaseAdmin.from("bookings").select("photographer_id").in("photographer_id", ids).eq("status", "completed").is("deleted_at", null),
    ]);

    const out = ps.map((p): CompareDetails => {
      const pk = ((pricing.data ?? []) as any[])
        .filter((r) => r.photographer_id === p.id && r.package !== "addon" && Number(r.price) > 0)
        .map((r) => ({ label: r.label, price: Number(r.price), service: r.service }))
        .sort((a, b) => a.price - b.price);
      const rv = ((reviews.data ?? []) as any[]).filter((r) => r.photographer_id === p.id);
      const min = pk.length ? pk[0].price : null;
      const fixed = p.fixed_deposit ? Number(p.fixed_deposit) : null;
      const pct = Number(p.deposit_percent ?? 25);
      return {
        username: p.username,
        display_name: p.display_name,
        city: p.city,
        avatar_url: p.avatar_url,
        verified: p.verification_status === "verified",
        is_demo: !!p.is_demo,
        member_since: p.created_at,
        packages: pk,
        min_price: min,
        max_price: pk.length ? pk[pk.length - 1].price : null,
        services: [...new Set(pk.map((x) => (x.service === "cinematic_video" ? "video" : "photo")))],
        deposit_label: fixed ? t("{0} د.أ ثابت", [fixed]) : t("{0}٪ من السعر", [pct]),
        deposit_on_min: min == null ? fixed : fixed ?? Math.round((min * pct) / 100),
        free_km: p.free_km != null ? Number(p.free_km) : null,
        travel_fee_per_km: p.travel_fee_per_km != null ? Number(p.travel_fee_per_km) : null,
        portfolio_count: (p.portfolio_urls ?? []).length,
        avg_rating: rv.length ? rv.reduce((s, r) => s + Number(r.rating), 0) / rv.length : null,
        review_count: rv.length,
        completed_count: ((completed.data ?? []) as any[]).filter((b) => b.photographer_id === p.id).length,
      };
    });
    // keep the order the bride picked them in
    return data.usernames.map((u) => out.find((o) => o.username === u)).filter(Boolean) as CompareDetails[];
  });
