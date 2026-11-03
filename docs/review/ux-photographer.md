# CatchMyAction — Photographer / Seller UX Review

Reviewer role: senior product designer. Method: I read the code only. Nothing was run, built, or tested in a browser. All paths are relative to `src/`. "upload" means `app/(app)/upload/page.tsx`, "dashboard" means `app/(app)/dashboard/page.tsx`, "manage" means `app/(app)/dashboard/sessions/[id]/page.tsx`, and "settings" means `app/(app)/settings/page.tsx`.

---

## 1. Flow map (as implemented)

```
Register (/register, role select) ──┐
/upload form → "Continue" → auth modal (role=PHOTOGRAPHER) ──┼─► PHOTOGRAPHER
Settings → "Become a Photographer" (password + rights checkbox) ┘
        │
        ├─► Settings → Payouts → POST /api/stripe/connect → Stripe Express onboarding
        │        → return_url /settings?stripe=success (nothing handles this param)
        │
        ├─► /upload STEP 1: title, spot autocomplete, date/start/end, sport, price, free toggle, description
        │        → POST /api/sessions (geocode + marine conditions) → [LocationPicker if geocode fails]
        │   STEP 2 (client state only): drag/drop → POST /api/photos/upload ×3 concurrent
        │        → "Publish Session (N)" → PATCH published=true → notify subscribers → /dashboard
        │        └ or "Skip — Upload Later & Get QR Code" → /dashboard/sessions/[id]
        │
        ├─► /dashboard  [Sessions tab]: stat cards, profile QR, session rows (Publish/Unpublish, ⋯ menu:
        │        Edit (modal), QR, Copy link, Manage photos, Delete)
        │                [Earnings tab]: range pills, net/sales cards, canvas chart, by-session, transactions
        │
        ├─► /dashboard/sessions/[id]: add photos, select/delete, set cover, QR. No publish control here.
        │
        ├─► Reports: buyer POST /api/photos/report → email to photographer only (no in-app UI)
        │
        └─► Public profile /photographer/[id] (published sessions, 4 thumbs each, social links)
```

APIs that exist but have no UI: `POST /api/sessions/[id]/reindex-faces`, `GET /api/sessions/[id]/notify` (subscriber count), `GET /api/photographer/stats?period=` (the UI only ever requests `all`), and PhotoReport `status` (nothing writes it after creation).

---

## 2. Per-flow findings

### 2.1 Becoming a photographer

There are three entry points:
- `/register` role select (`register/page.tsx:80-83`)
- the auth modal on `/upload`, which always registers as PHOTOGRAPHER (`upload:139-145`)
- Settings upgrade (`settings:314-354`)

Friction and issues:
- **Validation rules disagree.** The auth modal password uses `minLength={6}` (`upload:497`). The server requires at least 8 characters with upper, lower, and a number (`lib/validation`, `api/auth/register:29`). The user only finds out after submitting.
- **Sign-in in the modal flips silently to "upgrade required".** After login, the code waits a hard-coded `setTimeout(500)` and then re-fetches the session (`upload:165`). If the user is a USER, they get an upgrade modal that sends them to `/settings` (`upload:424-448`). The draft is saved to localStorage, but after upgrading in Settings nothing routes them back to `/upload`. That is a dead end.
- **Upgrade requires the password again** plus a rights checkbox (`settings:320-332`). Re-entering the password is reasonable. The rights checkbox duplicates the Terms consent from sign-up.
- **Upgrade success is invisible.** `onSuccess` sets a message, then `window.location.reload()` (`settings:332`) wipes it. The same happens on profile save (`settings:64`) and downgrade (`settings:373`).
- **The upgrade CTA sits at the bottom of Settings,** below the password section. Nothing mentions it in the navbar or home page for logged-in USERs.
- **Downgrade copy says "Your sessions remain"** (`settings:~380`), but it doesn't say whether they stay live and selling, or what happens to Stripe and earnings. Note that `api/sessions` POST and `api/photos/upload` never check `role`, so a downgraded user can still create sessions and upload through the API. The role gate exists only in the client.
- **No onboarding checklist** after upgrade (verify email → connect Stripe → first session).

### 2.2 Stripe payouts setup

