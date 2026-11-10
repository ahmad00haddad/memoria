# Redesign — status (paused 2026-11-10)

Resume from here. Do not redo research, audits or the five directions.

## Done
- `A-product-audit.md` — product, architecture, findings (final).
- `B-creative-research.md` — five directions, scoring, decision: **Folio** base + Plain's density (final).
- `F-technical-architecture.md` — token mapping to existing CSS variables, app shell, PWA, performance targets (final).
- `prototypes/` — five directions, three final pages, logo board, `final.css`. View: from repo root run `python -m http.server 4180`, open `http://localhost:4180/docs/redesign/prototypes/`.
- `_route-inventory.md` — per-route functional inventory (largest 8 route files at grep level only).
- `_critic-review.md` — independent critique; its 10 ranked changes are accepted unless noted below.

## Draft, must be revised with the critic's fixes
- `D-brand-identity.md` + `brand/*.svg` — logo "Kept Frame" fails at 16px (reads as a chat bubble). Redraw in progress: two opposed corner mounts, print as negative space, flattened paths, one 3-unit gap. Test file: `prototypes/_logo-test.html` (not yet viewed). Wordmark needs drawn adjustments, not stock fonts.
- `E-design-system.md` + `prototypes/final.css`:
  - Display stack: digits-only alias (Newsreader, `U+0030-0039`) first, then Amiri, then Newsreader. Wrapped Amiri headings line-height ≥ 1.5.
  - Re-set `font-variant-numeric` after every `font:` shorthand.
  - Status: bordered label for "needs you", filled / half / hollow / struck markers, full phrase on mobile.
  - Fix: visible 2px focus on inputs; no white on clay in dark; control borders ≥ 3:1; readable busy button.
  - Rows: chevron, `:active` fill, `min-width:0` + ellipsis; "+" key 56px.
  - Logical properties and safe-area insets everywhere; photo-corner motif fixed to physical bottom-left.
  - Absorb from Sijill: date margin rule, serif amounts, totals line. Two-pane bookings only ≥ 1280px.
  - Currency: number then unit ("170 د.أ", unit on the left in RTL).
  - Prototype font names differ from product names ("Readex Pro Variable", "Newsreader Variable"); dark mode is `.dark` on `<html>`, not `[data-theme]`.
- Known prototype inaccuracies (prototypes show visual direction, not parity):
  - "Mobile today" mock is wrong (pills are desktop-only).
  - Dashboard "القادم" list has no data source in the current query.
  - Manual-booking mock lacks "الخدمة" and "سعر مخصّص" and adds a "القاعة" label not checked against code.

## Not started
1. `G-sonnet-blueprint.md` — critic accept/reject log, app shell, eight key screens, roadmap, preservation checklist, acceptance criteria, instructions to Sonnet. (Fable)
2. Parity table: every element of current dashboard, bookings list, booking detail, manual-booking sheet → its place in the new design, plus missing states (new user, expired subscription, offline, no-CliQ alert, deposit-proof row, load error, male copy). Start from `_critic-review.md` section 6. (Sonnet handoff)
3. Secondary routes (~50) in G, applying the finished template from the inventory. (Sonnet handoff)
4. Numerals: set formatter locale to `ar-JO-u-nu-latn`; list the 34 files with literal Arabic-Indic digits and the 51 `toLocale*` call sites. Literal digits are i18n keys: owner approval needed before changing. (Haiku handoff)
5. `HANDOFF.md`, `README.md` index.

## Decisions that stand
- Keep ivory + espresso; gold narrowed to brass (fill) and brass-ink (text). Clay = needs you / error, ochre = waiting, sage = settled, slate = info.
- Readex Pro for interface, Amiri 400 + Newsreader for display. No new dependencies.
- Photographer public-page theming (`src/lib/page-settings.ts`, `html[data-pfont]`) is not touched; shared primitives read the existing semantic variables so the ten themes keep working.
- Service worker strategies, manifest behaviour, routes, data and business logic unchanged. `start_url` change, RPCs, package removal need owner approval.
