import { createServerFn } from "@tanstack/react-start";

function isUuid(s: any) { return typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s); }
function isToken(s: any) { return typeof s === "string" && /^[0-9a-f]{16,64}$/i.test(s); }

// Client view via tracking token — returns gallery metadata + signed photo URLs
export const getGalleryByToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => {
    if (!isToken(d?.token)) throw new Error("invalid token");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bk } = await supabaseAdmin
      .from("bookings")
      .select("id,client_name,photographer_id")
      .eq("client_tracking_token", data.token)
      .maybeSingle();
    if (!bk) throw new Error("invalid token");

    const { data: g } = await supabaseAdmin
      .from("delivery_galleries")
      .select("*")
      .eq("booking_id", bk.id)
      .maybeSingle();
    if (!g) return { gallery: null, photos: [] as any[] };
    if (g.expires_at && new Date(g.expires_at).getTime() < Date.now()) {
      return { gallery: null, photos: [], expired: true };
    }

    const { data: photos } = await supabaseAdmin
      .from("delivery_photos")
      .select("id,storage_path,caption,position")
      .eq("gallery_id", g.id)
      .order("position", { ascending: true });

    const withUrls = await Promise.all((photos ?? []).map(async (p) => {
      const { data: s } = await supabaseAdmin.storage.from("delivery-photos").createSignedUrl(p.storage_path, 60 * 60 * 24 * 7);
      return { id: p.id, caption: p.caption, position: p.position, url: s?.signedUrl ?? null };
    }));

    let coverUrl: string | null = null;
    if (g.cover_path) {
      const { data: c } = await supabaseAdmin.storage.from("delivery-photos").createSignedUrl(g.cover_path, 60 * 60 * 24 * 7);
      coverUrl = c?.signedUrl ?? null;
    }

    return {
      gallery: { id: g.id, title: g.title, allow_downloads: g.allow_downloads, expires_at: g.expires_at, cover_url: coverUrl },
      photos: withUrls,
    };
  });

// Client-side messages via tracking token (read + send) — works without auth
export const getMessagesByToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => {
    if (!isToken(d?.token)) throw new Error("invalid token");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bk } = await supabaseAdmin.from("bookings").select("id,photographer_id,client_name")
      .eq("client_tracking_token", data.token).maybeSingle();
    if (!bk) throw new Error("invalid token");
    const { data: msgs } = await supabaseAdmin.from("messages").select("id,sender_id,sender_name,body,created_at,read_at")
      .eq("booking_id", bk.id).order("created_at", { ascending: true }).limit(500);
    return { booking_id: bk.id, photographer_id: bk.photographer_id, messages: msgs ?? [] };
  });