Steps: Settings → Payouts card (`settings:125-131`, `StripeConnect` at `settings:235-305`) → POST creates an Express account and an AccountLink (`api/stripe/connect/route.ts:20-48`).

- **BUG (P0): the Connect button submits the Settings form.** `StripeConnect` is rendered inside `<form onSubmit={handleSave}>` (`settings:85` → `129`). Its buttons have no `type="button"` (`settings:276`, `297`), so a click fires `handleConnect` and also submits the form. The submit runs PATCH `/api/user` and then `window.location.reload()`, which races the redirect to Stripe. Expect intermittent "nothing happened", or a reload back to Settings.
- **The Stripe return isn't handled.** `return_url=/settings?stripe=success` and `refresh_url=/settings?stripe=refresh` (`connect:42-43`). No code reads `stripe=`, so the user gets no "You're set" confirmation. An expired link on `refresh` doesn't auto-regenerate.
- **No `account.updated` webhook** (`api/webhooks/stripe/route.ts` handles only `checkout.session.completed`). Status is fetched live on every Settings or Dashboard load (`connect:57-76`). That is slow and a single point of failure. Network errors fall into `connected:false`, so the UI says "Connect Stripe" even when the account exists.
- **The verify-email gate shows up late.** Connect returns 403 `needsVerification` (`connect:16-18`). The UI shows it as a generic red error and doesn't link to "Resend verification", which sits further up the same page.
- **Only the "incomplete" state is shown.** `chargesEnabled` true with `payoutsEnabled` false (bank not verified) displays "✓ Payouts are enabled" (`settings:259-268`). That is wrong.
- **Dashboard optimism flashes the wrong state.** `stripeConnected` defaults to `true` and `stripeStatus` to `"active"` (`dashboard:70-71`), so the nudge pops in late (layout shift). If the Stripe call fails, the nudge never shows.
- **The no-Stripe fallback is never explained, and the money goes to the platform.**
  - Single purchase: `connectId = photographer.stripeAccountId` is used whether or not onboarding is complete (`api/photos/[id]/purchase/route.ts:55`, despite the comment "only if fully set up"). If Stripe rejects the transfer, the code retries with `photographerStripeAccountId: null`, so the platform keeps 100% (`purchase:70-88`). The same applies when the photographer has no account at all (`lib/stripe.ts:45-54`).
  - **No ledger records what is owed to the photographer.** Yet the dashboard nudge says "You have $X in earnings" (`dashboard:202`), and Earnings shows 82% net for every sale (`api/photographer/earnings:30-33`, `65`). That implies the money is waiting for them. There is no code path that pays it later.
  - The nudge copy "Connect Stripe to get paid" doesn't say that sales made before connecting are not paid out.

### 2.3 Create session

Form: `upload:327-420`. Server: `api/sessions/route.ts:40-110`.

- **Missing auth/role check on the server:** any logged-in USER can POST a session (`sessions/route.ts:41-42`). The upload API checks ownership only (`photos/upload:51`).
- **Times are compared as strings** (`upload:118`, `sessions:52`), so a session that crosses midnight is impossible. That's acceptable for dawn patrol, but there's no timezone field. `date` is parsed as UTC midnight (`sessions:90`), so the date can display one day off in the Americas.
- **The date window is "last year Jan 1 → +7 days"** (`upload:353`, `sessions:57-63`). Uploading an old archive is blocked without explanation.
- **Sport list has 20 options in one `<select>` with emoji** (`upload:368-389`). It isn't remembered from the last session, and it isn't saved in the localStorage draft (`upload:88`, which has no `sportType`). The edit modal can't change sport at all.
- **Price input:**
  - It is `disabled` when the value is exactly `"0"` (`upload:395`), so typing 0 locks the field and only the checkbox can unlock it.
  - The "Free session" checkbox sits in a third grid column with its hint text (`upload:398-407`), which overflows on mobile.
  - Fees aren't shown ("buyer pays $9.99 → you get $8.19").
  - There's no currency choice (USD is hard-coded in `lib/stripe.ts:25`) for an EU or Canary Islands photographer.
- **Location:**
  - The autocomplete is free text. If geocoding fails, a world-zoom map modal appears (`components/location-picker.tsx:30-34`, centre [20,0] zoom 2). The user has to pan from the whole globe on a phone.
  - There's no "use my current location", which is the obvious choice at the spot.
  - "Skip" leaves the session with no coordinates and off the explore map, with no warning.
