# CatchMyAction — Athlete / Buyer UX Review

Scope: athlete-side flows, traced through page + component + API code under `src/`. Read-only review; nothing was executed against the live site. Line refs are `file:line` relative to `src/`.

---

## 1. Flow map (as implemented)

```
QR at beach ──────────────┐            (session QR: api/sessions/[id]/qr/route.ts:10 → /sessions/:id)
                          ▼            (photographer QR: api/photographer/qr/route.ts:11 → /photographer/:id)
Landing "/" ──Find My Photos──► /sessions (Explore: map + spot search, EMPTY until a spot is picked)
  │  hero, search bar(spot+date) ──► /sessions?location=&date=   (date is IGNORED)
  │  home map marker click ───────► /sessions?location=
  ▼
/sessions/:id  ─┬─ photoCount==0 → ComingSoon "Notify me" → POST /api/sessions/:id/notify
                │                    (email sent only on unpublished→published transition)
                └─ PhotoGrid (24/page infinite scroll)
                     ├─ tile click → lightbox → Buy & Download / Free Download / Download HD
                     │                         └─ Report photo (incl. "That's me — remove")
                     ├─ tile checkbox → cart → sticky bar → Buy N (bulk Stripe)
                     └─ Find Me → (login wall, no callback) → selfie upload/camera
                           → POST find-me → matches highlighted "IT'S YOU", auto-added to cart,
                             silently auto-claimed (POST /api/photos/claim)
Purchase single: POST /photos/:id/purchase → Stripe → /sessions/:id?purchased=ID → poll verify (5×1.5s) → auto-download
Purchase bulk:   POST /photos/bulk-purchase → Stripe → /sessions/:id?bulkPurchased=a,b → poll bulk-verify → banner "in My Actions"
Cancel:          Stripe cancel_url → /sessions/:id (no message, cart lost)
/my-photos ("My Actions"): purchases + claims grid → Download HD / Buy / ✕ unclaim
Account: /register → "/" (no verify prompt) → email link /api/auth/verify → "/?verified=true" toast
         /forgot-password → email → /reset-password?token= ; Settings → Delete Account (prompt())
/photographer/:id public profile → session list
/purchase/success — orphan page, never reached by current Stripe success_url
```

---

## 2. Per-flow findings

### 2.1 First visit / landing — value prop
How it works now: Hero says "Find Yourself in Action / Photographers shoot. You find yourself. Buy your HD photos." (`app/components/hero.tsx:44-51`). After that come the search bar, stats counters, a world map, and "How it works".

- **The differentiator is missing.** Selfie face-matching (Find Me) is never mentioned on the landing page. "How it works" step 2 says "Browse by location and date" (`app/components/how-it-works.tsx:14`). The face-matching feature shows up only in SEO keywords (`app/layout.tsx:22`).
- **Social proof can backfire.** Stats show raw counts, including "Photos Sold" (`app/page.tsx:74-79`). At early scale this reads "0 / 3 photos sold" and hurts trust. The `⬇️` stat is also rendered with a `DollarSign` icon (`app/components/stats-counter.tsx:17`).
- **Three names for one destination.** The same `/sessions` target is labelled "Find My Photos" (hero), "Show Sessions" (search bar `search-bar.tsx:118`), "Explore" (navbar `navbar.tsx:42`) and "Browse" (footer `footer.tsx:14`).
- **Search bar below the fold on mobile.** The hero is `h-[85vh]` (`hero.tsx:13`), which pushes the search bar down.
- **Map traps scrolling.** The home map has `scrollWheelZoom: true` (`map-inner.tsx:57`) and Leaflet's default drag. On mobile, a one-finger scroll over the 400px map pans the map instead of the page.
- **Older sessions vanish from the home map.** Active markers are filtered to the last 7 days (`spot-map.tsx:64-69`). Background dots then exclude every location that has any session (`spot-map.tsx:82-88`). Result: a spot whose sessions are older than 7 days disappears entirely.
- **ISR is disabled.** `revalidate = 60` (`page.tsx:10`) is overridden by the root `export const dynamic = "force-dynamic"` (`layout.tsx:7`). Every homepage hit runs 5 Prisma queries.

