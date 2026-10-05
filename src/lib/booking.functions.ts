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
  const duration = toMin(d.end_time) - toMin(d.start_time);
  if (duration <= 0) throw new Error("وقت الانتهاء يجب أن يكون بعد وقت البداية");
  if (duration < 30) throw new Error("الحد الأدنى لمدة الحجز هو 30 دقيقة");
  // التاريخ يجب أن يكون اليوم أو في المستقبل
  // اليوم بتوقيت الأردن (UTC+3) وليس UTC، لتفادي رفض/قبول يوم كامل بالخطأ قرب منتصف الليل
  const todayStr = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split("T")[0];
  if (d.event_date < todayStr) throw new Error("لا يمكن اختيار تاريخ في الماضي");
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

      // Validate photographer subscription status
      const { data: subActive } = await supabaseAdmin.rpc("is_subscription_active", { _photographer_id: data.photographer_id });
      if (!subActive) {
        throw new Error("نعتذر، لا يمكن إتمام الحجز لأن اشتراك المصورة غير نشط حالياً.");
      }


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
      .select("id, display_name, username, fixed_deposit, deposit_percent, min_session_minutes")
      .eq("id", data.photographer_id)
      .single();
    if (profErr || !profile) throw new Error("المصوّرة غير موجودة");

    // احترام الحد الأدنى لمدة الجلسة الذي حدّدته المصوّرة
    const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
    const bookedMinutes = toMinutes(data.end_time) - toMinutes(data.start_time);
    const minMinutes = Number(profile.min_session_minutes ?? 0);
    if (minMinutes > 0 && bookedMinutes < minMinutes) {
      throw new Error(`الحد الأدنى لمدة الجلسة لدى هذه المصوّرة هو ${Math.round(minMinutes / 60 * 10) / 10} ساعة`);
    }

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
      const { data: prev } = await supabaseAdmin.from("bookings")
        .select("phone_verified_at, verify_code_wa, verify_code_email").eq("id", row.id).maybeSingle();
      const p: any = prev;
      if (!p || p.phone_verified_at) return { booking_id: row.id, tracking_token: row.client_tracking_token, verify: null };
      const { publicWhatsAppNumber } = await import("@/lib/verification.server");
      const waNumber = publicWhatsAppNumber();
      return {
        booking_id: row.id, tracking_token: row.client_tracking_token,
        verify: { whatsapp_number: waNumber, whatsapp_code: waNumber ? p.verify_code_wa : null, email: !!p.verify_code_email },
      };
    }

    // تأكيد الطلب قبل أن يُحسب: لا إشعار للمصوّرة ولا حجز طويل للموعد قبل التأكيد.
    const v = await import("@/lib/verification.server");
    const waNumber = v.publicWhatsAppNumber();
    const emailOn = v.isEmailConfigured();
    if (!waNumber && !emailOn) {
      // لا قناة تأكيد مهيّأة بعد — نؤكد تلقائياً حتى لا تتعطل الحجوزات.
      await v.markBookingVerified(row.id, "auto");
      return { booking_id: row.id, tracking_token: row.client_tracking_token, verify: null };
    }
    const waCode = v.sixDigits();
    const emailCode = v.sixDigits();
    await supabaseAdmin.from("bookings").update({
      verify_code_wa: waNumber ? waCode : null,
      verify_code_email: emailOn ? emailCode : null,
      verify_expires_at: new Date(Date.now() + v.VERIFY_WINDOW_MINUTES * 60_000).toISOString(),
      verify_attempts: 0,
    } as any).eq("id", row.id);
    let emailSent = false;
    if (emailOn) {
      try {
        const r = await v.sendEmailCode({ to: data.client_email, client_name: data.client_name, code: emailCode, booking_id: row.id });
        emailSent = r.ok;
      } catch (e) { console.error("[booking] verify email failed", e); }
    }
    if (!waNumber && !emailSent) {
      // الإيميل لم يُرسل (مثلاً مُرسل Resend التجريبي) ولا واتساب — لا نترك العروس عالقة.
      await v.markBookingVerified(row.id, "auto");
      return { booking_id: row.id, tracking_token: row.client_tracking_token, verify: null };
    }
    return {
      booking_id: row.id,
      tracking_token: row.client_tracking_token,
      verify: {
        whatsapp_number: waNumber,
        whatsapp_code: waNumber ? waCode : null,
        email: emailSent,
      },
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
    if (!row) return null;
    const { data: vr } = await supabaseAdmin.from("bookings")
      .select("phone_verified_at, verify_code_wa, verify_code_email")
      .eq("client_tracking_token", data.token).maybeSingle();
    const v: any = vr ?? {};
    let verify = null;
    if (!v.phone_verified_at) {
      const { publicWhatsAppNumber } = await import("@/lib/verification.server");
      const waNumber = publicWhatsAppNumber();
      verify = { whatsapp_number: waNumber, whatsapp_code: waNumber ? v.verify_code_wa : null, email: !!v.verify_code_email };
    }
    return { ...(row as any), phone_verified: !!v.phone_verified_at, verify };
  });

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

