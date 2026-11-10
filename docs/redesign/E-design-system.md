# Deliverable E — Memoria Design System ("Folio")

Reference implementation: [`prototypes/final.css`](prototypes/final.css) and the component board in [`prototypes/final-3-form-and-components.html`](prototypes/final-3-form-and-components.html). Where this document and the CSS disagree, this document wins and the CSS is the bug.

Mapping to code (Tailwind token names, which variables to reuse) is in F-technical-architecture.md section 1.1.

## 1. Principles

1. **Paper, ink, and one mark.** Surfaces are paper. Text and primary actions are ink. Colour appears only when it tells the photographer something.
2. **Rules before boxes.** Group with space and a hairline. A bordered card is for an object that can be picked up (a sheet, a dialog, a selected item), not for every paragraph.
3. **Two voices.** A serif speaks titles and money. A sans does everything you operate. Never a third.
4. **One decision per screen.** One primary button per view. Everything else is secondary or quiet.
5. **Still by default.** Nothing moves unless the user caused it.

## 2. Colour

### 2.1 Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#F9F6F1` | `#120F0C` | Page background, bars, sheets |
| `surface` | `#FFFDFA` | `#1C1714` | Inputs, cards, menus |
| `sunken` | `#F2EEE6` | `#0D0907` | Hover fill, selected row, skeleton, neutral badge |
| `line` | `#DFDAD1` | `#2F2A27` | Hairlines, card borders |
| `line-strong` | `#C3BDB3` | `#47413C` | Secondary button border, grab handle |
| `line-input` | `#8F877F` | `#7A736C` | Input and select borders (3.5:1 on surface) |
| `ink` | `#1F1915` | `#F2EEE7` | Primary text, primary button fill, section rule |
| `ink-2` | `#4E4640` | `#BCB7AF` | Secondary text, quiet buttons |
| `ink-3` | `#6F6761` | `#918B84` | Meta text, placeholders, inactive tabs |
| `on-ink` | `#F9F6F1` | `#120F0C` | Text on ink |
| `brass` | `#BE9761` | `#D2B281` | Brand fill: logo corner, photo-corner motif, progress. Never text on paper in light mode. |
| `brass-ink` | `#805B31` | `#D2B281` | Brass as text or link, focus ring |
| `brass-wash` | `#F5EAD5` | `#2F2416` | Focus halo, highlight |
| `clay` / `clay-wash` | `#A04034` / `#FDE9E6` | `#E1897B` / `#351C18` | Needs your action, overdue, error, destructive |
| `ochre` / `ochre-wash` | `#875814` / `#F9EDD5` | `#DCB87A` / `#2F2512` | Waiting on someone else, pending review, offline |
| `sage` / `sage-wash` | `#4A6D51` / `#E5F3E7` | `#92BE9A` / `#19281C` | Confirmed, received, saved |
| `slate` / `slate-wash` | `#4B677E` / `#E7F0F7` | `#97B5CF` / `#1A252F` | Neutral information, "new" |
| `whatsapp` | `#1F7A4A` | `#7FCF9F` | WhatsApp actions only (outline button and icon). The brand green `#25D366` fails contrast as text and is not used for labels. |
| `scrim` | `rgb(31 25 21 / .45)` | `rgb(0 0 0 / .6)` | Behind sheets and dialogs |

### 2.2 Contrast (WCAG 2.1, computed)

Light: ink on paper 16.1 · ink-2 on paper 8.6 · ink-3 on paper 5.1 · ink-3 on surface 5.5 · ink-3 on sunken 4.8 · brass-ink on paper 5.7 · brass-ink on brass-wash 5.1 · clay on paper 5.9 · clay on clay-wash 5.5 · ochre on ochre-wash 5.3 · sage on sage-wash 5.1 · slate on slate-wash 5.2 · on-ink on ink 16.1 · ink on brass 6.4 · line-input on surface 3.5.
Dark: ink on paper 16.5 · ink-2 on paper 9.6 · ink-3 on paper 5.7 · ink-3 on surface 5.3 · brass on paper 9.5 · brass on brass-wash 7.5 · clay on clay-wash 6.1 · ochre on ochre-wash 8.0 · sage on sage-wash 7.4 · slate on slate-wash 7.3.
Deliberately below 3:1: `line` and `line-strong` (decorative separators, not the only boundary of a control).

### 2.3 What changed from the current palette and why

