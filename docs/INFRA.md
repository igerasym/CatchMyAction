# Infrastructure & Access

Production runs on a single EC2 host. This file documents what exists and who/what can access it.
**No secrets belong in this file or anywhere in the repo.**

## AWS account
- Account: `923917779583`, region `us-west-2`
- EC2: `i-08cce0f2e60886aa0` (t4g.small, 1.8 GB RAM + 4 GB swap, 20 GB gp3, unencrypted), Elastic IP `52.39.186.224`
- Security group: `catchmyaction-sg`
- Instance role: `CatchMyActions-EC2-Role` (S3 on the two buckets, SES send, Rekognition/Textract/Bedrock full — to be narrowed)
- S3: `catchmyaction-originals-us-west-2` (private, BPA on), `catchmyaction-previews-us-west-2` (public-read policy)
- CloudFront: `ED1FIIGST6SHG` → `d3l9l6cbrqgaa0.cloudfront.net` (origin = previews bucket)
- Rekognition: one face collection per session (`session-<sessionId>`)

## Host layout (EC2)
- `~/app` — git checkout of this repo + **untracked** `.env.production` and `docker-compose.production.yml`
- Containers: `app-app-1` (Next.js), `app-postgres-1` (Postgres 16, volume `app_pgdata`)
- nginx on :80 → app :3000; Cloudflare in front (DNS + TLS)
- **`cafe-manager-cafe-1` (port 8000) is a separate, unrelated app on the same host. Do not touch it** —
  no restarts, no compose changes, no prune commands that could affect its containers/images/volumes.

## IAM users

### `kiro-agent` (created 2026-11-03)
- **Purpose:** programmatic access for the Kiro AI coding agent to audit and later help operate
  CatchMyAction infrastructure (security review, deploy checks, server diagnostics).
- **Permissions:**
  - `ReadOnlyAccess` (AWS managed)
  - inline `kiro-extra`: `ec2-instance-connect:SendSSHPublicKey` on `i-08cce0f2e60886aa0` as `ec2-user`
    (short-lived SSH via EC2 Instance Connect, no `.pem` needed), `rekognition:DescribeCollection` / `ListFaces`
- **No console access, no write permissions.** Any write/destructive change is done by the owner
  or after explicit approval, by temporarily granting a narrowly scoped policy.
- **Credentials:** a single access key, stored only in the owner's local AWS CLI profile `catchmyaction`.
  Never commit it, never paste it in chat.
- **Rotation / removal:** IAM → Users → kiro-agent → Security credentials → deactivate/delete the key.
  Deleting the user removes all agent access.

## Deploy (current manual process)
```bash
ssh ec2-user@52.39.186.224
cd ~/app
docker tag app-app:latest app-app:rollback-$(git rev-parse --short HEAD)   # rollback point
git pull --ff-only origin main
docker-compose -f docker-compose.production.yml build app                  # ~6-7 min on t4g.small
docker-compose -f docker-compose.production.yml up -d --no-deps app        # only app; never touch postgres/cafe-manager
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```
Rollback: `docker tag app-app:rollback-<sha> app-app:latest && docker-compose -f docker-compose.production.yml up -d --no-deps app`.

### Build-time (public) config
`NEXT_PUBLIC_*` values used in client code are inlined during `next build`, and `.env.*` is excluded from the
Docker context, so they are passed as build args: `~/app/.env` (compose interpolation, chmod 600) holds
`NEXT_PUBLIC_CARTO_KEY=...`, and `docker-compose.production.yml` → `app.build.args.NEXT_PUBLIC_CARTO_KEY: ${NEXT_PUBLIC_CARTO_KEY}`.
- CARTO basemaps key: https://carto.com/basemaps/apikey (free commercial tier up to 1M tile requests/month;
  keep it restricted to `catchmyactions.com` in the CARTO dashboard). Without it maps show "API KEY REQUIRED".