export const sendMessageByToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; body: string }) => {
    if (!isToken(d?.token)) throw new Error("invalid token");
    if (!d?.body || typeof d.body !== "string") throw new Error("invalid body");
    const body = d.body.trim();
    if (body.length === 0 || body.length > 2000) throw new Error("invalid body length");
    return { token: d.token, body };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bk } = await supabaseAdmin.from("bookings").select("id,client_name").eq("client_tracking_token", data.token).maybeSingle();
    if (!bk) throw new Error("invalid token");
    // Rate limit: max 10 client messages per booking per 60s.
    const sinceIso = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bk.id)
      .is("sender_id", null)
      .gte("created_at", sinceIso);
    if ((count ?? 0) >= 10) {
      throw new Error("أرسلتِ رسائل كثيرة في وقت قصير، الرجاء الانتظار قليلًا.");
    }
    const { error } = await supabaseAdmin.from("messages").insert({
      booking_id: bk.id, sender_id: null, sender_name: bk.client_name || "العميل", body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Photographer-side: create or get gallery for a booking
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ensureGallery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string }) => {
    if (!isUuid(d?.booking_id)) throw new Error("invalid booking_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bk } = await supabase.from("bookings").select("id,photographer_id,client_name").eq("id", data.booking_id).maybeSingle();
    if (!bk || bk.photographer_id !== userId) throw new Error("forbidden");
    const { data: existing } = await supabase.from("delivery_galleries").select("*").eq("booking_id", data.booking_id).maybeSingle();
    if (existing) return existing;
    const { data: created, error } = await supabase.from("delivery_galleries").insert({
      booking_id: data.booking_id, photographer_id: userId, title: `صور ${bk.client_name}`,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return created;
  });

export const updateGallery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { gallery_id: string; title?: string; allow_downloads?: boolean; expires_at?: string | null }) => {
    if (!isUuid(d?.gallery_id)) throw new Error("invalid gallery_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    // Explicit ownership check — never trust RLS alone.
    const { data: g } = await context.supabase
      .from("delivery_galleries")
      .select("id, photographer_id")
      .eq("id", data.gallery_id)
      .maybeSingle();
    if (!g || g.photographer_id !== context.userId) throw new Error("forbidden");
    const patch: any = {};
    if (typeof data.title === "string") patch.title = data.title.slice(0, 200);
    if (typeof data.allow_downloads === "boolean") patch.allow_downloads = data.allow_downloads;
    if (data.expires_at !== undefined) patch.expires_at = data.expires_at;
    const { error } = await context.supabase.from("delivery_galleries").update(patch).eq("id", data.gallery_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { gallery_id: string; storage_path: string; caption?: string | null }) => {
    if (!isUuid(d?.gallery_id)) throw new Error("invalid gallery_id");
    if (!d?.storage_path || typeof d.storage_path !== "string" || d.storage_path.length > 500) throw new Error("invalid path");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: g } = await context.supabase.from("delivery_galleries").select("photographer_id").eq("id", data.gallery_id).maybeSingle();
    if (!g || g.photographer_id !== context.userId) throw new Error("forbidden");
    if (!data.storage_path.startsWith(`${context.userId}/`)) throw new Error("invalid path scope");
    const { data: maxPos } = await context.supabase.from("delivery_photos").select("position").eq("gallery_id", data.gallery_id).order("position", { ascending: false }).limit(1).maybeSingle();
    const position = (maxPos?.position ?? 0) + 1;
    const { error } = await context.supabase.from("delivery_photos").insert({
      gallery_id: data.gallery_id, storage_path: data.storage_path, caption: data.caption ?? null, position,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photo_id: string }) => {
    if (!isUuid(d?.photo_id)) throw new Error("invalid photo_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: ph } = await context.supabase.from("delivery_photos").select("storage_path,gallery_id,delivery_galleries!inner(photographer_id)").eq("id", data.photo_id).maybeSingle();
    if (!ph || (ph as any).delivery_galleries.photographer_id !== context.userId) throw new Error("forbidden");
    await context.supabase.storage.from("delivery-photos").remove([(ph as any).storage_path]);
    await context.supabase.from("delivery_photos").delete().eq("id", data.photo_id);
    return { ok: true };
  });

// Photographer-side: signed URLs to preview their gallery photos
export const getGalleryForPhotographer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string }) => {
    if (!isUuid(d?.booking_id)) throw new Error("invalid booking_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: g } = await context.supabase.from("delivery_galleries").select("*").eq("booking_id", data.booking_id).maybeSingle();
    if (!g) return { gallery: null, photos: [] as any[] };
    if (g.photographer_id !== context.userId) throw new Error("forbidden");
    const { data: photos } = await context.supabase.from("delivery_photos").select("id,storage_path,caption,position").eq("gallery_id", g.id).order("position");
    const withUrls = await Promise.all((photos ?? []).map(async (p) => {
      const { data: s } = await context.supabase.storage.from("delivery-photos").createSignedUrl(p.storage_path, 60 * 60);
      return { id: p.id, caption: p.caption, position: p.position, url: s?.signedUrl ?? null, storage_path: p.storage_path };
    }));
    return { gallery: g, photos: withUrls };
  });