#!/bin/bash
# CatchMyAction auto-deploy: poll origin/main, build in a separate checkout, migrate DB, swap, health-check,
# auto-rollback.
# Installed on the EC2 host at ~/bin/auto-deploy.sh, run every 5 min by systemd user timer cma-autodeploy.timer.
# Never touches postgres or the unrelated cafe-manager stack.
set -uo pipefail

APP=$HOME/app                      # live checkout (+ untracked .env.production, docker-compose.production.yml, .env)
BUILD=$HOME/app-build              # separate checkout used only for building
COMPOSE="docker-compose -f docker-compose.production.yml"
LOG=$HOME/deploy.log
FAILED=$HOME/.deploy-failed-sha
APP_CONTAINER=app-app-1
DB_CONTAINER=app-postgres-1
BACKUPS=$HOME/backups

log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }

# Cheap "anything to deploy?" check runs WITHOUT the lock (systemd never overlaps two runs of this unit).
cd "$APP" || exit 1
git fetch -q origin main || { log "fetch failed"; exit 1; }
LIVE=$(git rev-parse HEAD)
TARGET=$(git rev-parse origin/main)
[ "$LIVE" = "$TARGET" ] && exit 0
[ -f "$FAILED" ] && [ "$(cat "$FAILED")" = "$TARGET" ] && exit 0   # already failed this commit; wait for a new one

# Lock shared with ~/bin/cafe-auto-deploy.sh: the 2 GB host can't run two docker builds at once. Taken only when
# there is real work, and WAITED for (not `-n`): both timers fire in the same second, and with `-n` on both sides
# one of them lost every tick (2026-11-05: every CatchMyAction deploy silently skipped 20:15-22:56 UTC).
exec 9>"$HOME/.deploy.lock"
flock -w 900 9 || { log "lock busy for 15 min (cafe deploy running?) — retry next tick"; exit 0; }

SHORT_LIVE=${LIVE:0:7}; SHORT_T=${TARGET:0:7}

# 0. Disk guard. A full disk fails the build half-way and stops Postgres from writing (2026-11-07: docker build
#    cache had grown to 19 GB and left 8 MB free). Build cache is regenerable, so free it first. If that is not
#    enough, stop WITHOUT marking the commit as failed, so the next tick retries once there is room.
MIN_FREE_KB=$((3 * 1024 * 1024))
free_kb() { df --output=avail -k / | tail -1 | tr -d ' '; }
if [ "$(free_kb)" -lt "$MIN_FREE_KB" ]; then
  log "low disk ($(( $(free_kb) / 1024 )) MB free) — pruning docker build cache before building $SHORT_T"
  docker builder prune -af >/dev/null 2>&1
  if [ "$(free_kb)" -lt "$MIN_FREE_KB" ]; then
    log "only $(( $(free_kb) / 1024 )) MB free after pruning — not deploying $SHORT_T, will retry next tick"
    exit 0
  fi
fi

log "deploy start $SHORT_LIVE -> $SHORT_T"

# 1. Build the candidate image from a separate checkout (live tree untouched on failure)
[ -d "$BUILD/.git" ] || git clone -q https://github.com/igerasym/CatchMyAction.git "$BUILD"
git -C "$BUILD" fetch -q origin main && git -C "$BUILD" checkout -q --detach "$TARGET" || { log "checkout failed"; exit 1; }
set -a; . "$APP/.env"; set +a      # build-time public config (NEXT_PUBLIC_CARTO_KEY)
if ! docker build -q --build-arg NEXT_PUBLIC_CARTO_KEY="${NEXT_PUBLIC_CARTO_KEY:-}" -t app-app:candidate "$BUILD" >> "$HOME/deploy-build.log" 2>&1; then
  log "BUILD FAILED for $SHORT_T — prod stays on $SHORT_LIVE"
  echo "$TARGET" > "$FAILED"
  exit 1
fi

# 2. Database migrations, run from the candidate image BEFORE the swap. Migrations must be
#    expand-only (add tables/columns, never drop/rename in the same release) so the old code that is
#    still serving keeps working — and so a rollback of the image never needs a schema rollback.
fail_migrate() { log "MIGRATION FAILED for $SHORT_T ($1) — prod stays on $SHORT_LIVE, image not swapped"; echo "$TARGET" > "$FAILED"; exit 1; }
DBURL=$(docker exec "$APP_CONTAINER" printenv DATABASE_URL) || fail_migrate "cannot read DATABASE_URL"
NET=$(docker inspect "$APP_CONTAINER" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
[ -n "$NET" ] || fail_migrate "cannot find app network"
if ! git -C "$BUILD" diff --quiet "$LIVE" "$TARGET" -- prisma/migrations; then
  mkdir -p "$BACKUPS"
  DUMP="$BACKUPS/pre-migrate-$SHORT_T-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
  docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$DUMP" \
    || fail_migrate "pre-migration backup failed"
  log "new migrations in $SHORT_T — backup $DUMP"
fi
DATABASE_URL="$DBURL" docker run --rm --network "$NET" -e DATABASE_URL app-app:candidate \
  node node_modules/prisma/build/index.js migrate deploy >> "$HOME/deploy-build.log" 2>&1 \
  || fail_migrate "prisma migrate deploy"

# 3. Swap: keep a rollback tag, point latest at the candidate, restart app only
docker tag app-app:latest "app-app:rollback-$SHORT_LIVE"
docker tag app-app:candidate app-app:latest
git merge --ff-only -q "$TARGET" || { log "ff-merge failed (local changes on host?)"; }
$COMPOSE up -d --no-deps app >> "$HOME/deploy-build.log" 2>&1

# 4. Health check, auto-rollback on failure
ok=0
for i in $(seq 1 30); do
  h=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || true)
  a=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/sessions?limit=1" || true)
  [ "$h" = 200 ] && [ "$a" = 200 ] && { ok=1; break; }
  sleep 3
done
if [ "$ok" != 1 ]; then
  log "HEALTH FAILED for $SHORT_T (home=$h api=$a) — rolling back to $SHORT_LIVE"
  docker tag "app-app:rollback-$SHORT_LIVE" app-app:latest
  git checkout -q --detach "$LIVE"
  $COMPOSE up -d --no-deps app >> "$HOME/deploy-build.log" 2>&1
  echo "$TARGET" > "$FAILED"
  exit 1
fi
log "deploy OK $SHORT_T"
rm -f "$FAILED"

# 5. Housekeeping: keep the 3 newest rollback tags, drop dangling layers, and drop build cache older than 2 days.
#    `image prune` does not touch build cache, which is what filled the disk; two days of cache keeps back-to-back
#    deploys fast. (--max-used-space would be nicer but needs buildkit 0.17+; this host's is older, and the
#    step 0 guard above clears everything if space still runs low.)
docker images app-app --format '{{.Tag}} {{.CreatedAt}}' | grep '^rollback-' | sort -k2,3 -r | tail -n +4 | awk '{print $1}' \
  | while read -r t; do docker rmi "app-app:$t" >/dev/null 2>&1; done
docker image prune -f >/dev/null 2>&1
docker builder prune -af --filter until=48h >/dev/null 2>&1 || log "build cache prune failed"
