import { createServerFn } from "@tanstack/react-start";

type BookingItemInput = { rule_id: string; qty: number };

type SubmitInput = {
  photographer_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_address?: string | null;
  items: BookingItemInput[];
  client_notes?: string | null;
  privacy_level: "public" | "private_only";
};

function validateInput(d: SubmitInput): SubmitInput {
  const isUuid = (s: any) => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
  const isDate = (s: any) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const isTime = (s: any) => typeof s === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(s);
  if (!d || typeof d !== "object") throw new Error("invalid payload");
  if (!isUuid(d.photographer_id)) throw new Error("invalid photographer_id");
  if (!d.client_name || d.client_name.length > 120) throw new Error("invalid client_name");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.client_email ?? "")) throw new Error("invalid email");
  if (!d.client_phone || d.client_phone.length > 30) throw new Error("invalid phone");
  if (!isDate(d.event_date)) throw new Error("invalid event_date");
  if (!isTime(d.start_time) || !isTime(d.end_time)) throw new Error("invalid time");
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
  if (toMin(d.end_time) <= toMin(d.start_time)) throw new Error("وقت الانتهاء يجب أن يكون بعد وقت البداية");
  // التاريخ يجب أن يكون اليوم أو في المستقبل
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const ev = new Date(d.event_date + "T00:00:00");
  if (ev.getTime() < today.getTime()) throw new Error("لا يمكن اختيار تاريخ في الماضي");
  if (!Array.isArray(d.items) || d.items.length === 0 || d.items.length > 30) throw new Error("invalid items");
  for (const it of d.items) {
    if (!isUuid(it.rule_id)) throw new Error("invalid item rule_id");
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 50) throw new Error("invalid item qty");
  }
  if (d.privacy_level !== "public" && d.privacy_level !== "private_only") throw new Error("invalid privacy_level");
  if (d.venue_address && d.venue_address.length > 500) throw new Error("invalid venue");
  if (d.client_notes && d.client_notes.length > 4000) throw new Error("invalid notes");
  return d;
}

