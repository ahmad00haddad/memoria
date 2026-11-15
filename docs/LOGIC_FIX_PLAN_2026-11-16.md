# Memoria — Logic Fix Plan (2026-11-16)

> للمالك: هذا الملف تعليمات تنفيذ لمودل Sonnet. يحتوي كل تناقضات المنطق التي وُجدت في تدقيق 2026-11-16، مرتّبة في مراحل، مع السلوك الحالي والمطلوب واختبار القبول لكل بند.

You are implementing fixes found by a full business-logic audit of Memoria. Read this whole file before touching anything. Work phase by phase, in order. Each phase is one commit and one deploy.

---

## 0. How to work (read first, applies to every task)

### 0.1 The product in one paragraph

Memoria is a booking platform for wedding photographers in Jordan. Photographers have accounts, a public page, packages, a calendar and a subscription (trial, Basic, Pro; paid through Zbooni or PayTabs, approved by an admin). Brides have **no accounts**: they book from the public page, verify by code, and follow the booking on a secret-token page (`/track/<token>`). The deposit goes **directly from the bride to the photographer by CliQ**; the platform never holds booking money. The photographer confirms the deposit by hand.

Stack: TanStack Start (React, server functions via `createServerFn`), Supabase Postgres with RLS, deployed as a Cloudflare Worker. UI text is Arabic, wrapped in `t()` / `tr()` from `@/i18n`.

### 0.2 Repo facts you need

- Root: `C:\Users\ahmad\memoria`. Branch: `main` (commit straight to it).
- Server functions: `src/lib/*.functions.ts`. Server-only helpers: `src/lib/*.server.ts`.
- Two Supabase clients exist on the server:
  - `context.supabase` (from the `requireSupabaseAuth` middleware) acts **as the signed-in user**, so RLS and triggers apply.
  - `supabaseAdmin` (`@/integrations/supabase/client.server`) is the **service role** and bypasses RLS. Use it only after you have checked ownership in code.
- Cron endpoints: `src/routes/api/public/hooks/*.ts`, protected by an `x-cron-secret` header.
- Migrations: `supabase/migrations/<14-digit timestamp>_<name>.sql`. Later files override earlier ones. To learn what a function does **now**, grep its name across all migrations and read the **last** definition.
- `src/integrations/supabase/types.ts` is stale (seven newer tables are missing). Code uses `as any` for those. Do not regenerate it as part of these fixes.
- Jordan time is UTC+3 all year. The codebase computes "today in Jordan" as `new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10)`. Use that same expression for every "today / tomorrow / yesterday" you write.

### 0.3 Rules

1. **Line numbers in this file are from 2026-11-16 and will drift.** Locate code by the quoted snippet or function name with Grep, then read the surrounding function fully before editing.
2. **Verify before you fix.** Each task states what the audit saw. Confirm it in the current code first. If the code already behaves as the "Required" section says, skip the task and note it in your report.
3. Keep changes minimal and local. Do not refactor, rename, reformat or "clean up" anything a task does not name. Match the style of the file you are in (Arabic comments, `tr()`/`t()` for every user-visible string, existing error-throwing pattern).
4. Every new user-visible string is Arabic and goes through the same translation helper the file already uses. Photographer-facing strings in files that use the gender helper `g(feminine, masculine)` must provide both forms.
5. Never weaken a check to make something pass. If a required change conflicts with existing behaviour in a way this file did not foresee, stop that task, leave the code as it was, and report it.
6. Owner decisions that are final (do not "fix" these):
   - Subscriptions: paid manually per period, no auto-renew, **no refunds**.
   - Free-trial abuse through new accounts is accepted.
   - Reviews and fake-review defences are low priority.
   - No automatic cancellation of a booking because the bride did not upload a receipt (decision of 2026-11-04).
   - Photographer forms stay minimal: do not add required fields.
   - Email is sandbox-only until the domain is bought; do not work on email delivery.
7. Do not print, log or commit secrets. Do not touch `.env*`, `wrangler.jsonc` secrets or `.dev.vars`.

### 0.4 Database migrations

- One new migration file per phase that needs SQL, named `supabase/migrations/2026111612XXXX_<phase_name>.sql` (increase the timestamp for each).
- Write every statement so it can run twice safely: `CREATE OR REPLACE FUNCTION`, `DROP ... IF EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`.
- Wrap each file in `BEGIN; ... COMMIT;`.
- Every `SECURITY DEFINER` function gets `SET search_path = public` and an explicit `REVOKE ALL ... FROM PUBLIC, anon, authenticated` followed by only the grants it needs.
- The dev database (`EliteCapture`) only has migrations up to 2026-10-18, so it cannot run these. Production (`memoria`, ref `qrpkfanblpjiqgkufnrb`) has only test accounts. The migration is applied to production through the Supabase SQL Editor. **If you cannot apply SQL yourself, stop after writing the file and say so in your report**; the code of that phase must not be deployed before its migration is applied.
- Order within a phase: apply the migration first, then deploy the code. Write code so that it does not break if it runs for a few minutes against the new schema before the new bundle is everywhere.

### 0.5 Checks before each commit

Run from the repo root, in this order, and fix what they report (only errors caused by your change; the repo has pre-existing lint noise):

```bash
npx tsc --noEmit
```

```bash
npx vitest run
```

```bash
npx vite build
```

### 0.6 Commit and deploy (exact procedure)

1. Make sure no `wrangler dev` or `workerd` process you started is running (it locks `.output`).
2. `npx vite build > build.log 2>&1`, then confirm `build.log` contains `You can deploy` and does not contain `error during build`. Delete `build.log` afterwards.
3. `git add` **only the files you changed**. Never add `graphify-out/`, `tools/`, `*.mp4`, `Lost videos/`, `package-lock.json`.
4. Commit message: one line, imperative, English, describing behaviour (look at `git log --oneline -10` for the style). End the message with a blank line and `Co-Authored-By: Claude <noreply@anthropic.com>`.
5. `git push origin main`.
6. Wait until the GitHub check "Workers Builds: memoria-production" for that commit shows `completed` (`gh run list` / `gh api repos/{owner}/{repo}/commits/<sha>/check-runs`). It deploys a stale build about a minute after each push.
7. Only then run `npx wrangler deploy` from the repo root.
8. Verify live at `https://memoria-production.ahmad000haddad.workers.dev`: request the page about 12 times with a cache-busting query string until every response is the new build (rollout takes about 5 minutes). Do not redeploy during that window.