- **Marine conditions:** fetched only at creation (`sessions:73-84`). Editing the date or location doesn't refresh them (`api/sessions/[id]/route.ts:57-82` only re-geocodes). The photographer never sees what was fetched.
- **Accessibility:**
  - The labels in `upload` aren't tied to inputs (no `htmlFor`/`id`). `DateTimeInput` doesn't pass `id`.
  - Errors are not announced (no `role="alert"`).
  - The calendar icon button is `pointer-events-none` (`components/date-time-input.tsx:37`), so the `showPicker` call can never run (dead code).
  - The spot autocomplete lacks combobox ARIA and keyboard navigation (`components/spot-autocomplete.tsx:60-89`).

### 2.4 Upload

Client: `upload:173-215` and `manage:107-138`. Server: `api/photos/upload/route.ts`.

- **Step 2 lives only in React state** (`upload:248`). A refresh, a lost tab, or iOS Safari evicting the tab mid-upload loses the screen. The session exists but the user lands back on an empty Step 1. Recovery means finding the draft in the dashboard, and that isn't explained.
- **Uploads are sequential batches of 3 full-size originals** (up to 25MB each) with no client-side checks, so over beach 4G the whole file uploads before rejection.
  - Not checked before upload: size (25MB), resolution (1200px minimum), MIME type, duplicates (server hash at `upload/route:97-104`).
  - No client-side downscale, no resumable or chunked upload, no per-file progress, no cancel.
  - The guide promises "200 photos"; at 25MB on 4G that is hours.
- **No retry.** Failed files become text lines in a red list (`upload:300-310`). The user has to re-find those files in the picker.
  - The `<input>` value is never reset on `/upload` (`upload:276`), so picking the same files again doesn't fire `onChange`.
  - Server 500s (Rekognition or S3 timeouts) look the same as permanent rejections ("rejected" copy at `upload:286`).
- **Manage page progress never reaches 100%** when anything fails. `done` counts successes only (`manage:131`). It also clears previous errors at the start (`manage:110`).
- **Limits are enforced but not visible.**
  - 200 per session and 50 for free sessions (`upload/route:54-61`). The UI doesn't show "37/200 used".
  - Race: the photo-count check runs before the increment (`upload/route:54` vs `175-178`), so 3 parallel uploads can go past the limit.
- **Moderation rejection copy shows raw Rekognition labels** ("prohibited content detected (Drugs)") (`upload/route:111-115`). There's no appeal path or explanation, and a false positive on wetsuits or board graphics has no recourse.
- **The PNG/WebP original is stored under a `.jpg` key** (`upload/route:118`), and free/paid downloads use `.jpg` filenames. The guide says "JPEG format" while the UI accepts PNG/WebP.
- **Face indexing is fire-and-forget** (`upload/route:136-138`). If it fails, nothing is shown, and the photographer can't trigger the existing `reindex-faces` API from the UI.
- **Drag & drop is useless on mobile;** tap-to-browse is fine. There's no camera-roll multi-select guidance, and no "Upload from camera via Wi-Fi/SD" guidance.

### 2.5 Publish

- **The Publish button appears only after at least 1 success and when idle** (`upload:290-297`). Publish goes straight to `/dashboard` with no success confirmation, share sheet, or QR. This is the peak moment to share, and it's wasted.
- **Email verification:** the client handles `needsVerification` (`upload:235-237`, `dashboard:129-131`), but the server no longer enforces it (`api/sessions/[id]/route.ts:45-46`, "soft nudge" comment). The toast path is dead code with confusing copy ("Settings → Profile").
- **"Draft" isn't private.** `sessions/[id]/page.tsx:59-66` doesn't filter on `published`, and `GET /api/sessions/[id]` is public. That's intentional so the QR works before upload, but it's never explained.
  - Photos uploaded to a "draft" are immediately visible and purchasable to anyone with the link or QR.
  - The `ComingSoon` gate disappears as soon as `photoCount > 0` (`sessions/[id]/page.tsx:142`), so subscribers can see photos before they're notified.
