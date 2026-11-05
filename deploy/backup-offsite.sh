#!/bin/bash
# Off-host copy of a nightly DB dump. Called by ~/bin/backup-db.sh with the dump path.
# Installed on the EC2 host as ~/bin/backup-offsite.sh. Uses the instance role (no keys on disk), which may only
# PutObject into s3://$BUCKET/db/* — it cannot read, list or delete, so a compromised box can't wipe the copies.
# Retention is the bucket's lifecycle rule (see deploy/backup-bucket-lifecycle.json), not this script.
set -euo pipefail

DUMP=${1:?usage: backup-offsite.sh <dump.sql.gz>}
BUCKET=${BACKUP_BUCKET:-catchmyaction-db-backups-923917779583}

aws s3 cp "$DUMP" "s3://$BUCKET/db/$(basename "$DUMP")" \
  --region us-west-2 --sse AES256 --only-show-errors
echo "offsite ok s3://$BUCKET/db/$(basename "$DUMP")"