| Current | Verdict | Reason |
|---|---|---|
| Ivory `#FDFAF4`, charcoal `#1F1915` | Kept. Paper lowered one step to `#F9F6F1` | So white-ish `surface` inputs read against it without a shadow. |
| Gold `#B68D59` as accent, text, ring, hover and (in dark) primary | Narrowed | 2.9:1 as text. Split into `brass` (fill) and `brass-ink` (text). No longer the hover colour or the dark primary. |
| Gold gradients, "royal" gradient | Removed | Decoration without meaning; the template look. |
| Destructive `#D40924` | Replaced by clay `#A04034` | The pure red is the only saturated colour on the page and reads as an alarm. |
| Tailwind emerald / amber / red / rose / blue / sky / violet / purple / indigo | Replaced by sage / ochre / clay / slate | Four semantic hues at matched lightness and chroma, in the palette's own warmth. |
| Rose-copper logo palette | Removed | Belongs to nothing else. |
| Dark mode | Kept and corrected | Primary becomes ivory, not gold. |

### 2.4 Status vocabulary (one map, used everywhere)

| Meaning | Tone | Booking status | Production | Other |
|---|---|---|---|---|
| Needs the photographer | `action` (clay) | "بانتظار موافقتك", overdue delivery | — | offer pending, new report, new message |
| Waiting on someone else | `waiting` (ochre) | `pending_deposit` | `awaiting`, `selecting` | payment "قيد المراجعة", referral pending |
| In progress | `info` (slate) | `quote` | `shooting`, `editing` | reviewing |
| Good / settled | `ok` (sage) | `confirmed` | `ready` | approved, signed, replied |
| Finished | `done` (hollow dot, ink-3) | `completed` | `delivered` | closed, read |
| Off | `off` (ink-3, struck) | `cancelled` | — | rejected, expired, spam |

Labels are the existing Arabic strings, unchanged. Production board columns lose their five coloured top borders: every column has a 1px ink rule under its title and a count; cards carry the status.

## 3. Typography

### 3.1 Families (all OFL, already in `package.json`, self-hosted through Fontsource)

| Role | Family | Files loaded | Why |
|---|---|---|---|
| Interface, Arabic and Latin | **Readex Pro Variable** (Nadine Chahine and Thomas Jockin; the Arabic companion of Lexend) | Arabic subset 23KB (preloaded), Latin subset 31KB | Drawn for reading ease, open counters, clear at 12 to 14px on phone screens; one variable file covers 300 to 600; Arabic and Latin share proportions so mixed lines sit level. Replaces Cairo (Arabic) and Jost (English). |
| Display, Arabic | **Amiri** Regular 400 (Khaled Hosny) | Arabic subset 108KB | A true Naskh book face: the calm, literate voice. Used large and light, never bold. Replaces Amiri 700 and removes Aref Ruqaa from product chrome. |
| Display, Latin and large figures | **Newsreader Variable** (Production Type) | Latin subset 58KB | A text-serif with real optical quality, lining figures and no fashion signature. Replaces Cormorant Garamond and Playfair Display. |

Font stacks:
- `--font-sans: "Readex Pro Variable", system-ui, sans-serif`
- `--font-serif: "Newsreader Variable", "Amiri", Georgia, serif` (the browser takes Latin glyphs and digits from Newsreader and Arabic glyphs from Amiri, per character)
- `--font-script` is removed from product chrome. `.font-script` stays defined for photographer pages that select the calligraphy pair.

Not chosen, and why: Cairo (default Arabic web face, the generic look); IBM Plex Sans Arabic (excellent, but a new package and static weights for no gain over Readex Pro); Zain (static only, new package); Thmanyah Serif (beautiful editorial Arabic, free for commercial use but its licence forbids redistributing the files and it ships only as OTF: self-hosting a webfont needs written confirmation first; revisit as a later upgrade); Instrument Serif and Fraunces (current fashion signatures); Cormorant (too thin below 24px, the wedding-template serif).

### 3.2 Scale (seven sizes; nothing else)

| Token | Size / line | Weight | Family | Use |
|---|---|---|---|---|
| `display` | 44 / 1.2 (mobile 32 / 1.25) | 400 | serif | Dashboard greeting, marketing heroes |
| `title` | 32 / 1.25 (mobile 26 / 1.3) | 400 | serif | Page title (`h1`) |
| `heading` | 24 / 1.35 (mobile 22) | 400 | serif | Focus task, dialog and sheet titles |
| `section` | 20 / 1.4 | 400 | serif | Section heads above a rule |
| `body-lg` | 16 / 1.6 | 400 | sans | Inputs, long text, marketing body |
| `body` | 14 / 1.6 | 400; 500 for labels, names, buttons | sans | Default |
| `meta` | 12 / 1.5 | 400 | sans | Secondary lines, status, captions |
| `figure` | 32 / 1.1 (mobile 26) | 400 | serif, Western digits | Money and counts in summaries |

