# Critic review — Memoria redesign proposal ("Folio" + Plain density, "Kept Frame" logo)

Reviewed 2026-11-10 from source only (no browser render). Files: `docs/redesign/prototypes/*`, `docs/redesign/brand/*.svg`, and the current product files named in the brief. Contrast figures are WCAG 2.x ratios computed from the hex values in `final.css`. Font metrics were read from the woff2 files in `node_modules` with fontTools.

Two documents the prototypes cite do not exist: `docs/redesign/E-design-system.md` (final.css line 2) and `docs/redesign/README.md` (index.html, last paragraph). The "written specification" is therefore `final.css` alone.

---

## 1. Distinctiveness

**Verdict: not distinctive. With the logo hidden, nothing identifies Memoria.**

- `--paper:#F9F6F1` + `--ink:#1F1915` + serif heading + 1px rules + a muted clay/sage/ochre status set is the default "editorial SaaS / quiet luxury" kit of 2023–2026. The proposal's own caption for Plain says it is "closest to every other modern SaaS"; Folio is closest to every other *premium* SaaS.
- The delta from today is small. Current tokens (`src/styles.css` 70–72) are already ivory, espresso charcoal and champagne, with Amiri headings. The redesign changes ivory by a few points, swaps Cairo for Readex, removes cards and removes gold. That is a cleanup, not an identity.
- The one ownable device, the photo-corner, is never used. `.corner` is defined (`final.css` 116–117) and appears in zero prototype pages (grep count 0 in all three `final-*.html`). The logo verdict in `logos.html` promises it will "mark a selected photo, a confirmed booking, or a saved state"; none of that is drawn.
- No photograph appears anywhere in a product for photographers. The dashboard, list and detail are text and rules only. `.proof` is an empty grey box.
- Generic elements, by selector: `.sec` (heading + ink underline + small link), `.figs` (three figures split by hairlines), `.segtabs` (underline tabs), `.rows` (date block / name / status dot), `.mast` (wordmark + underline nav + `Ctrl K`), `.badge` washes. Each is a stock pattern.
- What is specific and should be pushed: the date numeral as the row's anchor (`.day b`, 28px serif), and the ink rule (`border-bottom:1px solid var(--ink)`) versus line rule hierarchy. Neither is enough alone.

What would make it recognisable without the logo: (a) the corner motif actually carrying state, in one fixed place per component; (b) real photographs as row and header thumbnails, held by that corner; (c) one signature layout no competitor has, for example the upcoming list as a dated ledger with a running balance column (see section 8, Sijill).

## 2. Typography

Measured metrics (em units):

| Face | hhea asc / desc | Alef top | Deepest tail (ج / ي) | Space | Digit height |
|---|---|---|---|---|---|
| Amiri 400 (arabic subset, 108,560 B) | 1.124 / −0.634 | 0.695 | −0.514 | 0.292 | none in subset |
| Readex Pro (arabic 22,864 B, latin 31,428 B) | 1.0 / −0.25 | 0.74 | −0.473 | 0.28 | 0.71 |
| Newsreader (latin 58,084 B) | 0.735 / −0.265 | n/a | n/a | 0.229 | 0.686 |
| Cairo (current) | 1.303 / −0.571 | 0.717 | −0.43 | 0.22 | 0.671 |

Findings:

