
import { locale } from "@/i18n";// ============================================================================
// paytabs.server.ts — PayTabs (MEPS Jordan) للاشتراكات — خادمي فقط
// ----------------------------------------------------------------------------
// صفحة دفع مستضافة (Hosted Payment Page): بيانات البطاقة لا تمرّ على خادمنا.
// كل دفعة يدوية — لا tokenise ولا recurring (قرار المالك: لا خصم تلقائي).
//
// الأمان:
//   * لا نثق بأي حمولة واردة: نتحقّق من التوقيع ثم نستعلم /payment/query
//     بالـ tran_ref ونعتمد نتيجة PayTabs فقط.
//   * المبلغ والعملة يجب أن يطابقا صف subscription_payments (cart_id = id الصف).
//   * التفعيل idempotent: تحديث مشروط status=pending، والتمديد فقط إن تم التحديث.
//
// env: PAYTABS_PROFILE_ID, PAYTABS_SERVER_KEY, PAYTABS_BASE (افتراضي secure-jordan).
// ============================================================================

export function payTabsConfig() {
  const profileId = Number(process.env.PAYTABS_PROFILE_ID || "");
  const serverKey = process.env.PAYTABS_SERVER_KEY || "";
  const base = (process.env.PAYTABS_BASE || "https://secure-jordan.paytabs.com").replace(/\/$/, "");
  if (!profileId || !serverKey) return null;
  return { profileId, serverKey, base };
}

export function isPayTabsConfigured(): boolean {
  return payTabsConfig() !== null;
}