Rules:
- Minimum text size 12px. The 11px tab-bar label is the only exception and is always paired with an icon. Replace every `text-[10px]`, `text-[9px]`, `text-[8px]` with `text-xs`.
- Arabic letter-spacing is always 0. Latin display uses −0.01em. No uppercase tracking on Arabic.
- Arabic headings need line-height ≥ 1.25 and 0.1em block padding where a container clips (`overflow: hidden`), so Amiri's descenders and marks are not cut.
- Weights in use: sans 400 and 500 (600 allowed for a numeric badge); serif 400 only (Latin wordmark 500).
- **Numerals:** inside the app area (`/dashboard`, `/admin`, `/notifications`, token pages) all digits are Western (0 to 9), lining and tabular: `font-variant-numeric: lining-nums tabular-nums`. Amounts render as `<bdi dir="ltr">320</bdi> د.أ` so the number never reorders. Dates use the existing formatters with `numberingSystem: "latn"`. Public marketing copy keeps its current digits until the owner approves a copy change.
- English pages use the same roles with the Latin subsets; no separate English font rules remain except what photographer themes add.

## 4. Space, layout, shape

- **Spacing scale (px):** 4, 8, 12, 16, 20, 24, 32, 40, 56. Tailwind steps 1, 2, 3, 4, 5, 6, 8, 10, 14. Avoid other steps.
- **Breakpoints:** `sm` 640, `md` 768, `lg` 1024 (app shell switches here), `xl` 1280.
- **Containers:** app content max 1120px with 56px side padding at `lg`, 20px on phones; reading column (forms, settings) max 640px; marketing `container-editorial` stays 1200px.
- **Grid:** desktop dashboard pages use main + aside (1fr + 340px, 56px gap) or list + detail (400px + 1fr). Phones are one column.
- **Radius:** `r1` 2px (buttons, inputs, badges, the "+" key), `r2` 6px (cards, dialogs, menus, toasts, image thumbnails), `r3` 14px (top corners of bottom sheets only), full circle (avatars, dots, switches, numeric count). No pills for buttons, chips or search fields.
- **Borders:** 1px `line` for separation; 1px `ink` under a section head, under the masthead, above the tab bar and around the single next-step panel. That ink rule is the system's signature: use it only in those four places.
- **Shadows:** none on resting elements. One overlay shadow `0 12px 32px -12px rgb(31 25 21 / .28)` for sheets, dialogs, menus, toasts.
- **Motif, the kept corner:** a 7px brass triangle in the bottom-start corner of an element (`.corner` in `final.css`). Meaning: "kept". Use on a selected gallery photo, a confirmed booking's date block, the saved-state of an autosaved section, and nowhere decorative.
- **Iconography:** keep `lucide-react`. Size 20px in navigation and rows, 16px inside compact buttons, stroke 1.6 (`strokeWidth={1.6}`). One icon per concept: bookings `ListChecks`, calendar `Calendar`, production `Layers`, pricing `Tag`, contracts `FileSignature`, WhatsApp templates `MessageCircle`, offers `HandCoins`, questions `CircleHelp`, reports `ChartNoAxesColumn`, profile `User`, settings `SlidersHorizontal`. No emoji as interface icons. No icon tiles (icon inside a tinted square): the icon sits directly beside its label.
- **Imagery:** photographs are the only colour-rich element and are never tinted, masked into novelty shapes, or overlaid with gradients except a bottom-up `ink` scrim (0 → 60%) when text sits on them. Aspect ratios 4:5 portrait and 3:2 landscape; 6px radius in the app, 0 on full-bleed marketing images. The arch mask stays only on the home hero.

## 5. Motion

| Token | Value | Use |
|---|---|---|
| `fast` | 120ms `cubic-bezier(.2,.8,.2,1)` | Hover, press, colour, focus |
| `base` | 200ms same curve | Tab underline, disclosure, toast in |
| `sheet` | 280ms same curve | Sheets, dialogs, page transitions (existing 260ms view transitions are close enough: leave them) |

- Press feedback: `scale(.98)` for 120ms on buttons and rows (the existing `.app-shell` rule at 0.97 is fine).
- Saving: the autosave chip shows "حُفظ" with a check in sage for 2s. No spinner for saves under 400ms.
- Booking confirmation: the status dot changes to sage and the row gains the kept corner; a toast confirms. No confetti in the photographer app (`canvas-confetti` remains only where the bride completes a booking, if it is used there today).
- Loading: skeletons shaped like the content, 1.4s opacity pulse; never a full-page spinner inside the app shell.
- Reduced motion: every duration becomes 0; sheets and toasts appear in place.
- Removed: button shimmer, hover lift, magnetic hover, grain, shimmer text, Lenis smooth scroll, staggered entrances on dashboard pages (kept on first-visit marketing pages only).