1. **Line-height too tight for wrapped Amiri headings.** Ink runs from about +0.75em (lam) to −0.51em (jeem), before any marks. At `.t-display` 44px/1.2 the baseline gap is 52.8px but tail + ascender need 55.6px: lines overlap by about 3px. `.t-title` 32px/1.25 touches (40.0 vs 40.4). `.t-heading` 24px/1.35 has about 2px clearance, which shadda/kasra will consume. The mobile lead heading (`final-1-dashboard.html` line 97, 22px, wraps to two lines at 335px) is the first place this shows.
2. **Clipping risk at `line-height:1`.** `.topbar .ttl` (`final.css` 148) is Amiri 20px/1 and carries user data (client name) on the detail screen. As soon as an implementer adds `truncate` (overflow hidden) the tails and marks are cut. Same for Readex at `/1` in `.btn`, `.input`, `.badge`: Readex's yeh reaches −0.473em against a −0.25 descent.
3. **The font stack order is wrong.** `--font-display:"Newsreader","Amiri"` (line 20) makes Newsreader supply every shared glyph: the space (0.229em instead of Amiri's 0.292em, so Arabic word spacing in headings is 22% tighter than Amiri's design), full stop, brackets, middle dot, en dash. The Arabic comma still comes from Amiri. Punctuation in one heading comes from two faces.
4. **Digits inside Amiri headings.** Heights match well (Newsreader digit 0.686em vs alef 0.695em), so size is not the problem. Stroke weight and contrast are: Newsreader's default optical size is a text cut, Amiri 400 is a high-contrast Naskh. I could not measure stems; this needs an eye test at 32px ("السبت 14 تشرين الثاني", `final-2-bookings.html` line 97).
5. **`font:` shorthand cancels the numeric settings.** `.mz` sets `font-variant-numeric:lining-nums tabular-nums` (line 32), but every figure rule uses the `font` shorthand (`.t-figure` 57, `.amt` 127, `.day b` 123, `.money dd`), which resets font-variant to normal on that element. Tabular and lining figures are not applied where they matter.
6. **Font-family names do not exist in the product.** The prototype declares its own `@font-face` names in `shared.css` ("Readex Pro", "Newsreader", "Geist"). The app's Fontsource names are "Readex Pro Variable", "Newsreader Variable", "Geist Variable". Tokens copied verbatim fall back to `system-ui` and Georgia with no error.
7. **Amiri 400 on low-DPI Android.** Hairlines at 20px (`.t-section`, `.topbar .ttl`) are the risk. Today the product uses Amiri 700 (`styles.css` 162), which is sturdier. File size is not a regression: Amiri 700 (99,968 B) is already shipped; the new critical set is about 220 KB against a comparable set today.
8. **Readex Pro width.** Mean isolated Arabic advance is 0.696em vs Cairo 0.662em (+5%); beh is +14%; Latin zero is 0.607em vs 0.56em. `.rows>li` (`grid-template-columns:52px 1fr auto`, line 121) has no `min-width:0` and no ellipsis rule, so a long name or venue overflows instead of truncating.
9. **Bidi.**
   - `.t-figure{direction:ltr}` with `170<small>د.أ</small>` puts the currency to the right of the number. Arabic convention in RTL is number then unit, so the unit sits on the left.
   - `.money dd{direction:ltr;text-align:end}`: the total row is "320 د.أ" and the others are bare numbers, so digits do not share a right edge.
   - "Western digits everywhere" is contradicted inside the prototypes: `.day span` reads "تشرين ٢", "كانون ١"; line 54 uses "32٪" (Arabic percent sign with Western digits).
   - It is also contradicted by the runtime: `toLocaleDateString('ar-JO')` returns Arabic-Indic digits (checked in Node: "السبت، ١٤ تشرين الثاني", "١٬٢٥٠"). There are 51 `toLocale*` call sites and 220 hard-coded Arabic-Indic digits in 34 source files, many inside `t("…")` strings, which are the i18n lookup keys (`src/i18n/index.ts` 59–67).
10. **Scale drift.** Declared scale is 8 sizes. Actually used: 11, 12, 13 (`.btn.sm`, `.field>span`, `dt`), 14, 16, 20, 22 (inline), 24, 26 (inline), 28 (`.day b`), 32, 44. `MOBILE_APP_MASTER_PLAN.md` item 20 asks for three text sizes on the phone.

Test before committing: Chrome on a 720p Android phone and one 1x-dpr desktop, light and dark, with these strings: "نهاركِ سعيد، ليلى", a two-line heading containing ج/ع above ل/ك with shadda, "السبت 14 تشرين الثاني", "1,250 د.أ", and a 30-character client name in `.topbar .ttl` with truncation on.

Fallback to specify:
- Display stack: a digits-only alias face (`unicode-range:U+0030-0039`, source Newsreader) first, then Amiri, then Newsreader, then "Noto Naskh Arabic Variable" (already installed), then serif.
- Line-height 1.5 minimum for any Amiri heading that can wrap; 1.3 minimum for single-line Amiri with overflow hidden, plus `padding-block:.15em`.
- If the 20px Amiri test fails: `.t-section` and `.topbar .ttl` move to Readex Pro 500, and Amiri is used at 24px and above only.
- `font-display:swap` with `size-adjust` on the fallback, or the heading reflows on weak networks.

## 3. Usability for the real user

Tap targets (from `final.css`):

| Element | Size | Verdict |
|---|---|---|
| `.btn` / `.btn.lg` | 44 / 48 px | OK |
| `.btn.sm` | 36 px | Used in `.empty` (components board), which also renders on mobile. Below 44. |
| `.iconbtn` | 44×44 | OK |
| `.sec a` ("كل الحجوزات", "الكل (10)") | 12px text, no padding, about 19px tall | Fail. This is the only route to the full tool list on mobile. |
| `.segtabs a` | about 46px tall, text-width only | Height OK. Filters beyond the fifth scroll off-screen with `scrollbar-width:none` and no fade. |
| `.tabbar a` / `.add` | 48 min-height / 48×48 | OK, but "+" shrinks from today's 56px raised circle (`MobileBottomNav.tsx` 60). |
| `.rows>li` | 68px min | OK in size; see affordance below. |
| `.tools a` | 48px | OK |