- **Subscriber notification has gaps.** It fires only on the draft→published transition when `photoCount > 0` (`api/sessions/[id]/route.ts:92`).
  - If a photographer publishes an empty session (allowed from the dashboard row, `dashboard:582-587`) and uploads later, nobody is ever notified.
  - Unpublish and republish doesn't re-notify; `notified` stops duplicates, which is fine.
  - The photographer never sees "12 people waiting" (the count API exists, unused).
- **The manage page has no Publish control** (`manage:183-200`). "Done" just goes to `/dashboard`, where the user has to find the row and press Publish.

### 2.6 Edit / delete session and photos

- **BUG (P0): the edit modal turns free sessions into $9.99.** `useState(((session as any).pricePerPhoto || 999) / 100 + "")` (`dashboard/edit-modal.tsx:33`) treats 0 as falsy. The modal always sends `pricePerPhoto` (`edit-modal:64`), and the server rewrites every photo's price (`api/sessions/[id]/route.ts:84-89`). Fixing a typo in the title of a free session silently starts charging for it.
- **BUG: every edit reprices all photos**, even when the price didn't change. Price isn't validated server-side (negative, NaN, or `>999` all accepted; `api/sessions/[id]/route.ts:77`).
  - Changing a 120-photo paid session to free bypasses the 50-photo free limit.
  - `Math.round(parseFloat("")*100)` gives NaN, and Prisma throws a 500.
- **The edit save ignores errors** (`dashboard:141-153`, no `res.ok` check): it merges `{error}` into the row and closes the modal.
- **The edit modal reimplements location autocomplete** (`edit-modal:40-112`) instead of reusing `SpotAutocomplete`. It has no sport field. The date validation isn't re-checked on the server for PATCH.
- **BUG (P0, trust/legal): deleting a session or photo deletes buyers' purchases.**
  - `prisma.purchase.deleteMany` runs in `api/sessions/[id]/route.ts:129` and `api/photos/[id]/route.ts:35`.
  - Paying customers lose download access with no refund. Earnings history and stats shrink retroactively, so the photographer's revenue "disappears".
  - Session delete also never removes S3 objects; only Rekognition is cleaned up (`route.ts:130`).
- **The delete confirmation doesn't mention sales** ("Delete this session and all its photos?", `dashboard:113`). It should say "23 photos were purchased; buyers will lose access".
- **Manage grid is broken on touch.** Set-cover ★ and delete ✕ appear only on `group-hover` (`manage:363`), so on phones they never show. A tap toggles selection. Targets are 20×20px (`w-5 h-5`), below 44px.
- **Manage page shows only 50 photos:** it requests `limit=500`, but the API caps at 50 (`api/sessions/[id]/photos/route.ts:12`, `manage:52`) and the page doesn't paginate. In sessions with 51 to 200 photos, the rest can't be managed or deleted, and "Select all (50)" is wrong.
- **Bulk delete is sequential, with no error handling** (`manage:79-81`). A partial failure still removes the photos from the UI.
- **The manage page doesn't check ownership client-side** (the APIs do). A non-owner sees the manage UI with failing actions.
- **No way to reorder, set a per-photo price, or add a caption** (the schema has a per-photo `priceInCents`, but the UI only offers session-level pricing).

### 2.7 Pricing

- **Price is per photo, set at session level** (`upload:392-395`; the default `999` is in the schema). Copying it to each photo happens at upload (`upload/route:160`) and on every edit.
- **No bundle or "all my photos" price,** even though bulk purchase exists on the buyer side.
- **No fee breakdown** at entry. The "82%" claim appears in Settings, the dashboard, and the guide, but it's only true when Connect works (see §2.2). It's computed on the gross before Stripe's processing fee. Under destination charges the platform pays the Stripe fee out of its 18%, so the 82% figure holds only when the transfer happens.
- **Free downloads count as sales.** Each one creates a $0 Purchase (`api/photos/[id]/free-download/route.ts:32-40`). Those show up in "Sold", in "Photos Sold", and as $0.00 transactions, and they drag down the "avg per photo" figure (`dashboard:349`).

### 2.8 Share QR at the spot

