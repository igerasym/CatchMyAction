# CatchMyAction — Architecture Review & Refactoring Plan

Scope: static read of `src/**`, `prisma/**`, `next.config.js`, `Dockerfile`, `docker-compose*.yml`, `infra/*`, `package.json`, `tsconfig.json`, `PROGRESS.md`. Nothing was executed against the repo (no install, build, or tests). Line numbers are from the current working tree (139 tracked files, ~10.8k LOC in `src/`).

Severity legend: **P0** = exploitable / money or legal exposure now · **P1** = correctness/security debt likely to bite soon · **P2** = maintainability/perf.

---

## 0. Top findings (executive summary)

| # | Sev | Finding | Where |
|---|-----|---------|-------|
| 1 | P0 | **Unauthenticated purchase endpoint trusts `userId` from the request body.** If Stripe is unset or set to a `mock` key, it creates a free `Purchase` for any user/photo. If Stripe is configured, anyone can still start a checkout attributed to another user. | `src/app/api/photos/[id]/purchase/route.ts:10-21,96-104` |
| 2 | P0 | **Originals are not protected when local storage is used.** Production env sets `USE_LOCAL_STORAGE=true` (`infra/deploy-aws-simple.sh:172`, `docker-compose.prod.yml:19`). In that mode `getDownloadUrl()` returns the public, unauthenticated `/api/uploads/originals/<key>` (`src/lib/s3.ts:81-83`), and `/api/uploads/[...path]` serves any file under `public/uploads` with no auth (`src/app/api/uploads/[...path]/route.ts:8-41`). Original keys are guessable from preview keys (`sessions/<sid>/previews/<id>.jpg` → `.../originals/<id>.jpg`, `upload/route.ts:111-113`). The same flag also turns off Rekognition (`src/lib/rekognition.ts:10`). | as cited |
| 3 | P0 | **Production DB password is committed** in plain text. Locations: `infra/deploy-aws-simple.sh:133` and `:165`, and `PROGRESS.md:100`. `PROGRESS.md:97,100` also contain the prod host IP and SSH key name. The demo seed (`prisma/seed.ts:7`, password `password`) is run against prod as part of deploy step 3 (`deploy-aws-simple.sh:236`). | as cited |
| 4 | P0 | **Biometric (BIPA/GDPR) exposure.** Every uploaded photo has the faces of everyone in it indexed (`upload/route.ts:127`) without consent from the people photographed. Any logged-in user can run a selfie search on any session, including unpublished ones, with no rate limit (`sessions/[id]/find-me/route.ts:10-26`). Account deletion leaves S3 objects and Rekognition collections in place (`api/user/delete/route.ts:20-30`). The "that's me" removal report does not delete face vectors. Settings has no "delete biometric data" control, but the privacy policy says users can delete biometric data via Settings and that face data is processed "only with your explicit opt-in consent" (`(app)/privacy/page.tsx:18,25,28`). | as cited |
| 5 | P0 | **Purchase verification/IDOR plus a weak webhook.** `GET /api/photos/[id]/verify-purchase?userId=` needs no auth, takes any userId, and scans only the **last 10 checkout sessions account-wide** (`verify-purchase/route.ts:11,26`). The webhook records `photo.priceInCents` at webhook time, not the amount Stripe actually charged. It doesn't check `payment_status`, has no event-ID idempotency, and ignores refunds and disputes (`webhooks/stripe/route.ts:26-77`). | as cited |

Also high: moderation is silently skipped for photos over 5 MB (§2.5), deleting a photo also deletes buyers' purchases (§2.4), schema/migration drift (§3), and there is no CI, tests, or lint config (§4).

---

## 1. Code organization

### 1.1 App Router structure
- Route groups: only `(app)` (`src/app/(app)/layout.tsx:1-3`), which just adds a `<main>` wrapper. Public pages (`sessions/`, `photographer/`, `page.tsx`) sit outside it, and auth pages sit inside it with app pages. There is no `(auth)`, `(marketing)`, or `(photographer)` split, so role-gated pages can't share a layout guard.
- **No `middleware.ts`.** Every role check is client-side, e.g. `dashboard/page.tsx:77,155` (`router.push("/")` once the session loads) and `upload/page.tsx:123-125`. The pages render and fetch before the redirect happens.
- Shared components live in `src/app/components/*` (14 files). Feature components are colocated inconsistently (`sessions/[id]/photo-grid.tsx` vs `dashboard/edit-modal.tsx`). `src/app/navbar.tsx` and `providers.tsx` sit at the app root.
- `src/lib` mixes infrastructure (`db`, `s3`, `stripe`, `rekognition`, `email`), domain logic (`image-processing`, `marine-conditions`, `geocode`), static data (`spots-database.ts` 550 lines, `surf-spots.ts` 168 lines, the latter **unused**), and a client-only util (`toast.ts`).

### 1.2 Giant client components
| File | LOC | Issues |
|---|---|---|
| `(app)/dashboard/page.tsx` | 696 | One `"use client"` file holding the sessions tab, earnings tab, a hand-rolled canvas revenue chart (`:447-535`), session row, QR modal, and Stripe status. Five data fetches in `useEffect` (`:84-106`), 12 `useState`s (`:62-73`). |
| `sessions/[id]/photo-grid.tsx` | 596 | Grid, infinite scroll, cart, single and bulk checkout, post-redirect verify plus auto-download (`:83-144`), report modal (`:52-57,301`), lightbox. On every mount it fetches **all** of the user's purchases, each with a presigned 1h original URL (`:65`). |
| `(app)/upload/page.tsx` | 531 | Inline register/login wizard (`:142-170`), session form, upload queue (batches of 3, `:188-195`), publish step. Polls `/api/auth/session` (`:166`). |
| `(app)/settings/page.tsx` | 471 | Profile, avatar, password, role switch, Stripe Connect, verification. |
| `(app)/dashboard/sessions/[id]/page.tsx` | 422 | Requests `?limit=500` (`:52`) but the API caps at 50 (`api/sessions/[id]/photos/route.ts:12`). **Bug: sessions with more than 50 photos are truncated** in the manage view. |
| `lib/spots-database.ts` | 550 | Hardcoded dataset imported into client code (`components/spot-map.tsx:4`) and passed from `page.tsx:2`, so it ships in the JS bundle. Should be a DB table or a static JSON fetched lazily. `findSpotByName` uses bidirectional `includes` (`:530-532`), so "Pipe" matches "Pipeline" and any long string containing a spot name matches too. That gives wrong geocodes. |