- **Small text.** 11px: tab labels, `.day span`, `.count`. 12px: every status, every secondary line, `.eyebrow`, `.grp`, figure labels, `.t-meta`, field hints and error messages. For a 40+ user outdoors the error message (`.field.error>small`, 12px clay) and the status word are the two things that must be read, and both are the smallest text on screen. Today's product also uses 11px (95 occurrences of `text-[9–11px]`), so this is no worse, but the redesign does not fix it.
- **Status as 7px dot + 12px word.** `.status.waiting` and `.status.ok` have identical text colour (`--ink-2`); only the dot differs. Clay, ochre and sage have near-identical luminance (0.114 / 0.122 / 0.130), so for red-green colour-blind users the dots are one colour. The word carries everything, and on mobile the word is shortened to "موافقتكِ" and "العربون" (`final-2-bookings.html` 80–81). "العربون" alone does not say whether the deposit is awaited or received. Today's label is "بانتظار العربون".
- **Rows without containers.** `.rows>li` has no `:hover`, no `:active`, no chevron, no cursor rule. The current card has a border, a "التفاصيل ›" link and a press state. A hairline row with a status at the end reads as a table line, not a button. `.tools a` has the same gap.
- **Square 2px controls.** The brief asks for "أنثوي بلا ابتذال — نعومة في الخط". Ink-black rectangles with 2px corners, 1px ink rules and no shadow read as legal/financial. Warmth is carried by the paper tint alone.
- **Square "+".** A 48px ink square in a row of four line icons reads as a fifth tab with a heavy background, or as a stop button. The raised circle it replaces is a learned pattern for "create".
- **Mobile figures row.** Three columns at 375px leave about 87px of content each (`.m .figs>div{padding-inline:12px}`). "1,250" at 26px plus "د.أ" is about 87px; five digits overflow. Today's mobile shows one stat and hides the rest behind "كل الأرقام" (`dashboard.index.tsx` 765).
- **Desktop two-pane.** `.two{grid-template-columns:400px 1fr}` with `.detail{padding:28px 44px}` and `.cols{grid-template-columns:1fr 280px;gap:40px}`. At the stated 1024px breakpoint the main detail column is 624 − 88 − 40 − 280 = 216px. At 1120px it is 312px. The real detail page is 1,404 lines (chat, gallery upload, contract, shot list, extras, stage stepper). It does not fit.
- **One-hand reach.** Search moved from an always-visible field to a top-corner icon on mobile. "حجز يدوي" moved from one tap in the list header to two taps via "+".
- **Weak network.** No error state for a failed list load is drawn (current: `loadError` paragraph). The offline bar is drawn as a component but not placed in any shell.

## 4. Accessibility

Contrast, light theme (text on background):

| Pair | Ratio | |
|---|---|---|
| ink on paper / surface / sunken | 16.12 / 17.12 / 15.02 | AAA |
| ink-2 on paper / surface / sunken | 8.57 / 9.10 / 7.98 | AAA |
| ink-3 on paper / surface / sunken | 5.14 / 5.46 / 4.79 | AA |
| on-ink on ink (primary button) | 16.12 | AAA |
| clay on paper / surface / clay-wash | 5.94 / 6.31 / 5.48 | AA |
| ochre on paper / ochre-wash | 5.67 / 5.27 | AA |
| sage on paper / sage-wash | 5.42 / 5.09 | AA |
| slate on slate-wash | 5.14 | AA |
| brass-ink on paper / brass-wash | 5.63 / 5.09 | AA |
| whatsapp on paper | 4.94 | AA, thin margin |
| white on clay (`.count`, `.toast.err`) | 6.41 | AA |
| **brass on paper** | **2.50** | Fails 3:1. Decoration only; cannot carry state. |
| line-input on surface / paper | 3.48 / 3.28 | Passes 3:1 for input borders |
| **line-strong on paper** (`.btn.secondary` border, `.stick .iconbtn` border) | **1.73** | Fails 3:1 non-text contrast |
| line on paper / surface | 1.29 / 1.37 | Dividers only |
| disabled `.btn` (opacity .45) text on fill | 2.83 | Exempt as disabled, but it is used for the in-progress label "نضيف الحجز…", which must be readable |

Dark theme:

