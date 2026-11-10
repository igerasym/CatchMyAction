# AGENTS.md: start here

CatchMyAction (https://catchmyactions.com) is a marketplace for action-sports photos. Photographers upload sessions, and
athletes find themselves (spot, date, selfie search) and buy the full-resolution file. The stack is Next.js 14
(app router), Prisma 5.22 + Postgres 16, Stripe Connect (live), S3 + CloudFront, AWS Rekognition and Resend.

This file is the handoff for coding agents. Read it first, then the doc for the area you are touching.

## Ground rules
- **Never push to `main`.** Work on a branch from the latest `origin/main`, push it, and give the owner the compare URL
  (`https://github.com/igerasym/CatchMyAction/pull/new/<branch>`). The owner merges. A merge to `main` deploys to prod
  automatically within about 10 minutes.
- **Update docs in the same PR** as the change: this file, `docs/INFRA.md`, and the area doc.
- **No secrets** in the repo, in chat, or in logs. Production config lives only in `~/app/.env.production` on the host.
  When the owner adds a secret, have them type it on the host with `read -s`. Check only "set / length / prefix".
- **Do not touch `cafe-manager-cafe-1`** or its images and volumes. It is an unrelated app on the same host.
- **Prod data changes:** take a `pg_dump` into `~/backups` first, use a transaction, and ask the owner before writing.
- **Schema changes:** add a migration with `npm run db:migrate`. Migrations must only add things (no drop or rename in
  the same release). `db push` is disabled.
- Do not leave scratch files, mockups or research dumps in the repo.

## Commands
- `npm test` (vitest), `npm run -s typecheck`. ESLint is not configured. Run both before pushing.
- Prod host: `ssh -i ~/.ssh/kiro-cma-deploy ec2-user@52.39.186.224`. Containers: `app-app-1`, `app-postgres-1`.
- SQL on prod: pipe it through stdin so the quoting survives:
  `printf '%s\n' "select …;" | ssh … "docker exec -i app-postgres-1 sh -c 'psql -U \$POSTGRES_USER -d \$POSTGRES_DB'"`.
  Column names are camelCase and must be double-quoted (`"spotId"`, `"createdAt"`).
- Deploy log: `~/deploy.log`. Build output: `~/deploy-build.log`.

## Where things are documented
| Topic | File |
|---|---|
| Host, AWS, deploy, migrations, backups, payouts, Stripe webhook, Find Me, Feedback, known gaps | `docs/INFRA.md` |
| Spot catalogue, import rules, data fixes | `docs/SPOTS.md` |
| Sea conditions providers and licensing | `docs/CONDITIONS.md` |
| Google sign-in | `docs/GOOGLE_SIGNIN.md` |
| Design tokens and components | `docs/DESIGN_SYSTEM.md` |
| Product plan, ideas (video, Instagram) | `ROADMAP.md` |
| Feature list | `PROGRESS.md` |
| Older audits | `docs/review/` |

## State as of 2026-11-10
- **Payments are live and checked end to end.** The Stripe webhook has been on since 2026-11-10. A real $1.01 purchase
  and a full refund (which revokes access through `Purchase.revokedAt`) were tested on prod. See INFRA → Photographer
  payouts.
- **Fees:** each photographer's first 5 paid sales pay only a card-fee estimate. After that the platform takes 18%.
  Competitors in surf mostly take 0-15%, so whether to lower it is an open question for the owner.
- **Buying still needs a confirmed email on `main`.** The branch `feat/buy-without-verification` removes that and is
  not merged.
- **Email:** Resend works, and mail comes from `noreply@catchmyactions.com`. `FROM_EMAIL` is unset (the code default is
  used). Telegram for feedback is not configured.
- **Google sign-in:** keys are set on prod.
- **Instagram API:** paused at the Meta business-portfolio step. See ROADMAP → "Instagram auto-posting (paused)".

## Open work (rough priority)
1. Close port 3000 in the security group and allow 80 only from Cloudflare. Today anyone can spoof `cf-connecting-ip`
   and bypass every per-IP rate limit.
2. Sales hardening (INFRA → Known gaps):
   - auto-refund or flag a double payment for a photo the buyer already owns;
   - send a receipt email;
   - rate-limit `purchase`, `verify-purchase` and `download`;
   - gate Connect on `capabilities.transfers`;
   - run a reconciliation job for paid sessions that have no `Purchase` row.
3. Pending payouts move only when the photographer opens the dashboard. Add an `account.updated` webhook or a daily job.
4. Terms and Privacy list `legal@` and `privacy@catchmyaction.com`, which is missing the "s", and those mailboxes are not
   verified.
5. The funnel has no analytics. A funnel events table was proposed and is not built.
6. Rate limits and background jobs live in memory, so they reset on every deploy.

## Unmerged branches worth knowing about
- `fix/deploy-cache-prune`: build-cache window cut from 48 h to 12 h, plus this docs refresh. **After it is merged,
  copy the script on the host:** `cp ~/app/deploy/auto-deploy.sh ~/bin/auto-deploy.sh`.
- `feat/buy-without-verification`: lets buyers pay before confirming their email.
- `feat/photographer-payout-status`: an old 10%/first-10 fee experiment, superseded by the current fee rules. Do not
  merge.
- `docs/roadmap-instagram`: its content is already included in `fix/deploy-cache-prune`.
- `feat/hourly-conditions`: local only, never pushed, and conflicts with `main`.

## Gotchas
- Stripe events handled by the old code during a deploy are not retried. Resend them from Stripe → Event deliveries.
- After editing `.env.production`, recreate the app container. A restart does not reread the file. Run
  `cd ~/app && docker-compose -f docker-compose.production.yml up -d app`. The live compose file is
  `docker-compose.production.yml`, not `docker-compose.prod.yml`.
- `Session.location` is free text typed by the photographer. Spot imports re-point `spotId` but never rewrite that label.
- The home page is cached for 60 s (`unstable_cache`), so a data fix shows up after about a minute.
- Home page (since 2026-11-10) has one job, "Find my photos": hero (`components/home/hero.tsx`, the selfie dialog is
  `home/find-photos.tsx` -> `/api/find-me`: pick a place first, then searches the face collections of the sessions within 3 km of it; faces live in one Rekognition collection per spot, see docs/INFRA.md) -> how it works -> latest sessions ->
  photographer band. The old Find Me / Session Log / Discover map sections were removed; the map lives on `/sessions`.
  The red "It's you" box is pure CSS in `globals.css` (`.focus-box`) and must match the hero photo's crop/zoom classes in
  `hero.tsx`; if you change `/hero-bg.jpg` or those classes, update the surfer coordinates there.
- Open-Meteo is free for non-commercial use only. Switch providers before ads or real revenue (see `docs/CONDITIONS.md`).
