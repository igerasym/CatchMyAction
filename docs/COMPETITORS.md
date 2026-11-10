# Competitors and funnels

Written 2026-11-10 from **public pages and search snippets only**. No sign-ups, no purchases, no logins, no bypassing
bot protection. Many sites are JavaScript shells that return only a title in plain text, so a lot of what the apps do
inside is **not verified**. Figures marked (snippet) come from search results, not from the vendor's own page: check
them before quoting. Quotes are kept short on purpose.

## What everyone does (the standard buyer funnel)
Spot, then date or session, then a watermarked preview, then a cart, then payment, then a download of the original.
Seen on RadioSurf, Surfoto and ShootMySurf. The differences are in three places:

1. **Account before paying.** ShootMySurf sells with an email and a card, no registration (its terms). Sportograf
   appears to deliver by email (inferred). RadioSurf ties the download to an account (inferred). We need an account;
   on `main` it also needs a confirmed email (the branch `feat/buy-without-verification` removes that).
2. **Face search.** Sportograf (selfie or bib), MomentPik and MyRun do it for races and events. No surf marketplace
   showed it in public text; the apps themselves were not checked. This is our main difference.
3. **What is sold.** Sportograf does not sell single photos: after a selfie search it shows all matched photos at one
   price (a "Foto-Flat"), lets the buyer add more with a "That's me" button, and sends the link by email. The surf
   sites sell per photo.

## Fees charged to photographers
| Site | Photographer gets | Source |
|---|---|---|
| Wave Cam | 100% ("0% creator fees") | its home page |
| Surfoto | 100% ("Photographers keep 100%") | its home page |
| OndaPics | 100%; the buyer pays 15% of the order, capped at €1.50 | snippet |
| MyRun (events) | 100% | snippet |
| GotBarreled | 90% | snippet |
| MomentPik (events) | 85% | its home page |
| ShootMySurf | 80%, payouts from €40 by bank transfer | its terms |
| Flashframe | about 62% net of $7.99 (31% + Stripe fee) | its page |
| FLMR | subscription $10 or $30 a month; selling "coming soon" | its pricing page |
| RadioSurf | percentage not published | its pricing page |
| **CatchMyAction** | first 5 sales: card fee estimate only, then **82%** (18% fee) | `src/lib/stripe.ts` |

Zero-fee sites earn elsewhere: a buyer fee (OndaPics), a subscription (FLMR), or not at all yet. An 18% fee sits above
GotBarreled and OndaPics and below ShootMySurf and Flashframe.

## Per site: what is useful
- **RadioSurf:** sessions by spot, date and time; only sessions with ready previews are listed; private originals with
  signed links; a warning not to pay outside checkout; a Photo License page (personal, non-commercial). No fee number,
  no face search, vague account rules.
- **OndaPics:** pushes the fee onto the buyer so photographers keep 100%; caps it at €1.50; has a mobile app. Nothing
  else was readable.
- **GotBarreled:** photos and video; location landing pages; "no setup or monthly fees"; blog. Page bodies are
  client-rendered.
- **Wave Cam:** "0% creator fees · No costs to join or sell"; handles watermarking, payment, delivery. Core content did
  not render.
- **Surfoto:** a points scheme (points on each purchase, spent on the next one); a share of sales to ocean charities;
  iOS app. No legal pages found.
- **ShootMySurf:** two doors (surfer and photographer); search by location, date or surf school; "sequences" to bundle
  shots; full terms and a Czech company; files kept 60 days. Slow payouts, EUR only, no face search.
- **FLMR:** storage-first with a free tier (10 GB); photographers for hire. Selling not live yet on any plan.
- **Sportograf:** selfie search with consent given before the event; one price for all matched photos; voucher code at
  payment; email delivery. Prices, split and photographer workflow not verified.
- **MomentPik:** QR code at the event, enter an email, get only your photos within about a minute; the organiser picks
  free delivery or selling; first 100 photos free; face data deleted after the retention period.

## Ideas worth borrowing, in the order I would try them
1. Let a buyer pay without a confirmed email (branch exists). Next step beyond it: a magic-link login or email-only
   checkout, because an account is still required today.
2. Funnel analytics first (search, preview, cart, checkout, paid), or we cannot see where people drop. Not built.
3. A "all my photos" price after a selfie match, with a small discount, and a "That's me" loop (Sportograf).
4. Fee model decision: keep 18%, lower it, or move part of it to the buyer as OndaPics does. Needs numbers, see below.
5. Surf-school or group filter and a QR code at the beach (ShootMySurf, MomentPik). We already have a session QR code.
6. A free start for photographers (MomentPik gives 100 photos free); our first-5-sales rule is similar.
7. Loyalty (Surfoto points) is cheap to copy later, not now.

## Where we are ahead
- Selfie search across a spot or all sessions, which no surf site showed publicly.
- Stripe Connect payouts with no minimum, against ShootMySurf's €40 bank-transfer minimum.
- Terms, Privacy and a Photo License page. Surfoto, FLMR and Wave Cam showed none.
- Refund and dispute handling that revokes access (see `docs/INFRA.md`).

## Not verified
Sportograf's prices and split, the real buyer steps at Wave Cam, GotBarreled and OndaPics, whether anyone emails people
who searched but did not buy, whether anyone offers free previews without a watermark, and every figure marked
(snippet). Re-check before using any of it in public copy.
