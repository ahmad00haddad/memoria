import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { env, configured } from "./setup";

// Anonymous visitor (no login). Runs on DEV only. Skipped unless SECURITY_TEST_SUPABASE_URL/ANON_KEY are set.
const d = configured ? describe : describe.skip;

const anon = () => createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

// Tables an anonymous visitor must never read rows from.
const PRIVATE_TABLES = [
  "bookings", "contracts", "messages", "subscriptions", "subscription_payments", "photographer_private",
  "user_roles", "audit_logs", "email_log", "notifications", "referrals", "whatsapp_log", "rate_limits",
  "contact_messages", "bride_action_codes", "booking_addenda", "delivery_galleries", "delivery_photos",
];

d("anon: private tables return no rows (needs seeded data to be meaningful)", () => {
  for (const t of PRIVATE_TABLES) {
    it(t, async () => {
      const { data, error } = await anon().from(t).select("*").limit(1);
      // Either blocked (error) or filtered by RLS (empty). Any row is a leak.
      expect(error ? [] : data).toHaveLength(0);
    });
  }
});

// Server-only RPCs: an anonymous caller must be refused (permission denied / not found).
const SERVER_ONLY_RPCS: Array<[string, Record<string, unknown>]> = [
  ["create_booking_guarded", { _payload: {} }],
  ["client_mark_deposit_sent", { _token: "x", _proof_path: "x", _reference: "x", _note: "x" }],
  ["apply_subscription_payment", { _payment_id: "00000000-0000-0000-0000-000000000000", _months: 1, _actor: "00000000-0000-0000-0000-000000000000" }],
  ["expire_unpaid_bookings", {}],
];

d("anon: server-only RPCs are not callable", () => {
  for (const [fn, args] of SERVER_ONLY_RPCS) {
    it(fn, async () => {
      const { error } = await anon().rpc(fn, args as any);
      expect(error).not.toBeNull();
      // 42501 = permission denied, PGRST202 = function not exposed
      expect(["42501", "PGRST202"]).toContain((error as any).code);
    });
  }
});

d("anon: a made-up tracking token returns nothing", () => {
  it("get_booking_by_token", async () => {
    const { data } = await anon().rpc("get_booking_by_token", { _token: "A".repeat(32) });
    expect(data ?? null).toBeNull();
  });
});