### 0.7 Report format (after each phase)

For each task ID: `done` / `skipped (already correct)` / `blocked (why)`, the files changed, and how you verified it. State plainly anything you could not test.

---

## Phase 1 — Database exposure (security, do first)

All in one migration: `supabase/migrations/20261116120000_close_open_rpcs.sql`.

Before writing it, run these two checks and keep the output for your report:

- `Grep` for `get_bookings_with_contract|get_photographer_stats|get_booking_payment_status` in `src/` excluding `integrations/supabase/types.ts`. Expected: no callers.
- `Grep` for `create_booking_guarded` and `client_mark_deposit_sent` in `src/`. For every call site, read which client makes the call (`supabaseAdmin.rpc(...)` vs `supabase.rpc(...)` vs a browser import of `@/integrations/supabase/client`).

### 1.1 Drop three unauthenticated SECURITY DEFINER functions — CRITICAL

- **Now:** `get_photographer_stats(uuid)` and `get_bookings_with_contract(uuid)` (`20260623120000_phase6_enhancements.sql:31-114`) are `SECURITY DEFINER`, take any `_photographer_id`, check nothing, and were never revoked from `PUBLIC`. Anyone with the public anon key can read every booking of any photographer, including bride names, phones, emails and prices. `get_booking_payment_status(uuid)` (`20260623140000_phase8_gallery_whatsapp_security.sql:39`) leaks a booking's payment state and has no `search_path`.
- **Required:** if the grep found no callers, drop all three:
  ```sql
  DROP FUNCTION IF EXISTS public.get_photographer_stats(uuid);
  DROP FUNCTION IF EXISTS public.get_bookings_with_contract(uuid);
  DROP FUNCTION IF EXISTS public.get_booking_payment_status(uuid);
  ```
  If a caller exists, do not drop that function; instead add at the top of its body `IF _photographer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;` (convert it to plpgsql) and revoke it from `PUBLIC, anon`.
- **Accept:** after applying, `select proname from pg_proc where proname in (...)` returns no rows (or the guarded version).

### 1.2 `create_booking_guarded` callable only by the server — HIGH

- **Now:** granted to `anon, authenticated` (`20260621120000:143`, `20260622123601:78`). The function trusts `base_price`, `total_price`, `deposit_amount` and contact fields from its JSON payload. Calling it directly skips everything `submitBookingRequest` enforces (subscription active, rate limits, server-side price, hidden packages, approval flag) and lets a script put 30-minute holds on any photographer's dates.
- **Required:** only if **every** call site found by the grep uses `supabaseAdmin`:
  ```sql
  REVOKE ALL ON FUNCTION public.create_booking_guarded(jsonb) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.create_booking_guarded(jsonb) TO service_role;
  ```
  Check the argument type in the latest definition (`20261030100000_overnight_and_contract_lock.sql`); if a `json` overload also exists, revoke that too. If any call site uses the user client, change that call site to `supabaseAdmin` first (it is already inside a server function that validated the input) and then revoke.
- **Accept:** booking from the public page still works end to end; a direct `rpc('create_booking_guarded')` with the anon key returns a permission error.

### 1.3 `client_mark_deposit_sent` callable only by the server — MEDIUM

- **Now:** granted to `anon, authenticated` (last grant `20261027120000:159`). The server function `clientMarkDepositSent` in `src/lib/booking.functions.ts` validates the proof path (`public-tokens/<token>/...`), the terms acceptance and the demo account; the direct RPC skips all three.
- **Required:** same pattern as 1.2. Confirm the server function calls it through `supabaseAdmin`; switch it if not; then revoke from `PUBLIC, anon, authenticated` and grant to `service_role`. Use the exact argument list of the latest definition.
- **Accept:** uploading a receipt from `/track/<token>` still marks the deposit as sent.

### 1.4 Contract signature cannot be forged by the photographer — HIGH

- **Now:** policy `"owner manage contracts"` (`20260510084620:36`) is `FOR ALL` with only `photographer_id = auth.uid()`. A photographer can update their own contract row to `status='signed'` with any `client_signature`/`client_name`; the trigger `contracts_lock_signed` (`20261030100000:56-74`) then hashes and locks it as if the bride had signed.
- **Required:** first read `signContract` in `src/lib/contracts.functions.ts` and confirm it writes with `supabaseAdmin`. Then add a `BEFORE INSERT OR UPDATE` trigger on `public.contracts` that, when the caller is not the service role, raises `42501` if:
  - on INSERT: `NEW.status` is not `'pending'`, or `client_signature` is not null, or the booking `NEW.booking_id` does not belong to `auth.uid()`;
  - on UPDATE: `status`, `client_signature`, `client_name`, `signed_at` (use the real column names from the table definition) differ from `OLD`.
  Detect the service role the same way `guard_booking_direct_updates` does in `20261104140000_abuse_hardening.sql` (read the first lines of that function and copy its exemption test exactly).
- **Accept:** signing from `/contracts/<token>` still works; the photographer can still create and delete a pending contract from the dashboard.

### 1.5 Referral rows cannot be self-inserted — LOW

- **Now:** policy `"system insert referral"` (`20260511064346:21-23`) lets any user insert a referral naming any referrer. The only real writer is `recordReferralAfterSignup` (`src/lib/booking.functions.ts`, near line 591), which validates the code.
- **Required:** confirm that function inserts with `supabaseAdmin`; then `DROP POLICY IF EXISTS "system insert referral" ON public.referrals;`.

**Phase 1 has no code changes unless a call site had to move to `supabaseAdmin`.**