| Pair | Ratio | |
|---|---|---|
| ink on paper / surface / sunken | 16.52 / 15.36 / 17.14 | AAA |
| ink-2 on paper / surface | 9.58 / 8.91 | AAA |
| ink-3 on paper / surface / sunken | 5.67 / 5.27 / 5.88 | AA |
| clay on paper / clay-wash | 7.34 / 6.06 | AA |
| ochre on paper / ochre-wash | 10.17 / 8.02 | AAA |
| sage on paper / sage-wash | 9.15 / 7.38 | AAA |
| slate on slate-wash | 7.28 | AAA |
| brass-ink on paper | 9.48 | AAA |
| whatsapp on paper | 10.30 | AAA |
| **white on clay** (`.count`, `.toast.err`, both hard-code `#fff`) | **2.60** | **Fail** |
| line-input on surface / paper | 3.80 / 4.09 | Pass 3:1 |
| line-strong on paper | 1.90 | Fails 3:1 |

Other findings:

- **Focus on inputs is removed.** `.mz .input:focus{outline:0;border-color:var(--ink);box-shadow:0 0 0 3px var(--brass-wash)}` (line 88) overrides the global `:focus-visible` outline. The halo is 1.11:1 against paper (1.26 dark). The only visible change is a 1px border going from `--line-input` to `--ink`.
- **Focus elsewhere** is a 2px `--brass-ink` outline at 2px offset: 5.63:1 on paper, fine. `.seg button` and `.tabbar a` inherit it.
- **Colour-only signals.** Words are present, so the rule holds formally. In practice `.status.waiting` vs `.status.ok` differ only by dot hue (section 3). `.rows>li.sel` is background-only (`--sunken` vs paper is 1.07:1) with no `aria-selected` and no bar. `.field.error` changes border colour and hint colour but adds no icon.
- **Semantics in the prototype.** Tabs use `aria-current="true"` on anchors without `href`; `.segtabs` should be a tablist or real links. The detail `.stick` WhatsApp and call buttons have labels; the dark dashboard bell has none (line 116).
- **Reduced motion.** `@media (prefers-reduced-motion:reduce){.mz *{animation:none!important;transition:none!important}}` is correct but scoped to `.mz`. The product already handles this through `MotionConfig` and `styles.css` 407–415; keep those.
- **RTL.**
  - `.topbar{padding:0 var(--s2) 0 var(--s4)}` (line 147) is physical: 8px on the right, 16px on the left. In RTL the title sits 8px from the edge and the icon buttons get the 16px. Inverted.
  - `.listcol{padding:24px 24px 0 28px}` (`final-2-bookings.html` 10) is also physical.
  - `.corner::before` uses `inset-inline-start`, so the motif is bottom-right in RTL and bottom-left in LTR, while the logo's corner is fixed bottom-left. In the primary language the motif and the logo disagree.
  - `#list` (bullets on the left) is not mirrored for RTL. `#back` points right, which is correct for RTL only; the existing mirror rule (`styles.css` 183) covers lucide class names, not a custom sprite.
  - No LTR/English prototype exists. The product has a language toggle.
- **Safe areas.** `.tabbar{padding:6px 0 22px}`, `.stick{padding:12px 20px 26px}`, `.sheet{padding-bottom:28px}` hard-code the home-indicator inset. The product uses `env(safe-area-inset-bottom)`.

## 5. Logo — "Kept Frame"

Geometry (`brand/mark-mono.svg`): outlined rect, outer edge 14–39 × 5–38; filled right triangle (9,42) (9,27) (24,42), right angle at bottom-left, overhanging the rect by 5 units left and 4 below, with a 2-unit knockout gap from a mask.

- **At 16–24px it is a chat icon.** The small version (`mark-small.svg`) is a solid portrait rectangle with a solid triangle protruding from its bottom-left corner. At 16px the rectangle is about 8.7×11.3px, the triangle's legs 6.3px, the gap 0.83px (sub-pixel, so it blurs shut). A rectangle with a tail at bottom-left is the shape of lucide `message-square` and of most "comment" icons. The product has chat and uses message icons for three tools.
- **At 32px and above it is a document.** A portrait outline with a triangle on one corner is the family of file, sticky-note and page-curl icons. It also sits close to the brief's own S3 "الطيّة" (folded corner).
- **The metaphor has the flaw used to reject concept B.** `logos.html` rejects Notch because "the reference is invisible to brides and to most digital-era photographers". Photo-corner mounts are a pre-digital album object; a 22–32 bride has likely never used one.
- **One-colour construction is fragile.**
  - The knockout depends on an SVG `<mask>`. It will not survive conversion to a single path (icon font, vinyl cut, embroidery, some PDF and email clients).
  - Mask ids are `m`, `s`, `mk`, `am`, `asm`: generic and collision-prone when inlined.
  - Three different gaps exist: 2 units (mono), 2.5 units (small), 0.75 units (colour `mark.svg`, done with `stroke="#F9F6F1" paint-order="stroke"`).
  - The colour version's gap is a hard-coded paper stroke, so on a photo, on `--surface`, or on dark it shows a cream halo.
  - `icons.js` `#mark` hard-codes the corner as `#BE9761` in both themes.
