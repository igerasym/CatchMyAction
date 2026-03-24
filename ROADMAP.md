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
4. "Find Me" is buried inside individual sessions — should be global

### Photographers (supply side)
1. No earnings visibility — no payout history, no "when do I get paid"
2. No analytics — session views, conversion rate, Find Me attempts
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