### 2.2 Discover sessions (search, autocomplete, map, filters)
- **Date filter is dropped (bug).** `SearchBar` sends `?date=` (`search-bar.tsx:57`), but `SessionsPage` only reads `location` (`sessions/page.tsx:11,49`). Since "you know when and where you were" is the core promise (`how-it-works.tsx:14`), this matters.
- **Explore page is empty by default.** It shows nothing until a spot is picked: "Select a spot on the map or search above" (`explore-view.tsx:253-258`). There are no "Recent sessions", "Near me", or "Today" lists, so the hero CTA "Find My Photos" lands on an empty state.
- **The no-results copy speaks to photographers.** "Be the first to upload photos from this spot" (`explore-view.tsx:207`) is aimed at photographers, not athletes. There is also no "notify me when photos from this spot appear".
- **Results recompute on every keystroke.** `onChange` sets `selectedLocation` (`explore-view.tsx:136-139`), so the heading "Sessions in P…" flickers. The word-split fallback (`explore-view.tsx:96-97`) makes "North Shore" match any location containing "north".
- **"Near Me" fails silently.** It has no loading state and no handling for denied geolocation or `!navigator.geolocation` (`explore-view.tsx:147-160`).
- **Autocomplete is not accessible.** There is no `role="combobox"`/`listbox`, no arrow-key navigation, and no Escape (`search-bar.tsx:81-98`, `spot-autocomplete.tsx:71-88`). On Explore it is rendered with `label=""`, i.e. an empty label (`explore-view.tsx:140`).
- **Autocomplete leaks unpublished sessions.** It returns locations of unpublished sessions (`api/spots/autocomplete/route.ts:56-60`).
- **Explore loads everything.** It fetches every published session with no limit (`sessions/page.tsx:14-21`) and filters on the client.
- **Dead code.** `sessions/session-list.tsx` and `sessions/search-form.tsx` are never imported.
- **Date picker icon does nothing.** The icon button has `pointer-events-none`, so its `onClick` never fires (`components/date-time-input.tsx:36-37`).

### 2.3 Session page — browsing, lightbox, cart
- **Price is hidden until the lightbox.** The header shows no price (`sessions/[id]/page.tsx:113-131`), and neither do the tiles. Price appears only in the lightbox (`photo-grid.tsx:497-512`).
- **Find Me is buried.** It is a small right-aligned button above the grid (`photo-grid.tsx:357-372`), yet it is the primary athlete action. There is no intro copy like "Tap Find Me to see only your photos".
- **Photo order is upload order.** Photos sort by `createdAt` (`page.tsx:89`), not capture time, and there is no time-of-day scrubber for long sessions.
- **No navigation or sharing.** There is no breadcrumb back to Explore and no share button (high value for athletes sending a session to friends).
- **The lightbox:**
  - The "Download HD" button for owned photos calls `handlePurchase` and then `window.open` after an `await` (`photo-grid.tsx:226-233`). Safari/iOS popup blockers block this. **Bug.**
  - The lightbox has no "Add to cart" toggle and no "This is me" action. The cart can only be built from the tiny 20px tile checkboxes (`photo-grid.tsx:394-399`).
  - It uses a callback ref `ref={(el) => el?.focus()}` (`photo-grid.tsx:465`), which refocuses the overlay on every render. There is no focus trap, and prev/next/close buttons have no `aria-label` (`:470-479`, `:487-490`).
  - There is no swipe gesture on mobile.
- **"Free" download label can lie (bug).** `cartTotal` sums only *loaded* photos (`photo-grid.tsx:319-321`). After Find Me puts matches from unloaded pages into the cart (`:363`), the bar can show "Free" / "Download N Free" (`:428`) while the server charges real prices.
- **"All N photos loaded" is a developer message.** It is shown to users (`photo-grid.tsx:445-447`).

