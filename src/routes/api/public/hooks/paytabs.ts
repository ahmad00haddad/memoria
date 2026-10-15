import { createFileRoute } from "@tanstack/react-router";

// ============================================================================
// /api/public/hooks/paytabs — callback (خادم↔خادم، JSON) و return (متصفح، form)
// ----------------------------------------------------------------------------
// في الحالتين نأخذ tran_ref فقط ونستعلم PayTabs مباشرة (المصدر الموثوق)،
// ثم نفعّل الاشتراك بشكل idempotent. التوقيع يُتحقّق منه ويُسجَّل عند الفشل.
//   * JSON (callback/IPN) → 200 دائماً بعد المعالجة.
//   * form (return)       → 303 إلى /dashboard/subscription?payment=...
// ============================================================================

export const Route = createFileRoute("/api/public/hooks/paytabs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isPayTabsConfigured, verifyBodySignature, verifyReturnSignature, settleSubscriptionPayment } =
          await import("@/lib/paytabs.server");
        const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
        if (!isPayTabsConfigured()) return new Response("payments not configured", { status: 503 });

        const ctype = request.headers.get("content-type") || "";
        const raw = await request.text();

        // ----- return: نموذج من المتصفح -----
        if (ctype.includes("application/x-www-form-urlencoded")) {
          const fields = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;
          if (!(await verifyReturnSignature(fields))) console.warn("[paytabs] return signature mismatch", fields.tranRef);
          let outcome = "pending";
          if (fields.tranRef) {
            try {
              outcome = (await settleSubscriptionPayment(fields.tranRef)).status;
            } catch (e: any) {
              console.error("[paytabs] return settle failed:", e?.message || e);
            }
          }
          const q = outcome === "paid" ? "success" : outcome === "failed" ? "failed" : "pending";
          return Response.redirect(`${base}/dashboard/subscription?payment=${q}`, 303);
        }

        // ----- callback / IPN: JSON -----
        if (!(await verifyBodySignature(raw, request.headers.get("signature")))) {
          console.warn("[paytabs] callback signature mismatch");
        }
        let tranRef = "";
        try {
          tranRef = JSON.parse(raw)?.tran_ref || "";
        } catch {
          return new Response("bad request", { status: 400 });
        }
        if (!tranRef) return new Response("missing tran_ref", { status: 400 });
        try {
          const r = await settleSubscriptionPayment(tranRef);
          return Response.json({ ok: true, ...r });
        } catch (e: any) {
          console.error("[paytabs] callback settle failed:", e?.message || e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
      // PayTabs قد يعيد المتصفح بـ GET في بعض الحالات.
      GET: async () => {
        const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
        return Response.redirect(`${base}/dashboard/subscription?payment=pending`, 303);
      },
    },
  },
});
