# Docker

The production image (see `Dockerfile`) runs nginx and PHP-FPM under [S6 Overlay](https://github.com/just-containers/s6-overlay), and the two services in `s6/` next to them:

- `laravel-queue`: `php artisan queue:work`;
- `laravel-scheduler`: `php artisan schedule:work`.

Each starts once PHP-FPM is up, which is after the image's start-up steps have run the migrations. S6 restarts a service that stops. See [spec 0012](../docs/spec/0012-production-readiness.md).