### 2.4 Find Me (selfie) — consent, errors, no-match, privacy
- **Login wall before trying, with no return path.** `window.location.href = "/login"` (`find-me.tsx:34`) has no `callbackUrl`, and login defaults to `/` (`login/page.tsx:14`). An athlete coming from a QR code gets dropped on the homepage and has to find the session again.
- **No explicit biometric consent at the moment of use.** The privacy policy promises "explicit opt-in consent" (`privacy/page.tsx:25`), but the only consent is bundled into the ToS checkbox at registration (`register/page.tsx:86-95`). The modal shows only a 11px `text-white/20` note (`find-me.tsx:229-231`). This is a GDPR Art. 9 / BIPA exposure.
- **"No face detected" is swallowed (bug).** The API returns HTTP 200 with `error` set (`api/sessions/[id]/find-me/route.ts:33-38`). The client only reads `error` when `!res.ok` (`find-me.tsx:111-116`), so the user sees "No matches found" instead of "No face detected, try a clearer photo". The "collection missing" case is hidden the same way, but its message is photographer-facing copy ("Photos need to be re-uploaded").
- **Low threshold and silent auto-claim.** Matching uses `FaceMatchThreshold` 70 (`lib/rekognition.ts:88`), and every match is auto-claimed with no confirmation (`find-me.tsx:122-127`). False positives put strangers' photos into "My Actions", tagged "IT'S YOU".
- **Matches are capped.** `MaxFaces: 50` (`rekognition.ts:96`) limits matches in big sessions.
- **Big phone selfies are rejected.** The API rejects files over 5MB (`find-me/route.ts:21`). Modern phone photos often exceed that, and there is no client-side downscale (the avatar upload already does one, `settings/page.tsx:410-426`).
- **Retrying the same file does nothing.** The file input is never reset, so picking the same file after "Try Again" doesn't fire `onChange` (`find-me.tsx:181,212`).
- **Matches on unloaded pages are not reachable.** Only loaded pages can highlight or scroll (`photo-grid.tsx:365-369`). There is no "Show only my photos" filter.
- **Modal accessibility gaps.** No `role="dialog"`, no Escape handling, no focus management (`find-me.tsx:146`).
- **Debug logging in production.** `console.log("Find Me matched:", ids)` (`photo-grid.tsx:361`).

### 2.5 Claim "That's me" — terminology collision
- There is no manual claim at all. Claims happen only through the Find Me auto-claim.
- **Same phrase, opposite meanings.** "That's me" is used for *removal* in the Report modal ("That's me — I want my photo removed", `photo-grid.tsx:565`; `api/photos/report/route.ts:7`). The grid badge "IT'S YOU" (`photo-grid.tsx:406`) and the API comments "claim that's me" (`api/photos/claim/route.ts:6`) use it for *ownership*.
- Unclaiming exists only in My Actions, behind a ✕ with no confirmation and no `aria-label` (`my-photos/page.tsx:186-191`).

### 2.6 Purchase — single and bulk
- **Auth gates lose context.** `router.push("/login")` has no callbackUrl (`photo-grid.tsx:187,215,261`; `my-photos/page.tsx:96`). The cart is local state and is lost.
- **Email-verify gate:**
  - Single purchase shows the 403 message as an auto-dismissing toast, with no "Resend verification" CTA (`photo-grid.tsx:252`).
  - Bulk purchase ignores `data.error` completely (`photo-grid.tsx:270-279`). Unverified users click "Buy N Photos" and nothing happens. **Bug.**
  - My Actions `handleBuy` also ignores errors (`my-photos/page.tsx:104-107`).
- **Free photos in bulk fail (bug).** A $0 line item goes to Stripe (`api/photos/bulk-purchase/route.ts:46-56`), which rejects totals under the minimum. The API returns 500 and the client stays silent (see above). Free bulk downloads are broken; single free download works through `free-download`.
- **Payment is not trustworthy enough:**
  - Purchase trusts `userId` from the request body without checking the session (`api/photos/[id]/purchase/route.ts:10-21`). Passing a non-existent id skips the verification check. If Stripe is not configured, the mock path creates free purchases for anyone (`:96-106`).
  - `verify-purchase` is unauthenticated and takes `userId` from the query string (`verify-purchase/route.ts:11`).
- **Post-payment confirmation is fragile.**
  - `verify-purchase` and `bulk-verify` scan only the last 10 Stripe checkout sessions across the whole platform (`verify-purchase/route.ts:26`, `bulk-verify/route.ts:32`). Under concurrent traffic the poll misses the paying user's session.
  - The client gives up after 5×1.5s with **no UI at all**: no "processing", no "we'll email you", no failure state (`photo-grid.tsx:92-108,124-140`). The athlete has paid and sees an unchanged page.
