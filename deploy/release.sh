#!/usr/bin/env bash
#
# Puts a release built by the deploy workflow live. The workflow uploads the
# archive, then runs this script on the server as the deploy user:
#
#   ssh deploy@host "bash -s -- /tmp/<release>.tar.gz <release>" < deploy/release.sh
#
# The new release only goes live once its migrations and caches succeed, so a
# failed deploy leaves the running release as it was.

set -euo pipefail

readonly APP_DIR=/var/www/daily-drift
readonly PHP=/usr/bin/php8.4
readonly RELEASES_TO_KEEP=5

# Everything runs from main, so bash has read the whole script before the
# first command can touch stdin, which is where the script arrives from.
main() {
    local archive=$1 release=$2
    local release_dir=$APP_DIR/releases/$release

    echo "==> Unpacking $release"
    mkdir -p "$release_dir"
    tar -xzf "$archive" -C "$release_dir"
    rm -f "$archive"

    ln -sfn "$APP_DIR/shared/.env" "$release_dir/.env"
    rm -rf "$release_dir/storage"
    ln -sfn "$APP_DIR/shared/storage" "$release_dir/storage"

    cd "$release_dir"

    echo "==> Backing up the database"
    deploy/backup.sh pre-deploy

    echo "==> Migrating"
    "$PHP" artisan migrate --force --no-interaction

    echo "==> Caching config, routes, views and events"
    "$PHP" artisan optimize --no-interaction

    echo "==> Switching to $release"
    ln -sfn "$release_dir" "$APP_DIR/current.next"
    mv -Tf "$APP_DIR/current.next" "$APP_DIR/current"

    sudo -n /usr/bin/systemctl reload php8.4-fpm
    sudo -n /usr/bin/systemctl restart daily-drift-reverb daily-drift-queue

    echo "==> Removing old releases"
    find "$APP_DIR/releases" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' \
        | sort -r \
        | tail -n +$((RELEASES_TO_KEEP + 1)) \
        | while read -r old_release; do
            rm -rf "${APP_DIR:?}/releases/$old_release"
        done

    echo "==> $release is live"
}

main "$@"
