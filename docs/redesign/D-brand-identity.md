# Deliverable D — Brand Identity

Visual board: [`prototypes/logos.html`](prototypes/logos.html). Final files: [`brand/`](brand/).

## 1. Positioning and personality

**What Memoria is:** the place where a wedding booking is kept in order, from first message to delivered photographs, for the photographer and for the bride.

**The idea in one word: kept.** The name means memory. A photographer's promise is that the day will be kept; the product's promise is that the booking, the deposit, the contract and the dates are kept. Every identity decision serves that word: paper, ink, a ledger's order, an album's corner.

| Memoria is | Memoria is not |
|---|---|
| Composed | Glamorous |
| Literate | Decorative |
| Warm | Sweet |
| Exact | Technical |
| Local in voice, international in craft | A template |

Voice (unchanged from the product today, made explicit): direct Jordanian-inflected Arabic, addressed to the person by gender, short sentences, the words photographers use. English mirrors it: plain, no marketing adjectives.

## 2. Logo

### 2.1 Three concepts

| | A · Kept Frame | B · Notch | C · Threshold |
|---|---|---|---|
| Idea | A portrait print held by one album corner | A film sheet identified by its notch code | The Levantine arch as doorway and frame |
| Relation to the name | Keeping: the corner mount is how a photograph is preserved | Craft knowledge of the darkroom | Passage into a new life |
| Construction | Outline rectangle + solid triangle | Solid rectangle with three cuts on the top edge | Solid square with an arch cut from the base |
| At 16px | Reads as a picture with a held corner (solid variant) | A ticket or SIM card | A door |
| App icon | Symbol on ink tile, brass corner | A rectangle inside a rounded rectangle: weak | Strong but generic |
| One colour | Yes, by a masked gap | Yes | Yes |
| Verdict | **Chosen** | Rejected: the reference is invisible to the audience | Rejected as logo: the decade's most repeated boutique shape; kept as the hero image mask |

The earlier brief (`docs/logo-concepts/BRIEF.md`) is respected: the symbol contains no letter and survives a name change; the wordmark is a separate element; no camera, lens, aperture, ring, heart, flower or gold gradient.

### 2.2 Kept Frame — construction

Grid: 48×48 units. Coordinates are SVG user units, origin top-left. The mark does not mirror in RTL: the corner is always bottom-left, like a physical album corner seen from the front.

**Standard (outline) — use at 32px and above.** File: `brand/mark.svg` (two colours), `brand/mark-mono.svg` (one colour, `currentColor`).
- Print: rectangle `x=15.5 y=6.5 width=22 height=30`, corner radius 1, stroke 3 (centred), no fill. Outer size 25×33, ratio about 3:4.
- Corner: right isosceles triangle with vertices `(9,42) (9,27) (24,42)`: legs 15 units, right angle at bottom-left. It overhangs the print's outer left edge (x=14) by 5 units and its outer bottom edge (y=38) by 4 units.
- Separation: in two-colour use the triangle carries a 1.5-unit stroke in the background colour (`paint-order: stroke`). In one-colour use the print's stroke is masked by the triangle expanded with a 4-unit stroke, leaving a clear gap of 2 units.
- Colour: print in ink `#1F1915`; corner in brass `#BE9761` (light) or `#D2B281` (dark ground).

**Small (solid) — use below 32px: favicon, tab bar, notification badge.** File: `brand/mark-small.svg`, `brand/favicon.svg`.
- Print: filled rectangle `x=14 y=4 width=26 height=34`, radius 1.5.
- Corner: triangle `(6,44) (6,25) (25,44)`, legs 19.
- Gap: the print is masked by the triangle expanded with a 5-unit stroke (clear gap 2.5 units, which survives at 16px as a visible light line).
- `favicon.svg` switches to ivory and light brass under `prefers-color-scheme: dark`.

**Clear space:** on every side, at least the length of the corner's leg (15 units, 31% of the mark's height).
**Minimum sizes:** outline 32px; solid 16px; lockup height 20px.

### 2.3 Wordmark

- Latin: "Memoria", Newsreader Medium (500), letter-spacing −0.01em, title case. Not all caps, not tracked.
- Arabic: "ميموريا", Amiri Regular (400), letter-spacing 0.
- The two are optically matched by x-height to tooth-height: at the same nominal font size Amiri sets smaller, so the Arabic is set at 108% of the Latin size (verify by eye at the final size; adjust within 104 to 112%).
- For production assets the wordmarks must be converted to outlines from the licensed font files (both are OFL: outlining is permitted) and saved as `brand/wordmark-en.svg`, `brand/wordmark-ar.svg`, `brand/lockup-en.svg`, `brand/lockup-ar.svg`, `brand/lockup-bilingual.svg`. Until then, in the product header, the wordmark is live text in the same fonts, which is acceptable because both fonts are already loaded.

### 2.4 Lockups

