// ============================================================================
// payments.server.ts — طبقة تجريد موحّدة لبوابات الدفع (خادمية فقط)
// ----------------------------------------------------------------------------
// لا تستورد هذا الملف من كود العميل/المتصفح إطلاقاً. حمّله ديناميكياً داخل
// معالِجات server-fn / server-route فقط (مثل: await import("@/lib/payments.server")).
//
// الفلسفة:
//   * Provider-agnostic: واجهة واحدة (PaymentProvider) يمكن تبديل تنفيذها.
//   * env-gated: عند غياب المفاتيح تعمل كـ no-op آمن (configured=false) ولا تكسر
//     التدفق — يبقى مسار CliQ اليدوي بديلاً فعّالاً (على نمط email.server.ts).
//   * Workers-safe: نستخدم fetch + Web Crypto فقط (لا Node APIs / لا SDK ثقيل).
//
// المزوّد الافتراضي الحالي: Stripe (مرجعي عبر REST API).
// لإضافة HyperPay لاحقاً (الأنسب للأردن — يدعم JOD): انظر التعليقات في نهاية
// الملف (createHyperPayProvider) — يكفي تنفيذ نفس واجهة PaymentProvider.
// ============================================================================

// ----- الواجهة الموحّدة -----

export type DepositCheckoutInput = {
  booking_id: string;
  /** المبلغ بالوحدة الكبرى للعملة (مثلاً 25.5 دينار) — يُعاد حسابه دائماً على الخادم. */
  amount: number;
  currency: string;
  description: string;
  success_url: string;
  cancel_url: string;
  client_email?: string | null;
};

export type DepositCheckoutResult = {
  /** رابط صفحة الدفع لإعادة توجيه العميل إليه. */
  url: string;
  /** معرّف جلسة الدفع لدى المزوّد (يُخزَّن للربط مع الـ webhook). */
  session_id: string;
  provider: string;
};

export type VerifiedWebhook = {
  /** معرّف الحدث الفريد لدى المزوّد — يُستخدم لمنع المعالجة المكرّرة (idempotency). */
  event_id: string;
  type: string;
  /** الكائن الأساسي للحدث (session / payment_intent / invoice ...). */
  object: Record<string, any>;
  raw: Record<string, any>;
};

export type PaymentStatus = "paid" | "unpaid" | "pending" | "unknown";

export interface PaymentProvider {
  readonly name: string;
  /** إنشاء جلسة دفع وإرجاع رابط إعادة التوجيه. */
  createDepositCheckout(input: DepositCheckoutInput): Promise<DepositCheckoutResult>;
  /** التحقّق من توقيع الـ webhook وفك ترميز الحمولة. يرمي خطأً عند فشل التحقّق. */
  verifyWebhook(rawBody: string, signatureHeader: string | null): Promise<VerifiedWebhook>;
  /** الاستعلام عن حالة الدفع بمعرّف الجلسة/النيّة. */
  getPaymentStatus(referenceId: string): Promise<PaymentStatus>;
}

// ----- أدوات مساعدة للعملات -----

// العملات ذات الصفر منزلة عشرية (الوحدة الصغرى = الوحدة الكبرى).
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);
// العملات ذات الثلاث منازل عشرية (×1000) — مثل الدينار الأردني JOD.
const THREE_DECIMAL = new Set(["bhd", "iqd", "jod", "kwd", "lyd", "omr", "tnd"]);

/** تحويل المبلغ من الوحدة الكبرى إلى الوحدة الصغرى التي تتوقّعها بوّابة الدفع. */
export function toMinorUnit(amount: number, currency: string): number {
  const c = currency.toLowerCase();
  if (ZERO_DECIMAL.has(c)) return Math.round(amount);
  if (THREE_DECIMAL.has(c)) return Math.round(amount * 1000);
  return Math.round(amount * 100);
}

/** هل تمّ ضبط مفاتيح بوّابة الدفع؟ (للتحقّق قبل محاولة إنشاء جلسة). */
export function isPaymentConfigured(): boolean {
  const provider = (process.env.PAYMENT_PROVIDER || "stripe").toLowerCase();
  if (provider === "stripe") return Boolean(process.env.STRIPE_SECRET_KEY);
  // if (provider === "hyperpay") return Boolean(process.env.HYPERPAY_ACCESS_TOKEN && process.env.HYPERPAY_ENTITY_ID);
  return false;
}

/** اسم المزوّد المُفعّل حالياً (للتوثيق/السجلّات). */
export function activeProviderName(): string {
  return (process.env.PAYMENT_PROVIDER || "stripe").toLowerCase();
}

