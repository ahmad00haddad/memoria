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
// HyperPay (للأردن — يدعم JOD) — هيكل جاهز للتنفيذ لاحقاً.
// ----------------------------------------------------------------------------
// خطوات التنفيذ عند توفّر الحساب:
//   1) createDepositCheckout: POST /v1/checkouts (entityId + amount + currency=JOD)
//      → أعد رابط/معرّف الـ checkout (يُعرض عبر نموذج HyperPay المُستضاف).
//   2) verifyWebhook: تحقّق من توقيع الإشعار (تشفير حمولة/HMAC حسب لوحة HyperPay).
//   3) getPaymentStatus: GET /v1/checkouts/{id}/payment للتحقّق من result.code.
//   المفاتيح: HYPERPAY_ACCESS_TOKEN, HYPERPAY_ENTITY_ID, HYPERPAY_WEBHOOK_SECRET.
//
// function createHyperPayProvider(/* token, entityId */): PaymentProvider { ... }
// ============================================================================

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
  // if (provider === "hyperpay") { ... return createHyperPayProvider(...); }
  return null;
}
