# Deliverable A — Product Audit

Audited 2026-11-10. Source of truth: the repository at `C:\Users\ahmad\memoria` and its production deployment `https://memoria-production.ahmad000haddad.workers.dev`. The URL in the brief, `memoria-jo.lovable.app`, is the retired Lovable build: `src/routes/__root.tsx:180` redirects its visitors to production, so it was not audited separately.

How this was checked: code reading (routes, shell, styles, service worker, manifest, build output in `.output/`), a signed-in desktop walkthrough of the dashboard in Brave, phone-width (375px) measurements of public pages, and a per-route inventory in [`_route-inventory.md`](_route-inventory.md).

Limits, stated plainly:
- Phone-width screenshots of the signed-in dashboard were not possible (the browser window would not resize and the site sends `frame-ancestors 'none'`). Mobile dashboard findings come from code, from `docs/MOBILE_QA_2026-11-09.md` (a live 393px check done the day before), and from the desktop walkthrough.
- The inventory covered small routes fully and the eight largest route files at grep level. Anything marked "not verified" there must be read in code before it is touched.
- Admin screens, the bride tracking page, contract signing, review and offer pages were inventoried from code, not walked live.

## 1. What Memoria is

The brief describes a management tool for wedding photographers. The product is wider than that: a two-sided marketplace with three audiences.

| Audience | Entry | What they do |
|---|---|---|
| Bride / client (public, no account) | `/`, `/search`, `/photographers/$username` | Find a photographer, see packages and live price, request a booking, upload deposit proof, sign the contract, track production, leave a review. Tokenised pages: `/track/$token`, `/contracts/$token`, `/review/$token`, `/offer/$token`, `/ask/$token`. |
| Photographer (account, subscription with trial) | `/dashboard/*` | Bookings, calendar and blocked days, production board, packages and pricing, contracts, WhatsApp templates, offers, questions, reports, yearly recap, referrals, subscription, public-page settings, profile and verification. |
| Admin | `/admin/*` | Photographers, bookings, subscriptions, refunds, disputes, reviews, reports, roles, audit and email logs. |

Language: Arabic first, RTL, with an English toggle (`src/i18n`, cookie `memoria_lang`). Copy is gender-aware through `g()` in `src/hooks/use-gender.tsx`: photographers can be men, and the interface addresses them correctly. The redesign must keep both.

## 2. Technical architecture found

| Layer | Fact |
|---|---|
| Framework | TanStack Start 1.168 + TanStack Router (file routes, SSR) on React 19, built with Vite 7 through `@lovable.dev/vite-tanstack-config`. |
| Hosting | Cloudflare Workers (`wrangler.jsonc`, `src/server.ts`), cron every 30 min for Google Calendar sync. |
| Data | Supabase (auth, Postgres, storage). Server functions in `src/lib/*.functions.ts`; TanStack Query on some pages, a hand-rolled page cache (`src/lib/page-cache.ts`) on others. |
| Styling | Tailwind v4 with CSS variables in `src/styles.css` (532 lines). shadcn-style primitives in `src/components/ui` (49 files). |
| Motion | framer-motion in 54 files, Lenis smooth scroll on public pages, View Transitions on mobile dashboard, `tw-animate-css`. |
| PWA | Hand-written `public/sw.js` (cache `memoria-v8`: HTML network-first with offline page, images stale-while-revalidate, hashed assets left to the browser, API never cached, push handlers), `public/manifest.webmanifest`, install prompt, offline banner. |
| Integrations | WhatsApp deep links and webhook, Telegram bot, Google Calendar OAuth, iCal feed, Zbooni and PayTabs payments, CliQ deposits by proof upload, Resend email, Sentry (lazy), GA (optional). |
| Security headers | Strict CSP with nonce, `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'none'`. |

## 3. Inventory

Sixty-six page routes and ten API routes. The full per-route record (data read and written, forms, uploads, storage keys, overlays) is in [`_route-inventory.md`](_route-inventory.md). Summary:

- Public marketing: `/`, `/for-clients`, `/for-photographers`, `/pricing`, `/guide`, `/faq`, `/about`, `/contact`, `/blog`, `/blog/$slug`, `/app`, `/game`, legal pages, SEO landings (`/wedding-photographer/$city`, `/occasion/$type`).
- Discovery and booking: `/search` (filters, favourites, compare mode), `/photographers/$username` (1,720 lines: gallery, packages, live price, booking request with draft autosave, questions), `/photographers/join`.
- Auth: `/login` (password, magic link, Google), `/forgot-password`, `/reset-password`, `/recover`, `/onboarding`.
- Photographer app: 17 routes under `/dashboard`, plus `/notifications`.
- Admin: 15 routes.
- Client token pages: track, contract, review, offer, ask.

