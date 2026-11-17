# syntax=docker/dockerfile:1

# Daily-Drift in production (spec 0012): nginx and PHP-FPM, with the queue
# worker and the scheduler supervised by S6 Overlay in the same container.
# Render builds it from render.yaml; see docs/guides/deploy-render.md.
#
# Every stage stays on Debian trixie: pg_dump is copied from the PostgreSQL
# image and runs on the libraries the PHP image already has.

# 1. The PHP packages, without the dev ones. Composer's image has git, so a
#    package GitHub will not send as a zip is cloned instead. If GitHub
#    limits the downloads, a secret file named auth.json on the Render
#    service gives Composer a token (see the deploy guide).
FROM composer:2 AS composer

WORKDIR /app
COPY composer.json composer.lock ./
RUN --mount=type=secret,id=auth_json,dst=/app/auth.json \
    composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts --no-autoloader --ignore-platform-reqs \
    && find vendor -name .git -type d -prune -exec rm -rf {} +

# 2. The app and its autoloader, made on the PHP the app runs on.
FROM serversideup/php:8.4-cli-trixie AS vendor

USER root
ENV COMPOSER_ALLOW_SUPERUSER=1
WORKDIR /var/www/html

COPY . .
COPY --from=composer /app/vendor ./vendor
RUN composer dump-autoload --no-dev --classmap-authoritative --no-interaction

# 3. The front end. Wayfinder writes the route helpers with Artisan while
#    Vite builds, so this stage has Node next to PHP.
FROM vendor AS assets

COPY --from=node:24-trixie-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:24-trixie-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack \
    && corepack enable pnpm

RUN pnpm install --frozen-lockfile && pnpm run build

# 4. The app.
FROM serversideup/php:8.4-fpm-nginx-trixie

ENV PHP_OPCACHE_ENABLE=1 \
    # Migrate and cache the config, routes, views and events on start.
    AUTORUN_ENABLED=true \
    LOG_CHANNEL=stderr \
    # Render reaches the app over IPv4, and an IPv6 listener fails where the
    # kernel has no IPv6.
    NGINX_LISTEN_IP_PROTOCOL=ipv4 \
    # Files are 10 MB at most (spec 0010).
    NGINX_CLIENT_MAX_BODY_SIZE=12M \
    PHP_POST_MAX_SIZE=12M \
    PHP_UPLOAD_MAX_FILE_SIZE=12M

USER root

# pg_dump and pg_restore 17, for db:backup and for restoring a backup.
COPY --from=postgres:17-trixie /usr/lib/postgresql/17/bin/pg_dump /usr/lib/postgresql/17/bin/pg_restore /usr/local/bin/

# The queue worker and the scheduler, next to nginx and PHP-FPM.
COPY --chmod=755 docker/s6/laravel-queue/ /etc/s6-overlay/s6-rc.d/laravel-queue/
COPY --chmod=755 docker/s6/laravel-scheduler/ /etc/s6-overlay/s6-rc.d/laravel-scheduler/
RUN touch /etc/s6-overlay/user-bundles.d/user/contents.d/laravel-queue \
        /etc/s6-overlay/user-bundles.d/user/contents.d/laravel-scheduler \
    # Fail the build, not a backup, if pg_dump cannot run here.
    && pg_dump --version

USER www-data

COPY --chown=www-data:www-data --from=vendor /var/www/html /var/www/html
COPY --chown=www-data:www-data --from=assets /var/www/html/public/build /var/www/html/public/build