- **Bulk success has no download.** The banner says "Photos are now in My Actions" (`photo-grid.tsx:338`), with no "Download all"/zip. The user has to download one at a time in My Actions.
- **Cancel gives no feedback.** `cancel_url` returns to the session with no "Payment cancelled — your selection is saved" message, and the cart is gone (`purchase/route.ts:65`, `bulk-purchase/route.ts:68`).
- **Stripe checkout image may be broken.** It uses `/api/uploads/previews/...` (`purchase/route.ts:60`, `bulk-purchase/route.ts:52`), which is the local-storage path. In prod (S3/CloudFront) this is likely a broken image on the Stripe page. Not verified live.
- **Currency is hard-coded USD.** See `lib/stripe.ts:26` and `bulk-purchase/route.ts:48`. The platform lists spots worldwide (EU/AU athletes).
- **Bulk sales skip the photographer.** Bulk checkout has no Connect `transfer_data`/`application_fee_amount` (`bulk-purchase/route.ts:58-69`). Single checkout has them (`lib/stripe.ts:45-52`). Photographers aren't paid for bulk sales, which is a trust issue that reaches buyers via photographers.
- **Orphan success page.** `/purchase/success` (`purchase/success/page.tsx`) is never the Stripe success URL. It uses light-theme colours (`text-gray-500`, `text-red-600`) on the dark site and promises "up to 5 times", but `maxDownloads` (`prisma/schema.prisma`, Purchase) is never enforced in `download/route.ts`.

### 2.7 My Actions (`/my-photos`)
- **Name mismatch.** Nav "My Actions" (`navbar.tsx:87`), title "My Actions" (`my-photos/page.tsx:135`), route `/my-photos`, empty state "No photos yet". Pick one name, ideally "My Photos" in a sports-neutral voice, or rename the route.
- **Grid loads full-size originals.** Purchased tiles use the presigned *original* URL as the thumbnail (`my-photos/page.tsx:162`; `api/user/purchases/route.ts:44`). That means multi-MB images on mobile, and broken images once the 1h presigned URL expires on an open tab.
- **Missing structure and history.** No grouping by session or date, no "Download all", no order history (price paid, date, receipt). Nothing is paginated (`user/purchases/route.ts:16`).
- **Download failures are silent** (`my-photos/page.tsx:91`). The unauthenticated redirect has no callbackUrl (`:36`).
- **Lightbox issues.** Same refocus problem as the session page (`:213`). Prev/next have no labels.
- **Latent bug in claims API.** For purchased photos, `thumbnailUrl = getPreviewUrl(originalKey)` (`api/user/claims/route.ts:63`). That points the previews CDN at an originals key: either a 404 or a leak of originals via the public CDN. It is masked today because purchases win the merge (`my-photos/page.tsx:62-64`).

### 2.8 QR-code entry (athlete scans at the beach)
- **Where the QR goes.** It resolves to `/sessions/:id` (`api/sessions/[id]/qr/route.ts:10`), which falls back to `localhost:3000` if `NEXT_PUBLIC_APP_URL` is unset. The session page doesn't check `published` (`sessions/[id]/page.tsx:59-66`), so a draft session is reachable. That suits QR codes, but it also exposes drafts that already have photos to anyone with the URL, and they can be bought.
- **Typical path.** The session is unpublished with 0 photos, so the athlete sees ComingSoon (`coming-soon.tsx`) with an email field (prefilled if logged in). That part is good.
- **The biggest missed opportunity.** ComingSoon could let the athlete *register a selfie now* so they get "we found 12 photos of you" when photos land. Today they get a generic "Photos are ready" email (`lib/email.ts:60-69`), then hit the login wall, then get dumped on `/`.
- **No attribution.** QR scans and organic visits look the same (no `?src=qr`).

### 2.9 Notify-me subscription
- **Weak input handling.** The API has no email validation, no rate limit, no double opt-in, and no unsubscribe link (`api/sessions/[id]/notify/route.ts:9-27`). Errors return the raw `err.message` (`:32`).
- **Notifications fire only on publish.** The email is sent only when the session flips from unpublished to published with photos (`api/sessions/[id]/route.ts:92`). A session published empty and filled later never notifies.
- **Notify exists only on empty sessions.** It isn't offered on sessions that already have photos ("tell me when more are added") or at spot level.
- **Inconsistent feedback.** The button shows "..." while loading (`coming-soon.tsx:64`), and the error is a generic "Something went wrong".

### 2.10 Account lifecycle
- **Register:**
  - The "Check your email" success screen is dead code: `success` is never set (`register/page.tsx:13,49-59`). After signup the user is sent to `/` with no hint that verification is needed to buy (`:39-40`), and no callbackUrl.
  - The password rule is shown only as 11px `text-white/20` hint text (`:77`). The client checks only `minLength=8`, and the server returns one rule failure at a time.
