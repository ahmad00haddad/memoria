# Deliverable F — Frontend, Mobile/PWA and Performance Architecture

The redesign fits the existing stack. Nothing here replaces TanStack Start, Tailwind v4, Supabase, the service worker or the router. No new runtime dependency is required.

Every change is classified:
**V** visual only · **S** frontend structural · **I** interaction behaviour · **P** performance · **B** backend or business logic (none are part of this redesign; listed only to mark them out of scope).

## 1. Styling architecture

### 1.1 Tokens live where they already live (V)

`src/styles.css` keeps its structure: `@theme inline` maps Tailwind colour names to CSS variables, `:root` holds light values, `.dark` holds dark values. The redesign changes values and adds names. It does not rename what the code already uses.

| Existing variable (keep the name) | New light value | New dark value | Note |
|---|---|---|---|
| `--background` | `#F9F6F1` | `#120F0C` | paper |
| `--card`, `--popover` | `#FFFDFA` | `#1C1714` | surface |
| `--secondary`, `--muted` | `#F2EEE6` | `#0D0907` → use `#1C1714` for `--secondary` in dark | sunken |
| `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground` | `#1F1915` | `#F2EEE7` | ink |
| `--muted-foreground` | `#6F6761` | `#918B84` | ink-3 |
| `--border` | `#DFDAD1` | `#2F2A27` | line |
| `--input` | `#8F877F` | `#7A736C` | line-input (3:1 against surface) |
| `--primary` | `#1F1915` | `#F2EEE7` | **dark mode changes from gold to ivory**: primary buttons stop being gold |
| `--primary-foreground` | `#F9F6F1` | `#120F0C` | |
| `--accent` | `#F2EEE6` | `#1C1714` | **changes from gold to sunken**: shadcn uses `accent` for hover fills, which must not be gold |
| `--accent-foreground` | `#1F1915` | `#F2EEE7` | |
| `--gold` | `#BE9761` | `#D2B281` | brass: fills, rules, the logo corner. Never text on paper. |
| `--gold-foreground` | `#1F1915` | `#120F0C` | |
| `--ivory`, `--charcoal` | `#F9F6F1`, `#1F1915` | unchanged per theme | still referenced by `bg-charcoal text-ivory` buttons |
| `--destructive` | `#A04034` | `#E1897B` | clay |
| `--ring` | `#805B31` | `#D2B281` | focus ring |
| `--radius` | `0.375rem` | | makes `rounded-sm` 2px, `rounded-md` 4px, `rounded-lg` 6px, `rounded-xl` 10px |

New variables, each with a `--color-*` line in `@theme inline` so Tailwind generates utilities (`text-brass-ink`, `bg-clay-wash`, …):

`--ink-2` `#4E4640` / `#BCB7AF` · `--line-strong` `#C3BDB3` / `#47413C` · `--brass-ink` `#805B31` / `#D2B281` · `--brass-wash` `#F5EAD5` / `#2F2416` · `--sage` `#4A6D51` / `#92BE9A` · `--sage-wash` `#E5F3E7` / `#19281C` · `--ochre` `#875814` / `#DCB87A` · `--ochre-wash` `#F9EDD5` / `#2F2512` · `--clay` `#A04034` / `#E1897B` · `--clay-wash` `#FDE9E6` / `#351C18` · `--slate` `#4B677E` / `#97B5CF` · `--slate-wash` `#E7F0F7` / `#1A252F` · `--whatsapp` `#1F7A4A` / `#7FCF9F`.

The utility `text-gold` exists 100+ times. Repoint it in one place: change the `@utility text-gold` body to `color: var(--brass-ink)`. That fixes contrast everywhere at once without touching call sites. `bg-gold`, `border-gold` keep using `--gold`.

### 1.2 Photographer page theming must keep winning (S, high regression risk)

`src/lib/page-settings.ts` builds a full palette per photographer and sets font variables; `src/styles.css:498-501` applies them with `html[data-pfont]…` selectors that out-rank the base rules. These pages (`/photographers/$username` and the live preview iframe in settings and profile) are the photographer's brand, not Memoria's.