async function call(path: string, body: Record<string, unknown>) {
  const cfg = payTabsConfig();
  if (!cfg) throw new Error("PayTabs not configured");
  const res = await fetch(`${cfg.base}${path}`, {
    method: "POST",
    headers: { authorization: cfg.serverKey, "content-type": "application/json" },
    body: JSON.stringify({ profile_id: cfg.profileId, ...body }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `PayTabs HTTP ${res.status}`);
  return json;
}

export async function createHostedPayment(input: {
  cartId: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  returnUrl: string;
  customer: { name: string; email: string };
}): Promise<{ redirectUrl: string; tranRef: string }> {
  const json = await call("/payment/request", {
    tran_type: "sale",
    tran_class: "ecom",
    cart_id: input.cartId,
    cart_description: input.description,
    cart_currency: input.currency,
    cart_amount: input.amount,
    callback: input.callbackUrl,
    return: input.returnUrl,
    hide_shipping: true,
    customer_details: { name: input.customer.name, email: input.customer.email, country: "JO" },
  });
  if (!json?.redirect_url) throw new Error(json?.message || "PayTabs did not return a payment page");
  return { redirectUrl: json.redirect_url, tranRef: json.tran_ref };
}

export async function queryTransaction(tranRef: string): Promise<any> {
  return call("/payment/query", { tran_ref: tranRef });
}

// ----- التواقيع -----
async function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

/** callback / IPN: ترويسة Signature = HMAC-SHA256(rawBody, serverKey). */
export async function verifyBodySignature(rawBody: string, signature: string | null): Promise<boolean> {
  const cfg = payTabsConfig();
  if (!cfg || !signature) return false;
  return safeEqual(await hmacHex(cfg.serverKey, rawBody), signature.toLowerCase());
}

/** return (POST من المتصفح): حقل signature = HMAC لحقول النموذج غير الفارغة مرتّبة ومرمّزة كـ query (مثل http_build_query في PHP). */
export async function verifyReturnSignature(fields: Record<string, string>): Promise<boolean> {
  const cfg = payTabsConfig();
  const sig = fields.signature;
  if (!cfg || !sig) return false;
  const query = Object.keys(fields)
    .filter((k) => k !== "signature" && fields[k] !== "")
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(fields[k]).replace(/%20/g, "+")}`)
    .join("&");
  return safeEqual(await hmacHex(cfg.serverKey, query), sig.toLowerCase());
}

/**
 * يستعلم PayTabs عن tran_ref ويفعّل الاشتراك إن كانت الدفعة مقبولة ومطابقة.
 * آمن للاستدعاء أكثر من مرة (callback + return).
 */
export async function settleSubscriptionPayment(tranRef: string): Promise<{ status: "paid" | "failed" | "pending" | "unknown"; already?: boolean }> {
  const tx = await queryTransaction(tranRef);
  const cartId: string = tx?.cart_id || "";
  const respStatus: string = tx?.payment_result?.response_status || "";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (!/^[0-9a-f-]{36}$/i.test(cartId)) return { status: "unknown" };
  const { data: row } = await (supabaseAdmin as any)
    .from("subscription_payments")
    .select("id, photographer_id, amount, currency, period_months, status, method")
    .eq("id", cartId)
    .maybeSingle();
  if (!row || row.method !== "gateway") return { status: "unknown" };

  if (respStatus !== "A") {
    if (respStatus === "P" || respStatus === "H") return { status: "pending" };
    if (row.status === "pending") {
      await (supabaseAdmin as any)
        .from("subscription_payments")
        .update({ notes: `PayTabs: ${tx?.payment_result?.response_message || respStatus || "failed"}`, payment_reference: tranRef })
        .eq("id", row.id)
        .eq("status", "pending");
    }
    return { status: "failed" };
  }

  // مطابقة المبلغ والعملة مع ما أنشأناه على الخادم.
  const paidAmount = Number(tx.cart_amount);
  const paidCurrency = String(tx.cart_currency || "").toUpperCase();
  if (Math.abs(paidAmount - Number(row.amount)) > 0.0005 || paidCurrency !== String(row.currency || "JOD").toUpperCase()) {
    console.error("[paytabs] amount/currency mismatch", { cartId, paidAmount, paidCurrency, expected: row.amount });
    await (supabaseAdmin as any)
      .from("subscription_payments")
      .update({ notes: `PayTabs: مبلغ غير مطابق (${paidAmount} ${paidCurrency}) — يحتاج مراجعة`, payment_reference: tranRef })
      .eq("id", row.id)
      .eq("status", "pending");
    return { status: "failed" };
  }

  const now = new Date();
  const { data: updated } = await (supabaseAdmin as any)
    .from("subscription_payments")
    .update({ status: "approved", reviewed_at: now.toISOString(), payment_reference: tranRef, notes: `PayTabs · ${tx?.payment_info?.card_scheme || "card"}` })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id");
  if (!updated?.length) return { status: "paid", already: true };

  const months = Number(row.period_months) || 1;
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("status, current_period_end, trial_ends_at")
    .eq("photographer_id", row.photographer_id)
    .maybeSingle();
  // نبدأ من نهاية الفترة الحالية أو التجربة المجانية — لا تضيع أيام مدفوعة/تجريبية.
  const ends = [now.getTime()];
  if (sub?.current_period_end) ends.push(new Date(sub.current_period_end).getTime());
  if ((sub as any)?.status === "trial" && sub?.trial_ends_at) ends.push(new Date(sub.trial_ends_at).getTime());
  const start = new Date(Math.max(...ends));
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);

  const { error: e2 } = await supabaseAdmin.from("subscriptions").upsert({
    photographer_id: row.photographer_id,
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: end.toISOString(),
    trial_ends_at: (sub as any)?.trial_ends_at ?? now.toISOString(),
    updated_at: now.toISOString(),
  } as any, { onConflict: "photographer_id" });
  if (e2) console.error("[paytabs] subscription extend failed:", e2.message);

  try {
    await (supabaseAdmin.rpc as any)("grant_referral_reward", { _referred_id: row.photographer_id });
  } catch (e) {
    console.error("[paytabs] referral reward failed:", e);
  }
  await supabaseAdmin.from("audit_logs").insert({
    action: "subscription.paytabs_paid",
    actor_id: row.photographer_id,
    entity_type: "subscription_payment",
    entity_id: row.id,
    after_data: { tran_ref: tranRef, months, amount: paidAmount, period_end: end.toISOString() },
  } as any);
  await supabaseAdmin.from("notifications").insert({
    user_id: row.photographer_id,
    type: "system",
    title: "تم تفعيل اشتراكك ✓",
    body: `استلمنا دفعتك (${paidAmount} د.أ). اشتراكك فعّال حتى ${end.toLocaleDateString(locale("ar-JO"))}.`,
    link: "/dashboard/subscription",
  } as any);

  return { status: "paid" };
}