- **Verify:**
  - A valid link redirects to `/?verified=true`, and a toast handles it (`toast-banner.tsx:34-37`).
  - An invalid link redirects to `/?error=invalid-token` (`api/auth/verify/route.ts:10,18`), and nothing on `/` handles that. The login page handles it (`login/page.tsx:44`), but users are never sent there. Silent failure.
  - Login has no "Resend verification email" entry point. It exists only deep in Settings (`settings/page.tsx:108-115`).
- **Reset:**
  - Forgot-password writes the reset token into `verifyToken` (`api/auth/forgot-password/route.ts:18-21`). This invalidates any pending verification link.
  - The email says "expires in 1 hour" (`:30`), but there is no expiry anywhere (`reset-password/route.ts:14`). **Security bug.**
  - Forgot/Reset `<label>`s are not associated with inputs (`forgot-password/page.tsx:35`, `reset-password/page.tsx:48`).
- **Delete:**
  - The password is collected with `prompt()`, which is unmasked and inaccessible (`settings/page.tsx:206`). The confirm copy mentions "sessions, photos" to athletes (`:208`).
  - **No `signOut()` after deletion.** The JWT is still valid after `window.location.href="/"` (`:215-217`), so the navbar still shows the deleted user.
  - Deletion hard-deletes the athlete's purchase records (`api/user/delete/route.ts:21`), losing financial records. It leaves `SessionNotification`/`PhotoReport` rows keyed by email.
- **Settings for athletes:**
  - Shows Bio and "Social Links" (`settings/page.tsx:119-160`), which are photographer-centric.
  - Has no face-data or claims control, even though the privacy policy says "You can delete your biometric data at any time via Settings" (`privacy/page.tsx:28`). That is a broken promise in a legal document.
  - Has no notification preferences. `Field` labels are not associated with inputs (`settings/page.tsx:305-311`). Save reloads the whole page (`:64`).
- **Brand name is inconsistent.** UI says "CatchMyAction", domain is catchmyactions.com, emails say "CatchMyActions" (`lib/email.ts:43,84`; `forgot-password/route.ts:26`).

### 2.11 Photographer profile discovery
- **Renders any user id** (`photographer/[id]/page.tsx:15-37`), including athletes, exposing their name, join date and bio.
- **Unvalidated website link.** `href={photographer.website}` (`:75`) uses a value stored unvalidated (`api/user/route.ts:61`). A `javascript:` URL gives stored XSS. **Security bug.**
- **Few athlete-facing features.** No "Follow / notify me of new sessions", no pagination, avatar has `alt=""`, emoji icons for socials (`:76-88`). Session links show no price or Find Me hint.

### 2.12 Navbar / footer / contact / guide
- **Hard-to-reach and inaccessible account menu.** "My Actions", the athlete's key destination, sits inside the avatar dropdown. The dropdown button has no `aria-label`, `aria-expanded` or Escape handling (`navbar.tsx:49-63`).
- **Footer only on the homepage.** It's missing on Explore, session pages and My Actions. It has no "How it works", "For photographers" or "FAQ" links.
- **Guide is photographer-only** (`guide/page.tsx`). There is no athlete FAQ covering how Find Me works, what you get, licence, refunds, or download limits.
- **Contact labels are not associated** (`contact/page.tsx:79-103`). Its subject options do include "I'm an Athlete".

### 2.13 Mobile
- The sticky purchase bar (`photo-grid.tsx:413-433`) takes ~64px, and the tiles' 20px checkbox and badge targets are below the 44px minimum.
- The lightbox has no swipe, and the prev/next buttons overlay the image.
- Find Me uses `capture="user"` on mobile (good) and webcam on desktop (good). The 5MB limit is the main mobile failure.
- Map scroll-trap on home and Explore (`map-inner.tsx:57`, `explore-map.tsx:55`).