## 6. Components

For each: purpose · anatomy and size · states · responsive · accessibility.

### Button (`ui/button.tsx`)
- Variants: `default` (ink fill, on-ink text), `secondary` (transparent, 1px line-strong, ink text), `ghost` (no border, ink-2 text), `destructive` (transparent, 1px clay, clay text; filled clay only inside a confirm dialog), `whatsapp` (transparent, 1px whatsapp, whatsapp text and icon), `link` (brass-ink, underline on hover).
- Sizes: `default` h 44, px 20; `lg` h 48 (the one primary action on a phone screen, full width); `sm` h 36, px 12, 13px text (allowed only at `lg` and above); `icon` 44×44.
- Type 14/500 sans. Radius 2. Gap 8. Icon 16.
- States: hover = fill mixed 14% toward paper (default) or sunken fill (others); active = scale .98; focus-visible = 2px ring, 2px offset; disabled = 45% opacity, no pointer events; loading = label replaced by the existing `loadingText`, spinner 16px, width does not change.
- Remove: shimmer `before:` layer, `hover:-translate-y-px`, `shadow`, `overflow-hidden`.
- One `default` button per view. Existing `bg-charcoal text-ivory rounded-full` and `bg-gradient-gold` buttons become `<Button>`.

### Text field, textarea, select (`ui/input.tsx`, `ui/textarea.tsx`, `ui/select.tsx`)
- Label above (13/500), 6px gap; control h 48 on touch, 44 at `lg`; px 12; 16px text (prevents iOS zoom; keep the existing global rule); 1px line-input; radius 2; surface fill. Help text 12px ink-3 below, 6px gap.
- States: focus = border ink + 3px brass-wash halo; error = border clay, help text replaced by the message in clay, `aria-invalid`, `aria-describedby`; disabled = sunken fill, ink-3 text; read-only = no border, sunken fill.
- Native `<select>`, `<input type="date">` and `type="time"` stay native on phones (the OS pickers are the best mobile pickers). Radix select only where it is already used.
- Required fields are unmarked; optional fields say "(اختياري)" in the label, as today.
- Validation messages say what to do ("اكتبيه بعشر خانات مثل 07XXXXXXXX"), appear on blur or submit, never while typing the first time.

### Checkbox, switch
- 20px box, radius 2, ink when checked; row min-height 44 with the label as the hit area. Switch 44×24, ink track when on. `accent-color: var(--ink)` for native boxes.

### Segmented control and filter tabs
- Segmented (2 to 4 exclusive options, fits the width): equal columns, h 44, ink fill for the selected segment, `aria-pressed`.
- Filter tabs (bookings filters, booking detail sections): text tabs on a `line` rule, selected = ink text 500 + 2px ink underline; counts inline after a middle dot. Scrolls horizontally inside its own row; no pills. Keep the framer `layoutId` underline animation if present, else a 200ms CSS transition.

### Status and badge (`ui/status.tsx`, `ui/badge.tsx`)
- `Status`: 7px dot + 12px label, inline. Tones from 2.4. This is the default way to show state in lists.
- `Badge`: h 22, px 8, radius 2, 12/500, wash background with tone text. Use when the state must be louder than its row (overdue, plan name, payment state).
- `Count`: min 18×18, radius 9, clay fill, white 11/500. For unread and needs-action counts only.

### List row (`ui/list-row.tsx`)
- Grid: leading 52px (date block: day in serif 28, month in 11px) · body (name 14/500, one meta line 12px ink-3) · trailing (status or amount). Min-height 68, 12px vertical padding, hairline below. Whole row is one link.
- States: hover and focus = sunken fill bleeding 12px beyond the text edges; selected (desktop two-pane) = sunken fill; pressed = scale .99.
- Mobile swipe actions on booking rows stay exactly as implemented (WhatsApp one way, next step the other). The revealed action areas use whatsapp and ink fills.

### Card
- Surface, 1px line, radius 6, padding 20 (16 on phones). No shadow, no hover lift. Use for: sheet-like objects in a page (deposit proof, contract block, package editor), settings groups, the live phone preview frame. Do not wrap whole page sections in cards.

### Section head
- Serif 20 title + optional 12px link at the trailing edge, 8px above a 1px ink rule. 28 to 36px space above.

