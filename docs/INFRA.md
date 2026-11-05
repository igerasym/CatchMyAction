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
- Off-host copy: if `~/bin/backup-offsite.sh` exists it is called with the dump path (owner-installed, uploads to
  `s3://catchmyaction-originals-us-west-2/_backups/db/`).
- Restore: `zcat <dump> | docker exec -i app-postgres-1 psql -U catchmyaction -d catchmyaction`.

## Known gaps (see `docs/review/REFACTORING_PLAN.md`)
- ~~Disk ~90% full~~ — dangling images pruned 2026-11-03 (90% → 54%).
- ~~Postgres published on 0.0.0.0:5432~~ — bound to `127.0.0.1:5432` 2026-11-03.
- ~~Leaked DB password / guessable NEXTAUTH_SECRET~~ — both rotated 2026-11-03 (all sessions logged out).
  Pre-rotation config copies `~/app/*.bak.20261103132327` contain the old values → delete after verifying.
- Root user has an access key → delete it.
- No EBS snapshots / DLM policy yet.
- SG exposes 22 and 3000 to `0.0.0.0/0`.
- Cloudflare → origin is plain HTTP (no 443 on nginx).