export const submitBookingRequest = createServerFn({ method: "POST" })
  .inputValidator((d: SubmitInput) => validateInput(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Server-side authoritative price recompute.
    const ruleIds = data.items.map((i) => i.rule_id);
    const { data: rules, error: rulesErr } = await supabaseAdmin
      .from("pricing_rules")
      .select("id, photographer_id, label, price, service, package")
      .in("id", ruleIds);
    if (rulesErr) throw new Error(rulesErr.message);
    const ruleMap = new Map((rules ?? []).map((r: any) => [r.id, r]));
    for (const it of data.items) {
      const r = ruleMap.get(it.rule_id);
      if (!r || r.photographer_id !== data.photographer_id) {
        throw new Error("باقة غير صالحة");
      }
    }

    const mainItem = data.items.find((i) => (ruleMap.get(i.rule_id) as any)!.package !== "addon");
    if (!mainItem) throw new Error("يجب اختيار باقة أساسية");
    const mainRule: any = ruleMap.get(mainItem.rule_id);

    const items = data.items.map((it) => {
      const r: any = ruleMap.get(it.rule_id);
      return {
        rule_id: r.id,
        label: r.label,
        price: Number(r.price),
        qty: it.qty,
        kind: r.package === "addon" ? ("addon" as const) : ("main" as const),
      };
    });

    const basePrice = Number(mainRule.price) * (mainItem.qty || 1);
    const total = items.reduce((s, x) => s + x.price * x.qty, 0);

    // Photographer's deposit configuration
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, username, fixed_deposit, deposit_percent")
      .eq("id", data.photographer_id)
      .single();
    if (profErr || !profile) throw new Error("المصوّرة غير موجودة");

    const deposit = total > 0
      ? (profile.fixed_deposit != null
          ? Number(profile.fixed_deposit)
          : Math.round(total * (Number(profile.deposit_percent ?? 25) / 100)))
      : 0;

    const summaryLabel = `${mainRule.label}${items.length > 1 ? ` +${items.length - 1} إضافات` : ""}`;

    // Atomic, conflict-guarded, idempotent booking creation (see migration
    // 20260621120000_phase0_booking_integrity.sql). Re-checks availability on
    // the server inside an advisory lock to prevent double-booking races, and
    // de-duplicates identical submissions within a 2-minute window.
    const { data: created, error } = await supabaseAdmin.rpc("create_booking_guarded", {
      _payload: {
        photographer_id: data.photographer_id,
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        service: mainRule.service,
        event_date: data.event_date,
        start_time: data.start_time,
        end_time: data.end_time,
        venue_address: data.venue_address ?? null,
        base_price: basePrice,
        total_price: total,
        deposit_amount: deposit,
        privacy_level: data.privacy_level,
        photographer_can_publish: data.privacy_level === "public",
        client_notes: data.client_notes ?? null,
        addons: items,
      },
    } as any);

    if (error) {
      const msg = error.message || "";
      if (msg.includes("SLOT_CONFLICT")) throw new Error("هذا الوقت محجوز، يرجى اختيار وقت آخر");
      if (msg.includes("DAY_UNAVAILABLE")) throw new Error("هذا اليوم غير متاح، يرجى اختيار يوم آخر");
      throw new Error(msg);
    }

    const result = created as any;
    const row = {
      id: result.booking_id as string,
      client_tracking_token: result.tracking_token as string,
    };
    // When the request was de-duplicated we must NOT re-send notifications/emails.
    const deduped = result.deduped === true;
    if (deduped) {
      return {
        booking_id: row.id,
        tracking_token: row.client_tracking_token,
      };
    }

    const { data: priv } = await supabaseAdmin
      .from("photographer_private")
      .select("whatsapp, phone")
      .eq("user_id", data.photographer_id)
      .maybeSingle();

    // In-app notification for the photographer
    await supabaseAdmin.from("notifications").insert({
      user_id: data.photographer_id,
      title: "طلب حجز جديد",
      body: `${data.client_name} يرغب بحجز ${summaryLabel} بتاريخ ${data.event_date}`,
      link: `/dashboard/bookings/${row.id}`,
    });

    console.log("[booking] new request", {
      photographer: profile.username,
      whatsapp: priv?.whatsapp,
      booking_id: row.id,
      client: data.client_name,
    });

    // إشعار واتساب فوري للعروس (محرك الإشعارات الذكي) — fire-and-forget
    if (priv?.whatsapp || data.client_phone) {
      try {
        const { sendWhatsAppNotification } = await import("@/lib/whatsapp.server");
        const base = process.env.PUBLIC_APP_URL || "https://memoria-jo.lovable.app";
        const trackingUrl = row.client_tracking_token
          ? `${base}/track/${row.client_tracking_token}`
          : undefined;
        await sendWhatsAppNotification(
          data.photographer_id,
          data.client_phone,
          "welcome",
          {
            client_name: data.client_name,
            photographer_name: profile.display_name || profile.username || "المصورة",
            event_date: data.event_date,
            deposit_amount: deposit > 0 ? String(deposit) : undefined,
            total_price: total > 0 ? String(total) : undefined,
            service: mainRule.label,
            tracking_url: trackingUrl,
            venue: data.venue_address ?? undefined,
          },
        );
      } catch (e) {
        console.error("[booking] welcome WhatsApp failed", e);
      }
    }

    // Fire-and-forget emails — never block the booking on email failures.
    try {
      const { sendEmail, tplNewBookingForPhotographer, tplBookingReceivedForClient } =
        await import("@/lib/email.server");
      const { data: pUser } = await supabaseAdmin.auth.admin.getUserById(data.photographer_id);
      const photographerEmail = pUser?.user?.email;
      if (photographerEmail) {
        const t1 = tplNewBookingForPhotographer({
          photographer_name: profile.display_name || profile.username || "المصوّرة",
          client_name: data.client_name,
          service_label: summaryLabel,
          event_date: data.event_date,
          start_time: data.start_time,
          total,
          booking_id: row.id as string,
        });
        await sendEmail({
          to: photographerEmail, subject: t1.subject, html: t1.html,
          template: "new_booking_photographer",
          related_booking_id: row.id as string,
          related_user_id: data.photographer_id,
        });
      }
      const t2 = tplBookingReceivedForClient({
        client_name: data.client_name,
        photographer_name: profile.display_name || profile.username || "المصوّرة",
        event_date: data.event_date,
        total,
        deposit,
        track_token: row.client_tracking_token as string,
      });
      await sendEmail({
        to: data.client_email, subject: t2.subject, html: t2.html,
        template: "booking_received_client",
        related_booking_id: row.id as string,
      });
    } catch (e) {
      console.error("[booking] email send failed", e);
    }

    return {
      booking_id: row.id as string,
      tracking_token: row.client_tracking_token as string,
    };
  });

