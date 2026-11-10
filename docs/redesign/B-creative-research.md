# Deliverable B — Creative Research: Five Directions, Evaluation, References

Prototypes: [`prototypes/index.html`](prototypes/index.html). Each direction renders the same real screen (photographer dashboard, desktop and phone, with the real labels and data shapes) so they can be compared like for like.

## 1. The five directions

### 1 · Folio — Editorial Classic
[`prototypes/direction-1-folio.html`](prototypes/direction-1-folio.html)

- **Concept:** the dashboard as the front page of a well-set journal. A dateline, a lead item, figures set like a table of results, a ruled list.
- **Personality:** literate, calm, sure of itself. Speaks quietly because it does not need to shout.
- **Palette:** paper `#F9F6F1`, ink `#1F1915`, hairline `#DFDAD1`; brass only in the logo; clay, ochre and sage as 7px status dots.
- **Type:** Amiri 400 and Newsreader for titles and figures; Readex Pro for interface.
- **Logo direction:** small symbol beside a serif wordmark, like a publisher's device.
- **Layout:** no cards. Hairlines, a 1px ink rule under section heads, generous but not empty space, two columns on desktop.
- **Navigation:** text masthead on desktop; five-slot bottom bar on phones with a square ink "+" key.
- **Components:** rectangular 2px controls, ink primary button, status as dot plus word.
- **Interaction:** still. Underlines slide, sheets rise, nothing decorates.
- **Strengths:** highest typographic quality; colour finally means something; lightest CSS; ages slowly; reuses the existing ivory and charcoal.
- **Weaknesses:** can read as austere; rows without boxes need careful hit-area and hover treatment; relies on a 108KB Arabic display face; "paper and serif" alone is not unique.
- **Performance:** best paint cost (no shadows, gradients or blur); 3 font files.

### 2 · Hajar («حجر») — Modern Heritage
[`prototypes/direction-2-hajar.html`](prototypes/direction-2-hajar.html)

- **Concept:** Amman. Limestone walls, basalt, the Levantine arch as the one recurring shape.
- **Personality:** warm, local, proud; a boutique studio in Jabal al-Weibdeh.
- **Palette:** limestone `#EDE6D8`, card `#F8F4EC`, basalt `#2A2623`, terracotta `#A5553A` for action, olive `#66704C`, sand `#C9B58F`.
- **Type:** Reem Kufi for headings (12KB), Readex Pro for interface.
- **Logo direction:** an arch.
- **Layout:** soft cards on stone; arch-topped date blocks; a dark basalt side rail on desktop.
- **Navigation:** side rail; floating pill tab bar on phones with a round terracotta "+".
- **Components:** pill buttons and chips, 16 to 20px radii.
- **Strengths:** the most locally rooted; friendly and immediately "for weddings in Jordan"; very light fonts.
- **Weaknesses:** the arch and terracotta are the most repeated boutique-brand devices of recent years; Kufic headings tire in a tool used daily and read less well in long titles; pills and soft cards are today's look again; heavier chrome on a phone (floating bar eats content).
- **Performance:** good; more paint from large radii and fills, negligible.

### 3 · Plain — Contemporary Minimal
[`prototypes/direction-3-plain.html`](prototypes/direction-3-plain.html)

- **Concept:** a precise instrument. Linear's discipline applied to bookings.
- **Personality:** efficient, neutral, fast.
- **Palette:** near-white `#FCFCFA`, ink `#1B1A18`, lines `#E7E5E0`, functional green, red and amber dots.
- **Type:** Readex Pro only; Geist for Latin figures.
- **Logo direction:** a plain monogram tile.
- **Layout:** side navigation, 48px header, a dense table as the main object, 32 to 40px rows.
- **Navigation:** sidebar with counts and keyboard hints; four-slot bottom bar on phones with "+" in the header.
- **Strengths:** highest information density and scan speed; smallest font payload (one family); easiest to implement and keep consistent; excellent accessibility.
- **Weaknesses:** indistinguishable from any modern SaaS, which is exactly what the brief rejects; no emotional link to weddings or photography; 13px base and 32px controls are desktop habits that fail the phone-first user; moving "+" to the header puts the most-used action out of thumb reach.
- **Performance:** best.

### 4 · Contact Sheet — Photography Culture
[`prototypes/direction-4-contact-sheet.html`](prototypes/direction-4-contact-sheet.html)