| Lockup | Construction |
|---|---|
| Horizontal, Latin | Mark, then wordmark. Mark height = 1.3 × wordmark cap height. Gap = 0.3 × mark height. Baseline of the wordmark aligns to the print's bottom edge (y=38 on the grid), not to the corner. |
| Horizontal, Arabic | Mirror order for RTL layout (wordmark flows to the left of the mark); the mark itself is not mirrored. |
| Bilingual | Mark · Memoria · 1px vertical rule at 35% opacity, height of the cap height · ميموريا. Used on the marketing header and documents only. |
| App header | Mark 26px + Latin wordmark 22px (desktop); mark 22px + wordmark 20px (phone top bar). |

### 2.5 App icon, favicon, social

| Asset | Spec | Source |
|---|---|---|
| App icon 192, 512 (`purpose: any`) | Ink `#1F1915` square, ivory print, light-brass corner; symbol occupies the central 56% | `brand/app-icon.svg` → export PNG |
| Maskable 512 | Same; symbol occupies 47%, inside the 80% safe zone | `brand/app-icon-maskable.svg` → export PNG |
| Apple touch 180 | Export of `app-icon.svg` | — |
| Favicon | `brand/favicon.svg` plus a 32px PNG fallback rendered from `mark-small.svg` in ink on transparent | — |
| Notification badge (monochrome, Android) | `mark-small.svg` in white on transparent, 96px | — |
| OG image 1200×630 | Paper ground, bilingual lockup centred at 96px mark height, the line "ذاكرة يومكِ، محفوظة بأمان" in Amiri 400, 40px, ink-2; no photograph, no gradient | replaces `public/og-default.png` |

Why an ink tile and not ivory: on both iOS and Android home screens a dark warm tile stands apart from the many white and pastel wedding and photo apps, and matches the current `#0c0c0c` so existing installs do not look like a different app.

### 2.6 Usage rules

Do: one colour (ink on paper, ivory on ink, white on photographs with a 40% ink scrim beneath); brass only on the corner.
Do not: rotate or tilt the print; mirror the mark; fill the outline version; add a shadow, gradient or glow; place the corner at another corner; put the mark in a circle or rounded badge other than the app icon; set the wordmark in any other face; recolour the print in brass.

### 2.7 The mark as a system motif

The corner alone (a 7px brass triangle in the bottom-start corner of a rectangle) is the product's sign for "kept": a selected photo, a confirmed booking's date block, a saved section. It is the only decorative element in the interface, and it always carries that meaning. In RTL layouts the motif sits at the bottom-start (bottom-right), following reading direction; only the logo itself is fixed.

## 3. Colour and typography

Defined in E-design-system.md sections 2 and 3. Brand summary:

- **Core:** paper `#F9F6F1`, ink `#1F1915`.
- **Brand accent:** brass `#BE9761` (fills), brass-ink `#805B31` (text).
- **Semantic:** clay `#A04034`, ochre `#875814`, sage `#4A6D51`, slate `#4B677E`.
- **Type:** Amiri Regular and Newsreader for titles and figures; Readex Pro for everything operated.

Proportion on any screen: about 90% paper and surface, 8% ink, under 2% everything else. If a screen looks colourful, something is wrong.

## 4. Imagery

- Photographs are the brand's colour. Marketing uses real wedding work by member photographers with credit; demo profiles are labelled as demo (already the case).
- Preferred subjects: hands, fabric, light through windows, backs and profiles, quiet moments before the event. Respect privacy: no identifiable guest faces in marketing without consent; the product already offers watermarking.
- Treatment: natural colour, no filters, no duotones, no gradient overlays beyond the text scrim. Crops 4:5 or 3:2.
- AI-generated imagery is not used to represent real photographers' work.

## 5. Illustration and graphic language

- No illustration set. Empty states are typographic.
- Graphic devices: the ink rule, the hairline, the kept corner, the serif date numeral. Nothing else.
- Icons: `lucide-react` at stroke 1.6, one icon per concept (list in E section 4).

## 6. Light and dark

Both ship. Light is the default identity (paper). Dark is the same system on warm near-black `#120F0C` with ivory ink and lighter brass; it exists for night work and OLED phones and follows the user's stored choice exactly as today (`localStorage.theme`, system preference as fallback).

## 7. What happens to current brand assets

| Asset | Action |
|---|---|
| `public/brand/mark.svg`, `logo-*.svg/png`, `app-icon*.svg`, `og.svg` | Replaced in the branding phase; keep the old files in git history only |
| `public/app-icon-192.png`, `app-icon-512.png`, `app-icon-maskable-512.png`, `favicon.svg`, `favicon-32.png`, `og-default.png` | Regenerated from `docs/redesign/brand/` |
| `docs/logo-concepts/` (rounds 1 and 2, concepts G, H, I) | Left as history |
| Brand name occurrences | No change; see `docs/brand-name-locations.md` |
