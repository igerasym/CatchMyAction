# CatchMyAction — Product Roadmap & Go-to-Market

## Competitive Landscape

| Platform | Focus | Face Recognition | Multi-Sport | Marketplace |
|----------|-------|-----------------|-------------|-------------|
| **CatchMyAction** | Action sports photo marketplace | ✅ AWS Rekognition | ✅ 20 sports | ✅ Stripe Connect |
| PicThrive | Adventure tourism B2B | ❌ | Partial | Kiosk-based |
| FLMR | Surf photography | ❌ | ❌ Surf only | ✅ |
| Surf-Snaps | Surf photography | ❌ | ❌ Surf only | ✅ |
| SurfShot | Surf photography + prints | ❌ | ❌ Surf only | ✅ |
| GetSnapz | Ocean sports | ❌ | Partial (water) | ✅ |
| RaceSniper | Race/event photography | ✅ AI | ❌ Running/cycling | ✅ |
| SnapSeek | Marathons/races | ✅ AI | ❌ Running | ✅ |
| FindMePic | General events | ✅ AI | ❌ Events | ❌ (delivery only) |

**Our differentiator:** Location-based session browsing + AI face recognition + multi-sport support in one platform. Nobody else does all three.

---

## Product Gaps

### Athletes (demand side)
1. No reason to come back — no notifications, no "new session at your spot" alerts
2. No social proof — no reviews, no "X people bought from this session"
3. No sharing — can't share purchased photos to Instagram/social directly
4. "Find Me" is buried inside individual sessions — should be global (planned)

### Photographers (supply side)
1. ~~No earnings visibility~~ ✅ Earnings dashboard with revenue chart, per-session breakdown
2. ~~No analytics~~ ✅ Session view tracking (partial — views done, conversion funnel pending)
3. No way to build a following — athletes can't follow photographers
4. No bulk workflow for pros who shoot multiple sessions per day

### Growth
1. No SEO content — no blog, no spot landing pages
2. No mobile app / PWA — photographers at the beach need mobile-first upload
3. No referral system — no incentive loop

---

## Implementation Phases

### Phase 1 — Make It Sticky (2-3 weeks)

#### 1. Global "Find Me"
- Upload selfie from homepage → search across ALL sessions
- This is the killer feature, make it front and center
- Already have Rekognition infra, need to search across session collections
- Hero CTA: "Find Your Photos" → selfie upload → results page with matched photos across sessions

#### 2. Email Notifications
- "Your photos are ready" (session published → notify subscribers)
- "New session at [spot]" (for athletes who favorited a location)
- "Photographer you follow posted new session"
- SessionNotification model already exists, need SES production access + send logic

#### 3. Follow Photographer
- New DB model: `Follow { userId, photographerId }`
- Follow button on photographer profile and session pages
- Feed: "Photographers you follow" section on explore page
- Notification trigger when followed photographer creates session

#### 4. Social Sharing
- After purchase: one-click share to Instagram Stories
- Download with branded frame (CatchMyAction watermark on border, not on photo)
- Share link generates OG preview with the photo
- "Share & get 10% off next purchase" referral hook

---

### Phase 2 — Photographer Retention (2-3 weeks)

#### 5. Earnings Dashboard
- Payout history timeline
- Per-session breakdown (views → finds → purchases → revenue)
- Pending vs. paid vs. processing
- Monthly/weekly summary emails
- Stripe Connect payout schedule visibility

#### 6. Session Analytics
- Views count per session
- Unique visitors
- Find Me attempts and match rate
- Conversion rate (views → purchases)
- Heatmap: which photos get clicked most

#### 7. Photographer Directory
- Browsable `/photographers` page
- Filter by location, sport type, rating
- Photographer cards with avatar, bio, stats, recent sessions
- Helps athletes discover photographers
- SEO value: indexable profiles

#### 8. Bulk Session Creation
- "I shot 3 sessions today" workflow
- Quick-create: same location, different time slots
- Drag & drop photos into multiple sessions at once
- Template sessions (same spot, recurring schedule)