- **Concept:** the editor's contact sheet. Bookings are numbered frames on a strip; a grease-pencil circle marks the frame that needs you.
- **Personality:** insider, confident, a little cinematic.
- **Palette:** darkroom black `#141210`, film `#1E1B18`, paper text `#EDE8DE`, grease-pencil red `#E5532D`.
- **Type:** Readex Pro Light for headings, Geist uppercase with wide tracking for frame data.
- **Logo direction:** a tracked uppercase wordmark, like edge printing on film.
- **Layout:** horizontal strip of frames, sprocket edge, exposure-data row.
- **Strengths:** the most memorable; one accent with one meaning ("the frame that needs you") is a strong idea; photographs would look superb against it.
- **Weaknesses:** dark-first tires in daylight at a venue; Latin uppercase metadata is decorative English in an Arabic product and has no Arabic equivalent; the film metaphor is nostalgic and skews technical and masculine for this audience; frames as cards scale poorly past eight bookings; novelty wears with daily use.
- **Performance:** good; dark surfaces save OLED power.

### 5 · Sijill («سِجِلّ») — the keepsake ledger (the unexpected one)
[`prototypes/direction-5-sijill.html`](prototypes/direction-5-sijill.html)

- **Concept:** Memoria as the bound object a family keeps: bookcloth cover, linen pages, index tabs, a ruled ledger of bookings, statuses as rubber stamps, brass only as foil.
- **Personality:** archival, tender, permanent.
- **Palette:** bookcloth green `#3D473A`, linen `#EDE8DE`, page `#FAF8F3`, foil `#B8935A`, stamp inks in green, amber and red.
- **Type:** Noto Naskh Arabic for headings, EB Garamond for Latin and ledger figures, Readex Pro for interface.
- **Logo direction:** a foil-stamped roundel on cloth.
- **Layout:** a page inside a cover; a ledger table with a ruled date column; totals at the foot.
- **Navigation:** vertical index tabs on the page edge; tab-shaped active marker on the phone bar.
- **Strengths:** the most ownable world; green is unexpected and credible in this category; the ledger is a natural fit for bookings and money.
- **Weaknesses:** skeuomorphism: tilted stamps hurt legibility and RTL alignment, vertical tab text is slow to read in Arabic, the cover band costs vertical space on a phone; the look dates fastest; three type families; hardest to extend to forty-plus screens without the metaphor breaking.
- **Performance:** acceptable; the heaviest fonts of the five.

## 2. Scoring

Scores out of 10, weighted as the brief specifies.

| Criterion | Weight | Folio | Hajar | Plain | Contact Sheet | Sijill |
|---|---:|---:|---:|---:|---:|---:|
| Visual sophistication | 20% | 9 | 7 | 6 | 8 | 7 |
| Usability | 20% | 8 | 7 | 9 | 6 | 6 |
| Brand differentiation | 15% | 7 | 8 | 3 | 9 | 9 |
| Mobile experience | 15% | 8 | 7 | 8 | 6 | 6 |
| Typography and hierarchy | 10% | 9 | 6 | 6 | 7 | 7 |
| Performance and feasibility | 10% | 7 | 8 | 10 | 8 | 7 |
| Accessibility | 5% | 8 | 7 | 9 | 6 | 6 |
| Long-term sustainability | 5% | 9 | 5 | 8 | 5 | 4 |
| **Weighted total** | | **8.10** | **7.05** | **7.10** | **7.10** | **6.75** |

Reasoning for the scores that decide it:
- **Usability.** Plain wins on scan speed; Folio is close once its rows get proper hit areas; Contact Sheet and Sijill pay for their metaphors (frames do not list well, stamps and vertical tabs slow reading).
- **Differentiation.** Folio's weak point. Paper and a serif are shared by many "quiet" products. It scores 7 only with its three specific devices (the ink rule, the date-led row, the kept-corner mark). Contact Sheet and Sijill are stronger here and both lose it back on daily use.
- **Mobile.** Hajar's floating pill bar and Sijill's cover band cost content height; Contact Sheet's dark-first hurts outdoors; Plain moves the "+" out of thumb reach.
- **Sustainability.** A system of rules, type and three status colours extends to admin tables, token pages and marketing without inventing new parts. The metaphor directions need a new trick per screen.

