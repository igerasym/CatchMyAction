# CatchMyAction — Development Progress

## Platform
Action sports photo marketplace. Photographers upload sessions, athletes find themselves, buy HD photos.

**Tech Stack:** Next.js 14, PostgreSQL, Prisma, Tailwind CSS, Sharp, Stripe Connect, S3-compatible storage, face-api.js

---

## Completed Features

### 1. MVP Backend
- Prisma schema: User, Session, Photo, Purchase, PhotoClaim, SessionNotification
- API routes: sessions CRUD, photo upload with watermark + thumbnail, purchase flow, signed downloads
- Sharp image processing: diagonal "CATCH MY ACTION" watermark, preview + thumbnail
- S3-compatible storage with local dev fallback
- Auth helpers: getAuthUser(), verifySessionOwner() — consistent auth across all routes

### 2. Authentication & Security
- NextAuth with credentials provider (email/password), JWT strategy
- All state-changing API routes require authentication
- Session/photo edit/delete verifies ownership
- Avatar upload uses server session (not client-sent userId)
- Pagination limits capped (max 50 per page)

### 3. UI & Landing Page
- Full dark mode (#0a0a0a), hero with surf photo background
- Interactive Leaflet map (CartoDB Voyager, 100+ spots worldwide)
- Smart search with autocomplete (country/region/spot grouping)
- How It Works, animated flip-clock stats (real DB data), footer
- "Explore" link in navbar

### 4. Session Browsing & Gallery
- Sessions page with search, infinite scroll (cursor-based)
- Session detail with photo grid, lazy loading
- Photographer public profile with portfolio
- Purchased photos show without watermark everywhere (gallery, lightbox, My Actions)

### 5. Photographer Dashboard
- Session list: Publish/Unpublish, Edit, Delete, Photos, QR
- Manage photos: bulk select/delete, set cover (★), add with progress bar
- Session pricing ($9.99 default, bulk update on price change)
- Stats: Sessions, Photos, Photos Sold, Revenue
- Period filter: Today / This Week / This Month / All Time
- Recent Sales feed

### 6. Stripe Payments (Real)
- Stripe Connect (platform/marketplace mode)
- Single photo purchase via Stripe Checkout
- Bulk purchase: select multiple photos, one checkout, multiple line items
- Sticky purchase bar at bottom when photos selected
- Cart checkboxes on all unpurchased photos
- Webhook handler for single + bulk purchases
- Verify-purchase endpoint (polls Stripe when webhook delayed)
- Auto-download after payment redirect

### 7. Face Recognition (Find Me)
- face-api.js running entirely in browser (zero server cost, max privacy)
- Selfie never leaves device, never stored
- Upload selfie or use camera → scan all session photos
- Circular progress indicator during scan
- Consent screen with privacy explanation
- Results: matched photos highlighted with purple "IT'S YOU" badge
- Claims saved to DB (PhotoClaim model) — persist across page reloads
- Unclaim API for removing false matches

### 8. My Actions (Purchased + Claimed Photos)
- Single flat grid — no tabs
- Purchased: green border, "OWNED" badge, Download HD button, original (no watermark)
- Claimed (not purchased): purple border, "IT'S YOU" badge, Buy button, ✕ remove
- Lightbox: original for purchased, watermarked preview for unpurchased
- Buy directly from My Actions (Stripe Checkout, no redirect to session)

### 9. Upload Validation
- Max 25MB, min 1200px shortest side, max 5:1 aspect ratio
- Magic bytes check (JPEG/PNG/WebP actual content)
- SHA-256 duplicate detection per session
- Detailed error messages with filename
- EXIF extraction: takenAt, cameraMake, cameraModel, focalLength, iso, shutterSpeed, aperture, GPS

### 10. User System
- Dropdown user menu with avatar, role badge
- Settings: avatar (instant upload), name, bio, social links, password, role upgrade/downgrade
- Photographer public profile (visible even after downgrade)
- Delayed registration flow for photographers (fill form first, auth after)
- Surfer upgrade info modal pointing to Settings

### 11. QR Code & Notify Me
- QR code per session (SVG, black on white)
- "Skip → Get QR Code" after session creation
- QR modal: Copy Link + Download QR
- Coming Soon page for empty sessions with email subscription

### 12. Legal
- Terms of Service & Privacy Policy (facial recognition/biometric data, GDPR/CCPA/BIPA)
- Mandatory checkbox at registration

### 13. Branding
- CatchMyAction (sport-agnostic)
- SVG logo: camera lens + lightning bolt
- "CATCH MY ACTION" diagonal watermark

### 14. Infrastructure
- Dockerfile + docker-compose (prod)
- Raspberry Pi deploy script (uses existing PostgreSQL, port 3100)
- Cloudflare Tunnel setup script (persistent tunnel, systemd service)
- AWS deploy script: ECS Fargate (SPOT), RDS, S3, ALB, ECR (~$3-5/mo)

---

## Demo Accounts
- **Photographer:** photographer@demo.com / password
- **Surfer:** surfer@demo.com / password

## Git
- Repo: git@github.com:igerasym/CatchMyAction.git
- Branch: main