---

## Phase 2 — One day, one truth (double booking)

### Background: the contradiction

`booking_holds(b)` (`20261027120000_booking_approval_flow.sql:28-40`) is the single definition of "this booking occupies its day". For an approved booking waiting for the deposit, it holds only for 48 hours after approval unless `deposit_sent_at` is set. On 2026-11-04 the owner removed the deposit auto-cancel (`20261104130000`), saying: the photographer confirms when she sees the transfer, **or cancels herself to open the date**. So after hour 48 the booking stays `pending_deposit`, the day shows as free to other brides, and the photographer's screens and the cron email still say the date is reserved (`booking-deadlines.ts` ≈ line 166, `focus.ts` task `deposit-wait-`). Then `confirmBookingAfterDeposit` confirms it with no conflict check. Result: two confirmed bookings on one day.

**Decision (matches the owner's words and every on-screen text):** an approved booking that waits for its deposit holds its day until it is confirmed or cancelled. Nothing else releases it.

Migration: `supabase/migrations/20261116121000_holds_and_confirm_guard.sql`.

### 2.1 `booking_holds`: approved pending bookings hold until cancelled

- **Required:** redefine `public.booking_holds(b public.bookings)` exactly as it is now except the third branch. Replace
  ```sql
  OR (b.phone_verified_at IS NOT NULL AND (NOT b.needs_approval OR b.approved_at IS NOT NULL)
      AND (b.deposit_sent_at IS NOT NULL
           OR COALESCE(b.approved_at, b.created_at) >= now() - interval '48 hours'))
  ```
  with
  ```sql
  OR (b.phone_verified_at IS NOT NULL AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))
  ```
  Keep the first two branches (30 minutes unverified, 24 hours awaiting approval) unchanged. Copy the rest of the function from the latest definition, not from this file.
- Check manual bookings: read `src/lib/manual-booking.functions.ts` and see what `phone_verified_at` and `needs_approval` a manual booking gets. A manual booking with `deposit_received=false` must hold its day too. If manual rows have `phone_verified_at IS NULL`, add a branch for them using whatever column marks a row as manual (read the insert), and say so in your report.
- **Accept (SQL, run on prod after applying, replace ids with a test photographer):** an approved `pending_deposit` booking with `approved_at` 5 days ago and no `deposit_sent_at` makes `has_booking_conflict(pid, date, '10:00', '12:00')` return true.

### 2.2 `confirmBookingAfterDeposit` refuses when another booking holds the day

- **File:** `src/lib/booking.functions.ts`, function `confirmBookingAfterDeposit`.
- **Required:** add `start_time, end_time` to the select. Right before the line `const patch: any = { status: "confirmed", ...`, call
  ```ts
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const { data: clash, error: clashErr } = await admin.rpc("has_booking_conflict", {
    _pid: bk.photographer_id, _date: bk.event_date, _start: bk.start_time, _end: bk.end_time, _exclude: bk.id,
  });
  if (clashErr) throw new Error(clashErr.message);
  if (clash) throw new Error(tr("عندكِ حجز آخر يشغل هذا اليوم. ألغي أحدهما أو انقلي موعده قبل التأكيد."));
  ```
  Fail closed: an RPC error stops the confirmation. Reuse the admin import that already exists lower in the function instead of importing twice.
- **Accept:** with two pending bookings on the same date for a "one per day" photographer (create the second by SQL), confirming the first works and confirming the second shows the Arabic error.

### 2.3 Verifying a request re-checks the day

- **Now:** the unverified hold is 30 minutes, but `resendBookingEmailCode` (`booking.functions.ts` ≈ 375) extends the code's validity past that. Bride A verifies at minute 40 after bride B took the day; `markBookingVerified` (`src/lib/verification.server.ts`) has no conflict check, so both hold the day.
- **Required:** in `markBookingVerified`, before setting `phone_verified_at`, load the booking's `photographer_id, event_date, start_time, end_time` and call `has_booking_conflict` with `_exclude` = this booking. If it returns true: soft-delete this booking (`deleted_at = now()`), and throw `tr("هذا التاريخ حُجز قبل تأكيد رقمكِ. اختاري تاريخاً آخر.")`. Read how the two callers (code verification and the `"auto"` path) surface errors and make sure the bride sees this message instead of a generic failure.
- Do not apply this check when the caller is the price-offer acceptance path if that path already checked the conflict in the same request (read `negotiation.functions.ts` ≈ lines 120-130 and 271-304).

### 2.4 Texts stay true

- After 2.1 the texts "the date is still reserved" and "cancel to open the date" are correct. Read `src/routes/api/public/hooks/booking-deadlines.ts` ≈ lines 150-170 and `src/components/dashboard/focus.ts` task `deposit-wait-` and confirm they do not mention a 48-hour release. Fix any sentence that does.
- `src/routes/track.$token.tsx` defines `isExpired` near line 93 and never uses it. Read what it computes. If it models the removed 48-hour expiry, delete the dead variable; do not add an expiry banner.

### 2.5 Closing a day counts the same bookings as the database

- **File:** `src/lib/calendar.functions.ts`, `toggleUnavailability` (≈ line 111). It refuses to close a day only for `confirmed` / `pending_deposit`.
- **Required:** replace the hand-written status filter with a call to `has_booking_conflict(_pid, _date, '00:00', '23:59', null)` through `supabaseAdmin` (the user id is already verified by the middleware). Keep the existing error message.

---

## Phase 3 — Booking lifecycle

### 3.1 Watermark follows payment, not delivery — HIGH

- **Now:** `src/lib/gallery.functions.ts` ≈ line 71: `finalPaid = Boolean(bk.final_paid_at) || bk.status === "completed"`. Moving production to "delivered" sets `status = "completed"` (`production.functions.ts` ≈ line 77), so the watermark disappears on delivery even when the balance is unpaid. The dashboard tells the photographer the opposite ("المعرض سيبقى بعلامة مائية حتى تسجيل الدفعة").
- **Required:**
  1. Add `total_price, deposit_amount` to the select and set
     ```ts
     const remaining = Number(bk.total_price ?? 0) - Number(bk.deposit_amount ?? 0);
     const finalPaid = Boolean(bk.final_paid_at) || remaining <= 0;
     ```
  2. Grep `final_paid` and `status === "completed"` in `gallery.functions.ts`, `track.$token.tsx` and any download endpoint; every place that decides "clean photos / download allowed" must use the same rule. List the places you changed.
  3. Migration (grandfather existing deliveries so past brides do not suddenly see watermarks), in `20261116122000_lifecycle.sql`:
     ```sql
     UPDATE public.bookings
        SET final_paid_at = COALESCE(delivered_at, updated_at, now())
      WHERE status = 'completed' AND final_paid_at IS NULL AND deleted_at IS NULL;
     ```
     Check first whether `guard_booking_direct_updates` or another trigger blocks this update when run from the SQL editor; if it does, read how the trigger exempts privileged sessions and run the statement accordingly.
- **Accept:** deliver a booking with an unpaid balance → gallery from the track page is watermarked; record the final payment → clean.

### 3.2 Rescheduling moves everything that depends on the date — HIGH

- **File:** `src/lib/extras.functions.ts`, `addAddendum` and `respondAddendum`.
- **Now:** accepting a `reschedule` addendum writes `event_date`, clears `ready_confirmed_at` and sets `reminders_sent: []`. It leaves `delivery_due_at` on the old date (the triggers only fill it when NULL), so a wedding moved two months later shows "delivery late" before it happens. It only checks `has_booking_conflict`, which ignores days the photographer closed. In `addAddendum` a failed conflict check is only logged and the proposal goes through.
- **Required:**
  1. `addAddendum`: if `clashErr` is set, throw (`tr("تعذّر التحقق من التاريخ. حاولي مرة أخرى.")`) instead of logging and continuing.
  2. In both functions, after the conflict check, also reject when the new date is in `photographer_unavailability` for this photographer (query the table directly with `supabaseAdmin`: `.eq("photographer_id", ...).eq("date", newDate)`; do **not** call `is_photographer_busy`, because in "one per day" mode it returns true for the booking's own day). Message for the photographer in `addAddendum`: `tr("هذا اليوم مغلق في تقويمكِ. افتحيه أولاً أو اختاري تاريخاً آخر.")`. Message for the bride in `respondAddendum`: reuse the existing "التاريخ الجديد لم يعد متاحاً..." string.
  3. `respondAddendum`, at accept time: reject a new date earlier than today in Jordan with `tr("التاريخ المقترح صار في الماضي. اطلبي من المصوّرة موعداً جديداً.")`.
  4. In the reschedule patch:
     - Load `delivery_days_promised`. If it is not null, set `delivery_due_at` to the new event date plus that many days, computed exactly the way `submitBookingRequest` computes it (`new Date(\`${date}T12:00:00Z\`)` then `setUTCDate`, see `booking.functions.ts` ≈ line 205). If it is null, set `delivery_due_at` to null and check that the existing BEFORE UPDATE trigger (`booking_set_delivery_due` / `set_default_delivery_due`) refills it on update, not only on insert; if it only runs on insert, compute the default the same way that trigger does.
     - Reminders: do not wipe the whole array. Grep every key pushed into `reminders_sent` in `src/routes/api/public/hooks/booking-deadlines.ts` and `email-reminders.ts`. Remove only the keys whose trigger time depends on `event_date` or `delivery_due_at`; keep keys tied to other dates (gallery expiry, deposit waiting). Put the list of removed key prefixes in a comment above the filter.
     - If the booking is `pending_deposit`, do not touch `approved_at`.
  5. Order of writes on accept: do the booking update **first**, and only if it succeeds mark the addendum `accepted`. Today the addendum flips first, so a failed booking update leaves an "accepted" addendum that changed nothing. Keep the `.eq("status","pending")` guard on the addendum update; if that update then returns no row (someone else answered in between), revert the booking fields you just wrote to their previous values and throw the existing "هذا الملحق لم يعد بانتظار ردّكِ" error. Apply the same order to the amount branch (`total_price`).
- **Accept:** confirmed booking with `delivery_days_promised = 30`, event 2026-12-01, moved to 2027-02-01 → `delivery_due_at` is 2027-03-03; no "late delivery" task on the dashboard; proposing a move onto a closed day is refused.

### 3.3 "Delivered" is impossible before the event — MEDIUM

- **File:** `src/lib/production.functions.ts`, `updateProductionStage`, the `if (data.stage === "delivered")` block.
- **Required:** add `event_date` to the booking select and, at the top of that block, the same Jordan-date test `updateBookingStatus` uses for `completed` (read it near line 316 and copy its condition and wording). Message: `t("لا يمكن التسليم قبل يوم التصوير.")`.

### 3.4 A closed booking stops producing "late" tasks — MEDIUM

- **Now:** `updateBookingStatus` allows `confirmed → completed` without touching `production_stage`; afterwards the stage can never change, and the "delivery late" task stays forever.
- **Required:**
  - `src/components/dashboard/focus.ts`: in branch ٢ ("تسليم متأخر") and branch ٥ ("تسليم خلال ٧ أيام"), add `&& b.status !== "completed"` to the condition.
  - `src/lib/calendar.functions.ts` ≈ lines 68-70 (the delivery-due list): exclude `status = 'completed'` the same way.
- Add or extend a vitest test next to the existing focus tests (grep `focus` under `src/**/*.test.ts*`): a completed booking with `production_stage: "editing"` and a past `delivery_due_at` yields no `late-` item.

### 3.5 No "balance not paid" task when nothing is owed — MEDIUM

- `focus.ts` branch ٦ (`production_stage === "delivered" && !b.final_paid_at`): add the same exclusion the `else if` below it already has: `&& !(typeof b.total_price === "number" && b.total_price - (b.deposit_amount ?? 0) <= 0)`.
- `src/routes/_authenticated/dashboard.bookings.$id.tsx` ≈ line 495: the "final payment not received / record payment" block must not render when the remaining amount is `<= 0`. Reuse the `remaining` value the header already computes (≈ line 579); do not compute it a second time.
- Add a vitest case: delivered booking, `total_price 300`, `deposit_amount 300`, no `final_paid_at` → no `final-` item.

### 3.6 Reminder dates use Jordan time — MEDIUM

- **File:** `src/routes/api/public/hooks/email-reminders.ts`. The "tomorrow" reminder (≈ lines 70-72) and the "balance due yesterday" block (≈ 203-208) build dates from `new Date().toISOString()` (UTC). Section 4 (≈ 329-332) uses `setHours(0,0,0,0)` on a UTC server.
- **Required:** find the Jordan-day helper already used in this file (≈ line 164) or in `booking-deadlines.ts` (≈ line 198) and use it for all three. Do not change which bookings are selected in any other way.

### 3.7 Cancelled bookings: no gallery, no gallery reminders — LOW

- `gallery.functions.ts`, the token gallery handler: if `bk.status === "cancelled"`, return the same shape as "no gallery" (`{ gallery: null, photos: [], final_paid: false }`).
- `booking-deadlines.ts` gallery-expiry reminders (≈ 303-327): skip bookings whose status is `cancelled` or that have `deleted_at`.

### 3.8 Photos promised for photo+video packages — MEDIUM

- `booking.functions.ts` ≈ line 202: change `m.service === "photography"` to `(m.service === "photography" || m.service === "photo_video")`.
- Grep `service === "photography"` across `src/` and check each hit: wherever the logic means "this package delivers photos", `photo_video` must be included. List every hit and your decision in the report. Do not change hits that are about display labels or filters.

---

## Phase 4 — Subscriptions

Migration: `supabase/migrations/20261116123000_subscription_payment_atomic.sql`.

### 4.1 One atomic function for "a subscription payment was accepted" — HIGH

- **Now:** three code paths extend a subscription, each differently:
  - `adminApproveSubscriptionPayment` (`src/lib/admin.functions.ts` ≈ 342-407): checks `status !== "pending"` in JS, then updates by id only. Two concurrent approvals both pass and the period is extended twice. Never grants the referral reward. This is the **main** path (Zbooni).
  - `settleSubscriptionPayment` (`src/lib/paytabs.server.ts` ≈ 150-185): flips the row atomically, but if the subscription upsert fails it only logs, and the payment is lost. Grants the referral reward.
  - `adminRenewSubscription` (`admin.functions.ts` ≈ 180-221): ignores remaining trial days, does not set `tier`, no referral reward.
- **Required:** create
  ```sql
  public.apply_subscription_payment(_payment_id uuid, _months int, _actor uuid, _reference text DEFAULT NULL, _notes text DEFAULT NULL)
  RETURNS jsonb  -- { ok, already, period_end, photographer_id, tier }
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
  ```
  Body, in one transaction:
  1. `UPDATE subscription_payments SET status='approved', reviewed_at=now(), reviewed_by=_actor, period_months=_months, payment_reference=COALESCE(_reference, payment_reference), notes=COALESCE(_notes, notes) WHERE id=_payment_id AND status='pending' RETURNING photographer_id, tier`. If no row: return `{ ok: true, already: true }` and do nothing else.
  2. `SELECT ... FROM subscriptions WHERE photographer_id = ... FOR UPDATE`.
  3. `start = GREATEST(now(), current_period_end, CASE WHEN status='trial' THEN trial_ends_at END)` (nulls ignored).
  4. `end = start + make_interval(months => _months)`.
  5. Upsert the subscription: `status='active'`, `tier = COALESCE(payment.tier,'pro')`, `current_period_start = now()`, `current_period_end = end`, keep `trial_ends_at` if present else `now()`.
  6. `PERFORM public.grant_referral_reward(photographer_id);`
  7. Insert the audit row (`audit_logs`, action `subscription.approve`, same fields the JS writes today). Check `audit_logs` column names in its migration.
  8. Return the JSON.
  Use the real column names and enum types from the migrations (`20261014120000_zbooni_subscriptions.sql`, `20261027180000_basic_pro_tiers.sql`). `REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;`
- Code:
  - `adminApproveSubscriptionPayment`: keep `ensureAdmin`, the validator and the "not found" check; replace everything from "Mark payment as approved" to the audit insert with one `supabaseAdmin.rpc("apply_subscription_payment", { _payment_id, _months, _actor: userId })`. If the result has `already: true`, throw the existing `"تمت معالجة هذه الدفعة سابقًا"` error.
  - `settleSubscriptionPayment`: keep all PayTabs verification (amount, currency, cart id) untouched. Replace the block from the `.update({ status: "approved" ...` call through the `grant_referral_reward` call with the RPC (`_months = Number(row.period_months) || 1`, `_actor = row.photographer_id`, `_reference = tranRef`, `_notes` = the existing notes string). On RPC error, throw so the hook returns a failure and PayTabs retries (the payment row is still `pending` because the function is atomic). Keep the notification insert after it, using `period_end` from the result.
  - `adminRenewSubscription` (manual grant without a payment row): keep it in JS but (a) include the trial end in `start` exactly like the approve path did (`status === "trial" && trial_ends_at`), (b) do not write `tier` (a manual grant keeps the current tier; that is intended), (c) leave the rest.
- **Accept:** approve a pending Zbooni payment → subscription extended once, payment `approved`, audit row written; call the server function twice quickly → the second returns the "already processed" error and the period is unchanged; if the photographer was referred, the referrer's period grows by 14 days and `referrals.reward_granted` is true.

### 4.2 Referral reward works for a referrer whose trial ended — MEDIUM

- **Now:** `grant_referral_reward` (latest body in `20261004200000_fix_broken_functions.sql:237-320`; grep for a later redefinition first). For a referrer with `status='trial'` and `trial_ends_at` in the past it extends `current_period_end` but leaves `status='trial'`; `is_subscription_active` ignores `current_period_end` for trial rows, so the 14 days are never usable while `reward_granted` is already true.
- **Required:** redefine the function, changing only the branch selection:
  - `status='trial'` and `trial_ends_at > now()` → `trial_ends_at = trial_ends_at + 14 days` (as now).
  - `status='trial'` and `trial_ends_at <= now()` (or null) → `trial_ends_at = now() + 14 days` (she gets 14 fresh trial days; status stays `trial`).
  - any other status → `current_period_end = GREATEST(now(), current_period_end) + 14 days`, and if the status is `expired` set it to `active`.
  Read `is_subscription_active` (latest definition) before writing, and make sure each branch produces a row that function treats as active.

### 4.3 Expiry does not unpublish the profile — MEDIUM

- **Now:** the cron in `email-reminders.ts` ≈ lines 357-361 sets `profiles.is_published = false` when a subscription ends. No renewal path sets it back, so a photographer who pays again stays invisible until she finds the toggle. The unpublish is also unnecessary: visibility already depends on `is_subscription_active` in RLS and in the search RPC.
- **Required:**
  1. Prove the claim first: read the latest `profiles` SELECT policies, `get_public_profile_data` and `search_photographers` and confirm each hides a photographer whose subscription is not active. Quote the lines in your report. **If any of them shows an expired photographer, stop this task and report.**
  2. Delete only the `profiles` update (the block commented `// تعطيل الملف الشخصي تلقائياً`). Keep the `subscriptions.status = 'expired'` update and the email.
  3. One-time repair in this phase's migration: republish photographers that the cron hid and who are active again:
     ```sql
     UPDATE public.profiles p SET is_published = true, updated_at = now()
      WHERE p.is_published = false AND p.deleted_at IS NULL
        AND p.onboarding_completed_at IS NOT NULL
        AND public.is_subscription_active(p.id)
        AND EXISTS (SELECT 1 FROM public.email_log e
                     WHERE e.related_user_id = p.id AND e.template = 'subscription_expired_today');
     ```
     Before running the UPDATE, run it as a `SELECT p.id, p.username` and put the rows in your report. Check the real `email_log` column names.

### 4.4 PayTabs callback rejects a bad signature — LOW

- `src/routes/api/public/hooks/paytabs.ts` ≈ lines 33-34 and 47-49 only `console.warn` on a signature mismatch and continue. Return `new Response("invalid signature", { status: 401 })` in both places. Read how the signature is computed and make sure a callback that legitimately arrives without a signature (if the code handles such a case, e.g. the browser return URL) is not broken; if the same handler serves both the server callback and the browser return, apply the 401 only to the server callback branch.

### 4.5 Left alone on purpose

- Tier changes in the middle of a paid period take effect immediately (Basic→Pro upgrades the remaining days, Pro→Basic downgrades them). This needs an owner decision; do not change it.
- The legacy Stripe/HyperPay subscription code (`createSubscriptionCheckout` in `payments.functions.ts`, `hooks/payment.ts`) is broken but has no UI caller. Do not touch it; report whether any caller exists (`Grep createSubscriptionCheckout`).

---

## Phase 5 — Profile publishing, cache, push

### 5.1 Autosave never writes `is_published` — HIGH

- **Now:** `save()` in `src/routes/_authenticated/dashboard.profile.tsx` (≈ lines 194-210) writes the whole profile, including `is_published: !!cur.is_published`, from in-memory state. That state can come from the localStorage page cache or a stale tab. If an admin (or a report) hid the profile after the cache was written, the next autosave of a bio edit publishes it again.
- **Required:**
  1. Remove `is_published` from the autosave update object.
  2. The publish toggle (≈ lines 301-307) writes `is_published` by itself: on click, after the existing 3-photos check, run a dedicated `supabase.from("profiles").update({ is_published: next }).eq("id", uid)`, and only on success update local state and the page cache; on error show the server's message with `toast.error` and leave the toggle where it was. Read lines ≈ 222-235 (the `wasPublished` logic that fires side effects when publishing changes) and keep those side effects attached to the new dedicated write.
  3. Grep for other writers of `is_published` from the browser (`onboarding.tsx` ≈ line 254 is one). They are fine as dedicated writes; make sure none of them is part of a whole-row autosave.

### 5.2 A hidden profile cannot be re-published by its owner — HIGH

Migration `supabase/migrations/20261116124000_publish_guard.sql`:

- Add `profiles.moderation_hidden_at timestamptz` (nullable).
- Read `trg_protect_profile_admin_columns` (`20261004220000_protect_profile_admin_columns.sql`) and extend its function so a non-service, non-admin caller cannot change `moderation_hidden_at` or `is_demo` (the audit found `is_demo` unprotected). Copy the function's existing exemption logic; add only the two columns.
- New `BEFORE UPDATE OF is_published` trigger on `profiles`: when `NEW.is_published AND NOT OLD.is_published` and the caller is not service role / admin, raise `42501` with message `PROFILE_HIDDEN_BY_ADMIN` if `moderation_hidden_at IS NOT NULL`, and `SUBSCRIPTION_INACTIVE` if `NOT public.is_subscription_active(NEW.id)`.
- Code:
  - `src/lib/admin.functions.ts`: the admin unpublish / toggle functions (≈ lines 130-175) set `moderation_hidden_at = now()` when hiding and `null` when publishing.
  - `src/lib/profile-reports.functions.ts` ≈ line 106 (auto-unpublish after reports): also set `moderation_hidden_at = now()`.
  - In the toggle from 5.1, map the two error codes to Arabic toasts: `tr("صفحتكِ موقوفة من الإدارة. تواصلي مع الدعم.")` and `tr("اشتراككِ منتهٍ. جدّديه لتظهر صفحتكِ.")` (use the `g()` helper if the file has it).
- **Accept:** admin hides a profile → photographer edits bio → still hidden; photographer flips the toggle → Arabic error, still hidden; admin publishes → visible.

### 5.3 Onboarding gate does not trap accounts without a profile — MEDIUM

- **File:** `src/lib/onboarding-gate.ts`, `checkOnboarding`. When the `profiles` query returns no row (an admin-only account), it returns `!isOnboardingDeferred()` and sends the user into a photographer wizard that cannot save.
- **Required:** after the two queries, `if (!p) return false;`. Nothing else.
- Also in `src/routes/_authenticated/onboarding.tsx` `finish()` (≈ lines 237-246): the package count there must exclude add-ons the same way the gate does (`.neq("package", "addon")`).
- Do **not** change the rule that Google sign-ups become photographers; that is intended (brides have no accounts).

### 5.4 Sign-out leaves nothing of the previous user on the device — MEDIUM

- **File:** `src/lib/auth.ts` `signOut()` and `src/lib/page-cache.ts` `clearAppCache()`.
- **Required in `clearAppCache`:** also remove these keys (confirm each by Grep before adding; add any other key you find that stores booking or bride data): `memoria:last-booking`, every key starting `memoria:draft:`, `memoria:dashboard-last-visit`. Keep theme, language, last-login-account and `memoria-onb-done:*` keys.
- **Required in `signOut`:** before `supabase.auth.signOut()`, inside a `try/catch` that never blocks sign-out:
  1. if `"serviceWorker" in navigator`, get `registration.pushManager.getSubscription()`;
  2. if there is one, delete this user's row: `supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)` (RLS limits it to their own row), then `sub.unsubscribe()`;
  3. call `clearAppCache()` (check whether it is already called on the `SIGNED_OUT` event in `use-auth-state.ts`; if yes, do not call it twice).
- **Push for the next user:** `ensurePushSubscription` in `src/lib/push-client.ts` upserts on `(user_id, endpoint)`, so a second account on the same browser adds a second row for the same endpoint and the device receives both users' booking notifications (bride name and phone). Add a server function in `src/lib/push.functions.ts`, `claimPushEndpoint({ endpoint })`, with `requireSupabaseAuth`, that uses `supabaseAdmin` to delete rows where `endpoint = data.endpoint AND user_id <> userId`. Call it in `ensurePushSubscription` right before the upsert. Validate `endpoint` is an `https://` URL of at most 1000 characters.
- `src/components/dashboard/PushOptIn.tsx`: key the dismiss flag by user id (`<existing key>:<uid>`).
- **Accept:** user A enables push, signs out → `push_subscriptions` has no row for that endpoint; user B signs in and enables push → exactly one row for the endpoint, owned by B.

### 5.5 Cached dashboard is not shown for an expired session — MEDIUM

- **File:** `src/lib/page-cache.ts` `currentUidSync()`. It takes the first `sb-*-auth-token` key and returns its user id without checking expiry.
- **Required:** parse the stored session once; return the uid only if the object has a `refresh_token` and its `expires_at` (seconds) is later than `now - 7 days`. Otherwise return null (the guard then waits for the real session check instead of painting cached bookings). If more than one `sb-*-auth-token` key exists, prefer the one whose name contains the project ref taken from `import.meta.env.VITE_SUPABASE_URL`. Read `src/routes/_authenticated.tsx` and `src/hooks/use-auth-state.ts` to confirm a null result leads to the normal async check and not to an immediate redirect loop.

### 5.6 Undo after deleting a package restores only that package — LOW

- `src/routes/_authenticated/dashboard.pricing.tsx` ≈ lines 122-147: the undo handler does `setRules(before)`, discarding edits made to other packages during the undo window. Change it to re-insert only the deleted row at its original index: `setRules((cur) => { const next = [...cur]; next.splice(Math.min(idx, next.length), 0, removed); return next; })`. Read the block and keep the server-side restore call as it is.

---

## Phase 6 — Bride-side consistency

### 6.1 The booking form accepts weddings that end after midnight — HIGH

- **Now:** `src/routes/photographers/$username.tsx` ≈ line 1010 blocks submit when `toMin(end) <= toMin(start)`. The server (`sessionMinutes` in `src/lib/validation.ts`) and the database treat an end before the start as "past midnight" (migration `20261030100000` explicitly allows 20:00–02:00), and the price-offer form already accepts it.
- **Required:** block only `toMin(end) === toMin(start)` (keep the same toast). Then read every use of `start`/`end`/`toMin` in the component: duration, price for hourly packages, the `hasConflict` calculation and any displayed "N hours" must use `sessionMinutes` from `@/lib/validation` (import it) so an overnight session is not negative. When the end is earlier than the start, show a small muted hint under the time fields: `tr("ينتهي بعد منتصف الليل")`.
- **Accept:** 20:00 → 02:00 submits and the server stores a 6-hour session; 18:00 → 18:00 is refused.

### 6.2 Booking is refused for unpublished or deleted photographers — MEDIUM

- `submitBookingRequest` (`booking.functions.ts` ≈ lines 57-60) checks only `is_subscription_active`. Add: load `is_published, deleted_at` for the photographer (the profile is probably already selected a few lines below; extend that select rather than adding a query) and throw `tr("الصفحة غير موجودة")` when `!is_published || deleted_at`. Do the same at the top of `submitPriceOffer` in `negotiation.functions.ts`. Exempt nothing: demo profiles are published.

### 6.3 Deposit never exceeds the total — LOW

- `booking.functions.ts` ≈ lines 143-147 and the matching computation in `negotiation.functions.ts` (≈ line 262): after computing the deposit, clamp: `deposit = Math.min(deposit, total)`.

### 6.4 Recovering a tracking link actually finds the booking — MEDIUM

- **File:** `src/lib/recover.functions.ts`.
- **Required:**
  - Statuses: `["pending_deposit", "confirmed", "completed"]` (a bride needs her link most after delivery).
  - Phone: normalise the input with the same function `booking.functions.ts` uses when storing `client_phone` (≈ lines 29-31; export it from where it lives or move it to `src/lib/validation.ts` and import it in both files without changing its behaviour). It must turn `+962791234567`, `00962791234567` and Arabic-Indic digits into the stored form; if the existing normaliser does not handle Arabic-Indic digits, add that conversion inside it.
  - Email: compare case-insensitively. Use `.ilike("client_email", escaped)` where `escaped` is the trimmed input with `\`, `%` and `_` backslash-escaped, so it is an exact case-insensitive match and not a pattern.
  - Keep the identical "success" response for found and not-found (it prevents enumeration).

### 6.5 An accepted price offer becomes a complete booking — MEDIUM

- **Now:** accepting an offer (`negotiation.functions.ts` ≈ lines 271-304) creates the booking and auto-verifies it but skips what `submitBookingRequest` does after insert (≈ lines 191-221): `package_snapshot`, `photos_promised`, `delivery_days_promised`, `delivery_due_at`, `overtime_fee_per_hour`. It then calls `markBookingVerified(..., "auto")`, which sends the photographer "new request awaiting your approval, 24h" for an offer she herself accepted.
- **Required:**
  1. In `booking.functions.ts`, extract the post-insert "promises" block into an exported async helper in a server-only module (create `src/lib/booking-promises.server.ts`): `applyPackagePromises(admin, { bookingId, eventDate, mainRule, items, profile })` that performs exactly the update the block performs today. `submitBookingRequest` calls the helper; behaviour there must be byte-for-byte the same (same fields, same values).
  2. Call the helper from the offer-accept path with the offer's package rule. Read how the offer stores its package (`price_offers` columns in `20261018120000_price_offers.sql`) and load the `pricing_rules` row the same way `submitBookingRequest` loads `mainRule`. If an offer has no package rule (free-form offer), skip the helper.
  3. Notification: read `markBookingVerified` and `notifyNewBooking` in `verification.server.ts` / `notify.server.ts`. Add an optional parameter so the offer path sends "العروس وافقت على عرضكِ — بانتظار العربون" instead of the approval-request text. Do not change the message for normal requests.
  4. `needs_approval` stays false for accepted offers (the photographer already agreed by making the offer).

### 6.6 Pending-request limits count only live requests — LOW

- `booking.functions.ts` ≈ lines 72-88 count `pending_deposit`/`quote` rows per phone. After Phase 2 an approved request stays pending until someone cancels it, so the limit of 6 is reached by old abandoned requests. Restrict both counts to requests created in the last 30 days: `.gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString())`.

---

## Phase 7 — Direct database writes on bookings (do last, highest regression risk)

### 7.1 Photographers cannot move a booking's state by raw API calls — HIGH

- **Now:** RLS lets a photographer update her own bookings; the trigger `guard_booking_direct_updates` (`20261104140000_abuse_hardening.sql:55-96`) protects many columns but not `status` (except → `cancelled`), `production_stage`, `delivered_at`, `deposit_confirmed_at`, `final_paid_at`, `editing_started_at`, `editing_completed_at`. With her own session token she can mark a future booking `completed` (inflating the public completed count and unlocking a review), revive a cancelled booking, or skip production guards.
- **This task has two halves and the code half must ship first.**

**Half A — code (deploy and verify before any SQL):**
1. Grep every write to bookings that does not go through `supabaseAdmin`: `Grep 'from\("bookings"\)' src` and, for each hit followed by `.update(`, note the file, the client variable and the columns written. Include React components that import `@/integrations/supabase/client` directly.
2. For each write that touches one of the seven columns above:
   - in a server function: it already verifies `photographer_id === userId` (check; if not, add it). Change only the write itself to `supabaseAdmin`. Known cases: `confirmBookingAfterDeposit`, `updateProductionStage`, `updateBookingStatus`, `markFinalPaymentReceived`.
   - in a browser component: move it into an existing server function for that action if one exists, otherwise create a small server function with `requireSupabaseAuth`, an ownership check, and the same validation the UI did.
3. Put the full table (file, function, columns, what you changed) in the report.
4. Deploy. Exercise in the browser: confirm deposit, each production stage forward and back, mark completed, record final payment, optimistic stage move with a forced failure. All must work **before** half B.

**Half B — migration `20261116125000_guard_booking_state.sql`:**
- Redefine `guard_booking_direct_updates`, copying the latest body and adding to the protected list: `status`, `production_stage`, `delivered_at`, `deposit_confirmed_at`, `final_paid_at`, `editing_started_at`, `editing_completed_at`. With `status` fully protected, the separate `USE_CANCEL_BOOKING` block becomes unreachable for direct callers; keep it anyway.
- Before applying, re-run the grep from A.1 on the deployed commit. If any user-client write to those columns remains, do not apply.
- **Accept:** every action in A.4 still works; a raw `supabase.from('bookings').update({ status: 'completed' })` with a photographer session fails with `PROTECTED_BOOKING_FIELD`.

---

## Not in scope (known, decided or needs the owner)

| Item | Why it is left |
|---|---|
| Remaining-amount model ignores partial payments; `final_paid_amount` is stored and never read; reports count booked revenue, not cash received | Modelling change, needs an owner decision on what reports should show |
| Refund percentage read at cancel time instead of when the bride accepted | The bride side already snapshots terms (`stampDepositTerms`); confirm with the owner before changing SQL |
| Declining a substitute-photographer addendum does nothing although the email promises a refund | Money is off-platform; needs an owner decision on wording vs. flow |
| Signed contract keeps the old date/amount after a reschedule or discount | Needs a product decision (void and re-sign vs. addendum is the amendment) |
| Auto-verification when no WhatsApp/email channel works | Waits for the email domain |
| Zbooni amount is matched by the admin by eye | Needs Zbooni API access |
| Reports / WhatsApp templates gated only in the client | Low value to bypass |
| Mid-period tier change policy | Owner decision |
| Admin funnel stage definitions | Analytics only; separate task |
| `types.ts` regeneration, legacy Stripe path, anon-callable `photographer_tier` | Cleanup, separate task |
| Multi-bookings-per-day mode treats an overnight booking as ending at 23:59 | Edge case in a rarely used mode |
