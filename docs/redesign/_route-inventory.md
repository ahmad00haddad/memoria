# Route inventory (behaviour baseline for redesign)

Repo: `C:\Users\ahmad\memoria`. Snapshot read-only, no source changed.

**Coverage legend** (read this first):
- FULL = whole file read in this pass (shell, nav, api/public/**, small pages).
- GREP = large file (300+ lines) covered by targeted grep only (Supabase calls, server fn imports, storage, links, localStorage, confirm dialogs, status maps). Any UI detail not listed there = `not verified`.
- Server fn → route mapping comes from import lines; multi-line imports may be missed (`not verified`).
- Server fn bodies (`src/lib/*.functions.ts`) were NOT read; only their names and call sites.

Audience values: bride, photographer, admin, public, server-only.

---

## PUBLIC PAGES

### /  (`src/routes/index.tsx`)  [GREP, 790 lines]
- Audience: public (bride/visitor, photographer)
- Purpose: landing page. Chooses visitor role (bride vs photographer) and shows the matching CTA set.
- Auth/guards: none (reads session for subscription line only, `not verified` detail).
- Data read: `reviews`, `profiles`, `subscriptions` (direct supabase, lines 140/172/199); `listPublishedCities` (search.functions, import line 5); `sub.status === "trial" ? trial_ends_at : current_period_end` (line 210).
- Data written: none found by grep.
- Forms & validation: not verified.
- Uploads/downloads/share: none found.
- External links: not verified.
- Client state: localStorage `memoria_last_search` (read, line 235), `memoria_visitor_role` (read line 253, write line 265; exported const `VISITOR_ROLE_KEY`). Consumed also by Header/MobileTabBar.
- Overlays: not verified.
- Realtime/timers: none found.
- Mobile: not verified.
- Conditional UI: visitor-role-dependent content (not verified detail); subscription trial/current period logic (line 210).

### /app  (`src/routes/app.tsx`)  [GREP, 322 lines]
- Audience: public
- Purpose: "install the app" (PWA) page; imports Header/Footer and PwaInstallPrompt-related install flow (`not verified` detail).
- Auth/guards: none found.
- Data read/written: none found by grep.
- Client: `window.__deferredInstallPrompt` (set in __root.tsx line 313), event `pwa-installable`.
- Other: `not verified`.

### /about  (`src/routes/about.tsx`)  [GREP, 73 lines]
- Audience: public. Purpose: static "about" text page.
- Auth: none. Data: none. Writes: none.
- Layout: Header + Footer. Other: none.

### /contact  (`src/routes/contact.tsx`)  [GREP, 172 lines]
- Audience: public. Purpose: contact form.
- Data written: insert into `contact_messages` (line 46-47). Triggered by form submit (label not verified).
- Forms: not verified (fields/validation).
- Layout: Header + Footer.

### /faq  (`src/routes/faq.tsx`)  [GREP, 82 lines]
- Audience: public. Purpose: static FAQ. Data: none. Layout: Header + Footer. Other: not verified.

### /terms  (`src/routes/terms.tsx`), /privacy  (`src/routes/privacy.tsx`), /refund-policy  (`src/routes/refund-policy.tsx`)  [GREP]
- Audience: public. Purpose: static legal text. Data: none. Layout: Header + Footer.
- Note: refund-policy text is the public policy shown alongside `updateRefundPolicy` (cancellation.functions) in dashboard settings.

### /for-clients  (`src/routes/for-clients.tsx`), /for-photographers  (`src/routes/for-photographers.tsx`)  [GREP]
- Audience: public (bride / photographer marketing). Purpose: feature pitch pages. Data: none found. Layout: Header + Footer.
- Note: `/for-photographers` is the target of the MobileTabBar "المميزات" tab for visitor role photographer.

### /pricing  (`src/routes/pricing.tsx`)  [GREP, 197 lines]
- Audience: public. Purpose: plan pricing for photographers.
- Data: prices come from `src/lib/plans.ts` (Basic 15 / 180 yearly; Pro 20 / 200; legacy Pro 7 / 70). Route read of `plans.ts` not verified; `plans.ts` read FULL.
- Layout: Header + Footer. Mobile tab bar shows "الأسعار" to visitor-photographer and guests (not logged in only, MobileTabBar line 86).

### /guide  (`src/routes/guide.tsx`)  [GREP, 353 lines]
- Audience: public (bride). Purpose: "how it works" for brides. Data: none found. Layout: Header + Footer.

### /game  (`src/routes/game.tsx`)  [GREP, 30 lines]
- Audience: public. Purpose: mini game page (`BrideGame` component). Data: none. Layout: not verified (imports Header/Footer).
- Note: Footer links `<a href="/game/">` (trailing slash) — route is `/game`. Not verified whether this resolves.

### /blog  (`src/routes/blog.index.tsx`, 62 lines) and /blog/$slug  (`src/routes/blog.$slug.tsx`, 114 lines)  [GREP]
- Audience: public. Purpose: blog listing and article. Data: not verified (content source not read).
- Layout: Header + Footer on both.

### /occasion/$type  (`src/routes/occasion.$type.tsx`, 44 lines)  [GREP]
- Audience: public. Purpose: SEO landing for occasion (engagement, henna linked in Footer). Renders `SeoLanding` (`src/components/site/SeoLanding.tsx`, imports Header/Footer). Data: not verified.

### /wedding-photographer/$city  (`src/routes/wedding-photographer.$city.tsx`, 47 lines)  [GREP]
- Audience: public. Purpose: SEO landing per city (Footer links amman, irbid, aqaba). Renders `SeoLanding`. Data: not verified.

### /search  (`src/routes/search.tsx`, 869 lines)  [GREP]
- Audience: public (bride) — main discovery page.
- Purpose: search published photographers by city, max price, date, verified-only, compare.
- Auth/guards: none.
- Data read: server fn `searchPhotographers` (search.functions.ts:57, rpc `search_photographers`, then rpc `pro_photographers`); `listPublishedCities` (search.functions.ts:142). Client-side filter `verification_status === "verified"` (line 158 and badge line 824).
- Data written: none.
- Forms: filters (city, maxPrice, date, verifiedOnly, sort, not verified in detail).
- Client state: localStorage `memoria_favs` (JSON array; read lines 92, 717, 726; write 735); `memoria_last_search` (JSON `{city, maxPrice, date}`; read 93, write 135). URL: `window.location.search` read at line 86 (`sp`); other params not verified.
- Overlays: vaul `Drawer` (mobile filter sheet, lines 257-266, `pb-safe` class). Compare mode: `src/components/search/CompareMode.tsx` (not read; server fn `getCompareDetails` → rpc `pro_photographers`, compare.functions.ts).
- Loading/empty: `GridSkeleton` (ui/loading), `EmptyState` (ui/empty-state).
- Mobile: Header shows "ابحث عن مصوّر" hidden below sm; MobileTabBar shows "البحث" tab for visitor-client or guest.

### /photographers/$username  (`src/routes/photographers/$username.tsx`, 1720 lines)  [GREP — largest public page]
- Audience: public (bride) — photographer public profile and booking funnel.
- Purpose: profile, packages, booking request (multi-step), price offer, ask question, report profile.
- Auth/guards: none (anonymous booking allowed; email code verification).
- Data read: direct `profiles` (lines 62, 233 — select incl. `verification_status`, `page_settings`, `team_gender`, `gender`, `fixed_deposit`); `pricing_rules` (line 70); server fns `getPhotographerProfileData` (profile.functions: rpc `get_public_profile_data`, `photographer_tier`, `is_subscription_active`), `getPublicDepositInfo` (booking.functions:558), `getBookingByToken` (booking.functions:276, rpc `get_booking_by_token`), `optimizedImageUrl`, `responsiveSrcSet` (gallery.functions).
- Data written (server fns): `submitBookingRequest` (booking.functions:52; rpc `is_subscription_active`, `visible_pricing_ids`, `create_booking_guarded`); `submitPriceOffer` (negotiation.functions:86; rpc `is_subscription_active`, `photographer_tier`, `is_photographer_busy`, `has_booking_conflict`); `verifyBookingEmailCode` / `resendBookingEmailCode` (booking.functions:329/358, via VerifyBookingPanel); `askPhotographer` (not verified mount point, `AskPhotographer` component).
- Forms & validation: booking form fields and steps not verified in detail. Draft persisted (see client state). `StepUpBox` used for code entry (`not verified`).
- Uploads: none. Downloads: none.
- Share: `navigator.share({title, url})` else `navigator.clipboard.writeText(url)` + toast "نُسخ الرابط" (lines 727-728); copy button line 1145; WhatsApp link `https://wa.me/?text=` + "رابط تتبّع حجزي في ميموريا:" + url (line 1149). Copy CLiQ alias to clipboard (line 1553).
- External links: wa.me (line 1149); `cliqAlias` shown with copy (CliQ payment, line 1553).
- Client state:
  - localStorage `memoria.my-bookings` (`MY_BOOKINGS_KEY`, JSON array of this device's bookings; lines 829, 1041-1043).
  - localStorage `memoria.booking-draft.<username>` (draft `{f, addonQty, step, consent}`; lines 845, 885, 901, 907).
  - localStorage `memoria.booking-success.<username>` (success state; lines 873, 876, 883).
  - cookie `memoria_lang` read (line 221) to decide default language.
- Overlays: `Popover` (line 1272-1282), `Lightbox` (portfolio), `VerifyBookingPanel`, `AskPhotographer`, `BookingJourney`, `useConfirm` (askConfirm line 864), `canvas-confetti` on success.
- Realtime/timers: not verified.
- Mobile: MobileTabBar hidden on `/photographers/*` except `/photographers/join` (MobileTabBar line 30). Page renders its own sticky booking CTA (not verified).
- Conditional UI: `profile.verification_status === "verified"` → `VerifiedBadge` (line 501); `is_pro` flag (line 248) gates verification display; unpublished/deleted profiles (not verified).

### /photographers/join  (`src/routes/photographers/join.tsx`, 339 lines)  [GREP]
- Audience: public → becomes photographer. Purpose: sign-up / join flow.
- Auth/guards: none (sign-up).
- Data written: `profiles` insert/update (lines 88, 126 — not verified which op); server fn `recordReferralAfterSignup` (booking.functions:574).
- Client state: sessionStorage `pending_referral_code` (line 55; consumed and removed by dashboard index lines 460-467); URL `?ref=<code>` (line 51), `?email=<email>` prefill (line 59).
- Forms: not verified.
- Layout: Header + Footer. Visitor role `photographer` sends user here from Header/MobileTabBar.

### /track/$token  (`src/routes/track.$token.tsx`, 1107 lines)  [GREP — bride booking tracker]
- Audience: bride (token link, no login).
- Purpose: track booking, pay deposit (PayTabs/Zbooni/manual CliQ), upload receipt, sign contract link, gallery selection, messages, cancel, review, reports.
- Auth/guards: token only (`getBookingByToken`, booking.functions:276).
- Data read: `getBookingByToken`; `getGalleryByToken`, `getMessagesByToken` (gallery.functions); `getPublicDepositInfo`.
- Data written: `clientCancelBooking` (cancellation.functions:108, rpc `client_cancel_booking`); `clientMarkDepositSent` / `clientMarkReceived` / `clientAddNote` (booking.functions:408/461/479); `sendMessageByToken` (gallery.functions:227); `reportChatByToken` (profile-reports.functions:139); `clientEditDetails`, `respondAddendum`, `requestEmailFix`, `replyToReview`... (extras.functions: `BrideExtras`, `BrideEditDetails`, `BrideEmailFix` components); `confirmReady`, `withdrawAddendum` (not verified where mounted).
- Uploads: receipt image uploaded to storage (line 293, `.upload(path, finalFile, {upsert:false})`), compressed with `browser-image-compression` (dynamic import line 269); if compression can't shrink, asks for screenshot (line 280). Bucket name not verified (see line ~290).
- External links: Google Calendar add-event link `https://calendar.google.com/calendar/render?action=TEMPLATE&...` (line 138, opened via window.open); `https://wa.me/<whatsapp>` (lines 203, 749) after confirm "التحويل لواتساب".
- Client state: URL `?payment=success|failed|cancelled|pending` read then removed via `searchParams.delete("payment")` (lines 175-182; PayTabs/Zbooni return).
- Overlays: `useConfirm` dialogs: "التحويل لواتساب" (lines 202, 748, confirm text "حسناً"); "تأكيد الاستلام" (line 324, "تأكيد"); `Lightbox` (line 26); `ChatReport` (line 22); `PaymentMethodsView` (line 19); `StepUpBox` (line 38); `CopyButton` (line 31).
- Realtime/timers: polling `setInterval(() => { if (!busyRef.current) load(); }, 120000)` (line 189), and `setInterval(load, 15000)` (line 1061 — same file; the 15s interval is in the gallery/messages part `not verified`).
- Conditional UI: `isExpired` = pending_deposit and deposit_due_at past (line 93); `awaitingApproval` (needs_approval & not approved, line 95); shoot/balance/editing/delivered progress steps (lines 370-375); gallery blurred unless status completed (line 502); cancelled block with refund status `refunded` (line 667-678); contract step CTA "وقّعي عقد التصوير" vs "عقد التصوير موقَّع" (lines 732-735); deposit/remaining computed from `BookingJourney`.
- Mobile: not verified.

### /offer/$token  (`src/routes/offer.$token.tsx`, 95 lines)  [FULL-ish, GREP]
- Audience: bride. Purpose: view and respond to a photographer-sent price offer.
- Data read: `getOfferByToken` (negotiation.functions:175). Data written: `respondToOffer` (negotiation.functions:223) — trigger button labels `not verified`.
- Conditional: `offer.status === "accepted"` & tracking_token → link to tracker (line 78); `declined|expired` → link to photographer page (line 83).
- Layout: Header + Footer.

### /contracts/$token  (`src/routes/contracts.$token.tsx`, 183 lines)  [GREP]
- Audience: bride (token). Purpose: read contract and sign it electronically.
- Data read: `getContractByToken` (contracts.functions:59). Data written: `signContract` (contracts.functions:6).
- Print: `window.print()` button (line 150, class `print:hidden`).
- Conditional: `contract.status === "signed"` (line 77) shows signed state.
- Layout: Header + Footer.

### /review/$token  (`src/routes/review.$token.tsx`, 160 lines)  [GREP]
- Audience: bride (token). Purpose: leave a review after delivery.
- Data read: `getBookingByToken` (booking.functions:276). Data written: `submitReviewByToken` (booking.functions:497). Form fields/rating rules `not verified`.
- Layout: Header + Footer.

### /ask/$token  (`src/routes/ask.$token.tsx`, 61 lines)  [GREP]
- Audience: bride (token). Purpose: view the answer to a question sent via AskPhotographer.
- Data read: `getQuestionByToken` (questions.functions:53).
- Timers: `setInterval(load, 30000)` (line 23) — polls every 30 s.
- Layout: Header + Footer.

### /login  (`src/routes/login.tsx`, 285 lines)  [GREP]
- Audience: public (photographer and bride sign-in).
- Purpose: email+password sign-in via Supabase auth. Redirect target from search param.
- Auth: `Route.useSearch()` (line 62) — `redirect` param (used by `_authenticated.tsx` line 21). Rest `not verified`.
- Client state: localStorage `memoria_last_email` (read line 60, write line 112).
- Layout: Header + Footer.

### /forgot-password  (`src/routes/forgot-password.tsx`, 93 lines), /reset-password  (`src/routes/reset-password.tsx`, 94 lines)  [GREP]
- Audience: public. Purpose: Supabase password reset request and set-new-password. Data: Supabase auth only (`not verified` detail). Layout: Header + Footer.

### /recover  (`src/routes/recover.tsx`, 102 lines)  [GREP]
- Audience: public (bride). Purpose: recover lost tracking links by contact.
- Data: server fn `recoverTrackingLinks` (recover.functions.ts:4). Layout: Header + Footer.

### /robots.txt  (`src/routes/robots[.]txt.ts`, 44 lines), /sitemap.xml  (`src/routes/sitemap[.]xml.ts`, 96 lines)  [GREP]
- Audience: server-only (crawlers). robots: static text. sitemap: rpc `get_sitemap_photographers` (line 57) plus static URLs (not verified).

---

## AUTHENTICATED (SHELL + PHOTOGRAPHER)

### (layout) /_authenticated  (`src/routes/_authenticated.tsx`, 62 lines)  [FULL]
- Audience: photographer, admin (all app routes under this).
- Guard: `beforeLoad` calls `supabase.auth.getSession()`; no session or error → `redirect({ to: "/login", search: { redirect: location.pathname } })`. Skipped on server (`typeof window === "undefined"`).
- Error UI: `GlobalAuthError` (buttons "تحديث الصفحة" = reset, link "/dashboard" "العودة للرئيسية").
- Wraps children in `GenderProvider` (`src/hooks/use-gender.tsx`, localStorage `memoria.gender`).

### (layout) /dashboard  (`src/routes/_authenticated/dashboard.tsx`, 108 lines)  [FULL]
- Audience: photographer.
- Renders: `<OfflineBanner/>`, `<SubscriptionGuard/>`, `<Outlet/>`, then `<MobileBottomNav/>` (only mobile, `md:hidden`). Root div has `app-shell pb-20 md:pb-0`.
- Onboarding gate: on mount, `checkOnboarding(session.user.id)` (`src/lib/onboarding-gate.ts`); if incomplete → `navigate("/onboarding", replace)`. Until ready shows `PageLoader`.
- Scroll memory: sessionStorage `memoria-scroll:<pathname>` (saved on pointerdown and on path change; restored up to 1.5 s).
- Swipe-back: right-edge swipe (start x > innerWidth-28, drag > 70 px) → `history.back()` or `/dashboard`. Disabled on `/dashboard` root.
- Preloads: `/dashboard`, `/dashboard/bookings`, `/dashboard/calendar`, `/dashboard/profile`, `/dashboard/pricing`, `/dashboard/production`.

### /dashboard  (`src/routes/_authenticated/dashboard.index.tsx`, 851 lines)  [GREP]
- Audience: photographer. Purpose: home "لوحتي" — today focus, month grid, stats, to-dos.
- Data read: `bookings` (lines 469, 487), `pricing_rules` (479, 489), `profiles` (484), `photographer_private` (485), `subscriptions` (486), `reviews` (488), `whatsapp_templates` (490). Components: `TodayFocus`, `MonthGrid`, `ToolIndex`, `CopyButton` (share link), `ShareLinkButton`.
- Data written: `profiles` update (line 554, not verified which field).
- Client state: localStorage `memoria:dashboard-last-visit` (LAST_VISIT_KEY, read 450, write 453); sessionStorage `pending_referral_code` (read 460, removed 464/467; calls `recordReferralAfterSignup`).
- Overlays/toasts: not verified.
- Mobile: not verified.
- Conditional UI: onboarding (dashboard layout), subscription banner (SubscriptionGuard).

### /dashboard/bookings  (`src/routes/_authenticated/dashboard.bookings.tsx`, 8 lines)  [GREP]
- Layout route, renders `BookingsLayout` (Outlet-like wrapper for list and detail).

### /dashboard/bookings/  (`src/routes/_authenticated/dashboard.bookings.index.tsx`, 441 lines)  [GREP]
- Audience: photographer. Purpose: bookings list with filters and swipe actions.
- Data read: `bookings` (lines 69, 100); realtime channel `bookings-list-<uid>` (INSERT/UPDATE on bookings, lines 94-125).
- Data written: `confirmBookingAfterDeposit` (booking.functions:606) after `window.confirm(...)` (line 131: "تأكّدتِ من تطبيق البنك أن العربون ... وصل فعلاً لحسابك؟ ... لا تعتمدي على صورة الإيصال وحدها.").
- Client state: sessionStorage `memoria-bk-filter` (FilterKey, lines 64-65); localStorage `memoria:last-booking` (read line 89, `LAST_BOOKING_KEY`); localStorage `memoria:swipe-hint-seen` (read 91, write 147; `SWIPE_HINT_KEY`).
- URL: `?new=1` (line 81) → opens new-booking flow (not verified).
- Swipe gestures on rows: swipe left-to-right (`offset.x < -80`) opens WhatsApp `https://wa.me/<phone>` (line 381, `hapticVibrate("light")`). Other swipe directions `not verified`.
- Loading/empty: `ListSkeleton`, `EmptyState`.
- Status labels/colours: see Status vocabularies.
- Overlays: `ManualBookingSheet` / `BlockDaySheet` are opened from MobileBottomNav only (not from this page, `not verified`).

### /dashboard/bookings/$id  (`src/routes/_authenticated/dashboard.bookings.$id.tsx`, 1404 lines)  [GREP — largest app page]
- Audience: photographer. Purpose: single booking workspace: status, payments, contract, gallery upload, messages, production stage, cancel/reject, delete, tracking link.
- Data read: `bookings` (154), `messages` (155), `contracts` (156, 265), `contract_templates` (157), `profiles` (389, 1153); storage signed URL bucket `deposit-proofs` (line 165, 3600 s).
- Realtime: channel `messages-<id>` (lines 176-185).
- Data written:
  - `messages` update (192, mark read) and insert (375, chat send).
  - `profiles` read/update via `1153`.
  - Server fns: `updateProductionStage` (production.functions:15, stage buttons, toast `"المرحلة الآن: {0}"` line 215), `markFinalPaymentReceived` (not verified mount), `updateBookingStatus` (production.functions:292, `confirmed` path line 258), `approveBookingRequest` / `rejectBookingRequest` (approval.functions:30/73; reject via Dialog `rejectOpen` line 955), `cancelBooking` (cancellation.functions:26; Dialog `cancelOpen` line 937), `softDeleteBooking` (booking.functions:747, confirm "حذف الحجز"/"حذف" destructive, line 608), `regenerateBookingToken` (booking.functions:768, confirm "تجديد رابط التتبّع"/"تجديد", line 595), `createContractForBooking` (contracts.functions:80), `ensureGallery` / `addGalleryPhoto` / `deleteGalleryPhoto` / `updateGallery` / `getGalleryForPhotographer` (gallery.functions), `reportChatAsPhotographer` (profile-reports.functions:164), `uploadSneakPeek` (booking.functions:783 — `not verified` mount), `saveBookingSelectionLink` / `saveDeliveryLink` (production.functions:357/405 — `not verified` mount).
  - Deposit confirm dialog: "وصل العربون لحسابك؟" ... confirm "نعم، وصلني" (line 791).
  - Deliver dialog: "تسليم الصور وإنهاء الحجز", confirm "سلّمي الصور" (line 308; description: "ستصل للعميلة رسالة بأن صورها جاهزة مع طلب تقييم.").
  - Other confirm at line 289 and 314 (`not verified` text).
- Uploads: gallery photos to storage. Flow (lines 1211-1263): optional `browser-image-compression` (line 1211, preview only), original uploaded (line 1232 `originalPath`, `contentType: f.type`), if watermark on and text non-empty → `watermarkImageFile(f, {text, mode:"tile"})` (`src/lib/watermark.ts`, line 1238; failure = upload original as preview, line 1240) → preview upload (line 1246); also an un-watermarked branch (line 1263). Bucket names not verified. Watermark controls: checkbox `watermarkOn` default true (line 1146), text `watermarkText` (line 1147); hint copy line 530 "صور المعرض تظهر للعميلة بعلامة مائية حتى تسجّلي الدفعة النهائية."
- Downloads/share: `window.open(trackUrl, "_blank")` (line 585); copy tracking link via clipboard + toast "نُسخ رابط التتبّع" (line 590); WhatsApp `https://wa.me/<phone>?text=` (line 461, opened with window.open).
- Client state:
  - localStorage `memoria:draft:<id>` (message draft; read 113, write/remove 203).
  - localStorage `memoria.dismissed-hints.<id>` (JSON array; read 125-127, write 130).
  - localStorage `memoria:last-booking` = `{id, name}` (write line 161; same key as bookings list).
- Overlays: `DropdownMenu` actions (lines 585-608), `Dialog` cancel (937), reject (955), `Sheet`/`useConfirm` (1139), `ShotList` component (`src/components/ShotList.tsx`, server `seed_default_shot_list` rpc), `WhatsAppQuickSend` (`src/components/WhatsAppQuickSend.tsx`, rpc `seed_default_whatsapp_templates`), `BookingExtrasPanel` and `ClientHistory` (`src/components/BookingExtras.tsx`), `ChatReport`, `CopyButton`.
- Hints: `dismissedHints` list drives tip cards (line ~530 etc.).
- Conditional UI (lines 472-483): `cancelled` → no action card; `needs_approval && !approved_at && (pending_deposit|quote)` → approval card; `pending_deposit && (deposit_proof_url || deposit_sent_at)` → verify deposit card; `quote|pending_deposit` → awaiting client card.
- Deposit section: "إرسال طلب العربون" / deposit amount `Number(deposit_amount) > 0` (line 786).
- Refund display for cancelled bookings: `refund_status` "pending" → "قيد المعالجة", "refunded" → "تم الردّ" (line 831).
- Stage stepper (line 1024-1031) — see Status vocabularies.
- Mobile: not verified.

### /dashboard/calendar  (`src/routes/_authenticated/dashboard.calendar.tsx`, 439 lines)  [GREP]
- Audience: photographer. Purpose: availability calendar (blocked days), Google Calendar sync, iCal import/export.
- Data read: `photographer_unavailability` (64), `bookings` (65), `photographer_private` (66); `getCalendarMonthData` (calendar.functions:19); `getGoogleStatus` (google-calendar.functions:15), `getIcalStatus` (ical-sync.functions:46).
- Data written:
  - `photographer_unavailability` insert/delete (109-206 — block/unblock days; also `toggleUnavailability` calendar.functions:91 `not verified` mount).
  - `photographer_private` upsert (165, 189, 204) — iCal URL / auto-sync settings.
  - `syncExternalIcal` (ical-sync.functions:34) — sync external iCal URL.
  - `getGoogleConnectUrl` (google-calendar.functions:34) → Google OAuth; `syncGoogleNow`, `disconnectGoogle` (42, 49) — components `GoogleConnectCard`.
- Import: external iCal URL input (line 332, placeholder `calendar.google.com/calendar/ical/.../private-.../basic.ics`); validation: must match `/private-[^/]+/basic.ics` and contain calendar.google.com (line 337).
- Export: iCal URL (`exportUrl` `/api/public/ical/<token>`), copy to clipboard (line 177), Google subscribe link `https://calendar.google.com/calendar/render?cid=<webcal url>` (line 172). External: `https://calendar.google.com/calendar/r/settings` (line 325).
- Overlays: `Popover` (248-255) for day/picker; `BlockDaySheet` (`src/components/dashboard/BlockDaySheet.tsx`).
- Components: `MonthGrid`, `GoogleConnectCard`, `NotifyChannelsCard`? (not verified here).
- Client state: none found.
- Mobile: not verified.

### /dashboard/contracts  (`src/routes/_authenticated/dashboard.contracts.tsx`, 287 lines)  [GREP]
- Audience: photographer. Purpose: contract templates and sent contracts.
- Data read: `contract_templates` (105), `contracts` (106) — joined with `bookings` (`c.bookings.client_phone` line 219).
- Data written: `contract_templates` insert (124), delete (136). `createContractForBooking` (contracts.functions:80), `auto_generate_contract` rpc (booking.functions:671, payment webhook).
- Share: WhatsApp `https://wa.me/<phone>?text=` with contract link `مرحباً {0} 🤍 يرجى مراجعة عقد التصوير وتوقيعه من هنا: {1}` (line 219).
- Copy: `CopyButton` (line 6).
- Layout: Header + Footer.

### /dashboard/offers  (`src/routes/_authenticated/dashboard.offers.tsx`, 117 lines)  [FULL-ish, GREP]
- Audience: photographer. Purpose: list price offers sent by brides and their status. Data read: `listMyOffers` (negotiation.functions:206). Data written: `respondToOffer` (negotiation.functions:223).
- Status map: pending "بانتظار ردّك", accepted "مقبول", declined "مرفوض", expired "منتهي" (line 17). Pending pill `border-gold text-gold`, else `border-border text-muted-foreground` (line 80).
- WhatsApp link builder `https://wa.me/${p}?text=...` (line 23).
- Layout: Header + Footer. Loading: `PageLoader`.

### /dashboard/pricing  (`src/routes/_authenticated/dashboard.pricing.tsx`, 502 lines)  [GREP]
- Audience: photographer. Purpose: service packages (pricing_rules) CRUD.
- Data read: `pricing_rules` (125 select; 177).
- Data written: `pricing_rules` delete (125), insert (180), update path (177/180 `not verified`). Line 125 `.delete(` ; line 180 `.insert(`.
- Limits: Basic plan limit "3 packages, 20 photos" from `plans.ts` (`BASIC_LIMITS`); enforced in DB (`enforce_basic_*` per plans.ts comment) — client gate `not verified`.
- Layout: Header + Footer.

### /dashboard/production  (`src/routes/_authenticated/dashboard.production.tsx`, 572 lines)  [GREP]
- Audience: photographer. Purpose: Kanban of bookings by production stage.
- Data read: `bookings` (199 — select); polling `setInterval` (line 109 — interval length `not verified`).
- Data written: `updateProductionStage` (production.functions:15) via `executeMove` (line 158) — forward move one step; backward allowed; skipping rejected (`canMoveBooking` in `src/lib/production-rules.ts`). `markFinalPaymentReceived` (233, `not verified` mount). `updateBookingStatus` (292, `not verified` mount).
- Confirm: `AlertDialog` "تسليم صور {client}" with AlertDialogCancel "ليس الآن" and AlertDialogAction (lines 457-474) → sets delivered.
- Tour: localStorage `memoria-production-tour-seen` ("true"; read 102, write 332/365 on tip dismiss; default true when storage throws).
- Layout: Header + Footer. Mobile: column scroll with stage tabs (lines 382-445), empty copy per stage (STAGE_EMPTY lines 75-82).
- Conditional: stage column empty copy; back-button title "أرجعي إلى {0}" (line 552).

### /dashboard/profile  (`src/routes/_authenticated/dashboard.profile.tsx`, 735 lines)  [GREP]
- Audience: photographer. Purpose: profile editing (name, bio, city, socials, portfolio, equipment, deposit %, travel fee, gender, page settings), verification, notification preferences, tour status.
- Data read: `profiles` (77), `photographer_private` (216 upsert), `getMyVerification` (trust.functions:42).
- Data written: `profiles` update (112, 126, 154, 165, 200 — multiple sections, each separate save); `photographer_private` upsert (216); `requestVerification` (trust.functions:62, sets `verification_status: "pending_review"` local line 510-511); `updateNotificationPreferences` (trust.functions:171).
- Verification states: "verified" (line 474), "pending_review" (479), "rejected" (484), "unverified"/null (503).
- Sections (`Card` collapsible with ids `sec-trust` etc., line 461).
- Preview: `Sheet` `previewOpen` (591) with `LivePhonePreview` (`src/components/dashboard/LivePhonePreview.tsx`).
- Payment methods: `PaymentMethodsEditor` (`src/components/PaymentMethods.tsx`).
- Tour state text: "فعّالة" / "مكتملة" / "متخطّاة" / "لم تبدأ" (line 568).
- Layout: Header + Footer. Other: not verified.

### /dashboard/settings  (`src/routes/_authenticated/dashboard.settings.tsx`, 466 lines)  [GREP]
- Audience: photographer. Purpose: settings — page settings, refund policy, notification channels, reviews, reset defaults.
- Data read: `profiles` (52), `photographer_private` (53), `reviews` (54).
- Data written: `profiles` update (98); `savePageSettings` (page-settings.functions:6); `updateRefundPolicy` (cancellation.functions:181).
- Confirm: `window.confirm` "إرجاع كل الإعدادات للوضع الافتراضي؟ (لن يُحفظ حتى تضغطي حفظ)" (line 116) — native confirm, not useConfirm.
- Components: `NotifyChannelsCard`, `GoogleConnectCard`? (`not verified` which card is mounted here).
- Save model: explicit save (reset does not save until Save clicked). Note: Phase A6/A7 commits say autosave in settings; `use-autosave.tsx` exists — the settings page autosave behaviour `not verified`.
- Layout: Header + Footer.

### /dashboard/questions  (`src/routes/_authenticated/dashboard.questions.tsx`, 62 lines)  [GREP]
- Audience: photographer. Data: `listMyQuestions` (questions.functions:66); `answerQuestion` (questions.functions:77).
- Layout: no Header/Footer import in grep (`not verified`).

### /dashboard/recap  (`src/routes/_authenticated/dashboard.recap.tsx`, 230 lines)  [GREP]
- Audience: photographer. Purpose: yearly recap card (story image).
- Data read: `getYearRecap` (recap.functions:22).
- Share: canvas rendered 1080x1920 (line 135, hidden canvas) → `navigator.share({files:[file], title})` (line 65); fallback `not verified` (likely download). Canvas drawn in `drawStory` (line 150).
- Layout: Header (imported line 7) — Footer not imported (`not verified`).

### /dashboard/referrals  (`src/routes/_authenticated/dashboard.referrals.tsx`, 128 lines)  [GREP]
- Audience: photographer. Purpose: referral code and rewards.
- Data read: `profiles` (33), `referrals` (34).
- Share: WhatsApp `https://wa.me/?text=<shareText>` (line 68); copy button `CopyButton`.
- Layout: Header + Footer.

### /dashboard/reports  (`src/routes/_authenticated/dashboard.reports.tsx`, 284 lines)  [GREP]
- Audience: photographer. Purpose: stats and CSV export.
- Data read: `bookings` (41, 77); `getReportStats` (reports.functions:21, `lib/report-stats.ts`).
- Export: CSV via `Blob(["\ufeff" + ...], {type:"text/csv;charset=utf-8"})` (line 51) — columns: event_date, client_name, client_phone, service label (`صور + فيديو` / `فيديو` / `تصوير`), status label, total, deposit, final-paid flag `مستلمة`, venue. Download filename not verified.
- Funnel stages (report-stats.ts:138-143): quote, pending_deposit, confirmed, "تم التسليم" (completed with delivered_at), completed, cancelled.
- Layout: Header + Footer.

### /dashboard/subscription  (`src/routes/_authenticated/dashboard.subscription.tsx`, 509 lines)  [GREP]
- Audience: photographer. Purpose: plan, billing period, payment via PayTabs (card), Zbooni, or manual CliQ transfer; payment history.
- Data read: `subscriptions` (109), `subscription_payments` (110); `getPayTabsStatus` (paytabs.functions:15), `isPaymentsEnabled`.
- Data written: `subscriptions` / `subscription_payments` writes (109-110 not verified op), delete (127 `subscription_payments`? `not verified`); `startPayTabsSubscription` (paytabs.functions:20); `startZbooniSubscription` (zbooni.functions:40), `confirmZbooniSubscriptionPaid` (zbooni.functions:109).
- External: PayTabs checkout via `window.open("", "_blank")` (line 153) then redirect; return URL `/dashboard/subscription?payment=success|failed|pending` (paytabs hook line 37/62) → read and removed from URL (lines 122-127).
- PaymentBadge (lines 502-508): pending "قيد المراجعة" `bg-amber-100 text-amber-800`; approved "مُعتمد" `bg-emerald-100 text-emerald-800`; rejected "مرفوض" `bg-destructive/15 text-destructive`.
- Plans: from `src/lib/plans.ts`.
- Layout: Header + Footer. CopyButton (CliQ).

### /dashboard/whatsapp-templates  (`src/routes/_authenticated/dashboard.whatsapp-templates.tsx`, 305 lines)  [GREP]
- Audience: photographer. Purpose: WhatsApp message templates per booking stage.
- Data read: `whatsapp_templates` (78); rpc `seed_default_whatsapp_templates` (91, `_photographer_id`).
- Data written: insert (99), update (112-113), delete (130, confirm via `useConfirm`, line 71).
- Stage labels (line 34): `confirmed: "بعد تأكيد العربون"` (others not verified).
- Layout: Header + Footer.

### /notifications  (`src/routes/_authenticated/notifications.tsx`, 165 lines)  [GREP]
- Audience: photographer and bride (logged in). Purpose: notification inbox.
- Data read: `notifications` (38). Data written: `notifications` update (59 mark one read; 66 mark all read `not verified` which).
- Loading/empty: `ListSkeleton`, `EmptyState`.
- Layout: Header + Footer; hidden on `sm` for Footer (`inApp` regex includes `/notifications`).
- Mobile: appMode top bar with bell (Header.tsx line 137, 146).

### /onboarding  (`src/routes/_authenticated/onboarding.tsx`, 562 lines)  [GREP]
- Audience: photographer (new). Purpose: first-time setup wizard. Gate: dashboard layout redirects here until done (`checkOnboarding`).
- Data read: `profiles` (90), `photographer_private` (91), `pricing_rules` (92).
- Data written: `profiles` update (133, 165, 207, 251, 275 — step saves), `pricing_rules` insert (194), delete/insert (182-194 `not verified`), `photographer_private` upsert (199).
- Client state: sessionStorage `memoria-onboarding-later` (`LATER_KEY`; "later" skip for session); localStorage `memoria-onb-done:<uid>` (`DONE_KEY`, set when complete).
- Confetti: `canvas-confetti` on completion.
- Components: `PaymentMethodsEditor` (`src/components/PaymentMethods.tsx`).
- Layout: Header + Footer.

### /admin  (`src/routes/_authenticated/admin.tsx`, 91 lines)  [FULL]
- Audience: admin.
- Guard: client-side only. `supabase.auth.getSession()`; no session → `navigate("/login")`; then `supabase.from("user_roles").select("role").eq("user_id", ...)` → admin required, else renders "غير مصرّح" / "هذه الصفحة للمشرفين فقط." (no redirect).
- Nav (15 tabs, lines 57-71): نظرة عامة `/admin` (exact), المصوّرات, الحجوزات, الدفعات (subscriptions), التقييمات, النزاعات, البلاغات, الاستردادات, العقود, الإحالات, الأدوار, الإشعارات, سجل البريد, سجل العمليات, رسائل التواصل.
- Renders own Header + Footer (not the dashboard shell); no MobileBottomNav.
- Note: `/admin/*` nav tab labels are hard-coded Arabic strings wrapped in `t()`.

### /admin/  (`src/routes/_authenticated/admin.index.tsx`, 165 lines)  [GREP]
- Data read: `getAdminPlatformStats` (admin.functions.ts:630; counts incl. profiles verified count line 670).
- Layout: inside admin shell.

### /admin/photographers  (`src/routes/_authenticated/admin.photographers.tsx`, 389 lines)  [GREP]
- Data read: `listPhotographersAdmin` (admin.functions:11; profile fields incl. `verification_status`, `deleted_at`).
- Data written (server fns, names from lib/admin.functions.ts; route import multi-line, so call sites `not verified`): `adminVerifyPhotographer` (429; statuses verified / rejected / unverified, admin.functions 445-472), `adminTogglePublish` (161), `adminRenewSubscription` (180), `adminSoftDeletePhotographer` (263), `adminRestorePhotographer` (285), `adminDeletePhotographer` (223, hard delete).
- Confirms: `useConfirm` at lines 94, 133, 148 (texts `not verified`).
- Loading: `PageLoader`.

### /admin/bookings  (`src/routes/_authenticated/admin.bookings.tsx`, 264 lines)  [GREP]
- Data read: `listBookingsAdmin` (admin.functions:483). Data written: `adminCancelBooking` (admin.functions:508; throws `CANNOT_CANCEL_COMPLETED` / `ALREADY_CANCELLED`).

### /admin/subscriptions  (`src/routes/_authenticated/admin.subscriptions.tsx`, 303 lines)  [GREP]
- Data read: `listSubscriptionPaymentsAdmin` (admin.functions:307). Data written: `adminApproveSubscriptionPayment` (342), `adminRejectSubscriptionPayment` (410), `adminRenewSubscription` (180) (mount names `not verified`).
- Notifications: `notifyAdminsOfSubscriptionPayment` (admin-alerts.functions:8).

### /admin/reviews  (`src/routes/_authenticated/admin.reviews.tsx`, 139 lines)  [GREP]
- Data read: `listReviewsAdmin` (admin.functions:84). Data written: `adminApproveReview` (109), `adminRejectReview` (135).

### /admin/disputes  (`src/routes/_authenticated/admin.disputes.tsx`, 261 lines)  [GREP]
- Data read: `listDisputesAdmin` (admin.functions:571). Data written: `adminResolveDispute` (605).

### /admin/reports  (`src/routes/_authenticated/admin.reports.tsx`, 79 lines)  [GREP]
- Data read: `listProfileReports` (profile-reports.functions:76). Data written: `updateProfileReport` (90). Confirm to hide photographer page: "إخفاء صفحة @{username}؟" → "تختفي الصفحة من البحث والرابط المباشر حتى تعيدي نشرها." confirm "إخفاء" (line 41).
- Status map: new "جديد", reviewing "قيد المراجعة", closed "مغلق" (see vocab).

### /admin/refunds  (`src/routes/_authenticated/admin.refunds.tsx`, 185 lines)  [GREP]
- Data read: `bookings` (29), `profiles` (40) direct supabase.
- Data written: `processDepositRefund` (payments.functions:194) with `useConfirm` (line 54).

### /admin/contracts  (`src/routes/_authenticated/admin.contracts.tsx`, 122 lines)  [GREP]
- Data read: `listContractsAdmin` (admin.functions:789). No writes found.

### /admin/referrals  (`src/routes/_authenticated/admin.referrals.tsx`, 122 lines)  [GREP]
- Data read: `listReferralsAdmin` (admin.functions:816). No writes found.

### /admin/roles  (`src/routes/_authenticated/admin.roles.tsx`, 184 lines)  [GREP]
- Data read: `listUserRolesAdmin` (admin.functions:886). Data written: `adminGrantRole` (910), `adminRevokeRole` (952); `useConfirm` at line 67.

### /admin/notifications  (`src/routes/_authenticated/admin.notifications.tsx`, 129 lines)  [GREP]
- Data read: `listNotificationsAdmin` (admin.functions:847). Data written: `adminDeleteNotification` (872).

### /admin/email-log  (`src/routes/_authenticated/admin.email-log.tsx`, 119 lines)  [GREP]
- Data read: `listEmailLogAdmin` (admin.functions:755). Read-only.

### /admin/audit-log  (`src/routes/_authenticated/admin.audit-log.tsx`, 130 lines)  [GREP]
- Data read: `listAuditLogAdmin` (admin.functions:772). Read-only.

### /admin/contact-messages  (`src/routes/_authenticated/admin.contact-messages.tsx`, 175 lines)  [GREP]
- Data read: `listContactMessagesAdmin` (admin.functions:977). Data written: `updateContactMessageAdmin` (991), `deleteContactMessageAdmin` (1009).
- Filters: "الكل" + statuses (see vocab).

---

## PHOTOGRAPHER ALT FLOW

(no separate route; the photographer booking-manual add is `ManualBookingSheet` + `createManualBooking` (manual-booking.functions.ts:72) and is opened from MobileBottomNav quick actions.)

---

## API / SERVER ROUTES  (`src/routes/api/public/**`)

All under `/api/public/...`. Server-only. All FULL reads except where noted.

### POST /api/public/hooks/payment  (`src/routes/api/public/hooks/payment.ts`, 204 lines)  [FULL]
- Called by: payment provider webhook (Stripe-style; code also accepts HyperPay `customParameters`). Provider from `getPaymentProvider()` (`src/lib/payments.server.ts`).
- Does: verify signature (`provider.verifyWebhook(rawBody, stripe-signature)`); idempotency insert into `payment_events` (id = event_id; 23505 = duplicate → `{ok:true, deduped:true}`).
- Paid events: `checkout.session.completed` (payment_status paid/no_payment_required), `payment_intent.succeeded`, `invoice.paid`, `invoice.payment_succeeded`.
- kind=subscription → rpc `renew_subscription_paid` (`_photographer_id`, `_months`, `_provider`, `_intent`, `_amount`, `_currency`).
- kind=deposit → rpc `confirm_booking_deposit_paid` (`_booking_id`, provider, session, intent); if not already confirmed: rpc `auto_generate_contract`, insert `notifications` (title "تأكيد الحجز", link `/dashboard/bookings/<id>`), email `tplDepositConfirmed` (`lib/email.server`), WhatsApp text to client (`lib/whatsapp.server`).
- Secrets/signature: `getPaymentProvider` / `verifyWebhook`. 503 if not configured; 400 on bad signature; 200 otherwise.

### POST /api/public/hooks/whatsapp  (`src/routes/api/public/hooks/whatsapp.ts`, 114 lines)  [FULL]
- GET: Meta verification (`hub.mode=subscribe`, `hub.verify_token` == env `WHATSAPP_VERIFY_TOKEN`) → echoes `hub.challenge`; else 403.
- POST: signature `X-Hub-Signature-256` HMAC-SHA256 with `WHATSAPP_APP_SECRET`; invalid → 401.
- For each incoming text with 6-digit code: looks up `bookings` where `verify_code_wa` = code and `phone_verified_at` null and not deleted; matches sender phone (`verification.server` `phoneKey`); on match, not expired (30 min) → `markBookingVerified(id,"whatsapp")` and replies with tracking link `${appBase}/track/<client_tracking_token>`. Replies via `sendWhatsAppText`.
- Always 200 after verification.

### POST /api/public/hooks/paytabs  (`src/routes/api/public/hooks/paytabs.ts`, 66 lines)  [FULL]
- Called by: PayTabs (callback/IPN as JSON, and browser return as form POST; GET redirects).
- Form return: `verifyReturnSignature(fields)`; `settleSubscriptionPayment(tranRef)` → redirect 303 `/dashboard/subscription?payment=success|failed|pending`.
- JSON callback: `verifyBodySignature(raw, header "signature")` (mismatch only logged); `settleSubscriptionPayment(tran_ref)` → `{ok:true,...}`; errors 500.
- Requires `isPayTabsConfigured()`, else 503. Base URL env `PUBLIC_APP_URL`.

### POST /api/public/hooks/telegram  (`src/routes/api/public/hooks/telegram.ts`, 63 lines)  [FULL]
- Called by: Telegram Bot webhook (auto-registered on first "link Telegram" press).
- Auth: header `x-telegram-bot-api-secret-token` must equal `TELEGRAM_WEBHOOK_SECRET`; else 401.
- Logic: message `/start <8-char code>` or bare code → updates `photographer_private` (telegram_chat_id, telegram_link_code null, telegram_linked_at) where `telegram_link_code` = code (uppercased). Replies with Arabic help or success.
- Always 200 after auth.

### POST /api/public/hooks/booking-changed  (`src/routes/api/public/hooks/booking-changed.ts`, 36 lines)  [FULL]
- Called by: DB trigger + pg_net on booking insert/update.
- Auth: header `x-hook-secret` == secret from rpc `get_booking_hook_secret` (Vault), cached in module memory; else 401.
- Body `{booking_id, photographer_id}` → `pushOneBooking` (Google Calendar write, `lib/google-calendar.server`) if Google configured; otherwise `{skipped}`.

### POST /api/public/hooks/booking-deadlines  (`src/routes/api/public/hooks/booking-deadlines.ts`, 368 lines)  [FULL header; body GREP]
- Called by: Cloudflare Cron every 30 min (`src/server.ts` scheduled).
- Auth: `x-cron-secret` == `CRON_SECRET`.
- Steps: (1) rpc `expire_unpaid_bookings` (24 h photographer response deadline; deposit has no auto-cancel, asks photographer after 48 h); (2) notify both parties once for auto-cancel (`bookings.auto_cancel_kind`, `auto_cancel_notified_at`); (3) reminders: photographer 12 h and 2 h before response deadline; bride 24 h and 6 h before deposit deadline (`reminders_sent`); contracts reminder keys `contract7` / `contract14` (line 209); message reminder key `msg24:<msg id>` (line 286). Writes: `bookings`, `contracts`, `messages`, `delivery_galleries`, `payment_change_events`. Notifications via `lib/notify.server`.

### POST /api/public/hooks/email-reminders  (`src/routes/api/public/hooks/email-reminders.ts`, 414 lines)  [FULL header; body GREP]
- Called by: Cloudflare Cron (`src/server.ts` scheduled). Auth: `x-cron-secret` == `CRON_SECRET`.
- Steps: (0) PayTabs reconciliation: `subscription_payments` with method `gateway`, status `pending`, created in last 3 days → `settleSubscriptionPayment`; (1) 24 h event reminders (`tplEventReminder24h`) for confirmed bookings tomorrow; (2) subscription expiry warnings 7 d and 3 d (`tplSubscriptionExpiring`); (3) "expired today" notice. Writes: `subscription_payments`, `email_log` (idempotency: skip same template to same recipient within 20 h), `profiles`, `photographer_private`, `subscriptions` (update status at 364-365).

### POST /api/public/hooks/ical-sync  (`src/routes/api/public/hooks/ical-sync.ts`, 53 lines)  [FULL]
- Called by: Cloudflare Cron. Auth: `x-cron-secret` == `CRON_SECRET` else 401.
- Syncs all `photographer_private` rows with `external_ical_auto_sync = true` and non-null URL via `syncAndRecord` (ical-sync.functions), 5 workers in parallel; then all `google_calendar_links` via `syncGoogleUser`. Returns JSON summary.

### GET /api/public/ical/:token  (`src/routes/api/public/ical.$token.ts`, 96 lines)  [FULL]
- Called by: photographer's calendar app subscription (Google/Apple/Outlook). Token = `photographer_private.ical_token` (strips `.ics`); 404 if unknown.
- Output: `text/calendar`; bookings with status pending_deposit / confirmed / completed (not deleted) as VEVENT TZID Asia/Amman, summary "<client> (<status Arabic>)", LOCATION venue; unavailability as all-day VEVENT (skips reason starting "Google:"). Secret = token only (no signature).

### GET /api/public/google/callback  (`src/routes/api/public/google/callback.ts`, 39 lines)  [FULL]
- Called by: browser redirect from Google OAuth consent. Verifies `state` (`g.verifyState` → userId), requires granted scopes `calendar.freebusy` and `calendar.app.created`; exchanges code; saves link; sets `photographer_private.external_ical_url = null` and `external_ical_auto_sync = false` (only one sync source); first sync. Redirect 303 `/dashboard/calendar?google=denied|expired|scopes|error|connected`.

---

## Global shell — what renders where

- `__root.tsx` (FULL): wraps everything. Providers: QueryClient, ThemeProvider, ConfirmProvider, LazyMotion, MotionConfig(reducedMotion user). Always renders: skip link, `FirstVisitIntro` (only public, first visit, not on `/dashboard|/admin|/notifications|/track|/contracts|/review|/login|/forgot-password|/reset-password|/recover|/onboarding|/app|/api`), animated page wrapper keyed by path, `MobileTabBar`, `PhotographerCommandPalette`, Toaster (top-center, richColors, closeButton). Non-embedded only: `PwaInstallPrompt`, `GameHint`, `ClientTour`, `PhotographerTour`.
- Lenis smooth scroll disabled on `/dashboard`, `/admin`, `/notifications`.
- Not-found and error components defined here (`NotFoundComponent`, `ErrorComponent`).
- SW register `/sw.js`; `beforeinstallprompt` stored on window.
- Listens to supabase auth events SIGNED_IN / SIGNED_OUT / USER_UPDATED → router.invalidate + queryClient invalidate/clear.

- `Header` (`components/site/Header.tsx`, FULL): rendered by every public and app page that imports it (~45 route files, see grep). `appMode` (photographer on `/dashboard/*` or `/notifications`) → shows a small sticky top bar (back to لوحتي + bell) on `sm:hidden` and hides the header itself below `sm`.
  - Desktop nav varies by role: photographer (الحجوزات, التقويم, settings gear); logged-in bride (ابحث, كيف يعمل); visitor-client; visitor-photographer; guest.
  - Messages/notifications icons only when logged in (realtime channel `notif-badge-<uid>`).
  - Hamburger Sheet on `md:hidden`.
- `Footer` (`components/site/Footer.tsx`, FULL): rendered by most public pages and some app pages. Hidden on mobile for `/dashboard|/admin|/notifications|/onboarding` (`hidden sm:block`).
- `MobileTabBar` (`components/site/MobileTabBar.tsx`, FULL): mounted once in `__root`, `sm:hidden`. Returns null on `/photographers/*` (except join) and on `/dashboard*`. If `authed && isPhotographer` returns `MobileBottomNav`. Else visitor tabs (client: الرئيسية, البحث, كيف يعمل; photographer: الرئيسية, المميزات, الأسعار (guest only); right slot: لوحتي / انضمي / للمصوّرات).
- `MobileBottomNav` (`components/site/MobileBottomNav.tsx`, FULL): photographer app bar. Mounted by `_authenticated/dashboard.tsx` (`md:hidden`) and via MobileTabBar on non-dashboard pages for photographers. Tabs: الرئيسية, الحجوزات | + (quick actions sheet) | التقويم, ملفّي. Quick actions sheet: حجز جديد (ManualBookingSheet), حجب يوم (BlockDaySheet), مشاركة رابط ملفّي (navigator.share or clipboard), عروض الأسعار, قوالب واتساب, متابعة الإنتاج. Sheet dismisses on drag down.
- `BottomNav` (`components/site/BottomNav.tsx`, FULL): **NOT imported anywhere** (grep). Dead code. It would have shown photographer tabs (الرئيسية, الحجوزات, الإنتاج, الإشعارات with badge, حسابي) and public tabs (الرئيسية, بحث, التطبيق).
- `_authenticated/admin.tsx` renders its own Header + Footer and 15 tab nav; no MobileTabBar change (MobileTabBar still mounted globally; `/admin` not excluded so it shows for admin on mobile).
- `_authenticated/dashboard.tsx`: OfflineBanner (fixed top), SubscriptionGuard (inline banner above page), Outlet, MobileBottomNav.

Hide rules summary:
- MobileTabBar hidden: `/photographers/*` (except join), `/dashboard*`. Shown elsewhere (sm:hidden).
- MobileBottomNav (dashboard): `md:hidden`. Also rendered by MobileTabBar for photographers outside dashboard.
- Header appMode: hides the header on `sm` and below for photographers on `/dashboard/*` and `/notifications`.
- Footer: `hidden sm:block` on mobile in `/dashboard|/admin|/notifications|/onboarding`.
- SubscriptionGuard: hidden on `/dashboard/subscription`; dismissible only for "ending" state (per day).
- Lenis: disabled on dashboard/admin/notifications.
- FirstVisitIntro: not on app/auth/track/contracts/review/api paths.

---

## Status vocabularies

Booking status (bookings.status) — Arabic label and classes:
- `quote` — "عرض سعر" — dashboard.bookings.$id.tsx:59 label, :67 tone `bg-secondary text-muted-foreground`. CommandPalette "عرض سعر" (line 36).
- `pending_deposit` — "بانتظار العربون" — bookings.index.tsx:32 label, :40 colour `bg-amber-500/10 text-amber-700 dark:text-amber-400`; bookings.$id.tsx:60, :68 `bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300`; ical.$token.ts:32 (Arabic only, no colour); google-calendar.server.ts:181 and event colour "5" (line 210).
- `confirmed` — "مؤكّد" (bookings.index 34 "مؤكّد"; bookings.$id 61 "مؤكّد"; CommandPalette "مؤكّد"); ical "مؤكَّد" (note diacritic difference). Colour: index.tsx:42 `bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`; bookings.$id.tsx:69 `bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300`.
- `completed` — "مكتمل" — index.tsx:44 `bg-gold/10 text-gold`; bookings.$id.tsx:70 `bg-gold/15 text-gold`.
- `cancelled` — "ملغى" — index.tsx:43 `bg-red-500/10 text-red-600 dark:text-red-400`; bookings.$id.tsx:71 `bg-destructive/10 text-destructive`.
- Derived label: `needs_approval && !approved_at && status=pending_deposit` → "بانتظار موافقتك" (index.tsx:399; bookings.$id.tsx:567).
- Note: pending_deposit colours differ between list (index.tsx:40) and detail (bookings.$id.tsx:68). Inconsistent.

Production stage (`bookings.production_stage`) — 6 keys, used on dashboard.production.tsx:64-70 (colour classes: border-t-slate-400 / amber-400 / blue-400 / violet-400 / emerald-400; delivered = `bg-card border border-border text-muted-foreground opacity-80`) and dashboard.bookings.$id.tsx:1024-1031 (no colour):
- `awaiting` — "بانتظار الجلسة"
- `shooting` — "يوم التصوير"
- `selecting` — "اختيار الصور"
- `editing` — "قيد التحرير"
- `ready` — "جاهز للتسليم"
- `delivered` — "تم التسليم"
- lib/production.functions.ts:42 uses the same order plus `ready`; lib/production-rules.ts:4 STAGES_ORDER same 6. Note: production.functions.ts treats `completed`/`cancelled` in `canMoveBooking` as terminal (production-rules.ts:44).
- Note: track.$token.tsx (line 370-375) uses `production_stage` values awaiting/editing/delivered and `status` completed.
- Note: report-stats.ts:141 uses label "تم التسليم" for `status=completed && delivered_at` (funnel stage, not production_stage).

Offer status (offers): pending "بانتظار ردّك" (dashboard.offers.tsx:17, pill border-gold text-gold), accepted "مقبول", declined "مرفوض", expired "منتهي". BookingExtras.tsx:49-53 (addendum status): pending "بانتظار موافقة العروس" `text-amber-700`, accepted "موافَق عليه" `text-emerald-700`, declined "مرفوض" `text-rose-700`.

Subscription status (subscriptions.status): `trial`, `expired`, `canceled` read in SubscriptionGuard.tsx:54 (kind expired); `active`/other values `not verified` (no label map found). Trial ends `trial_ends_at`; paid `current_period_end`.
Subscription payments (PaymentBadge dashboard.subscription.tsx:502-508): pending "قيد المراجعة" `bg-amber-100 text-amber-800`; approved "مُعتمد" `bg-emerald-100 text-emerald-800`; rejected "مرفوض" `bg-destructive/15 text-destructive`. Payment method `gateway` (email-reminders.ts:49) and the `pending` status.

Verification (profiles.verification_status): `unverified` (default/null), `pending_review`, `verified`, `rejected` (dashboard.profile.tsx:463-503 branches; Arabic labels inside those JSX blocks `not verified` — read the block to fetch exact text). Admin side action values `verified` / `rejected` / `unverified` (admin.functions.ts:445-472). Public badge: `VerifiedBadge` when verified (photographers/$username.tsx:501); search filter (search.tsx:158).

Refund status (bookings.refund_status): `pending` "قيد المعالجة", `refunded` "تم الردّ" (bookings.$id.tsx:831); other values echo raw.

Offer/booking tracker step keys in track.$token.tsx:370-375: shoot/balance/editing/delivered (labels "يوم التصوير", "باقي المبلغ", "التحرير", "التسليم").

Contract status (contracts.status): `signed` (contracts.$token.tsx:77; track.$token.tsx:468); others `not verified`.

Admin reports STATUS (admin.reports.tsx:22-26): new "جديد" `bg-rose-100 text-rose-700`; reviewing "قيد المراجعة" `bg-amber-100 text-amber-800`; closed "مغلق" `bg-gray-100 text-gray-700`.
Admin contact messages (admin.contact-messages.tsx:17-21): new "جديدة" `bg-blue-100 text-blue-700`; read "مقروءة" `bg-gray-100 text-gray-700`; replied "تم الرد" `bg-green-100 text-green-700`; spam "سبام" `bg-red-100 text-red-700`.
Admin referrals (admin.referrals.tsx:25-29): pending "معلّقة" `bg-amber-100 text-amber-800`; completed "مكتملة" `bg-emerald-100 text-emerald-800`; rewarded "مكافأة مُمنوحة" `bg-blue-100 text-blue-800`.
Admin refunds/disputes/subscriptions status maps: `not verified` (not read in full).
Tour status (profile.tsx:568): active "فعّالة", completed "مكتملة", skipped "متخطّاة", none "لم تبدأ".

---

## localStorage / sessionStorage / cookie keys (deduplicated)

localStorage:
- `theme` — ThemeProvider + inline boot script in `__root.tsx:187` (`src/components/theme-provider.tsx:17,31`).
- `memoria_lang` — NOT localStorage; it is a cookie (see cookies).
- `memoria.gender` — `src/hooks/use-gender.tsx:17` (LS_KEY).
- `memoria_visitor_role` — `src/routes/index.tsx:43`, `src/components/site/Header.tsx:43,191,209,295`, `src/components/site/MobileTabBar.tsx:18`.
- `memoria_last_search` — `src/routes/search.tsx:93,135`; read `src/routes/index.tsx:235`.
- `memoria_favs` — `src/routes/search.tsx:92,96,717,726,735`.
- `memoria_last_email` — `src/routes/login.tsx:60,112`.
- `memoria_ask_<photographerId>` — `src/components/AskPhotographer.tsx:22`.
- `memoria.my-bookings` — `src/routes/photographers/$username.tsx:824,829,1041-1043`.
- `memoria.booking-draft.<username>` — `photographers/$username.tsx:845,885,901,907`.
- `memoria.booking-success.<username>` — `photographers/$username.tsx:873,876,883`.
- `memoria:draft:<bookingId>` — `_authenticated/dashboard.bookings.$id.tsx:111,203`.
- `memoria.dismissed-hints.<bookingId>` — `dashboard.bookings.$id.tsx:125,127,130`.
- `memoria:last-booking` — `dashboard.bookings.$id.tsx:161`; `dashboard.bookings.index.tsx:48,89`.
- `memoria:swipe-hint-seen` — `dashboard.bookings.index.tsx:47,91,147`.
- `memoria:dashboard-last-visit` — `dashboard.index.tsx:422,450,453`.
- `memoria-production-tour-seen` — `dashboard.production.tsx:102,332,365`.
- `memoria:visited-tools`, `memoria:recent-tools` — `src/components/dashboard/ToolIndex.tsx:20,30,34,54,59`.
- `memoria-onb-done:<uid>` — `src/lib/onboarding-gate.ts:17,20,23`.
- `memoria.dismissed.<key>` — `src/hooks/use-dismissed.ts:8` (dynamic key).
- `client_tour_v2` — `src/components/ClientTour.tsx:8,23,32`.
- `photographer_tour_v1` — `src/components/PhotographerTour.tsx:14,21,24`.
- `game_hint_seen` — `src/components/site/GameHint.tsx:8,11,14`.
- `pwa_prompt_dismissed` — `src/components/site/PwaInstallPrompt.tsx:7,65`.
- `memoria_notif_dismissed` — `src/components/NotificationPermission.tsx:22,44`.
- `memoria.subguard.dismissed` — sessionStorage (below).
- Supabase auth session — `src/integrations/supabase/previewAuthStorage.ts` (uses localStorage; key names are Supabase-generated, `not verified`).

sessionStorage:
- `memoria-scroll:<pathname>` — `src/routes/_authenticated/dashboard.tsx:23,24,26`.
- `memoria-bk-filter` — `dashboard.bookings.index.tsx:64,65`.
- `memoria-onboarding-later` — `src/lib/onboarding-gate.ts:6,10,14`.
- `pending_referral_code` — `src/routes/photographers/join.tsx:55`; `dashboard.index.tsx:460,464,467`.
- `memoria-pc:<key>` (page cache) — `src/lib/page-cache.ts:9,15,24`.
- `memoria.chunk-reload-at` — `src/routes/__root.tsx:267,270,272`.
- `__asset_reload` — inline guard in `__root.tsx:108-124` (`K`).
- `memoria.subguard.dismissed` (date string) — `src/components/dashboard/SubscriptionGuard.tsx:26,35,99`.
- `memoria_intro`? — intro uses cookie (below), no sessionStorage.

Cookies (document.cookie):
- `memoria_lang` (`LANG_COOKIE`, 1 year, SameSite=Lax) — `src/i18n/index.ts:18,45`; `src/routes/__root.tsx:368` (when `?lang=` present); read `src/routes/photographers/$username.tsx:221`.
- `memoria_intro_seen` (`INTRO_COOKIE`, 1 year) — `src/lib/intro.ts:17,27,31`.
- `sidebar_state` — `src/components/ui/sidebar.tsx:21,86` (sidebar component, probably unused by routes; `not verified`).

URL params (for reference):
- `?redirect=<path>` on /login (from `_authenticated.tsx:21`).
- `?payment=success|failed|pending|cancelled` on /track/$token and /dashboard/subscription.
- `?google=connected|denied|expired|scopes|error` on /dashboard/calendar.
- `?new=1` on /dashboard/bookings (`dashboard.bookings.index.tsx:81`).
- `?ref=` and `?email=` on /photographers/join.
- `?lang=` (`__root.tsx:367`).
- `?q=` on /search (`search.tsx` `not verified`; sitemap/SearchAction schema references `/search?q=`).

---

## All server functions (createServerFn) by file

- `src/lib/admin.functions.ts` — admin list/mutate: listPhotographersAdmin, listReviewsAdmin, adminApproveReview, adminRejectReview, adminTogglePublish, adminRenewSubscription, adminDeletePhotographer, adminSoftDeletePhotographer, adminRestorePhotographer, listSubscriptionPaymentsAdmin, adminApproveSubscriptionPayment, adminRejectSubscriptionPayment, adminVerifyPhotographer, listBookingsAdmin, adminCancelBooking, listDisputesAdmin, adminResolveDispute, getAdminPlatformStats, listEmailLogAdmin, listAuditLogAdmin, listContractsAdmin, listReferralsAdmin, listNotificationsAdmin, adminDeleteNotification, listUserRolesAdmin, adminGrantRole, adminRevokeRole, listContactMessagesAdmin, updateContactMessageAdmin, deleteContactMessageAdmin.
- `src/lib/admin-alerts.functions.ts` — notifyAdminsOfSubscriptionPayment: email/alert admins of a new payment.
- `src/lib/approval.functions.ts` — approveBookingRequest, rejectBookingRequest: photographer approves/rejects a booking request.
- `src/lib/booking.functions.ts` — submitBookingRequest (create booking), getBookingByToken, verifyBookingEmailCode, resendBookingEmailCode, clientMarkDepositSent, clientMarkReceived, clientAddNote, submitReviewByToken, getPublicDepositInfo, recordReferralAfterSignup, confirmBookingAfterDeposit, softDeleteBooking, regenerateBookingToken, uploadSneakPeek.
- `src/lib/cancellation.functions.ts` — cancelBooking (photographer), clientCancelBooking, updateRefundPolicy.
- `src/lib/calendar.functions.ts` — getCalendarMonthData, toggleUnavailability.
- `src/lib/compare.functions.ts` — getCompareDetails: photographer compare data.
- `src/lib/contracts.functions.ts` — signContract, getContractByToken, createContractForBooking.
- `src/lib/email.functions.ts` — sendGalleryDeliveredEmail.
- `src/lib/extras.functions.ts` — confirmReady, saveEventDayInfo, addAddendum, withdrawAddendum, respondAddendum, clientEditDetails, getBookingReview, replyToReview, getClientHistory, requestEmailFix.
- `src/lib/gallery.functions.ts` — getGalleryByToken, getMessagesByToken, sendMessageByToken, ensureGallery, updateGallery, addGalleryPhoto, deleteGalleryPhoto, getGalleryForPhotographer (+ optimizedImageUrl, responsiveSrcSet helpers).
- `src/lib/google-calendar.functions.ts` — getGoogleStatus, getGoogleConnectUrl, syncGoogleNow, disconnectGoogle.
- `src/lib/ical-sync.functions.ts` — syncExternalIcal, getIcalStatus (+ syncAndRecord helper used by cron).
- `src/lib/intro.ts` — not a server fn (cookie helpers).
- `src/lib/log-move.ts` — logMove: production move audit log.
- `src/lib/manual-booking.functions.ts` — createManualBooking.
- `src/lib/negotiation.functions.ts` — submitPriceOffer, getOfferByToken, listMyOffers, respondToOffer.
- `src/lib/extras.functions.ts` — (listed above).
- `src/lib/paytabs.functions.ts` — getPayTabsStatus, startPayTabsSubscription.
- `src/lib/payments.functions.ts` — isPaymentsEnabled, createDepositCheckout, createSubscriptionCheckout, processDepositRefund, reconcilePaymentStatus.
- `src/lib/zbooni.functions.ts` — startZbooniSubscription, confirmZbooniSubscriptionPaid.
- `src/lib/page-settings.functions.ts` — savePageSettings.
- `src/lib/production.functions.ts` — updateProductionStage, markFinalPaymentReceived, updateBookingStatus, saveBookingSelectionLink, saveDeliveryLink.
- `src/lib/profile-reports.functions.ts` — submitProfileReport, listProfileReports, updateProfileReport, reportChatByToken, reportChatAsPhotographer.
- `src/lib/profile.functions.ts` — getPhotographerProfileData.
- `src/lib/questions.functions.ts` — askPhotographer, getQuestionByToken, listMyQuestions, answerQuestion.
- `src/lib/recap.functions.ts` — getYearRecap.
- `src/lib/recover.functions.ts` — recoverTrackingLinks.
- `src/lib/reports.functions.ts` — getReportStats.
- `src/lib/search.functions.ts` — searchPhotographers, listPublishedCities.
- `src/lib/stepup.functions.ts` — requestBrideCode.
- `src/lib/telegram.functions.ts` — getNotifyChannels, getTelegramLinkUrl, unlinkTelegram, sendTelegramTest.
- `src/lib/trust.functions.ts` — verifyPhotographerStatus, getMyVerification, requestVerification, raiseDispute, resolveDispute, updateNotificationPreferences.
- `src/lib/upload-diagnostic.functions.ts` — checkUploadHealth, getUploadConfig.
- `src/lib/negotiation.functions.ts` — (listed).
- `src/lib/zbooni.functions.ts` — (listed).
- `src/lib/payments.functions.ts` — (listed).
- `src/lib/photographer...` none.

Note: `src/lib/*.functions.ts` bodies NOT read; one-line purposes are inferred from names and call sites, so treat as `not verified` beyond the names.

---

## Shared components and where used

- `BookingExtras` (`src/components/BookingExtras.tsx`, 585 lines; NOT read in full, grep only): exports `BookingExtrasPanel` (photographer addendums, line 75; used `dashboard.bookings.$id.tsx:41`), `BrideExtras` (line 267, `track.$token.tsx:20`), `BrideEditDetails` (449), `ClientHistory` (542, `dashboard.bookings.$id.tsx:41`), `BrideEmailFix` (565, `track.$token.tsx:20`). Addendum statuses at lines 49-53.
- `UploadZone` (`src/components/UploadZone.tsx`, 315 lines; NOT read; grep export at line 52). Used `not verified` (likely gallery upload).
- `ShotList` (`src/components/ShotList.tsx`, `ShotList` line 18; `dashboard.bookings.$id.tsx:21`; rpc `seed_default_shot_list` line 82).
- `WhatsAppQuickSend` (`src/components/WhatsAppQuickSend.tsx` line 48; `dashboard.bookings.$id.tsx:20`; rpc `seed_default_whatsapp_templates` line 67).
- `VerifyBookingPanel` (`src/components/VerifyBookingPanel.tsx` line 19; `track.$token.tsx:5`, `photographers/$username.tsx:19`).
- `PaymentMethods` (`src/components/PaymentMethods.tsx`): `PaymentMethodsView` (line 104; `track.$token.tsx:19`), `PaymentMethodsEditor` (line 23; `dashboard.profile.tsx:27`, `onboarding.tsx:6`).
- `Lightbox` (`src/components/Lightbox.tsx` line 9; `track.$token.tsx:26`, `photographers/$username.tsx:21`).
- `ChatReport` (`src/components/ChatReport.tsx` line 7; `track.$token.tsx:22`, `dashboard.bookings.$id.tsx:43`).
- `AskPhotographer` (`src/components/AskPhotographer.tsx` line 10; `photographers/$username.tsx:40`). localStorage `memoria_ask_<id>`.
- `BookingJourney` (`src/components/BookingJourney.tsx` line 6; `photographers/$username.tsx:36`).
- `StepUpBox` (`src/components/StepUpBox.tsx` line 9; `track.$token.tsx:38`).
- `PremiumLock` (`src/components/ui/PremiumLock.tsx` line 13; rpc `is_subscription_active` & `photographer_tier` line 50-51; plan-lock UI; route usage `not verified` (grep found no route import with exact name; check `src/components` consumers)).
- `confirm-dialog` (`src/components/ui/confirm-dialog.tsx` line 88 `useConfirm`; used in admin.photographers, admin.refunds, admin.reports, admin.roles, track.$token, photographers/$username, dashboard.bookings.$id, dashboard.whatsapp-templates, dashboard.production (AlertDialog native)). Options: title, description, confirmText, destructive.
- `loading` (`src/components/ui/loading.tsx`): `PageLoader` (default "جارٍ التحميل…"), `GridSkeleton`, `ListSkeleton`.
- `empty-state` (`src/components/ui/empty-state.tsx` line 4): `EmptyState` — used in search, bookings list, production, notifications.
- `copy-button` (`src/components/ui/copy-button.tsx` line 12): `CopyButton` — used in dashboard.index, bookings.$id, contracts, referrals, subscription, track.$token.
- `pull-to-refresh` (`src/components/ui/pull-to-refresh.tsx` line 10): `PullToRefresh` — used by bookings list, production, notifications per Phase A commit message (`not verified` in code; grep for import not run).
- `ShareLinkButton` (`src/components/dashboard/ShareLinkButton.tsx`, 32 lines; NOT read).
- `ManualBookingSheet`, `BlockDaySheet` (`src/components/dashboard/`): opened from MobileBottomNav quick actions; `BlockDaySheet` also on calendar (`not verified`).
- `CommandPalette` (`src/components/CommandPalette.tsx`, 157 lines; NOT read in full; grep: STATUS map line 35-37, `PhotographerCommandPalette` mounted in `__root.tsx:421`, `openCommandPalette` exported; used by MobileTabBar import).
- `PwaInstallPrompt` (`src/components/site/PwaInstallPrompt.tsx`, 116 lines; NOT read in full; mounted `__root.tsx:424`; localStorage `pwa_prompt_dismissed`).
- `OfflineBanner` (`src/components/site/OfflineBanner.tsx`, FULL): fixed top bar when navigator offline; mounted in `_authenticated/dashboard.tsx`.
- `SubscriptionGuard` (`src/components/dashboard/SubscriptionGuard.tsx`, FULL): dashboard layout only.
- `BasicLimitNote`, `GenderPicker`, `GoogleConnectCard`, `MonthGrid`, `TodayFocus`, `NotifyChannelsCard`, `LivePhonePreview`, `ToolIndex`: `src/components/dashboard/*` — used inside dashboard pages (`not verified` per file).
- `BottomNav` (site/BottomNav.tsx): unused, dead.
- `use-autosave.tsx` (hook, FULL): see Client state note; used by settings/pricing/profile per commit history (`not verified` per route).
- `page-cache.ts` (GREP only): sessionStorage cache prefix `memoria-pc:` (lines 9, 15, 24); consumers `not verified`.
- `plans.ts` (FULL): prices and limits (see /pricing, /dashboard/subscription, /dashboard/pricing).

---

## Surprises (for the redesign owner)

- `BottomNav.tsx` is dead code; the live bars are `MobileTabBar` (global, public) and `MobileBottomNav` (photographer). Both mounted on non-dashboard pages for photographers and dashboards → two different photographer tab bars exist (MobileBottomNav is the only one used for photographers).
- Admin tab labels and role check are client-only (`admin.tsx` line 27); non-admin sees "غير مصرّح" inside the admin page, not a redirect.
- Booking `pending_deposit` colour differs between bookings list (amber-500/10) and booking detail (amber-100). Status "مؤكّد" vs "مؤكَّد" (ical + google-calendar) spelling differs.
- Two different completion labels for `completed`: "مكتمل" everywhere, but report funnel relabels completed+delivered_at as "تم التسليم".
- Production stage values vs booking status values coexist (`production_stage` awaiting…delivered and `status` completed); the track page derives progress from both.
- Hard-coded Arabic emoji in Header (📷 أنا مصوّرة / 🌸 أنا عروس) and in whatsapp/telegram copy.
- `/game/` link in Footer has trailing slash vs route `/game` (`not verified` whether it works).
- Native `window.confirm` used in dashboard.bookings.index.tsx:131 and dashboard.settings.tsx:116 while the rest use `useConfirm` dialog.
- Settings save model conflicts: settings page has explicit save per commit "autosave in settings" — `not verified` in code.
- Several routes use direct `supabase.from(...)` from the browser (dashboard.index, calendar, bookings.$id, onboarding, profile, admin.refunds, admin.index?) — RLS-dependent, not server fns.
- `dashboard.calendar.tsx` iCal import validation hard-codes Google URL shape (`private-…/basic.ics`).
- Cron endpoints need `CRON_SECRET`; `booking-changed` needs Vault secret via rpc `get_booking_hook_secret`; WhatsApp needs `WHATSAPP_APP_SECRET` + `WHATSAPP_VERIFY_TOKEN`; Telegram needs `TELEGRAM_WEBHOOK_SECRET` (env names exact as in code).

---

## Not verified (explicit gaps)

- Any Arabic label/button text inside files marked GREP (most of routes/*.tsx > 300 lines).
- Full form validation rules (zod or manual) for booking, onboarding, profile, pricing, contact, join, login.
- Exact body of all `src/lib/*.functions.ts` server functions (only names + call sites).
- `src/components/*` not explicitly marked FULL (BookingExtras, UploadZone, CommandPalette, PwaInstallPrompt, ShareLinkButton, GoogleConnectCard, etc.).
- `src/hooks/use-autosave.tsx` NOT read in this pass. `src/lib/page-cache.ts` GREP only (consumers not verified).
- `src/components/site/PwaInstallPrompt.tsx`, `CommandPalette.tsx`, `UploadZone.tsx`, `BookingExtras.tsx`, `ShareLinkButton.tsx`, `dashboard/*.tsx` (other than SubscriptionGuard, BlockDaySheet not read) NOT read in full; only grep lines cited.
- Route files marked GREP (search, photographers/$username, track/$token, dashboard.bookings.$id, dashboard.production, dashboard.profile, dashboard.settings, dashboard.calendar, admin.* etc.) were NOT read line by line; this inventory is incomplete for their UI behaviour.
- `pull-to-refresh` usage per route not grep-verified.
</content>