---

### Phase 3 — Growth Engine (ongoing)

#### 9. SEO Landing Pages
- Auto-generated `/spots/pipeline-hawaii` pages
- Session history at that spot
- Active photographers
- Conditions history
- "Get notified about new sessions here" CTA
- Target long-tail: "buy surf photos pipeline", "action sports photos bali"

**State of SEO on 2026-11-08** (checked on the live site; Search Console is already verified, see `PROGRESS.md` #44).
Works: `sitemap.xml` (home, `/sessions`, up to 500 published sessions, up to 200 photographers), `robots.txt`,
session pages have a unique title/description, canonical, Open Graph, Twitter card, one `<h1>` and alt text on photos,
drafts are `noindex`.

Gaps, in the order worth doing them:
1. **Titles and descriptions on `/sessions` and `/photographer/[id]`.** Both show the homepage title and description, and
   `/sessions` has no canonical. Give each its own: "Find your session: surf, skate and more | CatchMyAction",
   and "<Name>, action sports photographer | CatchMyAction" with sessions and spots in the description.
2. **Keep utility pages out of the index.** `/login`, `/register`, `/upload` are in the sitemap and have no `noindex`.
   Remove them from the sitemap and mark them `noindex`.
3. **Spot pages `/spots/[slug]`** (this item). Today `/spots` and `/spot/...` return 404. Spot pages are the best
   chance to rank: people search by spot ("surf photos Cokes Maldives"), not by a session title. Content: spot name,
   region and country, map, published sessions there, conditions seen in past sessions, photographers who shoot
   there, CTA to get notified. Add them to the sitemap, link them from session pages and from the `/sessions` list.
   Do not make thin pages: list only spots with at least one published session, and `noindex` the rest.
4. **Structured data (JSON-LD).** `Event`/`ImageGallery` with `location` on session pages, `Place` on spot pages,
   `Person` on photographer pages, `BreadcrumbList` everywhere. None exists today.
5. **Better alt text.** Photos say "Photo 9 from Evening Twin Palms". Use spot, sport and date:
   "Surfing at Maldives Cokes, 26 Oct 2026". Do not stuff keywords.
6. **After shipping:** submit the sitemap in Search Console, then watch Coverage and Performance after 2-4 weeks.
   Expect little traffic until there are more than a handful of sessions; spot pages and content volume matter more
   than meta tags.

#### 10. PWA (Progressive Web App)
- Installable on mobile
- Push notifications
- Offline upload queue (photographer uploads at beach, syncs when back online)
- Camera integration for QR scanning

#### 11. Referral Program
- Photographer shares link → athlete signs up → photographer gets X% bonus on first sale
- Athlete shares purchased photo → friend signs up → both get discount
- Referral dashboard with tracking

#### 12. Photo Packages & Bundles
- "Buy all photos of you" bundle discount (e.g., 5 photos for price of 3)
- Session pass: "All photos from this session" flat rate
- Subscription: monthly pass for frequent athletes (unlimited downloads)

---

## Ideas (not planned)

### Video clips with face search
Added 2026-11-08. **Today video is not supported at all:** uploads accept only JPEG, PNG and WebP (checked by file
signature in `src/app/api/photos/upload/route.ts`), max 25 MB, and the server body limit is 10 MB
(`next.config.js`). There is no ffmpeg or video service, and face search runs only on stills.

Idea: turn a clip into watermarked previews plus keyframes, and use the keyframes for the existing face search.
1. **Upload** straight to S3 with a presigned URL (the current upload goes through the Next server). Limits to decide,
   for example 60 s and 500 MB.
2. **Process** (ffmpeg): keyframes at about 1 per second or on scene change; a short muted low-resolution preview with
   a tiled watermark baked in; a poster frame as the thumbnail.
3. **Recognise:** index each keyframe into the session's Rekognition collection with an `ExternalImageId` like
   `<videoId>#<seconds>`. A selfie search then returns frames, which map back to "you are in this clip at 0:12".
4. **Sell:** the original stays private in S3 and is released with a signed URL only after payment. Frames could be
   sold as photos if the photographer allows it.

Decisions already made while discussing it:
- Preview as a looping muted **MP4/WebM** (`autoplay muted loop playsinline`), not a GIF: GIFs lose colour and are often
  several times heavier. A GIF can be an optional share format.
- The watermark must be burned into the re-encoded preview, not overlaid by the player.
- **Rekognition Video is the wrong tool:** it searches a video for faces from a collection, while our flow is a selfie
  searching a session's collection. Per-selfie video jobs would be slow and costly. Keyframes into the existing
  collection are simpler. (From general AWS knowledge; re-read the docs before building.)
- Moderation must run on the keyframes too, as it does for photos.

Why it is not a quick add:
- The EC2 host (2 GB) is shared with cafe-manager and already struggles with builds and disk. Video encoding needs a
  separate worker (Lambda with ffmpeg, MediaConvert, or its own machine).
- Background work today runs inside the web process (lost on every deploy). Video needs a real queue with retries.
- Cost is per Rekognition image, so a 20 s clip at 1 frame per second is about 20 calls. Check current AWS pricing
  before deciding frame rates; none was verified.
- Surfers on video are often far from the camera and moving, so faces may be too small or blurred to match.
  **Not verified on any real clip.**

**Gate before building anything:** take 3-5 real clips, extract frames locally
(`ffmpeg -i clip.mp4 -vf fps=1 f_%03d.jpg`), upload them as ordinary photos to a test session and run Find Me. If it does
not find the person, video stays an atmosphere-only preview without search (or is dropped). If it works, build in this
order: presigned upload and a queue, then the worker (preview, poster, keyframes), then scene-based frame choice and
selling frames.

A cheaper intermediate: a short silent preview clip (about 15 s) attached to a session, no face search, while photos
stay the thing that is sold.

---

## Go-to-Market Strategy

### Week 1-2: Local Validation
- Find 2-3 photographers at nearest surf/action sport spot
- Free onboarding — help them upload first session
- Get them to show QR codes at the spot
- Measure: scan → find → buy conversion

### Week 3-4: Content + SEO
- Create spot landing pages for top 10 locations where photographers shoot
- Post session highlights on Instagram/TikTok (with photographer permission)
- Target long-tail keywords: "buy surf photos [location]"

### Month 2: Scale Supply
- Reach out to action sport photography communities
  - Facebook groups, Reddit (r/surfphotography, r/sportsphotography)
  - Local photography meetups
- Early adopter deal: 0% platform fee for first 3 months (normally 18%)
- Build photographer directory for organic discovery

### Month 3: Paid Acquisition
- Instagram/Facebook ads targeting surfers/athletes in locations with active photographers
- Retarget session page visitors who didn't buy
- Lookalike audiences from existing buyers

### Ongoing: Community
- Feature "Photographer of the Week" on social
- Monthly "Best Action Shot" contest
- Partner with surf schools, gyms, race organizers
- Sponsor local events (provide free photography coverage → onboard athletes)

---

## Key Metrics to Track

| Metric | Target (Month 1) | Target (Month 3) |
|--------|------------------|------------------|
| Active photographers | 5 | 20 |
| Sessions created/week | 10 | 50 |
| Photos uploaded/week | 500 | 5,000 |
| Find Me searches/week | 50 | 500 |
| Photos sold/week | 5 | 50 |
| GMV/month | $50 | $1,000 |
| Athlete signups/week | 20 | 200 |

---

## Chicken-and-Egg Strategy

**Start with photographers.** They create the content. Even 5 active photographers in 5 different spots gives enough inventory to attract athletes.

1. Photographers are easier to convince (they already shoot, just need a sales channel)
2. QR codes at spots create organic athlete acquisition
3. Face recognition is the "wow" moment that converts browsers to buyers
4. Each photographer brings their own audience (athletes they already shoot)

The flywheel: More photographers → more sessions → more athletes find photos → more sales → more photographers join.