export const getBookingByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => {
    if (!d || typeof d.token !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(d.token)) throw new Error("invalid token");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("get_booking_by_token", { _token: data.token });
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const clientMarkDepositSent = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; proof_path?: string | null; reference?: string | null; note?: string | null }) => {
    if (!d || typeof d.token !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(d.token)) throw new Error("invalid token");
    if (d.proof_path && (typeof d.proof_path !== "string" || d.proof_path.length > 500)) throw new Error("invalid proof_path");
    if (d.reference && (typeof d.reference !== "string" || d.reference.length > 200)) throw new Error("invalid reference");
    if (d.note && (typeof d.note !== "string" || d.note.length > 2000)) throw new Error("invalid note");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("client_mark_deposit_sent", {
      _token: data.token,
      _proof_path: (data.proof_path ?? null) as any,
      _reference: (data.reference ?? null) as any,
      _note: (data.note ?? null) as any,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clientMarkReceived = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => {
    // ✅ تحقق من صيغة الـ token (إصلاح: كان يمرر أي مدخل بدون تحقق)
    if (!d || typeof d.token !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(d.token)) {
      throw new Error("invalid token");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("client_mark_received", { _token: data.token });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clientAddNote = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; note: string }) => {
    if (!d || typeof d.token !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(d.token)) {
      throw new Error("invalid token");
    }
    if (!d.note || typeof d.note !== "string" || d.note.trim().length === 0) throw new Error("الملاحظة مطلوبة");
    if (d.note.length > 4000) throw new Error("الملاحظة طويلة جداً (4000 حرف كحد أقصى)");
    return { token: d.token, note: d.note.trim() };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("client_add_note", { _token: data.token, _note: data.note });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitReviewByToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; rating: number; comment?: string | null; client_name?: string | null }) => {
    if (!d || typeof d.token !== "string" || d.token.length < 16) throw new Error("invalid token");
    if (!Number.isInteger(d.rating) || d.rating < 1 || d.rating > 5) throw new Error("invalid rating");
    if (d.comment && d.comment.length > 2000) throw new Error("comment too long");
    if (d.client_name && d.client_name.length > 120) throw new Error("name too long");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, photographer_id, status, client_name, client_received_at")
      .eq("client_tracking_token", data.token)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!booking) throw new Error("الحجز غير موجود");
    if (booking.status !== ("completed" as any)) {
      throw new Error("لا يمكن التقييم قبل اكتمال الحجز");
    }

    const { error } = await supabaseAdmin
      .from("reviews")
      .insert({
        booking_id: booking.id,
        photographer_id: booking.photographer_id,
        client_name: (data.client_name || booking.client_name || "عميلة").slice(0, 120),
        rating: data.rating,
        comment: data.comment ?? null,
        // مراجعة قبل النشر: التقييمات الجديدة تبدأ غير منشورة حتى يعتمدها الأدمن.
        is_published: false,
      } as any);
    if (error) {
      if ((error as any).code === "23505" || /duplicate|unique/i.test(error.message)) {
        throw new Error("تم تسجيل تقييم لهذا الحجز سابقًا");
      }
      throw new Error(error.message);
    }
    return { ok: true, pending_moderation: true };
  });

// Public: deposit info shown on the photographer's public profile to clients (anon).
// Returns only the fields safe to display (CliQ alias + bank info text).
export const getPublicDepositInfo = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string }) => {
    if (!d || typeof d.username !== "string" || d.username.length === 0 || d.username.length > 64) {
      throw new Error("invalid username");
    }
    return { username: d.username.trim().toLowerCase() };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", data.username)
      .eq("is_published", true)
      .maybeSingle();
    if (!prof) return { cliq_alias: null, bank_info: null };
    const { data: priv } = await supabaseAdmin
      .from("photographer_private")
      .select("cliq_alias, bank_info")
      .eq("user_id", prof.id)
      .maybeSingle();
    return { cliq_alias: priv?.cliq_alias ?? null, bank_info: priv?.bank_info ?? null };
  });

// Records a referral after a new photographer signs up.
// يتطلّب جلسة مسجّلة — يُؤخذ معرّف المستخدم من التوكن (لا يُمرَّر من العميل) لمنع الانتحال.
import { requireSupabaseAuth as _ra } from "@/integrations/supabase/auth-middleware";
export const recordReferralAfterSignup = createServerFn({ method: "POST" })
  .middleware([_ra])
  .inputValidator((d: { referral_code: string }) => {
    if (!d || typeof d.referral_code !== "string" || d.referral_code.length === 0 || d.referral_code.length > 64) {
      throw new Error("invalid referral_code");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const newUserId = (context as any).userId as string;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: referrer } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("referral_code", data.referral_code)
      .maybeSingle();
    if (!referrer) return { ok: false, reason: "referrer not found" };
    if (referrer.id === newUserId) return { ok: false, reason: "self-referral" };
    await supabaseAdmin
      .from("referrals")
      .insert({ referrer_id: referrer.id, referred_id: newUserId });
    await supabaseAdmin
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", newUserId);
    return { ok: true };
  });

