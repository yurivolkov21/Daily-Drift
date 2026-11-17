<?php

namespace Tests\Feature\Production;

use App\Console\Commands\BackupDatabase;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Spec 0012: the weekly backup of the PostgreSQL database. pg_dump is
 * faked, so these tests need neither a database nor the binary, and they
 * leave the test database alone.
 */
class BackupDatabaseTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake();
        $this->travelTo('2026-11-22 20:00:00');
    }

    public function test_postgres_is_dumped_to_the_disk(): void
    {
        $this->usePostgres(['host' => 'db.example.test', 'port' => '5432', 'database' => 'drift', 'username' => 'app', 'password' => 's3cret', 'sslmode' => 'require']);
        $this->fakeDump('the dump');

        $this->artisan('db:backup')->assertSuccessful();

        Storage::assertExists('backups/db-2026-11-22-200000.dump');
        $this->assertSame('the dump', Storage::get('backups/db-2026-11-22-200000.dump'));

        Process::assertRan(function (PendingProcess $process) {
            $command = (array) $process->command;

            return $command[0] === 'pg_dump'
                && in_array('--format=custom', $command, true)
                && in_array('--no-owner', $command, true)
                && in_array('--schema=public', $command, true)
                && $process->timeout === BackupDatabase::TIMEOUT
                && $process->environment === [
                    'PGHOST' => 'db.example.test',
                    'PGPORT' => '5432',
                    'PGDATABASE' => 'drift',
                    'PGUSER' => 'app',
                    'PGPASSWORD' => 's3cret',
                    'PGSSLMODE' => 'require',
                ];
        });
    }

    public function test_the_password_never_reaches_the_command_line(): void
    {
        $this->usePostgres(['host' => 'db.example.test', 'password' => 's3cret']);
        $this->fakeDump('the dump');

        $this->artisan('db:backup')->assertSuccessful();

        Process::assertRan(fn (PendingProcess $process) => ! str_contains(implode(' ', (array) $process->command), 's3cret'));
    }

    public function test_a_database_url_is_taken_apart(): void
    {
        $this->usePostgres(['url' => 'postgresql://postgres.abc:p%40ss@pooler.example.test:5432/postgres?sslmode=require']);
        $this->fakeDump('the dump');

        $this->artisan('db:backup')->assertSuccessful();

        Process::assertRan(fn (PendingProcess $process) => $process->environment === [
            'PGHOST' => 'pooler.example.test',
            'PGPORT' => '5432',
            'PGDATABASE' => 'postgres',
            'PGUSER' => 'postgres.abc',
            'PGPASSWORD' => 'p@ss',
            'PGSSLMODE' => 'require',
        ]);
    }

    public function test_the_latest_8_backups_are_kept(): void
    {
        $this->usePostgres();
        $this->fakeDump('the dump');

        foreach (range(1, 9) as $day) {
            Storage::put(sprintf('backups/db-2026-10-%02d-200000.dump', $day), 'old');
        }
        Storage::put('backups/notes.txt', 'kept');

        $this->artisan('db:backup')->assertSuccessful();

        $backups = array_values(array_filter(Storage::files('backups'), fn (string $file) => str_ends_with($file, '.dump')));

        $this->assertSame([
            'backups/db-2026-10-03-200000.dump',
            'backups/db-2026-10-04-200000.dump',
            'backups/db-2026-10-05-200000.dump',
            'backups/db-2026-10-06-200000.dump',
            'backups/db-2026-10-07-200000.dump',
            'backups/db-2026-10-08-200000.dump',
            'backups/db-2026-10-09-200000.dump',
            'backups/db-2026-11-22-200000.dump',
        ], $backups);
        Storage::assertExists('backups/notes.txt');
    }

    public function test_a_failed_dump_writes_nothing_and_fails(): void
    {
        $this->usePostgres();
        Process::fake(fn () => Process::result(errorOutput: 'connection refused', exitCode: 1));
        Storage::put('backups/db-2026-10-01-200000.dump', 'old');

        $this->artisan('db:backup')
            ->expectsOutputToContain('connection refused')
            ->assertFailed();

        $this->assertSame(['backups/db-2026-10-01-200000.dump'], Storage::files('backups'));
    }

    public function test_sqlite_has_nothing_to_back_up(): void
    {
        config(['database.default' => 'sqlite']);
        Process::fake();

        $this->artisan('db:backup')
            ->expectsOutputToContain('Nothing to back up')
            ->assertSuccessful();

        Process::assertNothingRan();
        $this->assertSame([], Storage::allFiles());
    }

    public function test_the_scheduler_backs_up_every_sunday_at_3_in_vietnam_on_one_server(): void
    {
        $events = collect(app(Schedule::class)->events());

        $backup = $events->first(fn (Event $event) => str_contains((string) $event->command, 'db:backup'));

        $this->assertNotNull($backup);
        $this->assertSame('0 3 * * 0', $backup->expression);
        $this->assertSame('Asia/Ho_Chi_Minh', $backup->timezone);
        $this->assertTrue($backup->onOneServer);

        $this->assertTrue($events->every(fn (Event $event) => $event->onOneServer));
    }

    /**
     * Point the default connection at a PostgreSQL database that is never
     * reached.
     *
     * @param  array<string, string>  $settings
     */
    private function usePostgres(array $settings = []): void
    {
        config([
            'database.connections.backup_test' => ['driver' => 'pgsql', 'search_path' => 'public', ...$settings],
            'database.default' => 'backup_test',
        ]);
    }

    /**
     * pg_dump writes the given text to the file it is asked for.
     */
    private function fakeDump(string $contents): void
    {
        Process::fake(function (PendingProcess $process) use ($contents) {
            foreach ((array) $process->command as $argument) {
                if (str_starts_with($argument, '--file=')) {
                    file_put_contents(substr($argument, strlen('--file=')), $contents);
                }
            }

            return Process::result();
        });
    }
}