Shell components and where they appear: `Header` and `Footer` (marketing chrome) render on almost every page including the dashboard; `MobileTabBar` (public) and `MobileBottomNav` (photographer: Home, Bookings, "+", Calendar, Profile) share the bottom of the screen by rule; `CommandPalette` (Ctrl K); `PwaInstallPrompt`, `GameHint`, two product tours, `FirstVisitIntro`.

There is no separate "clients" screen. A client exists only as the person on a booking; the bookings list and its search are the client directory. The brief asks for a client management prototype "if present": it is not present, so none was invented.

## 4. What works and should stay

1. The palette's foundation. Warm ivory (`#FDFAF4`) with espresso charcoal (`#1F1915`, 16.6:1) is calm, appropriate and already consistent. Dark mode is warm, not blue-black.
2. The mobile behaviour layer shipped in the last two weeks: scroll memory per page, edge-swipe back, bottom sheets for quick actions, autosave with a small saved chip, pull-to-refresh, skeletons, an offline banner, route preloading. This is real product craft and is preserved untouched.
3. One focus task on the dashboard ("مهمة اليوم") and tools ordered by recent use.
4. Bookings list: search, filters with counts, "needs action" grouping, last-opened shortcut.
5. Friendly Arabic copy, gender-aware, with domain words the users know (عربون, CliQ).
6. Careful engineering under the surface: stale-chunk recovery, strict CSP, a service worker that refuses to cache private data, reduced-motion handling in CSS.
7. The photographer's own public page theming (10 palettes, 10 accents, 6 font pairs, 3 radii in `src/lib/page-settings.ts`) built on OKLCH with guaranteed contrast.

## 5. Findings

Severity: **C** critical (hurts use or trust), **M** major, **m** minor.

### Visual system

| # | Sev | Finding | Evidence |
|---|---|---|---|
| V1 | C | No shared component layer is in use. `Button`, `Input`, `Card`, `Badge`, `Select`, `Tabs`, `Table` and 28 other primitives in `src/components/ui` are imported nowhere; pages style raw elements inline. The same button is written dozens of ways. | `grep "components/ui/"`: `button` 5 imports, `input` 1, `card` 0. |
| V2 | C | Gold as text fails contrast. `--gold` (`#B68D59`) on ivory is 2.91:1. It carries eyebrows, active tab labels (11px), links and counts. | `src/styles.css:72`, `.eyebrow`, `MobileBottomNav.tsx` `text-gold`. |
| V3 | M | Three colour systems coexist: brand tokens, raw Tailwind palette classes (emerald 272 uses, amber 233, red 39, blue 30, rose 26, sky 21, plus violet, purple, indigo, orange), and one-off hex values. Status colours differ between screens: "awaiting deposit" is `amber-500/10` in the list and `amber-100` in the detail. | `dashboard.bookings.index.tsx:40` vs `dashboard.bookings.$id.tsx:68`. |
| V4 | M | Shape has no rule: `rounded-sm` 455, `rounded-full` 413, `rounded-2xl` 108, `rounded-xl` 92, `rounded-md` 87, `rounded-lg` 33. Ten shadow styles. Pills, soft cards and sharp boxes sit side by side. | class counts over `src/**/*.tsx`. |
| V5 | M | Type scale leaks: 98 uses of `text-[11px]`, 30 of 10px, 11 of 9px, one 8px. `text-xs` (642) nearly matches `text-sm` (732): most of the interface is 12 to 14px. | class counts. |
| V6 | M | The look leans on the wedding-template trio: bold Naskh headings, a calligraphic script accent, gold on black. The dark gold-button "task" card, gold gradients, a shimmer sweep on every button (`button.tsx`), hover lifts and grain overlays add decoration without information. | `src/styles.css:97-98, 252-292, 418-458`; `button.tsx` `before:` shimmer. |
| V7 | M | Eighteen font families are installed and declared; the home page downloads five files (235KB): Cairo, Amiri 700, Aref Ruqaa, Cormorant Garamond, plus Latin Cairo. Cairo is the default Arabic web face and gives the interface its generic look. | `package.json`, `src/styles.css:4-27`, measured on `/`. |
| V8 | M | The logo is a 20-polygon gradient gem in rose-copper (`#D8B49E → #4A2E22`). It cannot be drawn in one colour, is unreadable at 16px, and uses a palette that appears nowhere else. The manifest uses pure black `#0c0c0c` while the app uses warm charcoal. | `public/brand/mark.svg`, `public/manifest.webmanifest`. |
| V9 | m | Numerals are mixed: Eastern Arabic digits on marketing and dates ("١٠", "٣٢٠"), Western digits for money and counts in the dashboard, sometimes in one sentence. | home hero vs dashboard figures. |
| V10 | m | Emoji appear as icons in headers and package names; Kanban columns use five unrelated top-border colours (slate, amber, blue, violet, emerald). | `Header.tsx:198`, `dashboard.production.tsx:64-70`. |