- **Two QRs are offered:** per session (`api/sessions/[id]/qr`) and per profile (`api/photographer/qr`). That's good. Problems:
  - The QR is an SVG served at 256px with the default error correction. "Download QR" gives an `.svg` (`dashboard:631`, `manage:283-284`), which most phones can't open in Photos or print from easily. A PNG and a printable A5/A6 poster ("Scan for your photos — {session}") are missing.
  - There's no full-screen "show at the beach" mode with high brightness and a large code. The modal shows 192px on a dark card.
  - "Copy Link" in the manage page and the session QR modal gives no feedback (`manage:273-277`, `401-404`, `dashboard:628`); only the ⋯ menu shows a toast. There's no `navigator.share()`, the native share sheet you'd expect on mobile.
  - **Profile QR inconsistency:** it requires auth (`api/photographer/qr:7`) while the session QR doesn't. That's fine, but the thumbnail `<img>` loads on every dashboard render.
  - **QR URL host:** `NEXT_PUBLIC_APP_URL` is used for the QR, but the displayed text uses `window.location.origin`. On staging or localhost they can differ.

### 2.9 Earnings visibility

- **The Sessions tab "Total Revenue" card shows gross** (`dashboard:271`), while Earnings shows net. The labels don't distinguish them.
- **The stats API supports `today/week/month`, but the UI always requests `all`** (`dashboard:99`).
- **Earnings tab issues:**
  - The 7-day "range" chart builds the day buckets in UTC (`earnings:41-45`).
  - The "All" chart is capped at 90 days while the totals cover all time (`earnings:41`), which doesn't match.
  - The canvas chart has no accessible text alternative and no tooltip.
  - The 3-column loading skeleton (`dashboard:332`) doesn't match the 2-column result.
  - The per-session table on mobile shows only Net (`dashboard:378-383`).
- **No payout view:** no Stripe Express dashboard login link (`stripe.accounts.createLoginLink`), no payout schedule, no balance or pending amounts, no CSV export or tax info. ROADMAP.md lists these.
- **Privacy:** buyers' full names are shown to photographers (`dashboard:408`, `earnings:107`). Consider first name plus initial.
- **Earnings stay at 82% after refunds or disputes,** because there's no `charge.refunded` handling.

### 2.10 Handling reports / takedowns

- **Reports are email-only** (`api/photos/report/route.ts:54-74`). There's no dashboard inbox, no badge on the photo, no "resolve/dismiss", and `status` is never updated. The email asks for removal "within 48 hours", but nothing tracks or enforces it.
- **Security:** `details` and `email` are interpolated unescaped into the HTML email (`report:66-67`), which allows HTML injection into the photographer's inbox. The endpoint is unauthenticated and has no rate limit, so it can be used to spam photographers.
- **The "That's me — remove" flow has no photographer-side choice** (blur or remove) and no reply to the reporter.

### 2.11 Profile / portfolio

- **Public page** (`app/photographer/[id]/page.tsx`):
  - It renders for any user id, including non-photographers (`:15-37`).
  - `website` is used raw as `href` (`:75`). "yoursite.com" becomes a broken relative link, and `javascript:` is a stored-XSS vector, since nothing in `api/user` PATCH validates it.
  - The Instagram/YouTube/TikTok fields don't strip a leading `@` or full URLs, so `@@handle` or broken links are possible.
- **No cover image, no sports/spots tags, no follow** (in the roadmap), and no featured photos. Each session strip shows only the first 4 photos by insertion order, not the cover photo.
- **Settings has no "View my public profile" link.** The profile URL is only reachable through the dashboard QR modal.
- **Avatar upload:** no error state if the upload fails (`settings:~440-447`). It also creates object URLs that are never revoked.

### 2.12 Guide page (`app/(app)/guide/page.tsx`)

- The content is good: curate 15–30 photos, price $7–10, upload within 24h, connect Stripe early.
- **It contradicts the UI:**
  - The guide says "upload your best 15–30" while the upload page says "Select up to 200" (`upload:252`).
  - The guide says "JPEG format" while the UI accepts PNG/WebP.
- It's linked only from the Create Session subtitle. It isn't linked from the dashboard or the empty state.

### 2.13 Mobile-at-the-beach summary

