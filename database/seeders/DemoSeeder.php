<?php

namespace Database\Seeders;

use App\Actions\Comments\NotifyMentionedPeople;
use App\Actions\Projects\CreateProject;
use App\Actions\Tasks\CreateTask;
use App\Actions\Tasks\MoveTask;
use App\Actions\Teams\CreateTeam;
use App\Enums\Priority;
use App\Enums\TeamRole;
use App\Models\Activity;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Database\Seeder;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Auth;

/**
 * A demo workspace built from Daily-Drift's own history (DemoData).
 *
 * Everything goes through the app's actions and observers, as if each person
 * did it on the day it happened: the clock is set back for every step and the
 * person is signed in. So the history, the dashboard's numbers and charts,
 * My tasks and the notifications read like three weeks of real work, and the
 * dates move with the day the seeder runs.
 */
class DemoSeeder extends Seeder
{
    private CarbonImmutable $now;

    /** @var array<string, User> */
    private array $people = [];

    /** @var array<string, int> */
    private array $labels = [];

    /** @var array<string, array{project: Project, lists: array<string, TaskList>}> */
    private array $projects = [];

    /** @var array<string, Task> */
    private array $tasks = [];

    /** @var array<int, array{at: CarbonImmutable, seq: int, as: string, run: Closure}> */
    private array $timeline = [];

    public function __construct(
        private readonly CreateTeam $createTeam,
        private readonly CreateProject $createProject,
        private readonly CreateTask $createTask,
        private readonly MoveTask $moveTask,
        private readonly NotifyMentionedPeople $notifyMentioned,
    ) {}

    public function run(): void
    {
        $this->now = CarbonImmutable::now();

        $team = $this->setUpTeam();

        foreach (DemoData::projects() as $index => $project) {
            $this->planProject("p{$index}", $team, $project);
        }

        $personal = $this->people['me']->personalTeam();

        if ($personal !== null) {
            $this->planProject('personal', $personal, DemoData::personalProject());
        }

        $this->plan(DemoData::INVITATION['day'], 14, 'me', fn () => TeamInvitation::create([
            'team_id' => $team->id,
            'email' => DemoData::INVITATION['email'],
            'role' => DemoData::INVITATION['role'],
            'invited_by' => $this->people['me']->id,
            'expires_at' => now()->addDays(7),
        ]));

        $this->play();

        // Older notifications have been seen; the last two days stay unread.
        DatabaseNotification::query()
            ->whereNull('read_at')
            ->where('created_at', '<', $this->now->subDays(2))
            ->update(['read_at' => $this->now->subDay()]);

        $this->people['me']->switchTeam($team);
    }

