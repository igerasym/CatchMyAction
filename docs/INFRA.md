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

## Agent SSH access
- Public key `kiro-agent-deploy` (ed25519, `SHA256:1YndMGkhsqCxN8Q20QbXcU12vyH47+wH1sECP5dElqM`) is in
  `~ec2-user/.ssh/authorized_keys`. Private key lives only in the agent's session scratch dir.
- Revoke: `sed -i '/kiro-agent-deploy/d' ~/.ssh/authorized_keys` on the host.

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