### 2.14 Cross-cutting accessibility
- **Images.** All gallery, My Actions and profile images use `alt=""` (`photo-grid.tsx:390,486`; `my-photos/page.tsx:163,236`). They should be e.g. "Photo 3 of 120, <session>, <time>".
- **Keyboard.** Clickable `<div>` tiles are not focusable (`photo-grid.tsx:381`; `my-photos/page.tsx:160`).
- **Contrast.** Copy at `text-white/20`–`/30` on `#0a0a0a` fails WCAG AA. This includes the privacy note, the "Report this photo" link (`photo-grid.tsx:533`), hints and the footer copyright.
- **Toasts** have no `aria-live` (`toast-banner.tsx:55`). The close button has no label (`:61`).
- **Map popups** are raw HTML strings with no keyboard path to sessions (see the security note below).

### 2.15 Security / SEO issues found while tracing UX
- **Stored XSS in map popups.** Session `title`/`location` and DB spot names are concatenated into Leaflet HTML (`components/map-inner.tsx:116`, `sessions/explore-map.tsx:147-160`). Any photographer can inject script that runs on public pages.
- **HTML injection in report emails.** The unauthenticated report endpoint puts `details`/`email` unescaped into the photographer email (`api/photos/report/route.ts:66-67`), with no rate limit.
- **Report always says "submitted".** It shows success even on 4xx/5xx, because `fetch` resolves (`photo-grid.tsx:300-306`). The copy promises "notify you by email", which isn't implemented.
- **Canonical points everywhere to home.** The root sets `alternates.canonical: BASE_URL` (`layout.tsx:62-64`), and session pages don't override it (`sessions/[id]/page.tsx:33-49`). Every page canonicalizes to `/`, a serious SEO problem for session discovery.
- **No `not-found.tsx` / `error.tsx` / `loading.tsx`** anywhere under `app/`. Bad session ids get the default Next 404, and server errors get the default crash page.
- **Photographers can delete purchases.** Deleting a photo, a session, or a photographer account hard-deletes buyers' purchase records (`api/photos/[id]/route.ts:35`, `api/sessions/[id]/route.ts:129`, `api/user/delete/route.ts:26`). Athletes lose paid photos from My Actions with no notice. This is a trust and refund liability.

---

## 3. Top 10 recommendations (ranked)