- **Maskable icon is undersized.** In `app-icon-maskable.svg` the symbol spans 150×185px of 512 (29% × 36%). The file's title says it "uses 47%", which is the viewBox, not the artwork.
- **Against `BRIEF.md`:**

| Requirement | Result |
|---|---|
| Symbol has no letter | Pass |
| Works at 16px | Fail (chat-icon reading, gap closes) |
| One colour, reversed, over photo | Pass with the mask caveat; colour version fails over photo |
| Forbidden clichés (camera, ring, heart…) | Pass |
| Forbidden "أيقونة + خط افتراضي" | **Fail.** Wordmark is unmodified Newsreader 500 and unmodified Amiri 400 |
| AR/EN "نفس منطق السماكة والتباين" | **Fail.** Low-contrast text serif beside a calligraphic Naskh at the same 34px; Amiri reads smaller and lighter |
| "نعومة في الخط", feminine | Weak. Two hard-edged primitives, `rx=1` |
| "عربي معاصر" | Absent |
| "لا يحتاج شرح" | Fail. The verdict text needs a sentence of explanation |

**Geometric fix (keeps the idea):**

1. Use two corner mounts on one diagonal, bottom-left and top-right. On the 48 grid: triangles (6,42) (6,26) (22,42) and (42,6) (42,22) (26,6). A print held at two opposite corners cannot be read as a bubble tail, and the form is symmetric under 180° rotation, so it is direction-neutral beside Arabic or Latin.
2. Make the print the negative space. At 24px and below, drop the rectangle outline: draw a solid 4:5 print (x 13–35, y 8–40, rx 1.5) and cut a 3-unit channel along each hypotenuse with boolean subtraction. Ship flattened paths, no mask.
3. At 32px and above, the print may be an outline with a 3-unit stroke, with the same flattened gaps.
4. One gap value at every size: 3 units, which is 1px at 16px.
5. Draw the wordmark. At minimum: match Amiri's stroke contrast in the Latin (a Didone-leaning cut, per the brief's references), set the Arabic about 18% larger to match apparent size, and adjust one or two letterforms so it is not a stock font.
6. Before approval, place it at 16px in a row with lucide `message-square`, `file`, `sticky-note`, `expand` and `scan`. If it can be mistaken for any of them, it fails. Two opposed corners may drift toward "expand"; this test decides.

## 6. Functional-parity risks

The before/after is not a fair baseline. The "Mobile today" panel (`final-1-dashboard.html` 76–89) shows three pills (copy link, search, logout) and a name greeting. In code those are `hidden sm:flex` (desktop only, `dashboard.index.tsx` 621–641); mobile shows the title "لوحتي", one search icon, a "خروج" button and one stat. The current mobile screen is less cluttered than drawn.

**Dashboard — present today, absent from the prototypes:**

| Item | Source | Status in proposal |
|---|---|---|
| Logout | 617, 639 | Gone on both breakpoints |
| @username link + copy profile link (desktop) | 627–628 | Gone on desktop; mobile keeps it in the "+" sheet |
| Language toggle, theme toggle, settings gear, messages icon | `Header.tsx` 254–255 | Masthead "replaces the marketing header"; no placement shown |
| SubscriptionGuard / SubscriptionBanner | 644, layout | Not drawn |
| OfflineBanner | layout | Component drawn (36px ochre strip), not placed; today it is a fixed charcoal bar with safe-area padding |
| Onboarding-resume card | 647–656 | Not drawn |
| "No way to receive deposit" destructive alert | 710–718 | Not drawn |
| "Packages missing who-shoots" alert | 719–727 | Not drawn |
| Delivery-rate card | 728–737 | Not drawn |
| NotifyChannelsCard prompt | 740 | Not drawn |
| "Profile published, put link in bio" card | 742–750 | Not drawn |
| QuickStart checklist (progress, next step, dismiss) | 812–818 | Not drawn |
| NewUserWelcome (entire new-user state) | 658–707 | Not drawn |
| "Since last visit" line and multiple focus items | `TodayFocus` | One task only |
| Stat sub-lines on mobile, sparkline, "كل الأرقام" with four more stats | 753–809 | Dropped |
| Tool badges ("ناقص", "فارغة", "منتهي", "تجريبي", "N جديد"), attention tone, unvisited dot | `ToolIndex.tsx` 88–95 | Rows show a hint only |
| Recent-first tool order, disabled tool state, external "ملفي العام" | `ToolIndex.tsx` 39–48, 108–113 | Not specified |
| Tool icons | `ToolIndex.tsx` 85 | Removed |