Rules:
1. Do not change `page-settings.ts`, `THEMES`, `ACCENTS`, `FONTS`, `RADII`, or the `html[data-pfont]` block.
2. All eighteen `@font-face` imports stay available, because any of them can be selected. They move to a separate stylesheet (section 3.2) so only pages that need them pay for them.
3. New base font rules must have lower specificity than `html[data-pfont][dir] :is(...)`. Keep them as plain element or `[dir]` selectors exactly like today.
4. After every phase, open one public page per theme and per font pair and compare with production.

### 1.3 Component layer: finish what exists (S)

Do not add a UI library. `src/components/ui` already holds cva-based primitives that pages ignore. The work is to restyle a small set and then adopt them page by page:

Restyle and adopt: `button`, `input`, `textarea`, `label`, `select`, `badge`, `sheet`, `dialog`, `alert-dialog`, `confirm-dialog`, `sonner`, `skeleton`, `SkeletonCard`, `empty-state`, `loading`, `tabs`, `popover`, `dropdown-menu`, `calendar`, `accordion`, `tooltip`, `switch`, `checkbox`, `copy-button`, `pull-to-refresh`, `PremiumLock`.

Add three small files (no dependencies): `ui/status.tsx` (dot + label, one map for every status vocabulary), `ui/list-row.tsx` (the 68px row), `ui/page-header.tsx` (mobile top bar and desktop title block).

Leave untouched and unused for now: `sidebar`, `menubar`, `navigation-menu`, `context-menu`, `resizable`, `hover-card`, `breadcrumb`, `pagination`, `carousel`, `chart`, `table`, `drawer`, `input-otp`, `toggle-group`, `slider`, `progress`, `scroll-area`, `aspect-ratio`, `avatar`, `collapsible`, `radio-group`, `separator`, `toggle`, `command` (used by the palette: restyle only). Deleting unused files and their packages is a separate cleanup, proposed in section 5, and needs the owner's approval because it touches `package.json`.

### 1.4 App shell separate from site shell (S)

Today `Header` and `Footer` render inside dashboard pages. Introduce `src/components/app/AppShell.tsx` used by `src/routes/_authenticated/dashboard.tsx` (and by `admin.tsx` with its own nav list):

- ≥1024px: `AppMasthead` (64px: mark + wordmark, primary links, search trigger that calls the existing `openCommandPalette()`, notifications link with the existing unread count, quick "new booking" button that opens the existing `ManualBookingSheet`, account menu with language toggle, theme toggle and sign-out).
- <1024px: `AppTopBar` (52px: title or back + title, search, bell) and the existing `MobileBottomNav`, restyled.
- No marketing `Footer` in the app area. A one-line footer (support email, version) on desktop only.

Find where each dashboard route renders `<Header />` and `<Footer />` and remove those two elements from dashboard and admin routes only. Everything those headers did for a signed-in photographer (language, theme, bell with count, messages/questions link, settings link, sign-out, the trial banner if it lives there) must have a home in the new shell first. Build the shell, verify parity against the inventory, then remove the old chrome. Public routes keep `Header` and `Footer`, restyled.

Breakpoint note: the code switches mobile/desktop at `md` (768px) in some places and `sm` (640px) in others (`MobileTabBar` uses `sm:hidden`, `MobileBottomNav` uses `md:hidden`). Standardise the app shell on `lg` (1024px) for the masthead and keep the bottom bar below it; tablets get the mobile shell with a wider content column. This is a behaviour change on 768 to 1023px screens and must be tested.

## 2. Mobile and PWA

Preserve without modification: `public/sw.js` fetch strategies and push handlers, the registration code in `__root.tsx`, `beforeinstallprompt` capture, `OfflineBanner`, the asset-reload guard, View Transition names and types, scroll memory, edge-swipe back, route preloading, pull-to-refresh, the iOS 16px input rule, `overscroll-behavior`.

Allowed changes:

| Change | Class | Detail |
|---|---|---|
| Manifest colours and icons | V | `theme_color` and `background_color` → `#1F1915`. Replace the three PNG icons with exports of `docs/redesign/brand/app-icon.svg` (192, 512) and `app-icon-maskable.svg` (512). Shortcut icons likewise. |
| Theme-aware browser bar | V | Add `<meta name="theme-color" media="(prefers-color-scheme: light)" content="#F9F6F1">` and a dark twin `#120F0C` in `__root.tsx` head. |
| iOS icon | V | `apple-touch-icon` → a 180×180 PNG export. |
| Cache name bump | P | After icons change, bump `CACHE_NAME` to `memoria-v9` so old icons and HTML are dropped. No other line in `sw.js` changes. |
| `start_url` | **owner decision** | Changing `/` to `/dashboard/` would suit photographers and hurt brides who install. Leave as is; the existing "لوحة المصوّر" shortcut already covers it. Not part of this redesign. |
| Splash | V | Android builds the splash from `background_color`, name and the 512 icon: correct once the manifest is updated. iOS splash images are optional and deferred. |