// العروس تكتب رمز الإيميل لتأكيد الطلب (5 محاولات كحد أقصى).
export const verifyBookingEmailCode = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; code: string }) => {
    if (!d || typeof d.token !== "string" || !TOKEN_RE.test(d.token)) throw new Error("invalid token");
    const code = String(d.code ?? "").replace(/\D/g, "");
    if (code.length !== 6) throw new Error("الرمز يتكوّن من 6 أرقام");
    return { token: d.token, code };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b } = await supabaseAdmin.from("bookings")
      .select("id, phone_verified_at, verify_code_email, verify_expires_at, verify_attempts")
      .eq("client_tracking_token", data.token).is("deleted_at", null).maybeSingle();
    const bk: any = b;
    if (!bk) throw new Error("الحجز غير موجود أو انتهت مهلته");
    if (bk.phone_verified_at) return { ok: true };
    if (bk.verify_attempts >= 5) throw new Error("تجاوزتِ عدد المحاولات. احجزي من جديد.");
    if (bk.verify_expires_at && new Date(bk.verify_expires_at).getTime() < Date.now()) {
      throw new Error("انتهت صلاحية الرمز. اطلبي رمزاً جديداً.");
    }
    if (!bk.verify_code_email || bk.verify_code_email !== data.code) {
      await supabaseAdmin.from("bookings").update({ verify_attempts: bk.verify_attempts + 1 } as any).eq("id", bk.id);
      throw new Error("الرمز غير صحيح");
    }
    const { markBookingVerified } = await import("@/lib/verification.server");
    await markBookingVerified(bk.id, "email");
    return { ok: true };
  });