### 1.3 Server vs client split and data fetching
- 32 of 42 `.tsx` files are `"use client"`. Only 10 pages/layouts are server components (`page.tsx`, `sessions/page.tsx`, `sessions/[id]/page.tsx`, `photographer/[id]/page.tsx`, static legal pages).
- **59 client `fetch("/api/...")` calls.** Authenticated pages (dashboard, my-photos, settings, manage session) are client-rendered SPAs calling their own API, so each page pays for a waterfall plus a loading skeleton. Server Actions are not used anywhere, even though `next.config.js:9-11` configures `serverActions.bodySizeLimit`.
- Server pages query Prisma directly (`sessions/[id]/page.tsx:20,59,79`) and duplicate the API logic: preview-URL resolution is reimplemented at `:98-103`, alongside `getPreviewUrl` in `s3.ts:63-72` and `avatar/route.ts:33-38`. The local-mode check `!process.env.AWS_REGION || USE_LOCAL_STORAGE` is copy-pasted 5 times (`s3.ts:11`, `rekognition.ts:10`, `avatar/route.ts:33`, `user/claims/route.ts:55`, `sessions/[id]/page.tsx:98`).
- `generateMetadata` and the page both fetch the same session (`sessions/[id]/page.tsx:20` and `:59`) without `React.cache`.

### 1.4 Duplication across API routes
- **Two auth styles.** About half the routes use `getAuthUser()` (`lib/auth-helpers.ts:15`). The rest inline `getServerSession` plus `(session.user as any).id`: `photographer/earnings:9-14`, `photographer/stats:9-14`, `photos/claim:8-13`, `user/claims:9-14`, `user/purchases:9-14`, `auth/resend-verification:10-16`.
- **No role checks anywhere.** Any USER can `POST /api/sessions` (`sessions/route.ts:40-42`), upload photos, connect Stripe, and read `/api/photographer/*`.
- Ownership checks: `verifySessionOwner` (`auth-helpers.ts:24`) is used in 3 routes. Inline versions exist in `upload/route.ts:51` and `photos/[id]/route.ts:31`.
- "Is email verified" is fetched from the DB in 3 places with `as any` (`purchase:18`, `bulk-purchase:18`, `stripe/connect:13-16`). The JWT carries `emailVerified`, but it is **never true at sign-in**: `authorize()` doesn't return it (`lib/auth.ts:33-39` vs `:50`).
- Checkout creation is duplicated three times: `lib/stripe.ts:10-56`, `purchase/route.ts:58-83` (retry copy), and `bulk-purchase/route.ts:46-69` (which **never applies the Connect split or platform fee**, so photographers get nothing from bulk sales).
- The 18% platform fee is hardcoded in 5 places (`lib/stripe.ts:7`, `photographer/earnings/route.ts:46,65,95,102` as `0.18`/`0.82`).
- Purchase upsert logic is duplicated in `webhooks/stripe:44-75`, `verify-purchase:39-49`, and `bulk-verify:47-57`. The duplicates construct `stripePaymentId` in different ways.
- Error handling is ad hoc. Many routes return raw `err.message` to clients (`upload/route.ts:168`, `sessions/route.ts:108`, `sessions/[id]/route.ts:112`, `find-me:40`, `stripe/connect:54`, `avatar:51`, `notify:32`), which leaks Prisma/AWS internals. Routes without try/catch let `req.json()` errors become 500s.
- Email HTML is inlined in routes (`forgot-password/route.ts:27-34`, `photos/report/route.ts:57-73`). `sendPasswordResetEmail` exists in `lib/email.ts:80` but is unused.

### 1.5 No service/domain layer
Route handlers contain the business rules directly: upload limits (`upload/route.ts:54-60`), date-window rules (`sessions/route.ts:57-63`), price propagation (`sessions/[id]/route.ts:84-89`), notification fan-out (`:92-106`), and fee math. Nothing is unit-testable without HTTP and Prisma.

### 1.6 Typing
- **107 `any` usages.** Hotspots: `lib/auth.ts` (8), `sessions/[id]/page.tsx` (7), `explore-map.tsx` (7), `upload/route.ts` (5), `user/claims` (5).
- `(prisma as any).photoClaim` (`claim:24`, `unclaim:16`, `user/claims:22`, `user/delete:22`) and `data: {...} as any` (`register:49`, `forgot-password:20`, `reset-password:14,20`, `verify:13,23`, `upload:152`). These point to a stale generated client at write time (§3).
- No NextAuth module augmentation (`types/next-auth.d.ts` is missing), which forces `(session.user as any).id` everywhere.
- No shared DTOs. The client re-declares `interface Photo`/`Session`/`Stats` (`photo-grid.tsx:11`, `dashboard/page.tsx:17-56`), so API response shapes are unchecked.

---

## 2. Correctness & security

### 2.1 API route matrix (every route under `src/app/api`)

Auth: **—** none · **S** session required · **R** role checked. Own: ownership enforced. Val: input validation (none of these use a schema library such as zod; "manual" means hand-written ifs). RL: rate limited.

