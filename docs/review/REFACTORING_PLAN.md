# CatchMyAction — Consolidated Refactoring Plan (2026-11-03)

Sources: `architecture.md`, `ux-athlete.md`, `ux-photographer.md` (same folder). Static code review; P0 items
(purchase `userId` from body, bulk checkout without Connect split, `USE_LOCAL_STORAGE=true` in prod configs,
edit-modal `|| 999`, purchase hard-delete, root `force-dynamic`) were spot-checked by hand.

Effort: S ≤1d · M 2–4d · L 1–2w.

## Must verify on prod first (decides severity of several P0s)
- [ ] Real `.env.production` on EC2: `USE_LOCAL_STORAGE`? `AWS_REGION`? `STRIPE_SECRET_KEY` set?
      If local storage → originals are public and Find Me/moderation are OFF in prod.
- [ ] nginx config (body size, timeouts) and the untracked `docker-compose.production.yml`.
- [ ] Is the GitHub repo public? (committed DB password)

## Phase 0 — Hotfixes (week 1, small PRs, each with a regression test)
| # | Fix | Effort |
|---|-----|--------|
| 0.1 | Rotate prod DB password; remove from `infra/deploy-aws-simple.sh`, `PROGRESS.md`; ignore `.env.production`, `*.pem` | S |
| 0.2 | Purchase authZ: `getAuthUser()` in `photos/[id]/purchase` + `verify-purchase`; drop body/query `userId`; mock payments only when `PAYMENTS_MODE=mock` and not prod | S |
| 0.3 | Bulk checkout: add Connect split (photographers currently get 0% of bulk sales) | S–M |
| 0.4 | Verify by `{CHECKOUT_SESSION_ID}` instead of scanning last 10 Stripe sessions; webhook: `payment_status==='paid'`, event-id dedupe, `amount_total` | M |
| 0.5 | Protect originals: `/api/uploads` serves previews only; downloads only via purchase-checked route | S |
| 0.6 | Never hard-delete purchases: soft-delete photos/sessions, keep originals for buyers | S–M |
| 0.7 | Edit modal `|| 999` → `?? 999`, send price only if changed, validate price server-side | S |
| 0.8 | Stored XSS: escape Leaflet popup HTML; validate `website` as http(s); escape report-email HTML | S |
| 0.9 | Gate unpublished sessions (GET session/photos, autocomplete, find-me) | S |
| 0.10 | Reset/verify tokens: separate table, hashed, expiring | S |
| 0.11 | Stripe Connect button inside `<form>` → `type="button"`; handle `?stripe=success|refresh` | S |
| 0.12 | Find Me: explicit biometric consent, show "no face" errors, rate-limit, client downscale selfie | S–M |
| 0.13 | Network: close :3000, restrict :22, Cloudflare Full(strict), no `NEXTAUTH_SECRET` default; nightly `pg_dump` → S3 | S |

## Phase 0.5 — Safety net (before any structural refactor)
- Migration baseline (`migrate diff` → `migrate resolve --applied`), ban `db push`.
- ESLint/Prettier/`typecheck`; Vitest route tests (authZ matrix: anon/user/other/owner per route); Playwright smoke
  (register → create session → upload → buy (mock) → download).
- GitHub Actions: lint → typecheck → test → build image → push; prod pulls image tag (no on-box build), rollback = previous tag.
- Commit real prod compose + nginx into `deploy/`; move dead `deploy.sh`, `deploy-pi.sh`, `docker-compose.prod.yml` to `deploy/legacy/`.

## Phase 1 — Structure (weeks 2–4)
Target layout: `app/(marketing|auth|buyer|photographer)`, thin `app/api`, `server/{env,auth,http,services,adapters}`,
`shared/{schemas,dto,money}`, `features/*` client modules. Details in `architecture.md` §6.