**Dashboard — added without a data source:** the "القادم" list is new. Its rows show couple names, event type and city. The dashboard query (`dashboard.index.tsx` 487) selects neither `event_type` nor venue, and bookings expose a single `client_name`. The header's claim "same data" is not accurate.

**Bookings list:**

| Item | Source | Status in proposal |
|---|---|---|
| Swipe right = confirm deposit, swipe left = WhatsApp, first-use hint | 372–388, 433–437 | No affordance, no reveal design for a row without a container, no hint |
| "العربون وصل — راجعيه" chip (the trigger for the money step) | 405–407 | Gone |
| Conflict chip, pending-age chip, cancellation reason, relative day, weekday | 394–420 | Gone |
| Overdue | 408–410 | Replaces the booking status instead of adding to it |
| Price | 425–427 | Kept on mobile in the small line; dropped from the desktop row |
| "Last opened" row | 231–237 | Gone |
| Counts on every filter | 268 | Only on "تحتاج إجراء" |
| Filters "مكتملة", "ملغاة" | 173–174 | Not shown (may be off-screen) |
| Groups "خلال ٧ أيام / لاحقاً / سابقة" with counts, sticky | 202–204, 292 | Renamed "هذا الشهر", no counts, not sticky |
| Search always visible with clear button | 240–253 | Behind an icon on mobile; no clear button |
| "حجز يدوي" one tap | 222–227 | Two taps on mobile |
| Realtime "fresh" glow | 385 | No spec |
| Search match highlight | 321–326 | No spec |
| Two empty states + load-error state | 277–288, 275 | One empty state |
| `quote` status ("عرض سعر") | 33, 41 | No mapping in the five-state set |
| Pull-to-refresh, remembered filter | 211, 64 | Not mentioned; must survive |

The meaning of "تحتاج إجراء" also changes: today it is deposit-proof-received or delivery-overdue (line 56); the prototype's example is "بانتظار موافقتكِ".

**Booking detail:** mobile sticky bar has approve, WhatsApp and call; "رفض" exists only on desktop. The tab bar is hidden on detail (today it is always present). Three tabs and about ten fields stand in for a 1,404-line page; "keep every existing filter, action and field" is unproven.

**Manual booking form** (caption: "same fields, same order of validation"). Against `ManualBookingSheet.tsx` 172–228:
- "من" and "إلى" are two `type="time"` inputs; the prototype merges them into one free-text field.
- "الخدمة" (three options) is missing from the form.
- Email and notes are visible optional fields; the prototype hides them in `<details>` and adds "القاعة", which is not a field in the sheet.
- "سعر مخصّص" package option is not shown.

**Cross-cutting:**
- All prototype copy is feminine. Every such string in the product is `g(female, male)`; male photographers exist. The design must hold both lengths.
- Motion: "CSS only" conflicts with shipped behaviour that needs a gesture library: drag-to-dismiss sheets (`MobileBottomNav.tsx` 133–136), swipe rows, the shared-layout filter pill, list enter/exit. 54 files import framer-motion.

## 7. Implementation risk

1. **Per-photographer theming will not reach new tokens.** `paletteVars()` (`page-settings.ts` 171–194) overrides a fixed list: `--background`, `--foreground`, `--card`, `--popover`, `--secondary`, `--muted`, `--border`, `--input`, `--gold`, `--accent`, `--ring`, `--primary`, `--charcoal`, `--ivory`, `--radius`. Any shared primitive (Button, Input, Badge, Sheet) rewritten to read `--paper`, `--ink`, `--line`, `--surface`, `--clay`… will render in Memoria colours inside a "navy" or "velvet" public page. The ten themes break silently.
2. **`--radius` is photographer-controlled** (0.125 / 0.75 / 1.25rem) and `rounded-sm|md|lg|xl` derive from it (`styles.css` 36–39). Setting the app's `--radius` to 6px gives sm 2px / lg 6px for free on 456 `rounded-sm` uses. But 413 `rounded-full` and 320 `rounded-md…3xl` do not follow: `rounded-full` mixes true circles (avatars, dots, progress) with pills (buttons, chips, filters); it needs case-by-case triage, not find-and-replace.
3. **Name mismatches an implementer will copy literally.**
   - Dark mode: prototype uses `[data-theme="dark"]`; product uses `.dark` on `<html>` (`styles.css` 29, `theme-provider.tsx`, `applyPageTheme`).
   - Fonts: section 2, point 6.
   - `--font-display` / `--font-ui` vs Tailwind `--font-serif` / `--font-sans` (283 `font-serif` uses).