// Photographer-side: confirm a booking only if deposit has been paid (server enforced).
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const confirmBookingAfterDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string }) => {
    if (!d || typeof d.booking_id !== "string" || !/^[0-9a-f-]{36}$/i.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bk, error } = await supabase
      .from("bookings")
      .select("id, photographer_id, deposit_sent_at, deposit_confirmed_at, deposit_proof_url, status, client_user_id, client_phone, client_tracking_token, client_name, event_date, total_price")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!bk) throw new Error("الحجز غير موجود");
    if (bk.photographer_id !== userId) throw new Error("forbidden");
    if (!bk.deposit_sent_at && !bk.deposit_proof_url) {
      throw new Error("لا يمكن تأكيد الحجز قبل وصول إثبات العربون من العميل");
    }
    const patch: any = { status: "confirmed", updated_at: new Date().toISOString() };
    if (!bk.deposit_confirmed_at) patch.deposit_confirmed_at = new Date().toISOString();
    const { error: uerr } = await supabase.from("bookings").update(patch).eq("id", data.booking_id);
    if (uerr) throw new Error(uerr.message);
    // سجلّ تدقيق (عبر service-role لتجاوز RLS على audit_logs).
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("audit_logs").insert({
        action: "booking.confirm_deposit",
        actor_id: userId,
        entity_type: "booking",
        entity_id: data.booking_id,
        after_data: { status: "confirmed" } as any,
      });
    } catch (e) { console.error("[booking] audit log failed", e); }

    // توليد العقد تلقائياً من قالب المصوّرة عند تأكيد الحجز (إن وُجد قالب).
    try {
      const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
      await (adminClient as any).rpc("auto_generate_contract", { _booking_id: data.booking_id });
    } catch (e) {
      // العقد اختياري — لا نُفشل التأكيد إذا لم يوجد قالب.
      console.error("[booking] auto_generate_contract failed:", e);
    }
    // إشعار واتساب تأكيد الحجز — fire-and-forget
    if (bk.client_phone) {
      try {
        const { sendWhatsAppNotification } = await import("@/lib/whatsapp.server");
        const base = process.env.PUBLIC_APP_URL || "https://memoria-jo.lovable.app";
        const trackingUrl = bk.client_tracking_token
          ? `${base}/track/${bk.client_tracking_token}`
          : undefined;
        await sendWhatsAppNotification(
          bk.photographer_id,
          bk.client_phone,
          "confirmed",
          {
            client_name: bk.client_name || "عميلتنا",
            photographer_name: "المصورة",
            event_date: String(bk.event_date ?? ""),
            total_price: bk.total_price != null ? String(bk.total_price) : undefined,
            tracking_url: trackingUrl,
          },
        );
      } catch (e) {
        console.error("[booking] confirmed WhatsApp failed", e);
      }
    }

    // Notify the client (if they have an account linked)
    if (bk.client_user_id) {
      await supabase.from("notifications").insert({
        user_id: bk.client_user_id,
        title: "تأكيد الحجز",
        body: "تم تأكيد حجزك بعد استلام العربون.",
        link: `/dashboard/bookings/${bk.id}`,
      });
    }
    // Send confirmation email to client (fire-and-forget).
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { sendEmail, tplDepositConfirmed } = await import("@/lib/email.server");
      const { data: full } = await supabaseAdmin.from("bookings")
        .select("client_email, client_name, event_date, client_tracking_token")
        .eq("id", data.booking_id).maybeSingle();
      const { data: prof } = await supabaseAdmin.from("profiles")
        .select("display_name").eq("id", bk.photographer_id).maybeSingle();
      if (full?.client_email) {
        const t = tplDepositConfirmed({
          client_name: full.client_name || "عميلتنا",
          photographer_name: prof?.display_name || "المصوّرة",
          event_date: String(full.event_date),
          track_token: full.client_tracking_token!,
        });
        await sendEmail({
          to: full.client_email, subject: t.subject, html: t.html,
          template: "deposit_confirmed", related_booking_id: data.booking_id,
        });
      }
    } catch (e) { console.error("[booking] deposit confirm email failed", e); }
    return { ok: true };
  });

// Photographer-side: soft-delete a booking (keeps audit trail, recoverable).
export const softDeleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string }) => {
    if (!d || typeof d.booking_id !== "string" || !/^[0-9a-f-]{36}$/i.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("soft_delete_booking", { _booking_id: data.booking_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Photographer-side: regenerate the client-tracking token (invalidates old link).
export const regenerateBookingToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string }) => {
    if (!d || typeof d.booking_id !== "string" || !/^[0-9a-f-]{36}$/i.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: token, error } = await supabase.rpc("regenerate_booking_token", { _booking_id: data.booking_id });
    if (error) throw new Error(error.message);
    return { token: token as string };
  });
