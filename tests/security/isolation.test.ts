import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, haveRoles } from "./setup";

// Photographer A must not reach Photographer B's data, and one bride's token must not open another's booking.
// Requires seeded DEV accounts + data (see tests/security/README.md). Skipped otherwise.
const d = haveRoles ? describe : describe.skip;

async function login(who: { email: string; password: string }): Promise<SupabaseClient> {
  const c = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword(who);
  if (error) throw new Error(`login failed for ${who.email}: ${error.message}`);
  return c;
}

d("photographer isolation (A vs B)", () => {
  let A: SupabaseClient;
  beforeAll(async () => { A = await login(env.a); });

  // Positive control: A CAN see her own booking. Without this, "0 rows" could just mean an empty table.
  it("control: A sees her own booking", async () => {
    const { data } = await A.from("bookings").select("id").eq("id", env.bookingA);
    expect(data?.length).toBe(1);
  });

  it("A cannot read B's booking", async () => {
    const { data } = await A.from("bookings").select("id").eq("id", env.bookingB);
    expect(data ?? []).toHaveLength(0);
  });

  it("A's full bookings list never contains B's booking", async () => {
    const { data } = await A.from("bookings").select("id");
    expect((data ?? []).some((r: any) => r.id === env.bookingB)).toBe(false);
  });

  for (const table of ["contracts", "messages", "booking_addenda", "delivery_galleries"]) {
    it(`A cannot read B's rows in ${table}`, async () => {
      const { data } = await A.from(table).select("*").eq("booking_id", env.bookingB);
      expect(data ?? []).toHaveLength(0);
    });
  }

  it("A cannot update B's booking", async () => {
    const { data } = await A.from("bookings").update({ client_notes: "hacked" }).eq("id", env.bookingB).select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("A cannot change protected fields on her own booking directly", async () => {
    const { error } = await A.from("bookings").update({ status: "confirmed" }).eq("id", env.bookingA);
    expect(error).not.toBeNull(); // PROTECTED_BOOKING_FIELD
  });

  it("A cannot delete B's booking", async () => {
    const { data } = await A.from("bookings").delete().eq("id", env.bookingB).select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("A cannot soft-delete or cancel B's booking via RPC", async () => {
    const r1 = await A.rpc("soft_delete_booking", { _booking_id: env.bookingB });
    const r2 = await A.rpc("cancel_booking", { _booking_id: env.bookingB, _reason: "test" });
    expect(r1.error).not.toBeNull();
    expect(r2.error).not.toBeNull();
  });

  it("A cannot insert a booking owned by someone else", async () => {
    const { error } = await A.from("bookings").insert({ photographer_id: "00000000-0000-0000-0000-000000000000" } as any);
    expect(error).not.toBeNull();
  });
});

d("bride isolation (token A vs token B)", () => {
  const anon = () => createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  it.skipIf(!env.tokenA || !env.tokenB)("control: token A opens booking A only", async () => {
    const a = await anon().rpc("get_booking_by_token", { _token: env.tokenA });
    const b = await anon().rpc("get_booking_by_token", { _token: env.tokenB });
    expect((a.data as any)?.id).toBe(env.bookingA);
    expect((b.data as any)?.id).toBe(env.bookingB);
    expect((a.data as any)?.id).not.toBe((b.data as any)?.id);
  });

  it("bride cannot read bookings table directly", async () => {
    const { data } = await anon().from("bookings").select("id");
    expect(data ?? []).toHaveLength(0);
  });
});