The core loop is: arrive → create session → show QR → shoot → upload later. These are the points where it breaks on a phone:
- 20-option select, a 3-column grid that collapses, and a world-zoom map for an unknown spot with no geolocation.
- Small QR, SVG download, no share sheet, and no bright full-screen display.
- Large uploads with no resumability, no retry, and lost state on tab eviction.
- Manage actions hidden behind hover.
- Low-contrast text throughout: `text-white/20`–`/30` on near-black is about 2:1 to 3:1, which fails WCAG AA (4.5:1) and is unreadable in sunlight. Examples: hints at `upload:358-407` and labels like `text-white/40`.
- 11px type in many places, such as `text-[11px]`.

---

## 3. Top 10 recommendations

| # | Priority | Effort | Recommendation |
|---|---|---|---|
| 1 | **P0** | S | **Stop deleting purchases.** On photo or session delete, soft-delete (`deletedAt`) and keep originals for buyers. Block deletion of purchased photos, or warn with counts. Fix S3 cleanup only for unpurchased photos. (`api/photos/[id]/route.ts:35`, `api/sessions/[id]/route.ts:129`) |
| 2 | **P0** | S | **Fix the edit-modal price bug and validate price on the server.** Use `?? 999`, send `pricePerPhoto` only when it changed, and require an integer between 0 and 99900 on the server. Re-check the free-photo limit when switching to free. (`edit-modal.tsx:33,64`, `api/sessions/[id]/route.ts:77-89`) |
| 3 | **P0** | M | **Make the money flow honest.** Only add a destination when `charges_enabled` is true (cache it on User through an `account.updated` webhook). Record a `payoutStatus`/`transferId` per Purchase, which needs a webhook `metadata.photographerId`. Show sales collected while not connected as "Pending — connect Stripe to receive" and pay them later with `stripe.transfers.create`, or block paid publishing until Connect is active. Add the split to bulk checkout. |
| 4 | **P0** | S | **Fix the Connect button submitting the Settings form:** move `StripeConnect` out of the `<form>` or add `type="button"`. Handle `?stripe=success|refresh` with a toast or an auto-regenerated link. Show `payoutsEnabled` separately. Link "verify email" from the 403. (`settings:129,276,297`) |
| 5 | **P1** | M | **Resilient mobile upload.** Make the session id URL-addressable (`/upload?session=…` or go straight to manage). Validate size, dimensions, and type on the client. Optionally downscale to about 6000px or 15MB. Show per-file status with a **Retry failed** button that keeps the `File` objects. Show "N/200 used". Distinguish "rejected" from "network error, retrying". Make the server count limit atomic. Longer term, use presigned S3 PUT plus server processing and an offline queue. |
| 6 | **P1** | S | **Fix the manage page for real sessions:** paginate or raise the API cap for the owner (only 50 of up to 200 photos currently show). Make per-photo actions visible on touch with 44px targets. Add a Publish/Unpublish toggle and the subscriber count ("12 athletes waiting — Publish & notify"). |
| 7 | **P1** | S | **Publishing success screen:** after publish, show share sheet (`navigator.share`), session QR, copy-link with feedback, and "notified N subscribers". Notify subscribers on the first upload to an already-published session too. Explain clearly that Draft is link-visible, or gate photos until publish. |
| 8 | **P1** | M | **Beach-ready QR:** a full-screen high-contrast QR mode (wake lock, large), PNG and printable poster downloads, and a profile QR sticker template. Add "Use my location" in the create form and centre the location picker on the device location or geocode guess. |
| 9 | **P2** | M | **An earnings view people can trust:** label gross vs net, exclude $0 free downloads from "Sold" (or show them as "Free downloads"), add a Stripe Express dashboard login link, payout schedule and balance, wire the today/week/month filter, show buyer first names only, and handle refunds. |
| 10 | **P2** | M | **Reports inbox and onboarding:** list reports in the dashboard with Remove/Dismiss that updates `status`, escape the email HTML, and rate-limit the endpoint. Add a post-upgrade checklist (verify email → connect Stripe → first session → print QR). Return to `/upload` after upgrading from the upload modal. Show a fee preview next to price ("Buyer pays $9.99 · you get $8.19"). Validate social and website URLs. Move server role checks into `POST /api/sessions` and `/api/photos/upload`. Raise text contrast to AA. |

---

## 4. Bugs (functional / money / security)