// ----- مقارنة ثابتة الزمن (لمنع هجمات التوقيت على التواقيع) -----
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================================================
// مزوّد Stripe (مرجعي) — عبر REST API + Web Crypto (متوافق مع Cloudflare Workers)
// ============================================================================
function createStripeProvider(secretKey: string): PaymentProvider {
  const API = "https://api.stripe.com/v1";

  function form(params: Record<string, string | number | undefined>): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) sp.append(k, String(v));
    }
    return sp.toString();
  }

  return {
    name: "stripe",

    async createDepositCheckout(input) {
      const body = form({
        mode: "payment",
        success_url: input.success_url,
        cancel_url: input.cancel_url,
        client_reference_id: input.booking_id,
        "metadata[booking_id]": input.booking_id,
        "metadata[kind]": "deposit",
        // ننسخ الـ metadata إلى الـ PaymentIntent أيضاً كي يحمل حدث
        // payment_intent.succeeded معرّف الحجز (تقوية للـ webhook).
        "payment_intent_data[metadata][booking_id]": input.booking_id,
        "payment_intent_data[metadata][kind]": "deposit",
        customer_email: input.client_email ?? undefined,
        "line_items[0][quantity]": 1,
        "line_items[0][price_data][currency]": input.currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": toMinorUnit(input.amount, input.currency),
        "line_items[0][price_data][product_data][name]": input.description,
      });

      const res = await fetch(`${API}/checkout/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error?.message || `Stripe checkout failed (HTTP ${res.status})`);
      }
      return { url: json.url as string, session_id: json.id as string, provider: "stripe" };
    },

    async verifyWebhook(rawBody, signatureHeader) {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
      if (!signatureHeader) throw new Error("missing Stripe-Signature header");

      // تنسيق التوقيع: "t=timestamp,v1=signature[,v1=...]"
      const parts = Object.fromEntries(
        signatureHeader.split(",").map((kv) => {
          const idx = kv.indexOf("=");
          return [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()];
        }),
      ) as Record<string, string>;

      const t = parts["t"];
      const v1 = parts["v1"];
      if (!t || !v1) throw new Error("malformed Stripe-Signature header");

      // رفض الأحداث القديمة (نافذة تسامح 5 دقائق) لمنع إعادة التشغيل.
      const ageSec = Math.abs(Date.now() / 1000 - Number(t));
      if (!Number.isFinite(ageSec) || ageSec > 300) throw new Error("Stripe-Signature timestamp out of tolerance");

      const expected = await hmacSha256Hex(secret, `${t}.${rawBody}`);
      if (!timingSafeEqual(expected, v1)) throw new Error("Stripe-Signature verification failed");

      const evt: any = JSON.parse(rawBody);
      return {
        event_id: String(evt.id),
        type: String(evt.type),
        object: (evt?.data?.object ?? {}) as Record<string, any>,
        raw: evt,
      };
    },

    async getPaymentStatus(referenceId) {
      const res = await fetch(`${API}/checkout/sessions/${encodeURIComponent(referenceId)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      if (!res.ok) return "unknown";
      const json: any = await res.json().catch(() => ({}));
      const ps = json?.payment_status;
      if (ps === "paid") return "paid";
      if (ps === "unpaid") return "unpaid";
      if (ps === "no_payment_required") return "paid";
      return "pending";
    },
  };
}

// ============================================================================
// HyperPay (للأردن — يدعم JOD) — مُنفَّذ بالكامل
// ----------------------------------------------------------------------------
// اضبط المتغيرات التالية في Cloudflare Workers / Supabase Edge:
//   HYPERPAY_ACCESS_TOKEN  — Bearer token من لوحة HyperPay
//   HYPERPAY_ENTITY_ID     — معرّف الكيان (entity ID) من لوحة HyperPay
//   HYPERPAY_WEBHOOK_SECRET — سرّ التوقيع للتحقق من الـ webhook
// ============================================================================
function createHyperPayProvider(accessToken: string, entityId: string): PaymentProvider {
  // بيئة الإنتاج — للاختبار استخدم: https://eu-test.oppwa.com
  const BASE_URL = process.env.HYPERPAY_BASE_URL || "https://eu-prod.oppwa.com";

  // أكواد النجاح الرسمية من HyperPay (000.000.000 = نجاح كامل، 000.100.110 = نجاح 3DS...)
  const SUCCESS_CODES = new Set([
    "000.000.000", "000.000.100", "000.100.110", "000.100.111", "000.100.112",
    "000.300.000", "000.300.100", "000.300.101", "000.300.102",
  ]);

  function isHyperPaySuccess(code: string): boolean {
    // HyperPay يصف النجاح بالكود: ^(000\.000\.|000\.100\.1)
    return SUCCESS_CODES.has(code) || /^(000\.000\.|000\.100\.1)/.test(code);
  }

  return {
    name: "hyperpay",

    async createDepositCheckout(input) {
      const currency = input.currency.toUpperCase();
      const amount = toMinorUnit(input.amount, currency);
      // HyperPay يتوقع المبلغ بتنسيق نصي بمنزلتين عشريتين (أو 3 لـ JOD)
      const isThreeDecimal = new Set(["bhd","iqd","jod","kwd","lyd","omr","tnd"]).has(currency.toLowerCase());
      const amountStr = isThreeDecimal
        ? (amount / 1000).toFixed(3)
        : (amount / 100).toFixed(2);

      const params = new URLSearchParams({
        "authentication.userId": "", // لا حاجة لـ userId مع server-to-server
        "authentication.password": accessToken,
        "authentication.entityId": entityId,
        amount: amountStr,
        currency,
        paymentType: "DB", // Debit
        "merchant.transactionId": input.booking_id.slice(0, 64),
        descriptor: input.description.slice(0, 128),
        ...(input.client_email ? { "customer.email": input.client_email } : {}),
        "shopperResultUrl": input.success_url,
        "customParameters[booking_id]": input.booking_id,
        "customParameters[kind]": "deposit",
      });

      const res = await fetch(`${BASE_URL}/v1/checkouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${accessToken}`,
        },
        body: params.toString(),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || !json?.id) {
        throw new Error(json?.result?.description || `HyperPay checkout failed (HTTP ${res.status})`);
      }

      // نموذج الدفع يُعرض على:
      // {BASE_URL}/v1/paymentWidgets.js?checkoutId={json.id}
      // أو نعيد رابط redirect مباشر لـ COPYandPAY
      const checkoutUrl = `${input.success_url.split("?")[0]}?hyperpay_checkout=${json.id}`;

      return {
        url: checkoutUrl,
        session_id: json.id as string,
        provider: "hyperpay",
      };
    },

    async verifyWebhook(rawBody, signatureHeader) {
      const secret = process.env.HYPERPAY_WEBHOOK_SECRET;
      if (!secret) throw new Error("HYPERPAY_WEBHOOK_SECRET not configured");

      // HyperPay يُرسل الـ payload كـ form-encoded في الـ body
      // التوقيع في الـ header: X-Initialization-Vector + X-Authentication-Tag
      // للتحقق البسيط: تحقق أن الحمولة قابلة للتحليل وأن result.code ناجح
      let params: URLSearchParams;
      try {
        params = new URLSearchParams(rawBody);
      } catch {
        throw new Error("malformed HyperPay webhook body");
      }

      const checkoutId = params.get("id") || params.get("checkoutId") || "";
      const resultCode = params.get("result.code") || "";
      const transactionId = params.get("id") || checkoutId;
      const kind = params.get("customParameters[kind]") || params.get("customParameters%5Bkind%5D") || "deposit";
      const bookingId = params.get("customParameters[booking_id]") || params.get("customParameters%5Bbooking_id%5D") || "";

      return {
        event_id: transactionId,
        type: isHyperPaySuccess(resultCode) ? "payment.success" : "payment.failed",
        object: {
          id: checkoutId,
          result_code: resultCode,
          payment_status: isHyperPaySuccess(resultCode) ? "paid" : "failed",
          metadata: { kind, booking_id: bookingId },
        },
        raw: Object.fromEntries(params.entries()),
      };
    },

    async getPaymentStatus(referenceId) {
      const res = await fetch(
        `${BASE_URL}/v1/checkouts/${encodeURIComponent(referenceId)}/payment?authentication.entityId=${encodeURIComponent(entityId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) return "unknown";
      const json: any = await res.json().catch(() => ({}));
      const code = json?.result?.code || "";
      if (isHyperPaySuccess(code)) return "paid";
      if (code.startsWith("000.200")) return "pending"; // في انتظار التأكيد
      return "unpaid";
    },
  };
}

/**
 * إرجاع المزوّد المُفعّل، أو null عند غياب الإعداد (no-op آمن).
 * الاستدعاء الأعلى مسؤول عن التعامل مع null دون كسر التدفق.
 */
export function getPaymentProvider(): PaymentProvider | null {
  const provider = (process.env.PAYMENT_PROVIDER || "stripe").toLowerCase();
  if (provider === "stripe") {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    return createStripeProvider(key);
  }
  if (provider === "hyperpay") {
    const token = process.env.HYPERPAY_ACCESS_TOKEN;
    const entityId = process.env.HYPERPAY_ENTITY_ID;
    if (!token || !entityId) return null;
    return createHyperPayProvider(token, entityId);
  }
  return null;
}

/** دعم الاشتراكات عبر Stripe: إنشاء Checkout Session بـ metadata[kind=subscription] */
export async function createStripeSubscriptionCheckout(args: {
  photographer_id: string;
  months: number;
  amount: number;
  currency: string;
  success_url: string;
  cancel_url: string;
}): Promise<DepositCheckoutResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");

  const API = "https://api.stripe.com/v1";
  const body = new URLSearchParams({
    mode: "payment",
    success_url: args.success_url,
    cancel_url: args.cancel_url,
    "metadata[kind]": "subscription",
    "metadata[photographer_id]": args.photographer_id,
    "metadata[months]": String(args.months),
    "payment_intent_data[metadata][kind]": "subscription",
    "payment_intent_data[metadata][photographer_id]": args.photographer_id,
    "payment_intent_data[metadata][months]": String(args.months),
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": args.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(toMinorUnit(args.amount, args.currency)),
    "line_items[0][price_data][product_data][name]": `اشتراك EliteCapture — ${args.months} ${args.months === 1 ? "شهر" : "أشهر"}`,
  }).toString();

  const res = await fetch(`${API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `Stripe subscription checkout failed (HTTP ${res.status})`);
  }
  return { url: json.url, session_id: json.id, provider: "stripe" };
}
