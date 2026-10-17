# Memoria competitor analysis (2026-10-17)

Method: REA (analyze-web-bundle over CDP in headless Brave) + page reading.

| Site | Status | Stack (REA) | Model |
|---|---|---|---|
| arabiaweddings.com | Live | Next.js, 87 scripts | Directory + request form (service, date, guests, budget, phone OTP). Offers by email/WhatsApp. 73 Jordan photo/video vendors, price shown as $-$$$$, reviews almost empty. |
| sawerly.com | Dead (redirects to spam domain) | - | - |
| mosawer.com | Dead (TLS cert belongs to another site) | - | - |
| shoott.com | Live | Next.js, 72 scripts | Free booking, 30-min session, $25/photo, 10 for $199, 40+ for $299. Background-checked, 900+ photographers, 4.9 from 2,812 Google reviews, gallery in 3-5 days. |
| snappr.com | Live | custom, 15 scripts | B2B tiers (Pay as you go/Pro/Enterprise), API, SLAs. Not weddings. |
| perfocal.com | Dead (DNS fails) | - | - |

## Gaps for Memoria
- No Jordan competitor offers online booking + deposit + verified reviews. Arabia Weddings is a lead form only.
- Arabic-region marketplaces (Sawerly, Mosawer) are defunct.
- Ideas to copy: fixed-price packages with visible prices (Shoott), background-check badge, gallery delivery window, "no risk" promise, review counts from Google.

## Deep analysis (2026-10-18): features competitors have, Memoria lacks
Memoria already has: Kanban bookings, contracts + e-sign link, delivery galleries, verified reviews, referrals, subscriptions, calendar sync, push, WhatsApp templates, PWA, disputes/refunds, audit log, shot list, demo/featured profiles.
Verified by code grep: no favorites/shortlist, no style quiz, no budget planner, no questionnaire, no response-rate metric, no blog.

| Feature | Who has it | Memoria | Priority |
|---|---|---|---|
| Shortlist / favorites (save, notes, quotes) | The Knot Vendor Manager, Bridebook | missing | High, cheap |
| Response-rate + "Best of" badge (90% reply, verified reviews) | Zola | missing | High |
| Background-check / identity badge | Thumbtack, Shoott | verification_status exists, no public badge text | High |
| Guarantee (money-back / damage cover) | Thumbtack | missing (refund policy page only) | Medium |
| Style quiz / matching | Zola | missing | Medium |
| Budget planner + suggested split | Bridebook | missing | Medium |
| Client questionnaires before shoot | Pixieset Studio Manager | missing | Medium |
| Payment schedules / invoices / tax | Pixieset, HoneyBook | deposit only; Zbooni pending | Medium |
| Automations + reminders (scheduler, auto follow-up) | HoneyBook | partial (email reminders) | Medium |
| Photo proofing / client favorites in gallery, print store | Pixieset | delivery links only | Low (phase 2) |
| AI culling/editing | Pixieset (unconfirmed) | missing | Low |
| Free wedding website, guest list, registry | Zola, Bridebook | missing | Low (off-core) |
| Public price scale / fixed packages | Shoott, Perfocal | packages exist | keep |
| SEO content/blog | all directories | missing | Medium |

Sources: Pixieset (fitgap, SLR Lounge), Thumbtack safety pages, Zola vendor pages, Bridebook support, The Knot (secondary). Prices/claims from third-party pages, unverified.
