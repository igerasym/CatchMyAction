# CatchMyActions — Development Progress

## Platform
Action sports photo marketplace. Photographers upload sessions, athletes find themselves, buy HD photos.

**Live:** https://catchmyactions.com
**Tech Stack:** Next.js 14, PostgreSQL, Prisma, Tailwind CSS, Sharp, Stripe Connect, AWS (EC2 + S3), face-api.js
**Repo:** git@github.com:igerasym/CatchMyAction.git

---

## Infrastructure (Production)
- EC2 t4g.micro (ARM64, 1GB RAM + 1GB swap) in us-west-2
- PostgreSQL 16 in Docker on EC2
- S3: catchmyaction-originals (private) + catchmyaction-previews (public)
- Nginx reverse proxy (port 80 → 3000)
- Cloudflare DNS + SSL + CDN (catchmyactions.com)
- IAM role for EC2 → S3 access (no hardcoded keys)
- Docker Compose for app + PostgreSQL

## Completed Features
1. Full auth (NextAuth, JWT, credentials, role-based)
2. Photographer dashboard (stats, sessions, photos, sales)
3. Session creation with sport type + auto marine conditions (Open-Meteo)
4. Photo upload with validation (25MB, 1200px min, magic bytes, SHA-256 dedup, EXIF extraction)
5. Watermarked previews + thumbnails (Sharp)
6. S3 storage for photos (originals private, previews public)
7. Stripe payments (single + bulk purchase, webhook, verify-purchase)
8. Face recognition (face-api.js, browser-only, privacy-first)
9. Photo claims ("That's me") with persistent DB storage
10. My Actions page (purchased + claimed photos, buy/download/unclaim)
11. QR codes + Notify Me for sessions
12. Explore page with search, infinite scroll, conditions display
13. Settings (avatar, bio, socials, password, role upgrade/downgrade)
14. Legal (Terms, Privacy Policy — GDPR/CCPA/BIPA compliant)
15. Security (auth on all routes, ownership verification, pagination limits)

## Next Session TODO
- Fix face recognition on production (S3 URLs vs local)
- Dev/prod deploy pipeline (GitHub Actions or similar)
- Mobile responsiveness pass
- Email notifications (Resend/SES)
- Stripe Connect photographer payouts
- CloudFront CDN for S3 photos

## Demo Accounts
- Photographer: photographer@demo.com / password
- Surfer: surfer@demo.com / password