Mobile layout rules (all V or S):
- Bottom bar height 56px plus `env(safe-area-inset-bottom)`; content padding-bottom 96px plus the inset.
- A page-level sticky action bar (booking detail) replaces the bottom tab bar on that screen: never two bars. The existing rule that hides bars on the public photographer page stays.
- Floating buttons on profile and settings ("preview my page") move into the top bar as an icon button, which removes the overlap recorded in `MOBILE_QA` items 2 and 3.
- Sheets: top radius 14px, grab handle, max height 88vh, internal scroll, close button 44px, focus trapped, `Esc` and scrim close. Keep the framer drag-to-dismiss already implemented.
- Keyboard: inside sheets the primary button stays in normal flow at the end of the form (not fixed), so the on-screen keyboard never covers a fixed bar. Use `inputmode` and `autocomplete` as today; keep `dir="ltr"` on phone, email and amount fields.
- No horizontal scroll except the filter tab strip, which scrolls inside its own row and shows a fade at the trailing edge.

## 3. Performance plan

### 3.1 Targets (mobile, Moto G Power class, slow 4G, Lighthouse mobile preset)

| Metric | Target | Measured today |
|---|---|---|
| Lighthouse Performance | ≥ 90 public pages, ≥ 85 dashboard | not run (lab run is part of acceptance) |
| LCP | ≤ 2.5s at p75; home ≤ 2.0s | 7.1s desktop first visit (intro) |
| INP | ≤ 200ms | not measured |
| CLS | ≤ 0.1 (keep ≤ 0.02) | 0 |
| JS transferred, first load of `/` | ≤ 250KB gzip | 457KB |
| JS transferred, first load of `/dashboard` | ≤ 300KB gzip | not isolated |
| CSS transferred | ≤ 25KB | 39KB |
| Fonts on first load (Arabic) | ≤ 135KB, 2 files; ≤ 80KB if the Amiri subset is built | 235KB, 5 files |
| Total first-load weight of `/` | ≤ 700KB | about 840KB |
| Requests on dashboard home | no increase | 24 to 33 (reduction needs an RPC: backend, out of scope) |

### 3.2 Actions, in order of value

1. **Lazy English dictionary (P, S).** `src/i18n/index.ts` statically imports the 523KB `en.json`. Load it only when the language is English: on the server, resolve language from the cookie or `?lang` and include the dictionary in the SSR payload for English requests only; on the client, `await import("./en.json")` before hydration when `lang === "en"`. The `t()`, `tr()` and `tx()` call signatures do not change. Expected saving: about 140KB gzip for every Arabic visit. Risk: a flash of Arabic strings on English pages if the import resolves after first paint; guard by awaiting it in the router's client entry.
2. **Fonts (P, V).** Core stylesheet imports only: Readex Pro Variable (Arabic and Latin subsets), Amiri Arabic 400, Newsreader Variable Latin. Move the other families' `@import` lines into `src/styles/page-fonts.css`, imported only by `photographers/$username.tsx`, `dashboard.settings.tsx` and `dashboard.profile.tsx` (the three places that render a photographer theme). Preload exactly one file, `readex-pro-arabic-wght-normal.woff2` (23KB), with `<link rel="preload" as="font" crossorigin>`. Everything uses `font-display: swap` (Fontsource default). Remove the Amiri 700 and Aref Ruqaa imports from the core sheet (they remain in `page-fonts.css` for the "classic" and "calligraphy" pairs).
3. **Remove decorative motion from the critical path (P, I).** Delete the button shimmer (`before:` rules in `button.tsx` and the `.bg-gold::after` block in `styles.css`), `lift-on-hover`, `hover-magnetic`, `grain-overlay`, `shimmer-once`. Drop Lenis: native scrolling is smoother on phones and removes a permanent animation-frame loop (`__root.tsx:327-353`); keep `scrollIntoView({behavior:"smooth"})` for in-page links. Keep `FirstVisitIntro` only if the owner wants it; if kept, the hero must paint underneath it so LCP is not delayed (render the intro as an overlay above already-painted content).
4. **framer-motion stays, scoped (P).** It powers sheet drag, layout pills and page entrances in 54 files. Keep `LazyMotion` with `domAnimation`. Do not add new framer usage; new transitions are CSS. Where a file imports `motion` only for a fade-up entrance on a dashboard page, replace with the `animate-fade-up` class and remove the import. Do this opportunistically per page, not as a sweep.
5. **Images (P).** Convert `public/demo/*.jpg` and the hero to AVIF with a JPEG fallback (`<picture>`), add `width` and `height`, `loading="lazy"` and `decoding="async"` below the fold, `fetchpriority="high"` on the single LCP image. User uploads already pass through `browser-image-compression`; leave that path alone.
6. **CSS (P).** After steps 2 and 3 the sheet drops under 25KB transferred. Do not add a CSS-in-JS layer or another utility library.
7. **Bundle budget in CI (P).** Add a script that fails the build when the entry chunk exceeds 320KB gzip or any route chunk exceeds 90KB gzip (matches item 27 of the existing mobile master plan).