4. **Base rules that fight the new type system.** `[dir="rtl"] h1,h2,h3,.font-serif{font-weight:700;line-height:1.25}` (160–165) forces bold Amiri. `[dir="rtl"] button,input…{font-family:"Cairo Variable"}` (157–159) hard-codes Cairo. Both must change, but Cairo and Amiri 700 imports must stay: `FONTS.classic` and `FONTS.calligraphy` use them on public pages.
5. **`html[data-pfont]` specificity** (498–501) beats any class-level font rule, which is correct for public pages. Not verified: whether `LivePhonePreview` (used in `dashboard.profile.tsx`) scopes theme variables to an inner element or to `<html>`; if the latter, opening it would restyle the dashboard.
6. **Dark `--primary` is gold** (`styles.css` 111; `paletteVars` 189). The proposal's dark primary is cream ink. 139 `bg-primary`/`text-primary` uses plus hand-written `dark:bg-gold dark:text-charcoal` pairs (for example `MobileBottomNav.tsx` 60, `dashboard.bookings.index.tsx` 224) encode the old rule inline.
7. **`gold` is 747 uses with at least five meanings:** active nav, attention/urgent, link, focus ring, decoration, and on public pages the photographer's accent. "Brass demoted" needs a per-meaning mapping (active → ink, attention → clay, link → ink underline, ring → brass-ink, decoration → brass). Brass as text on paper is 2.50:1.
8. **617 raw palette utilities** (`emerald|amber|red|blue|violet|rose…-NNN`) carry status today, with known inconsistencies (list vs detail amber, per `_route-inventory.md`). Five hard-coded `#25D366`. 117 shadow utilities against "no shadows except overlays". 428 `charcoal|ivory` uses.
9. **Status mapping is incomplete.** Five states are specified. The inventory lists booking status (5 + derived), six production stages with their own colours, offer, addendum, subscription, payment, verification, refund and admin vocabularies.
10. **Digits** (section 2, point 9): one change in `locale()` to `ar-JO-u-nu-latn` covers the 51 formatter calls; the 220 literal digits are i18n keys, so each edit needs a matching dictionary-key edit or English silently falls back to Arabic.
11. **`font` shorthand** in ported component CSS will reset `font-variant-numeric` and `font-feature-settings` (the body sets `"ss01","cv01"`).
12. **Prototype positioning is not portable.** `.tabbar`, `.sheet`, `.scrim`, `.stick` are `position:absolute` inside a fake phone; product needs `fixed`, safe-area insets, the `vt-bottom-nav` / `vt-top-bar` view-transition names and z-index 40–60 already in use.

## 8. Rejected directions: what to absorb, what to cut

**Absorb:**

- **Sijill (5): the ledger.** A ruled table with a date column, a hairline margin rule (`.ledger td.dt{border-inline-end:1px solid #E5B9B0}`), right-aligned amounts in a serif, and a totals line. This is the one layout in the set that is both ownable and useful: a photographer's bookings are a book of dated money. Use it for the bookings list on desktop and for the money block. Leave the tilted stamps, vertical tabs and cloth cover.
- **Sijill: bordered status.** `.stamp` (1.5px `currentColor` border, 12px 500 text, untilted) is more legible than a 7px dot and is not colour-dependent. Replace `.status` dots with it for the action state at least.
- **Contact Sheet (4): one mark for "needs you".** The grease-pencil circle is the only genuinely photographic idea in five directions. A calm version (a clay ring or corner around the date numeral of the one row that needs action) gives the list a focal point and ties to the craft. Also take its frame numbering idea for the production board.
- **Hajar (2): shape on the date and a real photo slot.** The arch-masked date tile shows that the date block can carry a brand shape. Use the photo-corner there, not the arch. Hajar's terracotta filled primary is also the warmest button in the set; consider clay for the single primary action on the "today" card instead of ink.
- **Plain (3): honesty about density.** 40px desktop table rows, a table header row, and keyboard hints. The final direction took Plain's hairlines but kept 68px rows on desktop.

**Cut from the final direction:**

- `.corner` as written (unused, 2.50:1, flips in RTL). Either give it one job or remove it.
- Newsreader as the first family in `--font-display`.
- `.status` 7px dot as the primary status carrier.
- `.btn.sm` (36px) anywhere a touch device can reach.
- The square "+" tab.
- `.mast` "Ctrl K" as a primary header element for a phone-first, non-technical user; keep the shortcut, drop the chrome.
- The two-pane desktop layout below about 1280px.
- Abbreviated mobile status words.
- 13px, 22px, 26px one-off sizes.
- `--surface` vs `--paper` as two near-identical backgrounds (1.06:1 apart) unless a rule says when each applies.

