# CatchMyAction — Development Progress

## Platform
Action sports photo marketplace. Photographers upload sessions, athletes find themselves, buy HD photos.

**Tech Stack:** Next.js 14, PostgreSQL, Prisma, Tailwind CSS, Sharp, Stripe (mock), S3-compatible storage (local dev)

---

## Completed Features

### 1. MVP Backend
- Prisma schema: User, Session, Photo, Purchase, SessionNotification
- API routes: sessions CRUD, photo upload with watermark + thumbnail generation, purchase flow, signed downloads
- Sharp image processing: diagonal "CATCH MY ACTION" watermark, preview + thumbnail generation
- S3-compatible storage with local dev fallback

### 2. Authentication
- NextAuth with credentials provider (email/password)
- JWT strategy with role, avatarUrl in token
- Register API with bcrypt hashing
- Login/Register pages (dark mode)

### 3. UI & Landing Page
- Full dark mode (#0a0a0a)
- Hero section with real surf photo background, animated wave SVG
- Interactive Leaflet map (CartoDB Voyager tiles, 100+ surf spots worldwide)
- Smart search with autocomplete (country/region/spot grouping)
- How It Works section, animated flip-clock stats counter (real DB data)
- Footer, responsive navbar with transparent-on-home behavior

### 4. Session Browsing
- Sessions page with search, infinite scroll (cursor-based pagination)
- Session detail page with photo grid, lazy loading
- Photographer public profile with portfolio

### 5. Photographer Dashboard
- Session list with Publish/Unpublish, Edit (modal + spot autocomplete), Delete
- Manage photos: bulk select/delete, set cover photo (★), add photos with progress bar
- Session pricing ($9.99 default, bulk update existing photos on price change)

### 6. User System
- Dropdown user menu with avatar, role badge
- Settings page: avatar upload (instant), name, bio, social links (website, instagram, youtube, tiktok), password change, role upgrade/downgrade with password confirmation
- Photographer public profile (visible even after downgrade)

### 7. Legal
- Terms of Service & Privacy Policy (facial recognition/biometric data, GDPR/CCPA/BIPA)
- Mandatory checkbox at registration

### 8. Delayed Registration Flow
- Upload page accessible to everyone (no auth required to fill form)
- On submit: photographer → creates session; surfer → info modal pointing to Settings; guest → auth modal
- Draft saved to localStorage

### 9. QR Code & Notify Me
- QR code generation per session (SVG, black on white)
- "Skip → Get QR Code" option after session creation (upload photos later)
- QR modal in manage photos page (Copy Link + Download QR)
- Coming Soon page for empty sessions with email subscription (Notify Me)
- SessionNotification model for storing subscriptions

### 10. Branding
- CatchMyAction (sport-agnostic, not surf-specific)
- SVG logo: camera lens + lightning bolt
- "CATCH MY ACTION" diagonal watermark pattern

### 11. Infrastructure (not deployed)
- Dockerfile + docker-compose
- AWS deploy script: ECS Fargate (SPOT), RDS t4g.micro, S3, ALB, ECR
- Destroy script for cleanup
- Estimated cost: ~$3-5/mo

---

## Demo Accounts
- **Photographer:** photographer@demo.com / password
- **Surfer:** surfer@demo.com / password

## Git
- Repo: git@github.com:igerasym/CatchMyAction.git
- Branch: main
