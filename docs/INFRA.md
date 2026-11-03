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

## Known gaps (see `docs/review/REFACTORING_PLAN.md`)
- Root user has an access key → delete it.
- No backups (no EBS snapshots / DLM, no `pg_dump`).
- SG exposes 22 and 3000 to `0.0.0.0/0`; Postgres container publishes `0.0.0.0:5432` (blocked only by SG).
- Cloudflare → origin is plain HTTP (no 443 on nginx).
- The prod DB password was committed in git history before 2026-11-03 → rotate it on the server.