### Figures row
- Three columns separated by vertical hairlines; label 12px ink-3, value in `figure`, optional note 12px. Phones keep three columns with 12px inner padding and drop the note. The existing sparkline may stay in the revenue cell, drawn in ink-3 with no fill animation.

### App masthead (≥ 1024)
- h 64, paper, 1px ink rule below. Start: mark 26px + wordmark (Newsreader 500, 22px). Then primary links (14px; current = ink 500 with 2px ink underline flush to the rule): الرئيسية, الحجوزات (+count), التقويم, الإنتاج, الأسعار, المزيد (menu: ملفّي, العقود, قوالب واتساب, عروض الأسعار, الأسئلة, التقارير, سنتي, الإحالات, الاشتراك, الإعدادات). End: search button with `Ctrl K` hint, notifications icon with count, "حجز جديد" `sm` button, account menu (language, theme, sign out).

### Mobile top bar and bottom bar
- Top bar: h 52, sticky, paper, hairline. Root tabs: wordmark at start, search and bell at end. Sub-pages: back arrow (44px, mirrored for RTL by the existing rule) + serif 20 title + up to two icon buttons. Keeps `view-transition-name: top-bar`.
- Bottom bar: five slots, 1px ink rule above, min-height 56 + safe area. Item: icon 20 + 11px label, ink-3; current = ink 500 with a 20×2px ink tick at the top edge (not gold text). Centre: 48×48 ink key, radius 2, plus icon; opens the existing quick-actions sheet. Keeps `view-transition-name: bottom-nav`, same routes, same order.

### Sheet, dialog, confirm
- Bottom sheet (phones): paper, top radius 14, grab handle 36×4, title in `heading`, close icon button, max-height 88vh, padding 20, safe-area bottom padding. Drag-to-dismiss as implemented.
- Dialog (≥ 768): the same content centred, width 440 (forms 560), radius 6, 24 padding, overlay shadow.
- Confirm: title states the action ("إلغاء حجز ريم وخالد؟"), one sentence of consequence, buttons: quiet "رجوع" and the action button (destructive filled clay when destructive). Replace the two `window.confirm` calls with the existing `useConfirm`.

### Menu, popover, command palette
- Surface, 1px line, radius 6, overlay shadow, 4px padding; items h 40 (44 on touch), 14px, sunken on hover/focus; separators hairline. Command palette: same surface, input 48 with no border, groups titled in 12px ink-3.

### Toast (`ui/sonner.tsx`)
- Top-centre as today. Ink fill, on-ink text, radius 6, min-height 48, icon 20. Error = clay fill, white text, with a retry action when the operation can be retried. Disable `richColors`. Success toasts 3s, errors stay until dismissed. `installFriendlyToasts` stays.

### Empty, loading, error, offline
- Empty: centred between two hairlines, `section` title, one 14px ink-3 sentence, one secondary button for the obvious next step. No illustration, no large icon.
- Loading: skeleton rows and blocks matching the final layout (`.sk`), from `ui/skeleton.tsx`. `PageLoader` only for the first auth/onboarding gate.
- Inline error: clay text 14px with a "إعادة المحاولة" secondary button, in place of the content it failed to load. Route error and 404 pages use the same layout as Empty (the game stays on 404).
- Offline banner: ochre-wash strip, 36px, 12px ochre text, under the top bar.

### Calendar (`MonthGrid`, `ui/calendar.tsx`)
- Day cell ≥ 44×44, Western digits, 14px. Today = 1px ink ring. Booked = sunken fill + 4px sage dot. Blocked = diagonal hairline hatch in line-strong. Pending = ochre dot. Selected = ink fill, on-ink text. Legend row in 12px under the grid. Tapping a day opens the existing sheet.

### Tables (admin)
- Not cards. Header 12px ink-3 on a 1px ink rule; rows h 48 with hairlines; numbers end-aligned with tabular figures; row hover sunken. Below `md`, each row becomes a list row (primary field + meta + status). The unused `ui/table.tsx` is the place to implement this.

### Upload zone, gallery tiles
- Dashed 1px line-strong border, radius 6, sunken fill on drag-over, one line of instruction and a secondary button. Thumbnails radius 6; selected = kept corner + 2px ink outline. Progress = 2px brass bar at the tile's bottom edge. Behaviour (compression, watermark, limits, diagnostics) untouched.

### Premium lock, subscription banner, trial notice
- One quiet strip: ochre-wash for "trial ends in N days", clay-wash when expired, with a single secondary button. No gold gradient. Logic in `SubscriptionGuard` and `PremiumLock` untouched.
