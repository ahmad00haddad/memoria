import { createServerFn } from "@tanstack/react-start";

function isUuid(s: any) { return typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s); }
function isToken(s: any) { return typeof s === "string" && /^[0-9a-f]{16,64}$/i.test(s); }

// ============================================================================
// Image URL Optimization Helpers
// ============================================================================
export function optimizedImageUrl(
  url: string | null | undefined,
  opts: { width?: number; quality?: number; format?: "webp" | "auto" } = {}
): string | null {
  if (!url) return null;
  const { width = 800, quality = 85, format = "auto" } = opts;

  const cfZone = typeof process !== "undefined" ? process.env?.CLOUDFLARE_IMAGES_ZONE : null;
  if (cfZone && url.startsWith("https://")) {
    return `https://${cfZone}/cdn-cgi/image/width=${width},quality=${quality},format=${format}/${url}`;
  }

  if (url.includes("/storage/v1/object/public/")) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}width=${width}&quality=${quality}`;
  }

  return url;
}

export function responsiveSrcSet(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const sizes = [400, 800, 1200, 1600];
  return sizes
    .map((w) => `${optimizedImageUrl(url, { width: w }) || url} ${w}w`)
    .join(", ");
}

// ============================================================================
// getGalleryByToken — Client view via tracking token
// ─────────────────────────────────────────────────────────────────────────────
// منطق التسليم الثنائي الحالة (Dual-State Delivery):
//
//   1. المصورة ترفع نسختين عند التفعيل:
//        - originals/{uid}/{gallery_id}/{file_id}.jpg  → الأصلية النظيفة
//        - previews/{uid}/{gallery_id}/{file_id}.jpg   → المحمية بعلامة مائية
//
//   2. السيرفر يتحقق من حالة الدفع النهائي (final_paid_at) لكل حجز:
//        - إذا لم يُدفع → يُعيد روابط مؤقتة للمسار previews/ (بعلامة مائية)
//        - إذا دُفع     → يُعيد روابط مؤقتة للمسار originals/ (نظيفة وبجودة عالية)
//
//   3. إذا لم تُوجد نسخة originals/ (المصور لم يفعّل خيار الرفع الثنائي)،
//      يُعيد الرابط الموجود أياً كان — لا يكسر التجربة الحالية.
// ============================================================================

export const getGalleryByToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => {
    if (!isToken(d?.token)) throw new Error("invalid token");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // ── 1. تحقق من صحة رمز التتبع ──
    const { data: bk } = await supabaseAdmin
      .from("bookings")
      .select("id,client_name,photographer_id,final_paid_at,status")
      .eq("client_tracking_token", data.token)
      .maybeSingle();
    if (!bk) throw new Error("invalid token");

    // ── 2. تحقق من حالة الدفع النهائي ──
    const finalPaid =
      Boolean(bk.final_paid_at) ||
      bk.status === "completed";

    // ── 3. جلب المعرض ──
    const { data: g } = await supabaseAdmin
      .from("delivery_galleries")
      .select("*")
      .eq("booking_id", bk.id)
      .maybeSingle();
    if (!g) return { gallery: null, photos: [] as any[], final_paid: finalPaid };

    if (g.expires_at && new Date(g.expires_at).getTime() < Date.now()) {
      return { gallery: null, photos: [], expired: true, final_paid: finalPaid };
    }

    // ── 4. جلب الصور ──
    const { data: photos } = await supabaseAdmin
      .from("delivery_photos")
      .select("id,storage_path,caption,position")
      .eq("gallery_id", g.id)
      .order("position", { ascending: true });

    // ── 5. تحديد المسار الصحيح بناءً على حالة الدفع ──
    //   storage_path المخزن دائماً هو مسار العلامة المائية (previews/ أو المسار القديم)
    //   إذا دُفع، نحاول تبديله بالمسار الأصلي originals/ أولاً.
    const resolveStoragePath = (storagePath: string): string => {
      if (!finalPaid) return storagePath; // لم يُدفع → المحمية
      // حاول تحويل مسار previews → originals
      if (storagePath.includes("/previews/")) {
        return storagePath.replace("/previews/", "/originals/");
      }
      // المسارات القديمة (قبل نظام الثنائي) → أعد كما هي بعد الدفع
      return storagePath;
    };

    const signedUrlDuration = finalPaid
      ? 60 * 60 * 24 * 30  // 30 يوماً للنسخة الأصلية بعد الدفع
      : 60 * 60 * 24 * 7;  // 7 أيام للمعاينة المحمية

    const withUrls = await Promise.all((photos ?? []).map(async (p) => {
      const resolvedPath = resolveStoragePath(p.storage_path);

      // ── Fix #3: توليد signed URL للصورة الكاملة ──
      let signedUrl: string | null = null;
      const { data: s1 } = await supabaseAdmin.storage
        .from("delivery-photos")
        .createSignedUrl(resolvedPath, signedUrlDuration);
      signedUrl = s1?.signedUrl ?? null;

      if (!signedUrl && resolvedPath !== p.storage_path) {
        const { data: s2 } = await supabaseAdmin.storage
          .from("delivery-photos")
          .createSignedUrl(p.storage_path, signedUrlDuration);
        signedUrl = s2?.signedUrl ?? null;
      }

      // ── Fix #3: thumbnail_url مضغوط للعرض في شبكة الصور (Grid) ──
      // يحسّن الأداء بشكل كبير: الصور الكاملة (2-10 MB) تصبح 50-100 KB
      let thumbnailUrl: string | null = null;
      const thumbPath = resolvedPath !== p.storage_path && !signedUrl ? p.storage_path : resolvedPath;
      const { data: t1 } = await supabaseAdmin.storage
        .from("delivery-photos")
        .createSignedUrl(thumbPath, signedUrlDuration, {
          transform: {
            width: 600,
            height: 600,
            resize: "contain" as any,
            quality: 70,
          },
        });
      thumbnailUrl = t1?.signedUrl ?? null;

      // ── Fix #4: تقليل جودة صور المعاينة قبل الدفع (Security Layer) ──
      // حتى لو حصل العميل على الرابط الموقّع مباشرة،
      // سيحصل على نسخة بجودة منخفضة وليس الصورة الأصلية
      if (!finalPaid && signedUrl) {
        const { data: lowQ } = await supabaseAdmin.storage
          .from("delivery-photos")
          .createSignedUrl(resolvedPath !== p.storage_path && signedUrl ? p.storage_path : resolvedPath, signedUrlDuration, {
            transform: {
              width: 1200,
              quality: 55,
            },
          });
        if (lowQ?.signedUrl) signedUrl = lowQ.signedUrl;
      }

      return {
        id: p.id,
        caption: p.caption,
        position: p.position,
        url: signedUrl,
        thumbnail_url: thumbnailUrl ?? signedUrl, // fallback لل_url الكامل إن فشل التحويل
        is_original: finalPaid,
      };
    }));

    let coverUrl: string | null = null;
    if (g.cover_path) {
      const coverPath = finalPaid && g.cover_path.includes("/previews/")
        ? g.cover_path.replace("/previews/", "/originals/")
        : g.cover_path;
      const { data: c } = await supabaseAdmin.storage
        .from("delivery-photos")
        .createSignedUrl(coverPath, signedUrlDuration);
      if (c?.signedUrl) {
        coverUrl = c.signedUrl;
      } else if (coverPath !== g.cover_path) {
        const { data: c2 } = await supabaseAdmin.storage
          .from("delivery-photos")
          .createSignedUrl(g.cover_path, signedUrlDuration);
        coverUrl = c2?.signedUrl ?? null;
      }
    }

    return {
      gallery: {
        id: g.id,
        title: g.title,
        // السماح بالتنزيل فقط إذا دفع العميل كاملاً ومنحت المصورة الإذن
        allow_downloads: finalPaid && Boolean(g.allow_downloads),
        expires_at: g.expires_at,
        cover_url: coverUrl,
      },
      photos: withUrls,
      final_paid: finalPaid,
    };
  });

// ============================================================================
// getMessagesByToken — Client-side messages via tracking token
// ============================================================================
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
    const sinceIso = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bk.id)
      .is("sender_id", null)
      .gte("created_at", sinceIso);
    if ((count ?? 0) >= 10) {
      throw new Error("أرسلتِ رسائل كثيرة في وقت قصير، الرجاء الانتظار قليلاً.");
    }
    const { error } = await supabaseAdmin.from("messages").insert({
      booking_id: bk.id, sender_id: null, sender_name: bk.client_name || "العميل", body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================================
// Photographer-side gallery management
// ============================================================================
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

// ─────────────────────────────────────────────────────────────────────────────
// addGalleryPhoto — يُسجّل مسار الصورة بعد رفعها من المتصفح
// storage_path: يجب أن يكون مسار النسخة المحمية بالعلامة المائية (previews/)
//               ومسار النسخة الأصلية يُستنتج آلياً في getGalleryByToken.
// ─────────────────────────────────────────────────────────────────────────────
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
    // احذف كلا النسختين إن وُجدتا
    const previewPath = (ph as any).storage_path as string;
    const originalPath = previewPath.includes("/previews/")
      ? previewPath.replace("/previews/", "/originals/")
      : null;
    const pathsToDelete = [previewPath, ...(originalPath ? [originalPath] : [])];
    await context.supabase.storage.from("delivery-photos").remove(pathsToDelete);
    await context.supabase.from("delivery_photos").delete().eq("id", data.photo_id);
    return { ok: true };
  });

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