| # | Pri | Effort | Recommendation | Why / refs |
|---|---|---|---|---|
| 1 | P0 | S | **Preserve intent through every auth gate.** Pass `callbackUrl=<current URL incl. ?findme=1 / cart ids>` from Find Me, Buy, Bulk, My Actions, and honour it in register and verify (verify → back to the session). Persist the cart in `sessionStorage`. | Breaks the QR → buy funnel. `find-me.tsx:34`, `photo-grid.tsx:187,215,261`, `register/page.tsx:40`, `verify/route.ts:26` |
| 2 | P0 | M | **Make post-payment confirmation reliable and visible.** Look up the Stripe session by `session_id` (add `{CHECKOUT_SESSION_ID}` to `success_url`) instead of scanning the last 10. Show a "Confirming payment…" state, a success state with **Download / Download all (zip)**, and a "taking longer; we'll email you, it's in My Actions" fallback. Show a cancel banner that keeps the selection. | Paid users currently see nothing. `verify-purchase/route.ts:26`, `bulk-verify/route.ts:32`, `photo-grid.tsx:92-140` |
| 3 | P0 | S | **Fix the silent purchase failures.** Surface `data.error` in bulk and My Actions buy. Give `needsVerification` an inline "Verify your email → Resend" CTA. Route all-free carts to `free-download` and split mixed carts. Compute the cart total from server prices or the matched-photo list, not loaded photos. | `photo-grid.tsx:270-284,319,428`, `my-photos/page.tsx:104-107`, `bulk-purchase/route.ts:46` |
| 4 | P0 | S | **Close the security holes found while tracing.** Escape popup HTML (or use DOM nodes). Use the session user, not body/query `userId`, in purchase and verify-purchase. Validate `website` as http(s). Escape report email content and rate-limit it. Add an expiry and separate token for password reset. | `map-inner.tsx:116`, `explore-map.tsx:147-160`, `purchase/route.ts:11`, `verify-purchase/route.ts:11`, `photographer/[id]/page.tsx:75`, `report/route.ts:66`, `forgot-password/route.ts:18` |
| 5 | P0 | M | **Make Find Me consent-first and honest.** Add an explicit per-use biometric consent checkbox with a link to the policy. Show the API `error` for no-face cases. Downscale the selfie on the client to ≤1600px. Raise the threshold to ~85–90 or show a "Confirm these are you" step before claiming. Add a "Show only my photos" filter that pulls matched photos regardless of pagination. Add a "Delete my face matches/claims" control in Settings, as the privacy policy promises. | `find-me.tsx:111-127,229`, `find-me/route.ts:33-38`, `rekognition.ts:88`, `privacy/page.tsx:25-28` |
| 6 | P1 | S | **Fix discovery basics.** Honour `?date=` on `/sessions`. Show "Recent sessions / Near you" when no spot is selected. Replace "Be the first to upload…" with "No photos here yet — get notified". Debounce filtering. Keep older sessions visible on the home map. Remove the inherited canonical. | `sessions/page.tsx:11`, `explore-view.tsx:136,207,253`, `spot-map.tsx:64-88`, `layout.tsx:62` |
| 7 | P1 | M | **Make Find Me the hero of the session page.** Add a prominent banner "Were you here? Find your photos in 5 seconds with a selfie", show the price per photo or bundle in the header, add Share, and add "Add to cart" and "This is me" inside the lightbox. On landing, add Find Me to the hero subcopy and to "How it works" step 2. | `sessions/[id]/page.tsx:113-131`, `photo-grid.tsx:357-372,497-529`, `hero.tsx:50`, `how-it-works.tsx:14` |
| 8 | P1 | M | **Pre-register a selfie on Coming Soon (QR moment).** "Snap a selfie now, and we'll email you when we find you." Run the match on publish and send a personalised email: "We found 12 photos of you". Add spot-level and photographer-level follow, unsubscribe links, and a `?src=qr` tag. | `coming-soon.tsx`, `api/sessions/[id]/route.ts:92-105`, `lib/email.ts:60` |
| 9 | P1 | M | **Rebuild My Actions as a purchase locker.** Use thumbnails, not originals. Group by session and date. Add "Download all", order history with receipts, and a confirm step for un-claim. Unify naming: one label for nav, title and route. Fix the "That's me" collision by renaming the report reason to "This is me — please remove it" and the badge to "Matched you". | `my-photos/page.tsx:135,162,186`, `user/purchases/route.ts:44`, `photo-grid.tsx:406,565` |
| 10 | P2 | M | **Accessibility and mobile pass.** Make tiles `<button>`s with descriptive alt text. Add `aria-label`s on icon buttons and checkboxes (≥44px targets), dialog semantics, focus trap and Escape for all modals, a combobox pattern for autocomplete, `aria-live` toasts, contrast ≥4.5:1 (no `/20`–`/30` body text), lightbox swipe, and `dragging:false`/`tap` handling on the home map. Replace `prompt()` delete with a modal and call `signOut()` after delete. | §2.14, `settings/page.tsx:206-217`, `map-inner.tsx:57` |

Also worth doing (P2, S):
- Unify the brand string (CatchMyAction vs CatchMyActions).
- Delete the orphan `/purchase/success`, `session-list.tsx` and `search-form.tsx`.
- Hide stats below a threshold.
- Add an athlete FAQ (licence, refunds, download limits).
- Add `not-found`/`error` boundaries.
- Localise currency, or label it "USD".
- Stop hard-deleting buyers' purchases when photographers delete content; soft-delete and keep originals for buyers.

---

## 4. Bugs (functional / security), quick list

