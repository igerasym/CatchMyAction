# CatchMyActions — Development Progress

## Platform
Action sports photo marketplace. Photographers upload sessions, athletes find themselves, buy HD photos.

**Live:** https://catchmyactions.com
**Tech Stack:** Next.js 14, PostgreSQL, Prisma, Tailwind CSS, Sharp, Stripe Connect, AWS (EC2 + S3 + CloudFront + Rekognition), Resend (email), Lucide Icons
**Repo:** git@github.com:igerasym/CatchMyAction.git

---

## Infrastructure (Production)
- EC2 t4g.small (ARM64, 2GB RAM + 1GB swap) in us-west-2
- Elastic IP: 52.39.186.224
- PostgreSQL 16 in Docker on EC2
- S3: catchmyaction-originals (private) + catchmyaction-previews (public)
- CloudFront CDN for photo delivery (d3l9l6cbrqgaa0.cloudfront.net)
- Nginx reverse proxy (port 80 → 3000)
- Cloudflare DNS + SSL + CDN (catchmyactions.com + www)
- IAM role for EC2 → S3 + SES access (no hardcoded keys)
- Docker Compose for app + PostgreSQL
- SES configured with domain verification + DKIM (denied production access — switched to Resend)

## Completed Features

### Core
1. Full auth (NextAuth, JWT, credentials, role-based USER/PHOTOGRAPHER)
2. Email verification (lazy — register freely, verify before purchase)
3. Password rules (8+ chars, upper/lower/number), MX record validation
4. Forgot password flow (email reset link via SES)
5. Rate limiting on registration (5 per IP per 15 min)
6. Account deletion (GDPR compliant)
7. Security: auth on all state-changing routes, ownership verification, pagination limits