### Experience

| # | Sev | Finding | Evidence |
|---|---|---|---|
| U1 | C | The dashboard wears marketing chrome. Every app page shows the public site header (logo, section links, language, theme, bell, chat, settings, "my dashboard") and the full five-column marketing footer with SEO city links and the game. On a phone a sub-page carries three navigation systems at once. | walkthrough; `MOBILE_QA` item 9. |
| U2 | C | Desktop is an afterthought. On a 1440px screen every dashboard page is a single 640 to 900px column in an empty field; the bookings list cannot stay visible while a booking is open. | walkthrough screenshots. |
| U3 | M | Touch targets. At 375px, 31 of 38 interactive elements on `/` are under 44px high, 39 of 49 on `/search`, 33 of 41 on `/login`; "forgot password" and "sign in by email link" are 16px high. | measured in page. |
| U4 | M | Long pages: the public photographer page is 8.1 phone screens, the profile editor 4,242px, settings about 4,800px. | measured. |
| U5 | M | Booking detail (1,404 lines) shows everything at once: client, place, package, money, proof, contract, shot list, review, extras, chat, production. A sticky next-step card takes a quarter of the phone screen while scrolling. | `MOBILE_QA` item 13. |
| U6 | M | Two native `window.confirm` dialogs remain while the rest uses the styled confirm; an invalid email on join returns a generic error. | `dashboard.bookings.index.tsx:131`, `dashboard.settings.tsx:116`; `MOBILE_QA` item 6. |
| U7 | m | Icon reuse: one "message" icon stands for offers, WhatsApp templates and questions. | `MobileBottomNav.tsx` actions. |
| U8 | m | Onboarding overlays compete: first-visit intro, client tour, photographer tour, game hint, install prompt can all be eligible in one session. | `__root.tsx:397-428`. |

### Performance

| # | Sev | Finding | Evidence |
|---|---|---|---|
| P1 | C | The entry bundle is 1.60MB raw, 482KB gzip (home page transfers 457KB of JS at 375px). The English dictionary `src/i18n/en.json` (523KB) is statically imported into it and shipped to every Arabic user. | `.output/public/assets/index-BeYJK-wZ.js`; `src/i18n/index.ts:3`. |
| P2 | M | The stylesheet is 228KB raw (39KB transferred), inflated by `@font-face` rules for 18 families of which most pages use three. | `.output/public/assets/styles-*.css`. |
| P3 | M | First-visit LCP was 7.1s on desktop because the intro choreography delays the hero; Lenis runs a permanent `requestAnimationFrame` loop on public pages. | measured on `/`; `__root.tsx:329-353`. |
| P4 | M | The dashboard home fires 24 to 33 Supabase requests; profile and calendar refetch from zero on every visit. Already planned as an RPC in `MOBILE_APP_MASTER_PLAN.md` phase C (a backend change, out of redesign scope). | `MOBILE_QA` section C. |
| P5 | m | Demo and hero images are JPEG (60 to 254KB each), no `srcset`, no AVIF/WebP. | `public/demo`. |
| P6 | m | Dead weight in the repo: `recharts` is imported only by an unused chart wrapper; `BottomNav.tsx` is unused; `embla`, `react-resizable-panels`, `input-otp`, `vaul` and a dozen Radix packages back unused primitives (tree-shaken from the bundle, but they slow installs and confuse readers). | import search. |

Measured good: CLS 0 on `/`, DOMContentLoaded 66 to 156ms, hashed assets cached immutably, no horizontal overflow on the pages measured.

### PWA

| # | Sev | Finding |
|---|---|---|
| W1 | M | `start_url` is `/` (the bride's marketing page). A photographer who installs the app opens on marketing and must tap through to the dashboard. |
| W2 | M | The manifest description, name and shortcuts address brides and photographers at once; icons are the gradient gem; `theme_color` is not theme-aware. |
| W3 | m | `apple-touch-icon` points at a 512px file; there is no iOS splash image. |
| W4 | m | The app shell list precaches marketing pages, not the dashboard shell. Left as is: changing caching strategy is out of scope and the current behaviour is safe. |

## 6. Diagnosis in one paragraph

Memoria's behaviour is ahead of its appearance. The product already acts like an app (sheets, autosave, offline banner, swipe back), but it looks like a themed marketing site stretched over a tool: one decorative vocabulary (gold, script, gradient, shimmer) applied everywhere, no component layer to hold it together, and marketing chrome wrapped around working screens. The redesign therefore is mostly subtraction and consolidation: one token set, one component layer that pages finally use, an app shell separate from the site, a type system with two roles instead of five, and colour that means something.