### Deploy log
| Date | Commit | By | Notes |
|------|--------|----|-------|
| 2026-11-03 | `b5726db` (PR #1) | kiro-agent | Phase 0 hotfixes. First deploy since 2026-03-28. Rollback image `app-app:rollback-757cc47`. |
| 2026-11-03 | `acb152e` (PR #2) | kiro-agent | CARTO basemaps key (maps showed "API KEY REQUIRED"). |
| 2026-11-03 | `2d8f5d2` (PR #3) | kiro-agent | Homepage redesign (Viewfinder) + EXIF orientation fix. |
| 2026-11-03 | `186e3e8` (PR #4) | kiro-agent | Design system on all pages. From here on: auto-deploy (below). |

## Auto-deploy (since 2026-11-03)
Every merge to `main` goes live automatically within ~5 min + build time (~6 min on t4g.small).
- Script: `deploy/auto-deploy.sh` (installed on the host as `~/bin/auto-deploy.sh`), run by systemd **user** timer
  `cma-autodeploy.timer` every 5 min.
- Flow: `git fetch` → if `origin/main` moved, build `app-app:candidate` from a separate checkout `~/app-build`
  (live tree untouched) → tag current image `rollback-<sha>` → swap to candidate, restart **app only** → health check
  `/` and `/api/sessions` (90 s) → on failure roll back automatically. A commit that fails build/health is remembered
  in `~/.deploy-failed-sha` and not retried until a newer commit lands.
- Log: `~/deploy.log` (one line per deploy), build output `~/deploy-build.log`.
  Status: `systemctl --user list-timers cma-autodeploy.timer`, `tail ~/deploy.log`.
- Pause: `systemctl --user stop cma-autodeploy.timer` · resume: `start`.
- **DB migrations (since 2026-11-05):** after the build and before the swap the script runs
  `prisma migrate deploy` from the candidate image. If the commit adds migrations it first dumps the DB to
  `~/backups/pre-migrate-<sha>-<ts>.sql.gz`. A failed migration leaves prod on the old image (logged as
  `MIGRATION FAILED`).
- **Disk guard (since 2026-11-07):** the Docker build cache is not covered by `docker image prune` and grew to 19.5 GB,
  leaving 8 MB free. Before building, the script now checks for 3 GB free; if short it runs `docker builder prune -af`
  and, if that is still not enough, logs `not deploying … will retry next tick` and exits **without** marking the commit
  failed. After a successful deploy it drops build cache older than 48 h. `docker builder prune` only removes build
  cache (not containers, images or volumes), so it does not touch `cafe-manager`; its next build just starts colder.
  Do not use `--max-used-space` here: the host's buildkit is older than 0.17 and rejects it.
- Not covered: changes to the untracked prod config (`.env.production`, `docker-compose.production.yml`, `.env`).

## Schema changes (migrations)
- `prisma db push` is retired (`npm run db:push` refuses). Change `schema.prisma`, then
  `npm run db:migrate -- --name <what>` against a local/dev DB and commit the generated `prisma/migrations/<ts>_<what>/`.
- **Expand-only per release:** add tables/nullable columns/indexes; never drop or rename something the currently
  deployed code still reads. Remove it in a later PR once no code uses it. This keeps the old container working
  during the swap and makes image rollback safe without a schema rollback.
- CI (`.github/workflows/ci.yml`) applies all migrations to an empty Postgres and fails if the result differs from
  `schema.prisma`, so a schema edit without a migration can't reach `main` green.
- Baseline `20261105000000_baseline` = the schema as it was on prod on 2026-11-05. Prod was marked as already having
  it (`prisma migrate resolve --applied 20261105000000_baseline`) — never run it there.
- If the update script itself changes in git, reinstall it: `git -C ~/app show origin/main:deploy/auto-deploy.sh > ~/bin/auto-deploy.sh`.

## Agent SSH access
- Durable agent key (since 2026-11-05): `~/.ssh/kiro-cma-deploy` on the owner's Mac, public key comment
  `kiro-cma-deploy` in `~ec2-user/.ssh/authorized_keys`. Survives agent sessions (scratch-dir keys did not).
  Use: `ssh -i ~/.ssh/kiro-cma-deploy ec2-user@52.39.186.224`.
- Revoke: `sed -i '/kiro-cma-deploy/d' ~/.ssh/authorized_keys` on the host.

## Backups
- `~/bin/backup-db.sh`: `pg_dump` → `~/backups/catchmyaction-<ts>.sql.gz`, kept 14 days.
- Runs daily 03:00 UTC via systemd **user** timer `cma-backup.timer` (linger enabled for `ec2-user`).
  Check: `systemctl --user list-timers`; logs: `journalctl --user -u cma-backup`.
- Off-host copy: `~/bin/backup-offsite.sh` (= `deploy/backup-offsite.sh`) is called with the dump path and uploads to
  the dedicated private bucket `catchmyaction-db-backups-923917779583` (us-west-2): Block Public Access, SSE-S3,
  versioning, TLS-only bucket policy, lifecycle 35 days (+30 for overwritten versions).
  The instance role `CatchMyActions-EC2-Role` has inline policy `db-backup-write` = `s3:PutObject` on `db/*` only
  (no read/list/delete — a compromised host can't destroy the off-site copies).
  Restore from S3 (owner, from the Mac): `aws s3 cp s3://catchmyaction-db-backups-923917779583/db/<file> . --profile catchmyaction`.
- Restore: `zcat <dump> | docker exec -i app-postgres-1 psql -U catchmyaction -d catchmyaction`.

## Known gaps (see `docs/review/REFACTORING_PLAN.md`)
- ~~Disk ~90% full~~ — dangling images pruned 2026-11-03 (90% → 54%). Filled to 100% again on 2026-11-07 from 19.5 GB
  of build cache; cleared (100% → 53%) and now guarded by the auto-deploy script (see above).
- `/var/log` is ~2 GB on the host; worth capping (journald / docker log rotation) before it matters.
- ~~Postgres published on 0.0.0.0:5432~~ — bound to `127.0.0.1:5432` 2026-11-03.
- ~~Leaked DB password / guessable NEXTAUTH_SECRET~~ — both rotated 2026-11-03 (all sessions logged out).
  Pre-rotation config copies `~/app/*.bak.20261103132327` contain the old values → delete after verifying.
- Root user has an access key → delete it.
- No EBS snapshots / DLM policy yet.
- SG exposes 22 and 3000 to `0.0.0.0/0`. Port 3000 lets anyone reach the app directly, bypassing Cloudflare, and set
  `cf-connecting-ip` / `x-forwarded-for` themselves. That defeats every per-IP rate limit (`clientIp` in
  `src/lib/rate-limit.ts`): anonymous Find Me (paid Rekognition calls), forgot/reset password, photo reports. Fix: close
  3000 in the SG (nginx already proxies to it locally) and allow 80/443 only from Cloudflare's IP ranges. See "Find Me".
- Cloudflare → origin is plain HTTP (no 443 on nginx).

## Photographer payouts

- Checkout uses a Stripe destination charge when the photographer has an active Connect account. The destination is stored in the checkout metadata as `payoutAccount`.
- Fees (all in `src/lib/stripe.ts`, the single source of truth): each photographer's first `FREE_SALES_PER_PHOTOGRAPHER` (5) paid photos are commission-free; after that the platform takes `PLATFORM_FEE_BPS` (18%). "Sold" = `Purchase` rows with `amountInCents > 0` for photos in the photographer's sessions (`countSoldPhotos`), counted when the checkout is created; free photos never use a slot. `feesForItems` gives the per-photo fee, so a bulk checkout can straddle the boundary. `createPhotoCheckout` sets `application_fee_amount` to the sum (omitted when it is 0) and records `feeCents` on each line item's product metadata, `feeCents` (single: that photo; bulk: the sum) and `feeWaived` (ids of commission-free photos) on the session metadata. `fulfillCheckoutSession` stores `photographerShareCents = amount - feeCents`; sessions created before this fall back to `platformFee(amount)`. Card processing fees stay with the platform either way, so a commission-free sale costs the platform Stripe's fee. Two checkouts opened at the same moment near the boundary can both get the same free slot (the count is read at checkout creation, not reserved).
- `fulfillCheckoutSession` records `Purchase.photographerShareCents` and `Purchase.payoutStatus`: `sent` (routed at payment time), `pending` (no active Stripe account, so the platform holds the money) or `null` (rows from before tracking).
- The dashboard Earnings tab and `/api/photographer/earnings` read these fields. Do not recompute the share from a hardcoded percentage.
- Releasing `pending` money: `payOutPending` (`src/lib/payouts.ts`) runs from `GET /api/stripe/connect` when the photographer's account has `charges_enabled`, in the background, up to 50 purchases per run. Each share is sent as `stripe.transfers.create` with `source_transaction` = the original charge, `metadata.purchaseId` and idempotency key `payout-<purchaseId>`, then the purchase becomes `sent`.
- Duplicate protection: before paying, existing transfers to the account are scanned for `metadata.purchaseId` (idempotency keys expire after 24h). `transfer_group` is deliberately not used; Stripe sets it from the charge when `source_transaction` is given.
- `held`: the charge was refunded or disputed, so nothing is sent. It shows as "On hold" in Earnings and needs a human decision. Stripe does not reverse an existing transfer when a charge is refunded; that needs a manual transfer reversal.
- **Testing against Stripe (test mode only):** `test/stripe-sandbox.test.ts` runs `payOutPending` against the real Stripe
  TEST API with an in-memory stand-in for the database. It is skipped unless you opt in and refuses a live key:
  `STRIPE_TEST_KEY=sk_test_… STRIPE_TEST_ACCOUNT=acct_… npx vitest run test/stripe-sandbox.test.ts`.
  `STRIPE_TEST_ACCOUNT` is a TEST-mode connected account with the `transfers` capability active (set `STRIPE_TEST_CURRENCY`
  to the platform's currency if it is not USD). Never put these keys in the repo or in chat.
- **Production runs a LIVE key** (`sk_live_…`), so there is no test mode on prod. As of 2026-11-08 `STRIPE_WEBHOOK_SECRET`
  is defined but EMPTY in the container, so `/api/webhooks/stripe` rejects every call and a purchase is recorded only
  when the buyer returns to the site after paying (`verify-purchase` / `bulk-verify`). A buyer who closes the tab after
  paying would be charged with no purchase row. No paid purchase exists yet (all 4 purchases are free). Before the first
  real sale: add the endpoint `https://<domain>/api/webhooks/stripe` in the Stripe dashboard (events
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`) and put its signing secret in `.env.production`.
- Known limits: Stripe only supports separate-charges-and-transfers between the US, Canada, UK, EEA and Switzerland (other regions need the same region as the platform), so a transfer to a photographer elsewhere fails, is logged, and stays `pending` until the next dashboard load.

### Payout and fee risks (as of 2026-11-08)

- **Commission-free sales cost the platform money.** With destination charges the platform pays Stripe's card fee.
  On a commission-free sale there is no application fee to cover it, so each of the first 5 sales per photographer is a
  loss of roughly Stripe's fee (about $0.59 on a $10 photo at standard US pricing of 2.9% + $0.30; check the account's
  real pricing). Small prices make it relatively worse. Change `FREE_SALES_PER_PHOTOGRAPHER` in `src/lib/stripe.ts` to
  adjust, and update the copy in the guide, dashboard and settings, which repeat "5" and "82%" as text.
- **Race at the free-sales boundary.** The sold count is read when a checkout is created and no slot is reserved. Two
  checkouts opened at the same time, or one opened before an earlier one is paid, can both get the last free slot.
  Worst case: a few extra commission-free sales. The photographer never gets less than promised. A real fix needs a
  reservation table; not done.
- **Not verified against real Stripe:**
  - that a destination charge with `transfer_data` and no `application_fee_amount` is accepted;
  - that a later transfer of 100% of a charge (`source_transaction`, waived fee on a `pending` sale) succeeds when
    the platform balance is low.

  Run `test/stripe-sandbox.test.ts` in test mode with a waived sale before the first real one.
- **Pending money moves only when the photographer opens the app.** `payOutPending` has no webhook or cron trigger:
  it runs on `GET /api/stripe/connect` (dashboard and settings load). A photographer who connects Stripe and never comes
  back is not paid. Fix later with an `account.updated` webhook or a daily job. The guide says "the next time you open
  your dashboard", which matches this.
- **Copy depends on this behaviour.** The guide "How you get paid" section, dashboard Stripe nudge and settings Payouts
  text describe the rules above. Change them together.

## Find Me (selfie face search)

- Since 2026-11-08 anyone can search a **published** session without an account (`src/app/api/sessions/[id]/find-me/route.ts`);
  drafts stay owner-only. Sign-in is needed only to buy, download or save matches ("That's me" is kept in
  `sessionStorage` and claimed after login, `src/lib/find-me-pending.ts`). Explicit consent (`consent=1`) is still required.
- Every search is a paid Rekognition `SearchFacesByImage` call. Limits (`src/lib/find-me-limits.ts`), per hour:
  15 per account when signed in, 8 per IP when anonymous, 30 per IP for everyone.

### Risks

- **Rate limits are in memory.** They reset on every deploy or restart and are not shared between processes. Fine for
  one container; move to Redis or the database before scaling out.
- **Per-IP limits trust client headers.** `clientIp` reads `cf-connecting-ip`, then `x-real-ip`, then `x-forwarded-for`.
  Behind Cloudflare that is reliable. Anyone who reaches the origin directly (port 3000 is open, see Known gaps) can fake
  the header and run unlimited paid searches. Close the origin to everything except Cloudflare.
- **No global spend cap.** Many IPs (or a spoofed header, above) can still run up the Rekognition bill. Consider a daily
  cap on anonymous searches across all IPs and a CloudWatch billing alarm on Rekognition.
- **Privacy.** Anonymous search lets someone look for a specific person's face in a session. Gallery photos are already
  public, the search is per session, and the selfie is not stored, so nothing new is exposed, but it is now faster to find
  one person. Keep the consent step, and revisit if sessions ever become non-public.

## Photo uploads

Both upload screens use `useUploadQueue` (`src/hooks/use-upload-queue.ts`) on top of `uploadPhoto` (`src/lib/upload-client.ts`): 3 files at a time, up to 3 retries for network errors, 429 and 5xx, a retry button for failed files, and a warning when the tab is closed mid-upload. A 409 duplicate on a retry counts as success because the first attempt reached the server.