| Sev | Bug | Ref |
|---|---|---|
| High | Stored XSS: session title/location and DB spot names injected into Leaflet popup HTML | `components/map-inner.tsx:116`, `sessions/explore-map.tsx:147-160` |
| High | Purchase API trusts body `userId` (no auth). Verify gate bypassable. Mock path gives free purchases if Stripe is unset | `api/photos/[id]/purchase/route.ts:10-21,96` |
| High | `verify-purchase` is unauthenticated with `userId` from query. Both verify routes scan only the last 10 Stripe sessions platform-wide, so confirmations fail under load | `verify-purchase/route.ts:11,26`, `bulk-verify/route.ts:32` |
| High | Password reset token has no expiry (email claims 1h) and overwrites the email-verification token | `api/auth/forgot-password/route.ts:18-30`, `reset-password/route.ts:14` |
| High | Photographer-controlled `website` rendered as `href`, so `javascript:` XSS | `api/user/route.ts:61`, `photographer/[id]/page.tsx:75` |
| High | Photo, session or photographer deletion hard-deletes buyers' purchases | `api/photos/[id]/route.ts:35`, `api/sessions/[id]/route.ts:129`, `api/user/delete/route.ts:26` |
| High | Root canonical inherited by all pages, so session pages canonicalize to `/` | `app/layout.tsx:62-64` |
| Med | `?date=` from home search ignored by `/sessions` | `components/search-bar.tsx:57`, `sessions/page.tsx:11,49` |
| Med | Bulk purchase errors (unverified email, Stripe failure) silently swallowed | `sessions/[id]/photo-grid.tsx:270-284` |
| Med | Bulk "free" checkout sends $0 line items to Stripe and fails | `api/photos/bulk-purchase/route.ts:46-56` |
| Med | Cart total computed only from loaded photos, so it can show "Free" for paid matches | `photo-grid.tsx:319-321,428` |
| Med | Find Me "no face" / "not indexed" errors returned with 200, so the UI shows "No matches found" | `api/sessions/[id]/find-me/route.ts:33-38`, `find-me.tsx:111-116` |
| Med | Find Me auto-claims at 70% similarity without confirmation; max 50 matches | `find-me.tsx:122-127`, `lib/rekognition.ts:88,96` |
| Med | Bulk checkout has no Connect transfer, so photographers aren't paid on bulk sales | `api/photos/bulk-purchase/route.ts:58-69` vs `lib/stripe.ts:45-52` |
| Med | Owned-photo "Download HD" uses `window.open` after an await, which popup blockers block (iOS/Safari) | `photo-grid.tsx:226-233,244-248` |
| Med | Account delete doesn't sign out, so the deleted user still looks logged in | `settings/page.tsx:215-217` |
| Med | Report endpoint unauthenticated, not rate-limited, HTML-injects `details` into email; UI shows success on any response | `api/photos/report/route.ts:15,66`, `photo-grid.tsx:300-306` |
| Med | Privacy policy promises biometric-data deletion "via Settings"; no such control exists | `privacy/page.tsx:28`, `settings/page.tsx` |
| Low | Register success ("check your email") state never set: dead UI | `register/page.tsx:13,49` |
| Low | Invalid verify link redirects to `/?error=invalid-token`, which nothing handles | `api/auth/verify/route.ts:10,18` |
| Low | Home map hides every spot whose sessions are older than 7 days | `components/spot-map.tsx:64-69,82-88` |
| Low | Root `force-dynamic` nullifies homepage `revalidate = 60` | `layout.tsx:7`, `page.tsx:10` |
| Low | My Actions uses presigned originals (1h) as thumbnails: heavy, then broken after expiry | `my-photos/page.tsx:162`, `api/user/purchases/route.ts:44` |
| Low | Claims API builds a preview-CDN URL from `originalKey` (latent 404 or originals leak) | `api/user/claims/route.ts:63` |
| Low | Unpublished (draft) sessions with photos are publicly viewable and purchasable by URL | `sessions/[id]/page.tsx:59-66` |
| Low | Autocomplete returns unpublished session locations | `api/spots/autocomplete/route.ts:56-60` |
| Low | Notify only fires on the unpublished→published transition; no email validation or unsubscribe | `api/sessions/[id]/route.ts:92`, `notify/route.ts:9` |
| Low | Date-picker icon button has `pointer-events-none`, so it never opens the picker | `components/date-time-input.tsx:36-37` |
| Low | Same-file re-select in Find Me doesn't fire (input not reset) | `find-me.tsx:212` |
| Low | Lightbox callback ref refocuses on every render | `photo-grid.tsx:465`, `my-photos/page.tsx:213` |
| Low | `maxDownloads` (5) advertised but never enforced | `purchase/success/page.tsx:55`, `api/photos/[id]/download/route.ts` |
| Low | Free-download allowed when session price is 0 even if photo price ≠ 0 | `api/photos/[id]/free-download/route.ts:23` |
| Low | Debug `console.log` of matched ids in production | `photo-grid.tsx:361` |
| Low | Dead code: `sessions/session-list.tsx`, `sessions/search-form.tsx`, `(app)/purchase/success/page.tsx` | — |

Not verified (needs a live check): whether the Stripe product image at `/api/uploads/previews/...` resolves in prod; whether emails are being delivered (a stale comment at `api/sessions/[id]/route.ts:45-46` mentions SES production access, while `lib/email.ts` uses Resend). Purchases depend on email verification, so this matters.
