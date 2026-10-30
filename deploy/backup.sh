#!/usr/bin/env bash
#
# Copies the SQLite database into /var/www/daily-drift/backups. Cron runs it
# every night ("daily") and release.sh runs it before migrating ("pre-deploy").
# It keeps the newest 14 nightly and 10 pre-deploy copies.

set -euo pipefail

readonly APP_DIR=/var/www/daily-drift
readonly DATABASE=$APP_DIR/shared/database/database.sqlite
readonly BACKUP_DIR=$APP_DIR/backups

kind=${1:-daily}

case $kind in
    daily) keep=14 ;;
    pre-deploy) keep=10 ;;
    *)
        echo "Usage: $0 [daily|pre-deploy]" >&2
        exit 1
        ;;
esac

# The first release starts from an empty file.
if [[ ! -s $DATABASE ]]; then
    exit 0
fi

file=$BACKUP_DIR/database-$kind-$(date -u +%Y%m%d-%H%M%S).sqlite

sqlite3 "$DATABASE" ".backup '$file'"
gzip "$file"

find "$BACKUP_DIR" -maxdepth 1 -name "database-$kind-*.sqlite.gz" -printf '%f\n' \
    | sort -r \
    | tail -n +$((keep + 1)) \
    | while read -r old_backup; do
        rm -f "$BACKUP_DIR/$old_backup"
    done