| Sev | Bug | Where |
|---|---|---|
| **Critical (money)** | Bulk purchase checkout has no `transfer_data` or `application_fee`. The photographer receives **0%** of every bulk sale, while Earnings shows 82% net. | `api/photos/bulk-purchase/route.ts:59-71` vs `api/photographer/earnings/route.ts:30-33` |
| **Critical (money)** | For a photographer without Connect, or after the `insufficient_capabilities` retry, the platform keeps 100%. Nothing records that money as owed, yet the dashboard says "You have $X in earnings". | `api/photos/[id]/purchase/route.ts:55,70-88`; `lib/stripe.ts:45`; `dashboard:202` |
| **Critical (money)** | `stripeAccountId` is passed even when `charges_enabled=false` (the comment claims otherwise). Checkout may fail or retry depending on the Stripe error code. Other codes return "Payment failed", so buyers can't buy from incompletely onboarded photographers. | `purchase/route.ts:54-55,72` |
| **Critical (trust)** | Deleting a photo or session hard-deletes buyers' Purchase rows: paid customers lose access and earnings history is rewritten. | `api/photos/[id]/route.ts:35`; `api/sessions/[id]/route.ts:129` |
| **High** | The edit modal turns a free session (0) into $9.99 and reprices all photos on any edit. | `dashboard/edit-modal.tsx:33,64`; `api/sessions/[id]/route.ts:84-89` |
| **High** | Price isn't validated on PATCH (negative, NaN → 500, >$999). Switching to free bypasses the 50-photo free cap. | `api/sessions/[id]/route.ts:77` |
| **High** | The Stripe Connect button is a submit button inside the Settings form, so it races the PATCH plus reload against the Stripe redirect. | `settings:85,129,276,297` |
| **High** | The manage page shows at most 50 photos (the API caps `limit` at 50); photos 51 to 200 can't be managed. | `api/sessions/[id]/photos/route.ts:12`; `manage:52` |
| **Medium** | The photo-count limit check isn't atomic with 3 concurrent uploads, so 200/50 caps can be exceeded. | `api/photos/upload/route.ts:54-61,175-178` |
| **Medium** | Server never checks role: USERs (or downgraded photographers) can create sessions and upload through the API. | `api/sessions/route.ts:41`; `api/photos/upload/route.ts:30-52` |
| **Medium** | Subscribers are never notified if a session was published at 0 photos and filled later. Draft photos are publicly visible and buyable before publish. | `api/sessions/[id]/route.ts:92`; `sessions/[id]/page.tsx:59-66,142` |
| **Medium** | Report email interpolates user-supplied `details` and `email` unescaped (HTML injection). The endpoint is unauthenticated with no rate limit. | `api/photos/report/route.ts:15,66-67` |
| **Medium** | The profile `website` is rendered as a raw `href` (`javascript:` XSS, broken relative links). | `photographer/[id]/page.tsx:75`; `api/user/route.ts:63` |
| **Medium** | Free downloads create $0 purchases that count as "Sold" and lower the average per photo. | `api/photos/[id]/free-download/route.ts:32-40`; `photographer/stats` and `earnings` |
| **Low** | Settings shows "Payouts are enabled" when `payouts_enabled` is false. Dashboard Stripe state defaults to active and hides the nudge on fetch errors. | `settings:259-268`; `dashboard:70-71,105` |
| **Low** | Edit save ignores HTTP errors and merges `{error}` into the row state. | `dashboard:141-153` |
| **Low** | The upload auth modal allows 6-character passwords; the server requires 8 with complexity. | `upload:497` |
| **Low** | Manage-page progress bar counts only successes and never reaches 100% on failure. The `/upload` file input is never reset, so the same files can't be picked again. | `manage:131`; `upload:276` |
| **Low** | PNG/WebP originals are stored and served under a `.jpg` key and filename. | `api/photos/upload/route.ts:118`; `free-download:43` |
| **Low** | Session date is parsed as UTC (one day off in negative offsets). Marine conditions aren't refreshed on date or location edit. | `api/sessions/route.ts:90`; `api/sessions/[id]/route.ts:57-82` |
| **Low** | Session delete leaves all S3 objects orphaned. | `api/sessions/[id]/route.ts:128-131` |
| **Low** | Success messages are wiped by `window.location.reload()` after save, upgrade, and downgrade. | `settings:64,332,373` |