### 3.3 Cost of each visual decision

| Decision | Cost | Verdict |
|---|---|---|
| Serif display face for Arabic (Amiri 400) | 108KB, swap, not preloaded | Accepted: it is the brand voice. Optional build step: subset to basic Arabic plus presentation forms with `pyftsubset` (estimated 50 to 60KB, to be measured). |
| Latin display face (Newsreader variable) | 58KB, only fetched when Latin display glyphs appear (wordmark, large figures) | Accepted. Digits in figures come from this file. |
| Hairlines instead of cards and shadows | negative (less paint, less CSS) | Accepted. |
| Dark mode | zero JS, 40 lines of CSS | Kept: it exists, people use it, OLED phones benefit. |
| Photo-corner motif | CSS borders, no image | Accepted. |
| Two-pane bookings on desktop | route-level layout change, no new data | Accepted, phase 4, behind the `lg` breakpoint. |
| Page-turn or parallax effects | JS and layout thrash | Rejected. |

## 4. Accessibility baseline

- Text contrast ≥ 4.5:1, large text and UI boundaries ≥ 3:1. Token pairs are computed in E-design-system.md.
- Every interactive element ≥ 44×44 CSS px on touch layouts; 36px allowed only at `lg` and above with pointer `fine`.
- Visible focus: 2px `--ring` outline with 2px offset on every focusable element; never `outline: none` without a replacement.
- Status is never colour alone: a dot or tint always travels with a word.
- `prefers-reduced-motion`: all transitions and animations off; sheets and toasts appear without movement. The existing `MotionConfig reducedMotion="user"` stays.
- Semantics: one `h1` per page; lists are `ul`/`li`; the bottom bar is `nav` with `aria-current="page"`; sheets are `role="dialog"` with `aria-modal` and a label; icon-only buttons have `aria-label` (already the pattern in the code).
- RTL: logical properties only (`ps`, `pe`, `ms`, `me`, `start`, `end`, `border-s`, `inset-inline`). Directional icons mirror through the existing rule at `src/styles.css:183`. Numbers, phone numbers, emails and amounts are isolated with `dir="ltr"` or `unicode-bidi: isolate`.

## 5. Proposed but not approved (needs the owner's yes)

| Item | Class | Why it is separate |
|---|---|---|
| Delete unused UI primitives and their packages (`recharts`, `embla-carousel-react`, `react-resizable-panels`, `input-otp`, `vaul`, unused Radix packages), `BottomNav.tsx` | S | Touches `package.json`; no user-visible effect. |
| `dashboard_summary` RPC, query cache persistence, realtime | B | Backend and data layer; already planned in `docs/MOBILE_APP_MASTER_PLAN.md` phase C. |
| `start_url` change, separate photographer manifest | B | Product decision about who the installed app is for. |
| Western digits in public marketing copy | V (copy) | Changes translated strings. Inside the app area the rule is applied; marketing copy waits for approval. |
| Removing `FirstVisitIntro`, `BrideGame`, tours | I | Product features, not styling. Restyled only. |