### Photographer Features
8. Photographer dashboard with tabs (Sessions + Earnings), period filters, stats cards
9. Session creation with 20 sport types, time validation (start < end)
10. Auto marine conditions for water sports (Open-Meteo API)
11. Photo upload with validation (25MB max, 1200px min, magic bytes, SHA-256 dedup, EXIF extraction)
12. Watermarked previews + thumbnails (Sharp)
13. S3 storage + CloudFront CDN delivery
14. QR codes (modal with copy link + download) + Notify Me + prominent QR on empty sessions + skip-upload flow
15. Stripe Connect Express (82/18 split) — live mode, fallback to platform-only when photographer Connect not ready
16. Earnings tab: revenue chart (canvas), per-session breakdown with views, recent transactions
17. Session view tracking (excludes photographer's own views)

### Athlete Features
18. Map-first Explore page — select spot on map or search, sessions appear below
19. Face recognition "Find Me" (AWS Rekognition, server-side)
20. Photo claims ("That's me") with persistent DB storage
21. My Actions page (purchased + claimed photos, buy/download/unclaim)
22. Single + bulk photo purchase via Stripe Checkout (live mode)
23. Auto-download after purchase redirect + success banner with "Download Again" button

### Location System
22. 320 hardcoded action sports spots with verified coordinates across all sport types
23. Dynamic autocomplete API — searches spots database + user-created locations
24. Nominatim geocoding fallback for custom locations
25. Interactive world map — dark tiles, marker clustering, fast zoom, Locate Me button, background spots (faint)

### UI/UX
28. Lucide Icons throughout (no emojis — consistent across all devices)
29. Custom logo + SVG favicon (camera focus brackets + play triangle)
30. Hero: "Find Your Moment" / "Shot on real sessions. Instantly find yourself and own the moment."
31. Mobile responsive (navbar, hero, dashboard, upload, manage photos, lightbox)
32. Lightbox with prev/next navigation + keyboard support + photo counter
33. Cart checkboxes + sticky purchase bar on session gallery
34. Settings (avatar, bio, socials, password, role upgrade/downgrade, Stripe Connect, email verification)
35. Legal pages (Terms, Privacy Policy — GDPR/CCPA/BIPA compliant)
36. Photo report/takedown system (report button on photos, email notification to photographer, DB tracking)
37. Email notifications via Resend (session published → notify subscribers, photo report → notify photographer)
38. Toast notification system (success/error/warning) — replaced all browser alerts
39. Loading skeleton placeholders on dashboard, settings, my-photos, manage photos
40. Upload flow: cumulative progress, clear error messages, publish → dashboard redirect

### SEO & Infrastructure
41. Dynamic sitemap.xml (sessions + photographer profiles)
42. robots.txt with proper disallow rules
43. Open Graph + Twitter meta tags (global + per-session with cover photo)
44. Google Search Console verified
45. CloudFront CDN with CORS headers policy
46. www subdomain redirect via Cloudflare
47. X-Powered-By header removed
48. Subtle map attribution styling (compliant but minimal)

### Security
49. Auth on all state-changing API routes + ownership verification
50. /api/user: public fields only for non-self requests, auth required for PATCH
51. /api/photographer/sessions: auth required, returns only own sessions
52. /api/photos/download: userId from auth session (not query param)
53. /api/uploads: path traversal protection
54. Explore search: matches custom session locations + word-level matching

## Deploy Commands
```bash
# Deploy to production
ssh -i catchmyaction-key.pem ec2-user@52.39.186.224 "cd ~/app && git checkout -- . && git pull && docker-compose -f docker-compose.production.yml build app 2>&1 | tail -5 && docker-compose -f docker-compose.production.yml up -d 2>&1 | tail -3"

# DB migration on prod
ssh -i catchmyaction-key.pem ec2-user@52.39.186.224 'docker run --rm --network app_default -v $(pwd)/app/prisma:/app/prisma -w /app -e DATABASE_URL="postgresql://catchmyaction:CatchMyAction2026!@postgres:5432/catchmyaction?schema=public" node:20-alpine sh -c "apk add --no-cache openssl && npm install -g prisma@5.22.0 && prisma db push --schema /app/prisma/schema.prisma" 2>&1 | tail -10'
```

## Next Steps

### High Priority
- [x] Activate Stripe Connect on Stripe dashboard — done, 18% platform fee
- [x] Stripe live mode — identity verified, payments working, Connect enabled
- [x] Migrate face recognition from face-api.js to AWS Rekognition (server-side)
- [x] Email provider: switched from AWS SES (denied) to Resend
- [x] Photo report/takedown system with photographer email notification
- [x] Notify-me email notifications when photographer publishes session (with photos)
- [x] Map improvements: dark tiles, clustering, fast zoom, Locate Me
- [x] Map-first Explore page (sessions appear only after selecting a spot)
- [x] Content moderation: Rekognition auto-scan on upload (allow shirtless athletes for action sports)
- [x] Photographer earnings dashboard (earnings tab, revenue chart, per-session breakdown)
- [x] Session view tracking (viewCount, excludes photographer views)
- [x] Security audit: auth on user/download/sessions APIs, path traversal fix
- [x] Toast notifications replacing all browser alerts
- [x] Loading skeletons on all pages
- [x] Purchase success confirmation banner
- [x] Upload flow UX improvements (cumulative progress, clear errors, time validation)
- [x] Explore search: matches custom locations + word-level matching
- [x] Location warning when geocoding fails on session creation

### Medium Priority
- [ ] Global "Find Me" — selfie search across ALL sessions from homepage
- [ ] Photographers directory page (browse by location, portfolios, sport specialties, ratings)
- [ ] Session analytics (views → finds → purchases conversion funnel)
- [ ] CI/CD pipeline (GitHub Actions: test → build → deploy)
- [ ] Photo download: serve unwatermarked original from private S3 on verified purchase
- [ ] Report management UI for photographers (view/dismiss reports in dashboard)

### Nice to Have
- [ ] Social login (Google, Apple)
- [ ] PWA support (installable on mobile)
- [ ] Multi-language support
- [ ] Admin dashboard for platform management
- [ ] Bulk upload retry for failed photos
- [ ] Photographer public profile improvements

## Demo Accounts
Demo accounts removed — live mode with real Stripe payments.