## 3. Decision

**Folio is the base.** It is the highest scorer and also the right answer on judgment: this audience sells taste, and the product should look like it has some without competing with their photographs.

It does not win unmodified. Taken from the others:

| From | Taken | Why it is compatible |
|---|---|---|
| Plain | Density and discipline for data views: 68px list rows, text filter tabs, two-pane bookings on desktop, a strict seven-step type scale, keyboard search hint | Editorial pages and precise tables come from the same typographic tradition. |
| Contact Sheet | The single idea that one mark means one thing. In Folio it becomes clay = "needs you", and the logo's corner = "kept". | A rule about meaning, not a visual style. |
| Sijill | The date-led ledger row (day number first, in the serif) and totals set as figures | Already how Folio sets its list. |
| Hajar | Nothing structural. The arch stays as the hero image mask on the marketing home page, where it already exists. | — |

Rejected on purpose: Kufic display type, pills, side rails, dark-first, Latin uppercase metadata, stamps, tabs, covers, film edges.

What makes the result recognisable with the logo hidden:
1. A 1px ink rule under the masthead, under every section head and above the tab bar: the page is ruled like a printed sheet.
2. Every list leads with the date as a large serif numeral.
3. No filled colour anywhere except the one primary ink button, three status hues, and the brass corner.
4. Arabic titles in a regular-weight Naskh, never bold.
5. A square "+" key in the tab bar.

## 4. References

Observed facts are separated from interpretation. Screenshots were not captured for third-party products in this pass; observations are from public product knowledge and should be re-checked before being quoted externally.

| Reference | What works (observed) | Pattern worth studying | For Memoria | Do not copy |
|---|---|---|---|---|
| Linear | One neutral palette, dense lists, command menu, consistent 1px lines | List density; keyboard palette as the universal search | Bookings list rows; `Ctrl K` already exists and deserves a visible entry point | The cold grey-violet palette, 13px base, desktop-first assumptions |
| Things 3 (iOS) | A "Today" screen that shows only what matters now; large quiet titles; one floating add button | Today-first home; generous touch rows | The dashboard is "today" plus three figures; quick-add in thumb reach | Its blue accent and rounded softness |
| Stripe Dashboard | Money set in tabular figures; status as small coloured pills with words; restrained colour | Number typography; status vocabulary used identically everywhere | Figures row; one status map | Its sidebar density on phones |
| Notion | Content first, chrome nearly invisible | Chrome that recedes | App shell without marketing header and footer | Emoji as icons (already a problem here) |
| Milanote | Warm, tactile surfaces for creative users | Warmth without decoration | Paper tone, photograph-forward surfaces | Board metaphors |
| Pixieset (galleries, studio manager) | Photographs given the whole stage, minimal UI, client-facing pages that feel like the photographer's brand | Client pages belong to the photographer | Keep and protect per-photographer theming on public pages | Its generic dashboard cards |
| HoneyBook, Dubsado, Studio Ninja | Pipeline of leads to paid; templates; automations. Review sites describe them as feature-rich and form-heavy; all are English and LTR | Single next step per client | Keep "next step" on the booking; Memoria's edge is Arabic, RTL, WhatsApp and CliQ native | Stage-heavy pipelines and settings sprawl |
| Arabia Weddings (regional) | Directory plus lead form; no booking, deposit or contract flow | — | Memoria already does more; the design should make that depth feel simple | Directory clutter |
| Kinfolk, Cereal (editorial) | Regular-weight serif headlines, wide margins, hairlines, restrained captions | Hierarchy from size and space, not weight and colour | The Folio type system | Empty luxury: a tool must stay dense where it counts |
| Aesop, Aman (hospitality and retail) | Calm authority, one typeface family doing most of the work, earthy neutrals | Restraint as the premium signal | Tone | Their slowness; this is a working tool |

Underserved opportunity (interpretation): no photography-business tool is Arabic-first, phone-first and beautiful at once. International tools are capable and plain; regional ones are directories. A tool that looks like it was set by a typographer, in Arabic, on a phone, is open ground.

## 5. Independent critic

The critic pass ran after the prototypes were built. Its full text is in [`_critic-review.md`](_critic-review.md); what was accepted, rejected and changed is recorded in section 0 of [`G-sonnet-blueprint.md`](G-sonnet-blueprint.md).