    /**
     * The people (each with a personal team), the shared team and its labels.
     */
    private function setUpTeam(): Team
    {
        $this->travel($this->moment(-26, 9));

        foreach (DemoData::PEOPLE as $key => $person) {
            $this->people[$key] = User::factory()->create([
                'name' => $person['name'],
                'email' => $person['email'],
            ]);
        }

        $this->travel($this->moment(-25, 9));
        Auth::setUser($this->people['me']);

        $team = $this->createTeam->handle($this->people['me'], DemoData::TEAM);

        foreach (DemoData::PEOPLE as $key => $person) {
            if ($person['role'] === TeamRole::Owner->value) {
                continue;
            }

            $team->members()->attach($this->people[$key], ['role' => $person['role']]);
            $this->people[$key]->switchTeam($team);
        }

        foreach (DemoData::LABELS as $key => [$name, $icon]) {
            $this->labels[$key] = $team->labels()->create(['name' => $name, 'icon' => $icon])->id;
        }

        return $team;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function planProject(string $key, Team $team, array $data): void
    {
        $this->plan($data['created'], 8, 'me', function () use ($key, $team, $data) {
            $project = $this->createProject->handle($team, $this->people['me'], [
                'name' => $data['name'],
                'description' => $data['description'],
                'color' => $data['color'],
            ]);

            $this->projects[$key] = [
                'project' => $project,
                'lists' => $project->lists()->get()->keyBy('name')->all(),
            ];
        });

        foreach ($data['tasks'] as $index => $task) {
            $this->planTask("{$key}.{$index}", $key, $index, $task);
        }

        if (isset($data['archived'])) {
            $this->plan($data['archived'], 18, 'me', fn () => $this->projects[$key]['project']->update(['archived_at' => now()]));
        }
    }

    /**
     * A task's life: created, assigned, started, done, talked about.
     *
     * @param  array<string, mixed>  $data
     */
    private function planTask(string $key, string $project, int $index, array $data): void
    {
        $by = $data['by'];
        $who = $data['who'] ?? null;
        $doer = $who ?? $by;
        $shift = $index % 3;
        // A few minutes apart per task, so a day's steps do not share one minute.
        $jitter = ($index % 7) * 7 / 60;

        // Hours keep a day's steps in order: created 9-10, assigned just after,
        // started 10:30-11:15, comments from noon, done from 16:00, each moved
        // by the same few minutes for the task.
        $this->plan($data['created'], 9 + $shift / 3 + $jitter, $by, function () use ($key, $project, $data, $by) {
            $due = isset($data['due']) ? $this->now->startOfDay()->addDays($data['due'])->toDateString() : null;

            $task = $this->createTask->handle($this->list($project, 'To do'), $this->people[$by], $data['title'], $due);

            // Filled in with the task, so the history starts with "created".
            $task->forceFill([
                'description' => $data['description'] ?? null,
                'priority' => Priority::from($data['priority'] ?? 'none'),
            ])->saveQuietly();
            $task->labels()->sync(array_map(fn (string $label) => $this->labels[$label], $data['labels'] ?? []));

            $this->tasks[$key] = $task;
        });

        if ($who !== null) {
            $this->plan($data['created'], 9.25 + $shift / 3 + $jitter, $by, fn () => $this->tasks[$key]->update([
                'assignee_id' => $this->people[$who]->id,
            ]));
        }

        if (isset($data['started'])) {
            $this->plan($data['started'], 10.5 + ($index % 4) / 4 + $jitter, $doer, fn () => $this->moveTask->handle(
                $this->tasks[$key]->refresh(),
                $this->list($project, 'In progress'),
                PHP_INT_MAX,
            ));
        }

        foreach ($data['comments'] ?? [] as $number => $comment) {
            [$author, $day, $body] = $comment;
            $mentions = $comment[3] ?? [];

            $this->plan($day, 12 + $number + $shift / 3 + $jitter, $author, function () use ($key, $author, $body, $mentions) {
                $task = $this->tasks[$key];
                $person = $this->people[$author];

                $saved = $task->comments()->make([
                    'body' => $body,
                    'mentions' => array_map(fn (string $who) => $this->people[$who]->id, $mentions),
                ]);
                $saved->author()->associate($person);
                $saved->save();

                Activity::record($task, Activity::COMMENT_ADDED, ['comment_id' => $saved->id]);
                $this->notifyMentioned->handle($saved, $person);
            });
        }

        if (isset($data['done'])) {
            $this->plan($data['done'], 16 + $shift / 2 + $jitter, $doer, function () use ($key, $project) {
                $this->moveTask->handle($this->tasks[$key]->refresh(), $this->list($project, 'Done'), PHP_INT_MAX);
                $this->tasks[$key]->refresh()->update(['completed_at' => now()]);
            });
        }
    }

    private function list(string $project, string $name): TaskList
    {
        return $this->projects[$project]['lists'][$name];
    }

    private function plan(int $day, float $hour, string $as, Closure $run): void
    {
        $this->timeline[] = [
            'at' => $this->moment($day, $hour),
            'seq' => count($this->timeline),
            'as' => $as,
            'run' => $run,
        ];
    }

    /**
     * Replays every step in time order, as the person who took it.
     */
    private function play(): void
    {
        usort($this->timeline, fn (array $a, array $b) => [$a['at'], $a['seq']] <=> [$b['at'], $b['seq']]);

        foreach ($this->timeline as $step) {
            $this->travel($step['at']);
            Auth::setUser($this->people[$step['as']]);
            ($step['run'])();
        }

        $this->travel(null);
        Auth::forgetUser();
    }

    /**
     * A day relative to today at an hour (8 to 19). Today's steps are spread
     * between midnight and now, so none lands in the future.
     */
    private function moment(int $day, float $hour): CarbonImmutable
    {
        if ($day < 0) {
            return $this->now->startOfDay()->addDays($day)->addMinutes((int) round($hour * 60));
        }

        $start = $this->now->startOfDay();
        $span = max(1, (int) $start->diffInMinutes($this->now, true) - 1);

        return $start->addMinutes((int) round($span * max(0, min(1, ($hour - 8) / 12))));
    }

    private function travel(?CarbonImmutable $at): void
    {
        Carbon::setTestNow($at);
        CarbonImmutable::setTestNow($at);
    }
}
