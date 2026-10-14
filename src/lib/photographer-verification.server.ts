import { verificationChecks, type VerificationCheck } from "@/lib/verification";

// Photographer (profile) verification — server side. Not to be confused with
// verification.server.ts, which confirms *booking requests*.

/** Verification checklist for each photographer id, read with the service client. */
export async function computeVerificationChecks(supabaseAdmin: any, ids: string[]): Promise<Map<string, VerificationCheck[]>> {
  const out = new Map<string, VerificationCheck[]>();
  if (!ids.length) return out;
  const [profilesRes, pricingRes, privateRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, avatar_url, cover_url, bio, instagram, portfolio_urls").in("id", ids),
    supabaseAdmin.from("pricing_rules").select("photographer_id, package").in("photographer_id", ids),
    supabaseAdmin.from("photographer_private").select("user_id, phone, whatsapp").in("user_id", ids),
  ]);
  const packages = new Map<string, number>();
  for (const r of pricingRes.data ?? []) {
    if (r.package === "addon") continue;
    packages.set(r.photographer_id, (packages.get(r.photographer_id) ?? 0) + 1);
  }
  const phones = new Set<string>(
    (privateRes.data ?? []).filter((r: any) => (r.phone ?? "").trim() || (r.whatsapp ?? "").trim()).map((r: any) => r.user_id),
  );
  for (const p of profilesRes.data ?? []) {
    out.set(
      p.id,
      verificationChecks({
        avatar_url: p.avatar_url,
        cover_url: p.cover_url,
        bio: p.bio,
        instagram: p.instagram,
        portfolio_count: (p.portfolio_urls ?? []).length,
        package_count: packages.get(p.id) ?? 0,
        has_phone: phones.has(p.id),
      }),
    );
  }
  return out;
}

/** In-app notification to every admin (verification requests land here). */
export async function notifyAdmins(supabaseAdmin: any, n: { title: string; body: string; link: string }) {
  const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
  if (!admins?.length) return;
  await supabaseAdmin.from("notifications").insert(admins.map((a: any) => ({ user_id: a.user_id, type: "system", ...n })));
}
