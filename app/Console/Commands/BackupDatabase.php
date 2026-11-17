<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\ConfigurationUrlParser;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

/**
 * Spec 0012: Supabase's free plan keeps no backups, so the app dumps its
 * PostgreSQL database to the default disk (the bucket in production) and
 * keeps the latest dumps. Restoring one is in docs/guides/deploy-render.md.
 */
#[Signature('db:backup {--keep=8 : How many backups to keep}')]
#[Description('Back up the PostgreSQL database to the default disk, under backups/')]
class BackupDatabase extends Command
{
    public const string DIRECTORY = 'backups';

    /** The name of a backup made by this command, in UTC. */
    public const string PATTERN = '/^db-\d{4}-\d{2}-\d{2}-\d{6}\.dump$/';

    /** pg_dump may take this many seconds. */
    public const int TIMEOUT = 1800;

    public function handle(): int
    {
        $connection = $this->connection();

        if ($connection === null) {
            $this->components->info('Nothing to back up: only a PostgreSQL database is backed up.');

            return self::SUCCESS;
        }

        $path = self::DIRECTORY.'/db-'.now()->utc()->format('Y-m-d-His').'.dump';
        $dump = tempnam(sys_get_temp_dir(), 'db-backup-');

        if ($dump === false) {
            return $this->failWith('No temporary file for the dump.');
        }

        try {
            $result = Process::timeout(self::TIMEOUT)
                ->env($this->environment($connection))
                ->run([
                    'pg_dump',
                    '--format=custom',
                    '--no-owner',
                    '--no-privileges',
                    ...array_map(fn (string $schema) => '--schema='.$schema, $this->schemas($connection)),
                    '--file='.$dump,
                ]);

            if ($result->failed()) {
                return $this->failWith('pg_dump failed: '.trim($result->errorOutput()));
            }

            if (! $this->store($dump, $path)) {
                return $this->failWith("The backup could not be written to {$path}.");
            }
        } finally {
            @unlink($dump);
        }

        $removed = $this->prune(max(1, (int) $this->option('keep')));

        Log::info('Database backed up.', ['path' => $path, 'size' => Storage::size($path), 'removed' => $removed]);
        $this->components->info("Backed up to {$path}.".($removed === [] ? '' : ' Removed '.count($removed).' older ones.'));

        return self::SUCCESS;
    }

    /**
     * The default connection's settings, with a DB_URL taken apart, or null
     * when it is not PostgreSQL.
     *
     * @return array<string, mixed>|null
     */
    private function connection(): ?array
    {
        $settings = config('database.connections.'.config('database.default'));

        if (! is_array($settings)) {
            return null;
        }

        $settings = (new ConfigurationUrlParser)->parseConfiguration($settings);

        return ($settings['driver'] ?? null) === 'pgsql' ? $settings : null;
    }

    /**
     * pg_dump reads the connection from libpq's variables, which keeps the
     * password out of the process list.
     *
     * @param  array<string, mixed>  $connection
     * @return array<string, string>
     */
    private function environment(array $connection): array
    {
        return array_filter([
            'PGHOST' => $this->text($connection['host'] ?? null),
            'PGPORT' => $this->text($connection['port'] ?? null),
            'PGDATABASE' => $this->text($connection['database'] ?? null),
            'PGUSER' => $this->text($connection['username'] ?? null),
            'PGPASSWORD' => $this->text($connection['password'] ?? null),
            'PGSSLMODE' => $this->text($connection['sslmode'] ?? null),
        ], fn (string $value) => $value !== '');
    }

    /**
     * Only the app's own schemas: on Supabase the database also holds
     * Supabase's, which a restore must not touch.
     *
     * @param  array<string, mixed>  $connection
     * @return list<string>
     */
    private function schemas(array $connection): array
    {
        $path = $connection['search_path'] ?? $connection['schema'] ?? 'public';
        $names = is_array($path) ? $path : explode(',', $this->text($path));

        $schemas = array_values(array_filter(
            array_map(fn (mixed $name) => trim($this->text($name), " \t\"'"), $names),
            fn (string $name) => $name !== '' && $name !== '$user',
        ));

        return $schemas === [] ? ['public'] : $schemas;
    }

    /**
     * Delete all but the latest backups made by this command.
     *
     * @return list<string>
     */
    private function prune(int $keep): array
    {
        $backups = array_values(array_filter(
            Storage::files(self::DIRECTORY),
            fn (string $file) => preg_match(self::PATTERN, basename($file)) === 1,
        ));

        sort($backups);

        $old = array_slice($backups, 0, max(0, count($backups) - $keep));

        if ($old !== []) {
            Storage::delete($old);
        }

        return $old;
    }

    /**
     * Copy the dump to the disk as a stream, so a large one is never held
     * in memory.
     */
    private function store(string $dump, string $path): bool
    {
        $stream = fopen($dump, 'r');

        if ($stream === false) {
            return false;
        }

        try {
            return Storage::writeStream($path, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
    }

    private function failWith(string $message): int
    {
        Log::error('Database backup failed.', ['reason' => $message]);
        $this->components->error($message);

        return self::FAILURE;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? (string) $value : '';
    }
}