---

## (a) Ten changes before implementation, ranked

1. Re-base the tokens on the existing semantic variables (`--background`, `--foreground`, `--card`, `--border`, `--primary`, `--gold`, `--radius`) and extend `paletteVars()` with the new status tokens, so the ten photographer themes and six font pairs keep working without touching public pages.
2. Produce a parity table for dashboard, bookings list, booking detail and manual-booking sheet that maps every current element listed in section 6 to a drawn location in the new design, and draw the missing states (new user, subscription expired, offline, no-CliQ alert, deposit-proof-received row, load error, male copy).
3. Redraw the logo with two opposed corner mounts and the print as negative space, exported as flattened paths with one 3-unit gap, and pass a 16px line-up test against `message-square`, `file`, `sticky-note`, `expand` and `scan` before approving it.
4. Fix the display font stack so Amiri supplies Arabic text, spaces and punctuation and a digits-only alias (`U+0030-0039`) supplies numerals, raise wrapped-heading line-height to at least 1.5, and replace every `font:` shorthand on figure elements so `tabular-nums lining-nums` actually applies.
5. Replace the 7px dot status with a shape-and-word marker (bordered label for "needs you", filled/hollow/struck glyphs for the rest), keep the full status phrase on mobile, and publish one mapping from every status vocabulary in `_route-inventory.md` to that set.
6. Fix the accessibility failures: restore a 2px visible focus indicator on `.input`, replace `#fff` on clay in dark (`.count`, `.toast.err`) with `--on-ink`, raise `--line-strong` to at least 3:1 where it is a control boundary, and give the in-progress button a readable non-disabled style.
7. Make rows and tool links look and behave tappable (chevron or equivalent, `:active` fill, 44px minimum on `.sec a` and every `.btn.sm` reachable by touch), restore the 56px round "+" and specify how swipe-to-confirm and swipe-to-WhatsApp reveal on a row without a container.
8. Decide the numeral policy in code, not in the mock: set `locale()` to `ar-JO-u-nu-latn`, list the 34 files with literal Arabic-Indic digits and their i18n dictionary keys, fix currency order ("170 د.أ" with the unit on the left in RTL) and align money columns on the digit edge.
9. Convert all physical spacing and positioning to logical properties and safe-area insets (`.topbar`, `.listcol`, `.tabbar`, `.stick`, `.sheet`), fix the photo-corner to one physical corner that matches the logo, and build one LTR/English screen to prove the system mirrors.
10. Give the direction an identity beyond paper and serif by absorbing the Sijill ledger (date margin rule, serif amounts, totals line) for bookings and money, putting real photographs with the corner motif into rows and headers, and limiting the desktop two-pane layout to widths of 1280px and above.

## (b) Claims not verified from source

- How anything renders: no browser was used. Amiri hairline legibility at 20px on low-DPI Android, Newsreader/Amiri weight match, and the 16px logo reading are reasoned from geometry and metrics, not observed.
- Whether Newsreader defaults to lining or old-style figures, and its default optical size in the Fontsource `wght`-only file.
- Whether Chrome on Android clips Readex descenders in `select.input` at `line-height:1`.
- The proposal's statement that the design follows `docs/redesign/E-design-system.md` and `README.md`: neither file exists in `docs/redesign/`.
- "Reads at 16px as a picture with something holding it" (`logos.html`): contradicted by geometry, not tested on a screen.
- "List and detail keep every existing filter, action and field" (`final-2-bookings.html` header): the detail page source (`dashboard.bookings.$id.tsx`, 1,404 lines) was checked only through `_route-inventory.md`, not read in full.
- Where the language and theme toggles appear on mobile today; they are imported only in `Header.tsx`, which is hidden below `sm` in app mode.
- Whether `LivePhonePreview` applies theme variables to `<html>` or to a scoped element.
- Whether bookings store a second (groom) name or a city separate from `venue_name`; the prototype rows assume both.
- Browser ICU output for `ar-JO` digits was checked in Node only; Chrome and Safari are expected to match but were not run.
- Usage counts (`rounded-sm` 456, `rounded-full` 413, palette utilities 617, `gold` 747, shadows 117) are regex counts over `src/`, including comments and non-rendered branches. The brief's figure for `rounded-sm` was 455.
- The current gold's contrast (about 2.9:1) was computed from the prototype's hex approximation `#B68D59`, not from the OKLCH source value.