// إعادة إرسال رمز الإيميل (مرة كل دقيقة تقريباً) مع تمديد المهلة.
export const resendBookingEmailCode = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => {
    if (!d || typeof d.token !== "string" || !TOKEN_RE.test(d.token)) throw new Error("invalid token");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const v = await import("@/lib/verification.server");
    const { data: b } = await supabaseAdmin.from("bookings")
      .select("id, client_name, client_email, phone_verified_at, updated_at")
      .eq("client_tracking_token", data.token).is("deleted_at", null).maybeSingle();
    const bk: any = b;
    if (!bk) throw new Error("الحجز غير موجود أو انتهت مهلته");
    if (bk.phone_verified_at) return { ok: true };
    if (!v.isEmailConfigured()) throw new Error("الإرسال بالإيميل غير متاح حالياً");
    if (Date.now() - new Date(bk.updated_at).getTime() < 55_000) throw new Error("انتظري دقيقة قبل طلب رمز جديد");
    const code = v.sixDigits();
    await supabaseAdmin.from("bookings").update({
      verify_code_email: code, verify_attempts: 0, updated_at: new Date().toISOString(),
      verify_expires_at: new Date(Date.now() + v.VERIFY_WINDOW_MINUTES * 60_000).toISOString(),
    } as any).eq("id", bk.id);
    await v.sendEmailCode({ to: bk.client_email, client_name: bk.client_name, code, booking_id: bk.id });
    return { ok: true };
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
    if (error) {
      if (error.message.includes("EXPIRED_BOOKING")) throw new Error("انتهت مهلة الحجز وحُجز الموعد لعميلة أخرى. تواصلي مع المصوّرة لاختيار موعد جديد.");
      if (error.message.includes("BOOKING_NOT_VERIFIED")) throw new Error("أكّدي طلب الحجز أولاً (عبر واتساب أو رمز الإيميل) قبل إرسال العربون.");
      if (error.message.includes("BOOKING_NOT_AWAITING_DEPOSIT")) throw new Error("هذا الحجز لم يعد بانتظار العربون.");
      throw new Error(error.message);
    }
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
    if (!d || typeof d.token !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(d.token)) throw new Error("invalid token");
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
    // #3 حماية بيانات الدفع البنكية
    // لمنع سحب حسابات الدفع لأشخاص لم يحجزوا أبداً، لا يتم كشفها عبر البروفايل العام.
    return { cliq_alias: null, bank_info: null };
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
      .select("id, photographer_id, deposit_sent_at, deposit_confirmed_at, deposit_proof_url, status, client_user_id, client_phone, client_tracking_token, client_name, event_date, total_price, deposit_checkout_session_id")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!bk) throw new Error("الحجز غير موجود");
    if (bk.photographer_id !== userId) throw new Error("forbidden");

    // محاولة المصالحة التلقائية إذا كانت هناك جلسة دفع
    if (bk.deposit_checkout_session_id && !bk.deposit_confirmed_at) {
      try {
        const { reconcilePaymentStatus } = await import("@/lib/payments.functions");
        await reconcilePaymentStatus({ data: { token: bk.client_tracking_token! } });
      } catch (e) {
        console.error("[booking] auto-reconciliation failed during manual confirm", e);
      }
    }

    // كان مجرّد فتح صفحة الدفع الإلكتروني (checkout session) يكفي للتأكيد حتى لو لم يُدفع شيء.
    // الآن: إمّا دفع إلكتروني مؤكَّد من مزوّد الدفع، أو إثبات تحويل رفعته العميلة وتراجعه المصوّرة.
    if (bk.deposit_checkout_session_id && !bk.deposit_confirmed_at) {
      const { data: fresh } = await supabase
        .from("bookings").select("deposit_confirmed_at, status").eq("id", data.booking_id).maybeSingle();
      bk.deposit_confirmed_at = fresh?.deposit_confirmed_at ?? null;
      // المصالحة نفسها قد تكون أكّدت الحجز (دفع إلكتروني ناجح)
      if (fresh?.status === "confirmed") return { ok: true };
    }
    if (!bk.deposit_confirmed_at && !bk.deposit_sent_at && !bk.deposit_proof_url) {
      throw new Error(bk.deposit_checkout_session_id
        ? "الدفع الإلكتروني لم يكتمل بعد — لا يمكن تأكيد الحجز حتى يصل المبلغ"
        : "لا يمكن تأكيد الحجز قبل وصول إثبات العربون من العميل");
    }
    if (bk.status !== "pending_deposit" && bk.status !== "quote") {
      throw new Error("هذا الحجز ليس بانتظار العربون");
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
      // إنشاء إشعار للمصورة بفشل توليد العقد (M4)
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
         await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "system",
          title: "فشل توليد العقد التلقائي",
          body: "حدث خطأ أثناء محاولة توليد العقد تلقائياً لهذا الحجز. يرجى إنشاء العقد يدوياً.",
          link: `/dashboard/bookings/${data.booking_id}`
        });
      } catch (err) { console.error("[booking] failed to create contract failure notification", err); }
    }
    // إشعار واتساب تأكيد الحجز — fire-and-forget
    if (bk.client_phone) {
      try {
        const { sendWhatsAppNotification } = await import("@/lib/whatsapp.server");
        const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
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

export const uploadSneakPeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; url: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: b } = await supabase.from("bookings").select("photographer_id").eq("id", data.booking_id).single();
    if (b?.photographer_id !== userId) throw new Error("Unauthorized");
    await supabase.from("bookings").update({ sneak_peek_url: data.url }).eq("id", data.booking_id);
    return { ok: true };
  });
