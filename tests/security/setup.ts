// Safety guard: this suite may only ever talk to the DEV Supabase project.
const DEV_REF = "ysqpmqulbeawzcatauqq";
const FORBIDDEN = ["qrpkfanblpjiqgkufnrb", "ukjkgiahtpnevqdoguiq"]; // production, legacy

export const env = {
  url: process.env.SECURITY_TEST_SUPABASE_URL ?? "",
  anonKey: process.env.SECURITY_TEST_ANON_KEY ?? "",
  a: { email: process.env.SECURITY_TEST_PHOTOGRAPHER_A_EMAIL ?? "", password: process.env.SECURITY_TEST_PHOTOGRAPHER_A_PASSWORD ?? "" },
  b: { email: process.env.SECURITY_TEST_PHOTOGRAPHER_B_EMAIL ?? "", password: process.env.SECURITY_TEST_PHOTOGRAPHER_B_PASSWORD ?? "" },
  admin: { email: process.env.SECURITY_TEST_ADMIN_EMAIL ?? "", password: process.env.SECURITY_TEST_ADMIN_PASSWORD ?? "" },
  // booking tracking tokens of two different brides (seeded on DEV)
  tokenA: process.env.SECURITY_TEST_BRIDE_A_TOKEN ?? "",
  tokenB: process.env.SECURITY_TEST_BRIDE_B_TOKEN ?? "",
  // ids of a booking owned by A and by B (seeded on DEV)
  bookingA: process.env.SECURITY_TEST_BOOKING_A_ID ?? "",
  bookingB: process.env.SECURITY_TEST_BOOKING_B_ID ?? "",
};

if (env.url) {
  for (const f of FORBIDDEN) {
    if (env.url.includes(f)) throw new Error(`REFUSING to run: SECURITY_TEST_SUPABASE_URL points to a non-dev project (${f}).`);
  }
  if (!env.url.includes(DEV_REF)) throw new Error("REFUSING to run: URL is not the dev project.");
}

export const configured = !!(env.url && env.anonKey);
export const haveRoles = configured && !!(env.a.email && env.b.email && env.bookingA && env.bookingB);
