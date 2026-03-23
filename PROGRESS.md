# CatchMyActions — Development Progress

## Platform
Action sports photo marketplace. Photographers upload sessions, athletes find themselves, buy HD photos.

**Live:** https://catchmyactions.com
**Tech Stack:** Next.js 14, PostgreSQL, Prisma, Tailwind CSS, Sharp, Stripe Connect, AWS (EC2 + S3 + SES), face-api.js
**Repo:** git@github.com:igerasym/CatchMyAction.git

---

## Infrastructure (Production)
- EC2 t4g.micro (ARM64, 1GB RAM + 1GB swap) in us-west-2
- PostgreSQL 16 in Docker on EC2
- S3: catchmyaction-originals (private) + catchmyaction-previews (public)
- Nginx reverse proxy (port 80 → 3000)
- Cloudflare DNS + SSL + CDN (catchmyactions.com)
- IAM role for EC2 → S3 + SES access (no hardcoded keys)
- Docker Compose for app + PostgreSQL
- SES configured with domain verification + DKIM (sandbox mode, production access requested)

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
9. Session creation with sport type selector (surf, kite, windsurf, skate, mtb, moto, ski, snowboard, other)
10. Auto marine conditions for water sports (Open-Meteo API — wave height, period, direction, wind, water temp)
11. Photo upload with validation (25MB max, 1200px min side, 5:1 aspect ratio, magic bytes, SHA-256 dedup, EXIF extraction)
12. Watermarked previews + thumbnails (Sharp)
13. S3 storage (originals private bucket, previews public bucket)
14. QR codes + Notify Me for sessions
15. Stripe Connect Express (80/20 split — photographer/platform, requires email verification)

### Athlete Features
16. Explore page with search, infinite scroll, conditions display
17. Face recognition "Find Me" (face-api.js, browser-only, privacy-first, BETA)
18. Photo claims ("That's me") with persistent DB storage
19. My Actions page (purchased + claimed photos, buy/download/unclaim)
20. Single + bulk photo purchase via Stripe Checkout
21. Auto-download after purchase redirect

### Location System
22. 231 hardcoded action sports spots with verified coordinates (surf, kite, windsurf, skate parks, MTB/bike parks, ski resorts, moto tracks, major cities)
23. Dynamic autocomplete API — searches spots database + user-created locations from DB
24. Nominatim geocoding fallback for custom locations
25. Interactive world map with active session markers + background spot dots

### UI/UX
26. Sport-agnostic copy throughout ("Action Spots", "Athletes" instead of surf-specific)
27. Custom logo (camera focus brackets + play triangle, ocean-blue gradient)
28. SVG favicon matching logo design
29. Mobile responsive (navbar, hero, dashboard, upload, manage photos, lightbox)
30. Lightbox with prev/next navigation + keyboard support + photo counter
31. Cart checkboxes + sticky purchase bar on session gallery
32. Verification toast banner on homepage
33. Settings (avatar, bio, socials, password change, role upgrade/downgrade, Stripe Connect, email verification status)
34. Legal pages (Terms, Privacy Policy — GDPR/CCPA/BIPA compliant)

### Date Validation
35. Date inputs limited to last year through +7 days (upload, edit, search)
36. Server-side validation matches client constraints

## Deploy Commands
```bash
# Deploy to production
ssh -i catchmyaction-key.pem ec2-user@35.86.237.14 "cd ~/app && git checkout -- . && git pull && docker-compose -f docker-compose.production.yml build app 2>&1 | tail -5 && docker-compose -f docker-compose.production.yml up -d 2>&1 | tail -3"

# DB migration on prod
ssh -i catchmyaction-key.pem ec2-user@35.86.237.14 'docker run --rm --network app_default -v $(pwd)/app/prisma:/app/prisma -w /app -e DATABASE_URL="postgresql://catchmyaction:CatchMyAction2026!@postgres:5432/catchmyaction?schema=public" node:20-alpine sh -c "apk add --no-cache openssl && npm install -g prisma@5.22.0 && prisma db push --schema /app/prisma/schema.prisma" 2>&1 | tail -10'

# Drop user on prod
ssh -i catchmyaction-key.pem ec2-user@35.86.237.14 'docker run --rm --network app_default -e PGPASSWORD=CatchMyAction2026! postgres:16-alpine psql -h postgres -U catchmyaction -d catchmyaction -c "DELETE FROM \"User\" WHERE email = '\''xxx'\'';"'
```

## Next Steps

### High Priority
- [ ] Fix face recognition on production (S3 CORS for face-api.js model files)
- [ ] SES production access (currently sandbox — can only send to verified emails)
- [ ] SEO: sitemap.xml, robots.txt, Open Graph meta tags, submit to Google Search Console
- [ ] CloudFront CDN for S3 photo delivery (faster loads, lower S3 costs)

### Medium Priority
- [ ] CI/CD pipeline (GitHub Actions: test → build → deploy)
- [ ] Photo download watermark removal (serve original from private S3 on verified purchase)
- [ ] Photographer earnings dashboard (total sales, per-session breakdown)
- [ ] Session analytics (views, claims, conversion rate)
- [ ] Email notifications when photos are uploaded to a session (notify-me subscribers)

### Nice to Have
- [ ] Social login (Google, Apple)
- [ ] Photo editing (crop, filters) before purchase
- [ ] Bulk upload progress with retry for failed photos
- [ ] PWA support (installable on mobile)
- [ ] Multi-language support
- [ ] Photographer public profile page improvements
- [ ] Admin dashboard for platform management

## Demo Accounts
- Photographer: photographer@demo.com / password
- Athlete: surfer@demo.com / password