| Route | Method | Auth | Own | Val | RL | Notes |
|---|---|---|---|---|---|---|
| auth/[...nextauth] | GET/POST | — | — | — | **no** | Credentials login has no throttle, so it is open to brute force and credential stuffing. |
| auth/register | POST | — | — | manual + MX | in-mem, XFF | `role` comes from the client (`:47`). Anyone can self-register as PHOTOGRAPHER (acceptable, but note it). `name` is unbounded and reaches email HTML unescaped (`lib/email.ts:46`). Email is not normalized to lowercase. |
| auth/forgot-password | POST | — | — | presence | **no** | Reuses `verifyToken` (`:18-21`); the email claims "expires in 1 hour" but **there is no expiry**. Token is stored plaintext. Await on send makes timing reveal whether the account exists. Email-bombing is possible. |
| auth/reset-password | POST | — | — | password rules | **no** | `findFirst` on an unindexed token (`:14`). Sets `emailVerified=true` (`:20`), so the shared token makes reset and verify interchangeable. Existing JWTs are not invalidated. |
| auth/verify | GET | — | — | — | no | Token never expires. GET with side effects. |
| auth/resend-verification | POST | S | self | — | **no** | Unthrottled email send. |
| contact | POST | — | — | manual | in-mem, XFF | `replyTo: email` is not validated. |
| photographer/earnings | GET | S | self | `parseInt(range)` with no bounds | no | `range=100000` builds a 100k-entry map (`:52-56`). Loads **all** purchases unpaginated. |
| photographer/qr | GET | S | self | — | no | |
| photographer/sessions | GET | S | self | — | no | |
| photographer/stats | GET | S | self | — | no | No role check. |
| photos/[id] | DELETE | S | ✔ inline | — | no | Hard-deletes buyers' purchases (`:35`). S3 failures are swallowed. Photo deletion, counter decrement and file deletion run without a transaction. |
| photos/[id]/download | GET | S | ✔ via purchase | — | no | `maxDownloads` (schema `:110`) **never enforced**. GET increments the counter. In local mode returns a public URL (finding #2). |
| photos/[id]/free-download | POST | S | n/a | — | no | Free if `photo.priceInCents==0` **or** `session.pricePerPhoto==0` (`:23`). That OR is inconsistent if the two values diverge. |
| **photos/[id]/purchase** | POST | **—** | **body `userId`** | presence | no | **P0 (finding #1).** If the buyer doesn't exist, `buyer` is null and the verification check is skipped (`:19`). Preview image URL is hardcoded to the local `/api/uploads/previews` path (`:60,76`), which is wrong in S3 mode. |
| **photos/[id]/verify-purchase** | GET | **—** | **query `userId`** | presence | no | **P0 (finding #5).** Reveals purchase existence for any user and can create purchases from Stripe data. |
| photos/bulk-purchase | POST | S | n/a | `Array.isArray` only, no max length | no | No Connect split. Mock branch (`:79-89`) gives free purchases whenever Stripe is unset. Metadata `photoIds` CSV can exceed Stripe's 500-char metadata limit at about 20 cuid IDs, so large carts fail. |
| photos/bulk-verify | POST | S | self | `Array.isArray` | no | Same "last 10 sessions" scan. Upserts in a loop with an extra query per photo (N+1). |
| photos/claim | POST | S | self | array, no max | no | Unbounded loop of upserts. |
| photos/report | POST | **—** | — | reason enum | **no** | `details`, `email`, and `title` are interpolated into HTML email unescaped (`:60-67`), allowing HTML injection or phishing via the photographer's inbox. Email spam vector. |
| photos/unclaim | POST | S | self | presence | no | |
| photos/upload | POST | S | ✔ inline | magic bytes, size, resolution | no | See §2.5. |
| sessions | GET | — | — | page/limit clamp | no | `date` is an exact DateTime equality match (`:17`). |
| sessions | POST | S | — | manual | no | **No role check.** `pricePerPhoto` is not type-checked (a string or float passes into an Int column and produces a 500). `sportType` is free-form. |
| sessions/[id] | GET | **—** | — | — | no | Returns **unpublished** sessions with all preview keys (`:13-27`). |
| sessions/[id] | PATCH | S | ✔ | **none** | no | `pricePerPhoto` can be negative or non-integer. `coverPhotoId` can point to another session's photo. `published` could be any truthy value. Re-geocodes on every save that includes a location. |
| sessions/[id] | DELETE | S | ✔ | — | no | Deletes buyers' purchases (`:129`). **S3 objects are never deleted.** |
| sessions/[id]/find-me | POST | S | **none** | size only | **no** | **P0 biometrics.** Works on unpublished sessions. Searching costs Rekognition money, so this is also a cost-abuse vector. |
| sessions/[id]/notify | POST | — | — | presence only | **no** | Email not validated, no double opt-in, so it can be used to sign arbitrary addresses up for mail. |
| sessions/[id]/notify | GET | — | — | — | no | Leaks subscriber count (minor). |
| sessions/[id]/photos | GET | — | — | limit ≤50 | no | Returns photos of **unpublished** sessions. |
| sessions/[id]/qr | GET | — | — | — | no | Generates a QR code for any string ID (harmless). |
| sessions/[id]/reindex-faces | POST | S | ✔ | — | no | Synchronous loop over every photo, so it hits request timeouts. Deletes the collection first, so a mid-run failure leaves search empty. |
| spots | GET | — | — | — | no | |
| spots/autocomplete | GET | — | — | min length 2 | no | Leaks **unpublished** session locations (`:56-64`). `ILIKE '%q%'` does a sequential scan. |
| stripe/connect | POST/GET | S | self | — | no | No role check. |
| uploads/[...path] | GET | **—** | — | traversal guard | no | Traversal guard is adequate (`:13-22`; `startsWith(UPLOADS_ROOT)` should be `UPLOADS_ROOT + path.sep`, minor). **Serves originals publicly** (finding #2). `readFileSync` loads the whole file into memory with an `immutable` cache header. |
| user/avatar | POST | S | self | size only | no | No magic-byte check. Sharp decodes arbitrary input up to 5 MB (decompression-bomb risk; set `limitInputPixels`). Avatar URL logic duplicated. |
| user/claims | GET | S | self | — | no | For purchased photos returns `getPreviewUrl(originalKey)` (`:63`). In S3 mode that points at the previews CDN with an originals key, so it 404s or, worse, exposes originals if both share a bucket or distribution. In local mode it exposes the public original path. |
| user/delete | POST | S | self + password | — | no | See §2.7. Not transactional. |
| user/purchases | GET | S | self | — | no | Presigns 1h original URLs for **every** purchase on every call (`:39-45`). It is called on every photo-grid mount. |
| user | GET | optional | self/public | — | no | Fine. |
| user | PATCH | S | ✔ (`id` in body must match) | partial | no | `avatarUrl` accepted from the client (`:65`), so a user can set an arbitrary URL that renders in others' UIs. URLs for `website` and socials are not validated (`javascript:` URI risk if rendered as `href`). Role change doesn't refresh the JWT. |
| webhooks/stripe | POST | signature ✔ | — | — | — | Signature is verified correctly using the raw body (`:7-24`). Gaps: no `event.id` dedupe table; no `payment_status==='paid'` check (async methods); amount comes from the current photo price, not `amount_total`/line items; no `charge.refunded`, `charge.dispute.*`, or `account.updated` handling; fabricated `stripePaymentId` per photo for bulk orders (`:50`). |

### 2.2 Input validation
There is no schema library; `lib/validation.ts` has only password and email helpers. Every body is destructured from `await req.json()` with no type guards. Recommendation: zod schemas in `src/server/validation/*`, shared with client forms, plus one `parseBody(req, schema)` helper.

### 2.3 Rate limiting
`lib/rate-limit.ts` is an in-process `Map`. It resets on every deploy or restart and won't work with more than one instance. It's keyed on the raw `x-forwarded-for` header (`register:10`, `contact:7`), which the client controls; behind Cloudflare and nginx the right key is `CF-Connecting-IP` or the nginx-set `X-Real-IP`. It is applied to only 2 routes. **Login, forgot-password, find-me, report, and notify are unthrottled.** A module-level `setInterval` (`:22`) runs per lambda/worker.

### 2.4 Purchases, downloads and originals
- Originals are stored as `.jpg` with `ContentType image/jpeg` even when the upload is PNG or WebP (`upload/route.ts:111,121`; `s3.ts:43`).
- Download filenames come from the title with a regex (`download/route.ts:31`), which is fine. `ResponseContentDisposition` is not RFC 5987 encoded (minor).
- **Deleting a photo or session deletes paying customers' purchases** (`photos/[id]/route.ts:35`, `sessions/[id]/route.ts:129`, `user/delete/route.ts:26`). This destroys financial records and buyer access. Use soft-delete and keep originals for buyers for N days.
- `PROGRESS.md:130` lists "serve unwatermarked original from private S3 on verified purchase" as **not done**, which is consistent with finding #2.
- The watermark is light (alpha 0.12–0.18, `image-processing.ts:24,30`) and the preview is 1200 px at q60, which is usable as-is for social media. That's a business decision, but worth flagging.

### 2.5 Upload pipeline
Flow (`upload/route.ts:28-164`): `formData()` → full `Buffer` (up to 25 MB) → `sharp.metadata` ×3 (`getImageMetadata`, `extractExif`, `createPreview`, each re-decoding headers) → SHA-256 → Rekognition `DetectModerationLabels` with **Bytes** → preview + thumbnail in parallel → 3× S3 put → fire-and-forget IndexFaces → DB insert → counter increment.

Problems:
1. **Moderation bypass.** Rekognition's `Image.Bytes` limit is 5 MB. Larger photos, which is most pro-camera JPEGs, throw `ImageTooLargeException`. That is caught and returns `flagged:false` (`rekognition.ts:192-195`), so **moderation is silently skipped** for most real uploads. Use an `S3Object` reference after upload, or moderate the preview buffer.
2. **Memory on a 2 GB EC2 instance** (`PROGRESS.md:13`; `deploy-aws-simple.sh:14` says t4g.micro, 1 GB, which is itself a drift). The client sends 3 concurrent uploads (`upload/page.tsx:188`) and the manage page sends more (`dashboard/sessions/[id]/page.tsx:114`). Each holds the 25 MB buffer plus FormData copy plus libvips decode of 24–45 MP (about 100–180 MB RGB each, ×2 for preview and thumbnail in parallel). Three concurrent uploads can therefore need roughly 1 GB transient, on the same box as Postgres and nginx, which risks OOM. `sharp.concurrency()`/`sharp.cache(false)` aren't set and there's no `limitInputPixels`.
3. **Synchronous processing in the request.** Moderation, resizing, and S3 puts all happen inline, about 3–10 s per photo. Requests are vulnerable to nginx or Cloudflare timeouts (Cloudflare's limit is 100 s), with no retry or resume. Body size limits depend on nginx `client_max_body_size`, which isn't in the repo.
4. **Ordering and atomicity.** IndexFaces starts before `photo.create` (`:127` vs `:131`). If the insert fails (for example a concurrent duplicate-hash race, since `(sessionId,fileHash)` has no unique constraint), face vectors are orphaned. The limit check (`:54`) and `photoCount` increment (`:155`) aren't in one transaction, so concurrent uploads can exceed 200. Failures after the S3 put leave orphan objects.
5. IndexFaces uses `S3Object` (`rekognition.ts:61`), so it **does nothing in local mode**. If prod is local mode, Find Me can't work there. Either way the claim in `PROGRESS.md:49` needs verifying against the real `.env.production`.
6. `deleteFacesForPhoto` lists only the first 100 faces (`rekognition.ts:137-140`), so faces beyond that are never deleted.
7. EXIF parsing uses regex over a binary string (`image-processing.ts:137-159`). `focalLength`, `iso`, `aperture`, and GPS are never extracted because the patterns only cover Make, Model, and DateTimeOriginal. The GPS columns are dead. Use `exifr`.

### 2.6 Tokens, sessions, CSRF
- Verify and reset tokens share one column with no expiry, no single-purpose flag, stored plaintext, and no index (`schema.prisma:22`). The emails claim 24h and 1h expiry (`email.ts:52,92`; `forgot-password:30`), which is false.
- The JWT has no revocation. Password reset and change don't invalidate existing sessions. The role is cached in the JWT until `update()` is called.
- `NEXTAUTH_SECRET` defaults to `change-me-in-production-please` in `docker-compose.prod.yml:13`. If it's ever deployed with that default, JWTs can be forged.
- CSRF: NextAuth cookies are `SameSite=Lax`, which blocks cross-site POSTs from carrying the session. Residual risk is low. No `Origin` check exists; add one to the shared route wrapper as defense in depth.
- There are no security headers (CSP, frame-ancestors, HSTS) in `next.config.js`.

### 2.7 Biometric data (BIPA/GDPR/CCPA)
- Faces of **every person in every photo** are indexed at upload (`upload/route.ts:127`). There's no notice to or consent from the people photographed, no retention schedule, and no published destruction policy, all of which BIPA §15(a)/(b) require. This contradicts `privacy/page.tsx:18,25`.
- The selfie is processed and not stored, which is good (`find-me.tsx:230`). But find-me has no consent checkbox, no rate limit, and no published-session check.
- The "that's me" report (`photos/report/route.ts`) only emails the photographer. It doesn't suppress the photo or delete face vectors.
- Account deletion (`user/delete/route.ts:20-30`) misses: S3 originals, previews, thumbnails and avatar; Rekognition collections for the photographer's sessions (it calls `photo.deleteMany` directly instead of going through `deleteFaceCollection`); `SessionNotification` and `PhotoReport` rows matching the email; Stripe Connect account. It's also not transactional, so a partial failure leaves an inconsistent account.
- **Recommendation:** decide the legal posture first (consent at upload or index on demand; geo-restrict Illinois/Texas/EU or obtain consent), then make collection lifecycle a single `BiometricService` with an audit trail.

### 2.8 Secrets in the repo
- DB password: `infra/deploy-aws-simple.sh:133`, `:165` and `PROGRESS.md:100` (values not reproduced here). Rotate it, scrub it from git history (`git filter-repo`), and move the value to SSM Parameter Store or Secrets Manager.
- `infra/deploy-pi.sh:35,52,99` and `prisma/seed.ts:7` use the literal password `password`, for the Pi DB and demo accounts.
- `infra/deploy.sh:236` echoes the generated RDS password to stdout, and `:98` makes RDS `--publicly-accessible`.
- `.gitignore` doesn't ignore `.env.production` (only `.env`, `.env.local`, `.env.prod`), and `.dockerignore` doesn't exclude it, so it goes into the Docker build context. The deploy runs `git checkout -- .` on the box (`PROGRESS.md:97`), so there's a risk of committing or overwriting it.

---

## 3. Data model (`prisma/schema.prisma`)

**Good:** money is stored as Int cents (`:52,91,105`). Purchase has `@@unique([userId, photoId])` (`:120`). There are some indexes.

**Issues:**
- **Migration drift (P1).** There is a single migration (`20260319181853_add_session_notification`), and it is missing `User.emailVerified`, `verifyToken`, `Session.locationLat/Lng`, `sportType`, `viewCount`, all marine fields, `Photo.fileHash`, all EXIF/GPS fields, and the `PhotoClaim` and `PhotoReport` tables. Prod is managed with `prisma db push` (`package.json:11`, `deploy-aws-simple.sh:235`, `PROGRESS.md:100`). There's no reproducible history and no safe rollback, and a fresh `migrate deploy` would produce the wrong schema. Fix: baseline with `prisma migrate diff --from-migrations --to-schema-datamodel`, mark it applied in prod with `migrate resolve --applied`, and use `migrate deploy` from then on.
- **Stringly-typed enums:** `sportType` (`:48`), `PhotoReport.reason`/`status` (`:151,153`), `currency` (`:106`). Convert to Prisma enums.
- **Missing FKs:** `SessionNotification.sessionId` has no relation (`:126`), so it orphans on session delete. `Session.coverPhotoId` has no relation (`:49`). `PhotoReport.email` and `SessionNotification.email` aren't linked to User (needed for GDPR erasure).
- **Cascade rules:** Purchase→Photo and Purchase→User are `RESTRICT` (migration `:128,131`), which is why the code hard-deletes purchases first. Purchases should be immutable financial records: soft-delete photos instead (`deletedAt`) and use `onDelete: Restrict` with app-level soft-delete. `Session→User` is RESTRICT and `PhotoClaim→User` has no cascade.
- **Purchase lacks:** `status` (pending/paid/refunded/disputed), `platformFeeCents`, `photographerNetCents`, `stripeTransferId`, and an `Order` aggregate for bulk checkouts. Today one bulk checkout becomes N rows with synthetic `stripePaymentId` and `stripeSessionId` values (`webhooks/stripe:50-51`). Proposed: `Order(id, userId, stripeSessionId UNIQUE, paymentIntentId, amountTotal, status)` → `OrderItem(orderId, photoId, priceCents, feeCents)`, plus an `Entitlement(userId, photoId)` unique row.
- **Missing table:** `StripeEvent(id PK)` for webhook idempotency.
- **Missing table:** `VerificationToken(userId, purpose, tokenHash UNIQUE, expiresAt, usedAt)` to replace `User.verifyToken`.
- **Indexes to add:**
  - `Photo(sessionId, createdAt)` for cursor pagination ordered by createdAt.
  - `@@unique([sessionId, fileHash])`.
  - `Session(published, date)`.
  - A `pg_trgm` GIN index on `Session.location` for `contains/insensitive` (`sessions/route.ts:16`, `spots/autocomplete:57-64`).
  - `Purchase(createdAt)` for earnings range queries, which currently join through photo→session.
  - Consider denormalizing `photographerId` onto Purchase/OrderItem for photographer reporting.
- `Session.date` (DateTime) plus `startTime`/`endTime` strings have no timezone. Marine lookups use `timezone=auto` (`marine-conditions.ts:31`), so times are ambiguous across zones. Store `startsAt`/`endsAt` as timestamptz plus an IANA tz.
- `photoCount` is a denormalized counter maintained non-transactionally (upload `:155`, delete `:37`), so it drifts. Either maintain it in the same transaction or compute it with `_count`.
- `priceInCents` is duplicated on Photo and Session and synced by `updateMany` (`sessions/[id]/route.ts:84-89`). Decide whether Photo price is an override or a copy.

---

## 4. Infra / DevOps

- **Two divergent deploy targets in the repo:**
  - `infra/deploy.sh` (ECS Fargate + RDS + ALB, HTTP only, `surfshots` naming, stale).
  - `infra/deploy-aws-simple.sh` (EC2 user-data that writes `docker-compose.production.yml` and `.env.production` **on the server**, `:122-173`; that compose file is not in git).
  - `infra/deploy-pi.sh` together with `docker-compose.prod.yml` (Raspberry Pi, host DB).
  - The prod compose file and the nginx config (`PROGRESS.md:18`) aren't versioned, so the running prod config can't be reviewed or reproduced. `docker-compose.prod.yml` ≠ `docker-compose.production.yml`.
- **Deploy** = `ssh … "git checkout -- . && git pull && docker-compose build app && up"` (`PROGRESS.md:97`). It builds on the 2 GB prod box (Next build plus `npm ci` competing with the live app and Postgres), has no rollback, causes downtime during the container swap, and `git checkout -- .` silently discards on-box edits. Migrations run by hand in a separate container (`:100`).
- **Network:** the security group opens 22 and 3000 to `0.0.0.0/0` (`deploy-aws-simple.sh:50,56`). Port 3000 bypasses nginx and Cloudflare. Cloudflare SSL is **Flexible** (`:244`), so CF→origin traffic is plaintext HTTP. Use Full (strict) with an origin cert.
- **Buckets:** `deploy-aws-simple.sh:73-81` disables BPA and adds a public-read policy on the previews bucket. The CloudFront config uses an empty OAI and legacy `ForwardedValues` (`infra/cloudfront-config.json:12,27`). Use OAC with a private bucket. The script doesn't create the originals bucket with BPA, unlike `deploy.sh:37-38`.
- **IAM:** the S3 policy in `deploy.sh:121` has no Rekognition permissions, and the EC2 script attaches no instance role at all, so access keys must be in `.env` (`s3.ts:18-23`). Prefer an instance profile.
- **Dockerfile:**
  - Fine: multi-stage, non-root, standalone.
  - Copies `tsx` and `esbuild` into the runtime just for seeding (`:44-45`).
  - No Prisma CLI in the runner (which is why migrations need a separate image).
  - No `HEALTHCHECK`.
  - Ships `public/models` (12 MB of face-api weights) into the image and serves them publicly.
  - `.dockerignore` misses `infra`, `*.pem`, `.env.*`, `public/uploads`.
  - Local storage writes into `/app/public/uploads` inside a volume.
  - `docker-compose.yml` uses the obsolete `version:` key.
- **No CI** (no `.github/`), **no tests** (zero `*.test.*`/`*.spec.*` files, no test runner in `package.json`), **no ESLint config** (`next lint` will prompt on first run), no Prettier, and no `typecheck` script.
- **Env handling:** env vars are read ad hoc with `!` assertions (`stripe.ts:3`, `webhooks/stripe:19`) and silent defaults (`BUCKET_ORIGINALS || "originals"`, `APP_URL || localhost`). An empty `STRIPE_SECRET_KEY` silently activates the free mock-purchase path (§2.1). Needed: a zod-validated `env.ts` that fails fast at boot and makes mock mode explicit (`PAYMENTS_MODE=mock`, refused when `NODE_ENV=production`).
- **Observability:** only `console.log`/`console.error`. No structured logs, request IDs, error tracking (Sentry), metrics, uptime check, or `/api/health`.
- **Backups:** Postgres runs in a Docker volume on the same EC2 host (`deploy-aws-simple.sh:127-140`) with no pg_dump cron, snapshot policy, or point-in-time recovery. Photos are in local storage if `USE_LOCAL_STORAGE=true`, on the same single EBS volume. One disk failure loses everything.
- Dependencies use caret ranges throughout `package.json` (lockfile present). Unused dependencies: `face-api.js` (`:24`), `@aws-sdk/client-ses` (`:18`, Resend replaced it), `uuid` (use `crypto.randomUUID`). `@types/leaflet.markercluster` is in dependencies instead of devDependencies.

---

## 5. Performance

- **ISR is not working:** `src/app/layout.tsx:7` sets `dynamic = "force-dynamic"` at the root, which overrides `page.tsx:10` `revalidate = 60`. Every homepage hit runs 4 queries, including an unbounded `photo.count()` and `purchase.count()`. Remove the root `force-dynamic` and use per-segment config or `unstable_cache`.
- `sessions/page.tsx:14-21` loads **every** published session with no limit on each request (explore map). Use a bbox query with a limit, or a cached GeoJSON endpoint.
- `photographer/earnings` loads all purchases into memory and does JavaScript aggregation. Use SQL `GROUP BY date_trunc('day')`.
- N+1 query loops: the webhook bulk loop (`webhooks/stripe:38-55`), `bulk-verify:40-59`, `photos/claim:22-33`, `bulk-purchase` mock loop `:79-89`, `user/delete:25-28`, `reindex-faces:27-30` (sequential Rekognition calls), and the session-publish notification fan-out (`sessions/[id]/route.ts:99-104`), which uses unbounded `Promise.all` with Resend rate limits.
- `user/purchases` presigns an original URL for every purchase on every photo-grid mount (`photo-grid.tsx:65`). Presign lazily on download.
- Images:
  - `next/image` remotePatterns allow `*.amazonaws.com` (`next.config.js:14-19`), but the CloudFront domain isn't listed.
  - Previews and thumbnails are JPEG q60/q50 only. No AVIF/WebP and no `srcset` sizes.
  - In local mode every image request goes through a Node route doing `readFileSync` (`uploads/[...path]/route.ts:28`). nginx should serve them directly, or better, use S3 + CloudFront.
- Bundle:
  - `spots-database.ts` (550 lines) ships to the client via `spot-map.tsx:4`.
  - Leaflet is dynamically imported in some places (`dashboard/page.tsx:15`, `upload/page.tsx:11`), but `explore-map.tsx` and `map-inner.tsx` import `leaflet` at module top level with `require` for markercluster (`explore-map.tsx:4,45-47`). Verify these are only loaded through `next/dynamic` with `ssr:false`.
  - `face-api.js` is still a dependency and its 12 MB of models sit in `public/models`, even though Rekognition replaced it (`PROGRESS.md:108`).
- The view counter is a write on every page render (`sessions/[id]/page.tsx:72-75`), which is row-lock contention on hot sessions. Batch it or use a separate table.
- Geocoding (Nominatim) and Open-Meteo are called synchronously in session create and PATCH (`sessions/route.ts:69-75`, `sessions/[id]/route.ts:59-64`). That adds latency and violates Nominatim's usage policy at scale. Cache results and move them to a job.

---

## 6. Phased refactoring plan

Effort: S ≈ ≤1 day, M ≈ 2–4 days, L ≈ 1–2 weeks (one dev).

### Phase 0: Stop the bleeding and add a safety net (week 1)

| # | Item | Rationale | Files | Effort | Risk |
|---|---|---|---|---|---|
| 0.1 | **Rotate the DB password; scrub history**; move secrets to SSM or Secrets Manager; add `.env.production`, `*.pem` to `.gitignore`/`.dockerignore` | Committed credential (§2.8) | `infra/deploy-aws-simple.sh`, `PROGRESS.md`, `.gitignore`, `.dockerignore` | S | Low (history rewrite needs a force push, so coordinate) |
| 0.2 | **Fix the purchase authZ:** `getAuthUser()` in `purchase` and `verify-purchase`; drop `userId` from body/query; refuse mock purchases unless `PAYMENTS_MODE=mock && NODE_ENV!=='production'` | Finding #1/#5 | `api/photos/[id]/purchase`, `verify-purchase`, `bulk-purchase`, `photo-grid.tsx:93,194,223` | S | Low |
| 0.3 | **Protect originals:** block `originals/` in `/api/uploads` (previews only); serve local originals only through `download` with a purchase check and a short-lived HMAC-signed URL; better, switch prod to S3 with a private originals bucket (BPA) | Finding #2 | `api/uploads/[...path]`, `lib/s3.ts`, `api/user/claims:63`, `.env.production` | S–M | Medium (verify which mode prod is really in) |
| 0.4 | **Gate unpublished content:** check `published || owner` in `sessions/[id]` GET, `sessions/[id]/photos`, `sessions/[id]/page.tsx`, `find-me`, `autocomplete` | Data leak | 5 files | S | Low |
| 0.5 | **Find-me hardening:** require published session, add a rate limit and an explicit consent checkbox; pause upload-time IndexFaces until the legal posture is decided | BIPA | `find-me/route.ts`, `find-me.tsx`, `upload/route.ts:127` | S | Low (feature degradation is intentional) |
| 0.6 | **Webhook:** add a `StripeEvent` dedupe table; require `payment_status==='paid'`; record `amount_total`/line-item amounts; handle `charge.refunded`. Make `verify-purchase`/`bulk-verify` retrieve the specific `checkout_session_id` (pass `{CHECKOUT_SESSION_ID}` in `success_url`) instead of listing the last 10 | Payment integrity | `webhooks/stripe`, `verify-purchase`, `bulk-verify`, `lib/stripe.ts`, schema | M | Medium |
| 0.7 | Network: close 3000 and restrict 22 (SSM Session Manager); Cloudflare Full (strict); remove the `NEXTAUTH_SECRET` default | §4 | infra, compose | S | Low |
| 0.8 | **Backups:** nightly `pg_dump` to S3 with lifecycle rules plus EBS snapshots (DLM); test a restore | Single disk | new `infra/backup.sh` / cron | S | Low |
| 0.9 | **Commit the real prod config:** `docker-compose.production.yml`, `nginx.conf` → `deploy/`; delete `deploy.sh`, `deploy-pi.sh`, `docker-compose.prod.yml` or move them to `deploy/legacy/` | Reproducibility | `infra/*`, compose files | S | Low |
| 0.10 | **Migration baseline:** generate the missing migration from the current schema, `migrate resolve --applied` in prod, ban `db push` | §3 drift | `prisma/migrations/*`, `package.json` | S | Medium (do it against a prod DB copy first) |
| 0.11 | **Tooling:** `.eslintrc` (next/core-web-vitals + `@typescript-eslint/no-explicit-any: warn`), Prettier, `typecheck` script; **Vitest** for unit tests plus route-handler tests with a Testcontainers Postgres; **Playwright** smoke test (register → upload → buy (mock) → download) | No safety net | new config files, `tests/` | M | Low |
| 0.12 | **CI (GitHub Actions):** lint → typecheck → test → `prisma migrate diff` drift check → docker build → push to ECR/GHCR. CD: prod pulls a **prebuilt image tag** (no on-box build) and runs `migrate deploy` as a release step; keep the previous tag for rollback | Deploy safety | `.github/workflows/ci.yml`, `deploy.yml` | M | Low |
| 0.13 | Write the first tests **before** Phase 1: authZ matrix tests (every route in §2.1 × anon/USER/other-PHOTOGRAPHER/owner), webhook idempotency, purchase → download | Lock in the fixes | `tests/api/*` | M | Low |

### Phase 1: Structural refactor (weeks 2–4)

Target structure:
```
src/
  app/
    (marketing)/            page.tsx, guide, privacy, terms, contact
    (auth)/                 login, register, forgot-password, reset-password  (+ layout redirects if signed in)
    (buyer)/                my-photos, purchase/success           (layout: requireUser)
    (photographer)/         dashboard, dashboard/sessions/[id], upload, settings/payouts  (layout: requireRole)
    sessions/               explore + [id] (public, server-first)
    photographer/[id]/
    api/                    thin route handlers only (webhooks, uploads, things that must be HTTP)
  server/                   ← 'server-only'
    env.ts                  zod-validated env, PAYMENTS_MODE, STORAGE_MODE
    db.ts
    auth/                   options.ts, session.ts (requireUser/requireRole/requireSessionOwner), tokens.ts
    http/                   route() wrapper: auth, zod parse, error→status map, request-id, logging, Origin check, rate limit
    rate-limit/             interface + Redis/Upstash or Postgres impl
    services/
      sessions.service.ts   create/update/publish/delete, price rules, notifications
      photos.service.ts     ingest (enqueue), delete (soft), list, pagination
      purchases.service.ts  checkout, fulfil(order), entitlements, downloads (maxDownloads)
      payouts.service.ts    Stripe Connect, fee policy (single FEE_BPS constant)
      biometrics.service.ts index/search/delete collection, consent, audit
      accounts.service.ts   register/verify/reset/delete (full erasure)
      notifications.service.ts
    adapters/               storage (S3 | local, one interface), rekognition, stripe, email (templates/), geocode, marine
    repositories/           optional thin Prisma query modules
  shared/
    schemas/                zod: SessionCreate, SessionPatch, PurchaseRequest, ...  (used by forms + server)
    dto/                    response types inferred from schemas
    money.ts                cents formatting, fee math
  components/               ui/ (Button, Modal, Card...), maps/, photos/
  features/                 client feature modules: photo-grid/, cart/, uploader/, earnings-chart/
  types/next-auth.d.ts
data/spots.json             (or Spot table + seed)
```

| # | Item | Rationale | Files | Effort | Risk |
|---|---|---|---|---|---|
| 1.1 | `server/env.ts` + `STORAGE_MODE` single source of truth | Removes 5 copies of the local-mode check and silent defaults | `lib/s3.ts`, `lib/rekognition.ts`, `avatar`, `claims`, `sessions/[id]/page.tsx` | S | Low |
| 1.2 | `next-auth.d.ts` augmentation; `authorize()` returns `emailVerified`; re-read role/verified from the DB in the `jwt` callback with a short TTL | Kills about 30 `as any`; fixes the verified flag | `lib/auth.ts`, all routes | S | Low |
| 1.3 | `route()` wrapper + `requireUser/requireRole/requireSessionOwner/requirePhotoOwner` + standard `AppError` → JSON mapping (no raw `err.message`) | Dedupes auth and errors in 39 handlers | all `api/**` | M | Low–Med |
| 1.4 | zod schemas in `shared/schemas`; validate every body and query; reuse in client forms | §2.2 | all routes + forms | M | Low |
| 1.5 | `middleware.ts` for route-group gating (`/dashboard`, `/upload`, `/my-photos`, `/settings`) plus server layouts calling `requireRole` | Server-side gating, no flash | new middleware, group layouts | S | Low |
| 1.6 | Extract services (sessions, photos, purchases, payouts, accounts); routes become about 10-line adapters | Testability, reuse from server components and actions | `api/**`, `lib/*` | L | Medium (covered by Phase 0 tests) |
| 1.7 | Unify checkout: one `PurchasesService.createCheckout(items[])` for single and bulk with Connect split per photographer (bulk carts may span photographers, so use separate charges + transfers, `transfer_group`). Add `Order`/`OrderItem` and store fee/net | Bulk sales pay photographers nothing today | `lib/stripe.ts`, purchase routes, webhook, schema | M | **High** (money; test in Stripe test mode with `stripe listen`) |
| 1.8 | Schema hygiene: enums, missing FKs, `VerificationToken` table (hashed, expiring, single-purpose), soft-delete `Photo.deletedAt`/`Session.deletedAt`, indexes from §3, `@@unique([sessionId,fileHash])`, `pg_trgm` | §3 | `schema.prisma` + migrations | M | Medium |
| 1.9 | Real rate limiter (Redis/Upstash or a Postgres `rate_limit` table), keyed on `CF-Connecting-IP`; apply to login (NextAuth `authorize`), register, forgot, reset, report, notify, contact, find-me, upload | §2.3 | `server/rate-limit`, routes | S–M | Low |
| 1.10 | Email templates module with HTML escaping (React Email or a tiny `escapeHtml`); use `sendPasswordResetEmail` | §2.1 report/register injection | `lib/email.ts`, report, forgot | S | Low |
| 1.11 | Split giant client components and move reads to server components: **dashboard** → server page that fetches stats, sessions, earnings in parallel via services, plus client islands (`EarningsChart`, `SessionRowMenu`, `QRModal`); **photo-grid** → `PhotoGrid` (view), `useInfinitePhotos`, `CartProvider`, `CheckoutButton`, `ReportDialog`, `Lightbox`; entitlement set computed server-side and passed as props; **upload** → `SessionForm`, `Uploader` (queue hook), `InlineAuth` removed in favor of `/register?next=/upload`; **settings** → per-section server-action forms | Maintainability, fewer waterfalls | the 5 big files | L | Medium (needs Playwright coverage) |
| 1.12 | Server Actions for authenticated mutations from our own UI (profile, session edit/publish, claim); keep API routes for webhooks, uploads, and anything public | Fewer hand-written fetches; typed end to end | settings, dashboard, edit-modal | M | Low |
| 1.13 | Delete dead code/dependencies: `lib/surf-spots.ts`, `face-api.js`, `public/models/` (12 MB), `@aws-sdk/client-ses`, `uuid`; move `spots-database` to `data/spots.json` or a `Spot` table and stop bundling it on the client; fix `findSpotByName` matching | Bundle and image size | listed | S | Low |
| 1.14 | Fix the dashboard 500-vs-50 photo limit (paginate in the manage view) | Bug | `dashboard/sessions/[id]/page.tsx:52` | S | Low |
| 1.15 | Remove root `force-dynamic`; cache the homepage and explore data (`unstable_cache` tag `sessions`, revalidated on publish); `React.cache` for `generateMetadata`+page | Perf | `layout.tsx:7`, `page.tsx`, `sessions/*` | S | Low |

### Phase 2: Deeper changes (weeks 5–8)

| # | Item | Rationale | Files | Effort | Risk |
|---|---|---|---|---|---|
| 2.1 | **Direct-to-S3 uploads + async processing.** The client requests a presigned PUT/multipart URL into an `incoming/` prefix (`POST /api/uploads/intent` creates a `Photo{status:PENDING}`). An S3 event goes to SQS, and a **worker** (Lambda with Sharp layer, or a separate container on the box with `sharp.concurrency(1)`) does validation, moderation via `S3Object`, preview/thumb, IndexFaces (consent-gated), and `status=READY`. The UI polls or uses SSE. Retries plus a DLQ. | Removes 25 MB bodies and libvips from the web process; fixes OOM, timeouts, and the moderation bypass; enables resumable uploads | `upload/route.ts` → `server/jobs/photo-ingest.ts`, `upload/page.tsx`, schema `Photo.status`, infra | L | Medium–High |
| 2.2 | Job runner for side effects: notification fan-out, reindex-faces, geocode/marine enrichment, account erasure, S3 cleanup (pg-boss on the existing Postgres is the cheapest; SQS if 2.1 already uses it) | Request handlers stay fast and idempotent | sessions/[id], reindex, user/delete | M | Medium |
| 2.3 | **BiometricService with compliance:** consent records (`FaceConsent`), per-photographer opt-in, retention TTL on collections (e.g. 90 days after session date), deletion on "that's me" report/account delete/session delete, full pagination of `ListFaces`, audit log; update the privacy policy to match | BIPA/GDPR | `lib/rekognition.ts`, report, delete, privacy page | M | Medium (needs legal review) |
| 2.4 | Full **account erasure** job: DB rows, S3 objects (originals keep a buyer-grace period), Rekognition, Stripe account deauthorize, email-keyed tables; export endpoint (GDPR Art. 15/20) | GDPR | `accounts.service.ts` | M | Medium |
| 2.5 | Image delivery: CloudFront with OAC for previews; signed CloudFront URLs/cookies (or S3 presign) for originals; generate AVIF/WebP + 2–3 widths; `next/image` with the CloudFront loader | Perf, security | `lib/s3.ts`, infra, grid | M | Low |
| 2.6 | Earnings and stats via SQL aggregates (or a materialized daily rollup); stored fee/net per OrderItem; Stripe balance-transaction reconciliation job | Correctness, perf | photographer routes | M | Low |
| 2.7 | Infra as code (Terraform/CDK): VPC, EC2 or ECS with an instance role (no static keys), RDS with PITR (or keep on-box Postgres with WAL-G), S3 BPA, CloudFront OAC, SSM params, CloudWatch logs and alarms. Retire the ad-hoc shell scripts. | Reproducibility | `infra/` → `infra/terraform/` | L | Medium |
| 2.8 | Observability: pino structured logs with request ID, Sentry (server + client), `/api/health` (DB + S3), uptime check, alarms on 5xx, webhook failures, queue DLQ depth | Ops | `server/http`, infra | S–M | Low |
| 2.9 | Explore: bbox and zoom-based session query + clustering server-side or a cached GeoJSON; lazy Leaflet everywhere through `next/dynamic` | Perf at scale | `sessions/page.tsx`, maps | M | Low |
| 2.10 | Session time model: `startsAt/endsAt timestamptz` + `timezone`; migrate the string times | Correctness | schema, forms, marine | M | Medium |

### Suggested sequencing and guardrails
1. Phase 0.1–0.5 are hotfixes, **same week**, each a tiny PR with a regression test.
2. Phase 0.10–0.13 (migration baseline + CI + authZ tests) must land before any Phase 1 service extraction.
3. Phase 1.3/1.4/1.6 go route-family by route-family (auth → sessions → photos → purchases), each PR keeping the HTTP contract identical (contract tests).
4. 1.7 (money) and 2.1 (ingest) get feature flags and a Stripe test-mode soak. Run the old and new ingest paths side by side per session until parity.

### Open questions / could not verify statically
- The actual prod `.env.production` (is `USE_LOCAL_STORAGE` still `true`? are `AWS_REGION` and `CLOUDFRONT_DOMAIN` set?). This decides whether finding #2 is live or latent, and whether Find Me and moderation run in prod at all.
- The nginx config (`client_max_body_size`, timeouts, which headers are forwarded) isn't in the repo.
- The real instance size (script says t4g.micro 1 GB, `PROGRESS.md:13` says t4g.small 2 GB).
- Whether Stripe live keys are set (if empty, the mock-purchase path is active in prod).