1. `server/env.ts` (zod) + single `STORAGE_MODE`/`PAYMENTS_MODE` (removes 5 copies of the local-mode check).
2. NextAuth type augmentation; `emailVerified` in JWT (kills ~30 `as any`).
3. `route()` wrapper: auth/role/ownership guards, zod parsing, error mapping (no raw `err.message`), rate limit.
4. `middleware.ts` + group layouts for server-side role gating.
5. Services: sessions, photos, purchases (single checkout path, `Order/OrderItem`, fee in one constant), payouts, accounts, biometrics.
6. Schema: enums, missing FKs, soft-delete, indexes (`Photo(sessionId,createdAt)`, `@@unique(sessionId,fileHash)`, trigram on location), `StripeEvent`, `VerificationToken`.
7. Split giant client components + move reads to server components:
   dashboard (696), photo-grid (596), upload (531), settings (471), manage (422).
8. Dead code out: `face-api.js` + `public/models` (12 MB), `client-ses`, `uuid`, `surf-spots.ts`, `session-list.tsx`,
   `search-form.tsx`, `purchase/success`; `spots-database.ts` → `data/spots.json`/table, not in client bundle.
9. Perf: remove root `force-dynamic`, cache homepage/explore, bbox query for explore, SQL aggregates for earnings.

## Phase 2 — Deeper (weeks 5–8)
- Direct-to-S3 uploads + async worker (moderation via S3Object — today >5 MB photos skip moderation silently),
  preview/thumb, IndexFaces, `Photo.status`; retries + DLQ. Fixes OOM on 2 GB box and timeouts.
- Job runner (pg-boss) for notifications, reindex, geocode/marine, account erasure.
- BiometricService: consent, retention, deletion on report/account delete; privacy policy aligned (needs legal decision).
- CloudFront OAC, signed original URLs, AVIF/WebP + srcset.
- IaC (CDK/Terraform), structured logs + Sentry + `/api/health`.
- Timezone-aware session times.

## UX track (runs in parallel with Phase 1, reuses split components)
Athlete:
1. Keep intent across auth gates (`callbackUrl`, persisted cart) — the QR → buy funnel breaks today.
2. Reliable post-payment state: "confirming…" → success with Download / Download all → fallback message; cancel banner.
3. Surface all purchase errors (bulk silently fails for unverified/free carts).
4. Find Me as hero: landing copy + "How it works", prominent banner on session page, "Show only my photos",
   confirm-before-claim, threshold ~85.
5. Discovery: honour `?date=`, Explore not empty by default (recent/near me), correct canonical URLs.
6. QR "Coming soon" page: pre-register selfie → personalised "we found 12 photos of you" email.
7. My Actions → purchase locker (thumbnails, group by session, download all, receipts); one name for nav/title/route;
   fix "That's me" collision (claim vs removal).
Photographer:
1. Honest money: show pending vs paid, record payout status, block paid publish or hold-and-transfer when Connect not active.
2. Resilient mobile upload: URL-addressable session, client pre-validation/downscale, per-file status, Retry failed, "N/200".
3. Manage page: pagination (only 50 shown now), touch-visible actions (44 px), Publish toggle + "N athletes waiting".
4. Publish success screen: share sheet, QR, notified count.
5. Beach-ready QR: full-screen bright mode, PNG + printable poster, "use my location" in create form.
6. Earnings: gross vs net labels, exclude free downloads from "Sold", Stripe Express login link, period filters.
7. Reports inbox in dashboard; onboarding checklist after upgrade; fee preview next to price.
Cross-cutting: WCAG contrast (`text-white/20–30` fails), labels/`htmlFor`, dialog semantics, `alt` text, 44 px targets,
`not-found`/`error` boundaries, single brand string (CatchMyAction vs CatchMyActions).

## Suggested PR order
1. 0.1, 0.2, 0.3, 0.5, 0.7, 0.8 (one-day hotfix batch)
2. 0.4, 0.6, 0.9–0.13
3. Safety net (migrations baseline + CI + authZ tests)
4. Phase 1 items 1–4, then services route-family by route-family (auth → sessions → photos → purchases)
5. Component splits paired with UX track items touching the same files
6. Phase 2
