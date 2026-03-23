# CatchMyActions — Development Progress

## Platform
Action sports photo marketplace. Photographers upload sessions, athletes find themselves, buy HD photos.

**Live:** https://catchmyactions.com
**Tech Stack:** Next.js 14, PostgreSQL, Prisma, Tailwind CSS, Sharp, Stripe Connect, AWS (EC2 + S3 + SES + CloudFront), face-api.js, Lucide Icons
**Repo:** git@github.com:igerasym/CatchMyAction.git

---

## Infrastructure (Production)
- EC2 t4g.micro (ARM64, 1GB RAM + 1GB swap) in us-west-2
- PostgreSQL 16 in Docker on EC2
- S3: catchmyaction-originals (private) + catchmyaction-previews (public)
- CloudFront CDN for photo delivery (d3l9l6cbrqgaa0.cloudfront.net)
- Nginx reverse proxy (port 80 → 3000)
- Cloudflare DNS + SSL + CDN (catchmyactions.com + www)
- IAM role for EC2 → S3 + SES access (no hardcoded keys)
- Docker Compose for app + PostgreSQL
- SES configured with domain verification + DKIM (sandbox mode)

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
8. Photographer dashboard (stats, sessions, photos, sales)
9. Session creation with 20 sport types (surf, kite, windsurf, wakeboard, skate, mtb, moto, ski, snowboard, marathon, triathlon, cycling, climbing, crossfit, parkour, kayak, diving, paragliding, bmx, other)
10. Auto marine conditions for water sports (Open-Meteo API)
11. Photo upload with validation (25MB max, 1200px min, magic bytes, SHA-256 dedup, EXIF extraction)
12. Watermarked previews + thumbnails (Sharp)
13. S3 storage + CloudFront CDN delivery
14. QR codes (modal with copy link + download) + Notify Me for sessions
15. Stripe Connect Express (80/20 split, requires email verification)

### Athlete Features
16. Explore page with search, infinite scroll, conditions display
17. Face recognition "Find Me" (face-api.js, browser-only, privacy-first, BETA)
18. Photo claims ("That's me") with persistent DB storage
19. My Actions page (purchased + claimed photos, buy/download/unclaim)
20. Single + bulk photo purchase via Stripe Checkout
21. Auto-download after purchase redirect

### Location System
22. 320 hardcoded action sports spots with verified coordinates across all sport types
23. Dynamic autocomplete API — searches spots database + user-created locations
24. Nominatim geocoding fallback for custom locations
25. Interactive world map with active session markers + background spot dots

### UI/UX
26. Lucide Icons throughout (no emojis — consistent across all devices)
27. Custom logo + SVG favicon (camera focus brackets + play triangle)
28. Hero: "Find Your Moment" / "Shot on real sessions. Instantly find yourself and own the moment."
29. Mobile responsive (navbar, hero, dashboard, upload, manage photos, lightbox)
30. Lightbox with prev/next navigation + keyboard support + photo counter
31. Cart checkboxes + sticky purchase bar on session gallery
32. Settings (avatar, bio, socials, password, role upgrade/downgrade, Stripe Connect, email verification)
33. Legal pages (Terms, Privacy Policy — GDPR/CCPA/BIPA compliant)

### SEO & Infrastructure
34. Dynamic sitemap.xml (sessions + photographer profiles)
35. robots.txt with proper disallow rules
36. Open Graph + Twitter meta tags (global + per-session with cover photo)
37. Google Search Console verified
38. CloudFront CDN with CORS headers policy
39. www subdomain redirect via Cloudflare

## Deploy Commands
```bash
# Deploy to production
ssh -i catchmyaction-key.pem ec2-user@35.86.237.14 "cd ~/app && git checkout -- . && git pull && docker-compose -f docker-compose.production.yml build app 2>&1 | tail -5 && docker-compose -f docker-compose.production.yml up -d 2>&1 | tail -3"

# DB migration on prod
ssh -i catchmyaction-key.pem ec2-user@35.86.237.14 'docker run --rm --network app_default -v $(pwd)/app/prisma:/app/prisma -w /app -e DATABASE_URL="postgresql://catchmyaction:CatchMyAction2026!@postgres:5432/catchmyaction?schema=public" node:20-alpine sh -c "apk add --no-cache openssl && npm install -g prisma@5.22.0 && prisma db push --schema /app/prisma/schema.prisma" 2>&1 | tail -10'
```

## Next Steps

### High Priority
- [ ] SES production access (currently sandbox — blocks real user emails)
- [ ] Fix face recognition on production (model files loading from CloudFront)
- [ ] Notify-me email notifications when photographer publishes session

### Medium Priority
- [ ] Photographer earnings dashboard (total sales, per-session breakdown, payout history)
- [ ] Session analytics (views, claims, conversion rate)
- [ ] CI/CD pipeline (GitHub Actions: test → build → deploy)
- [ ] Photo download: serve unwatermarked original from private S3 on verified purchase

### Nice to Have
- [ ] Social login (Google, Apple)
- [ ] PWA support (installable on mobile)
- [ ] Multi-language support
- [ ] Admin dashboard for platform management
- [ ] Bulk upload retry for failed photos
- [ ] Photographer public profile improvements

## Demo Accounts
- Photographer: photographer@demo.com / password
- Athlete: surfer@demo.com / password
