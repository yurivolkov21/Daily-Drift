<?php

namespace App\Actions\Tasks;

use App\Enums\Priority;
use App\Models\TaskList;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Add the drafted tasks a person kept (spec 0011), in order, at the bottom
 * of the list. Each keeps its description and priority, and its steps
 * become its checklist.
 */
class AddDraftedTasks
{
    public function __construct(private readonly CreateTask $createTask)
    {
        //
    }

    /**
     * @param  list<array{title: string, description?: string|null, priority: string, steps?: list<string>}>  $drafts
     */
    public function handle(TaskList $list, User $creator, array $drafts): void
    {
        DB::transaction(function () use ($list, $creator, $drafts) {
            foreach ($drafts as $draft) {
                $task = $this->createTask->handle($list, $creator, $draft['title'], attributes: [
                    'description' => filled($draft['description'] ?? null) ? $draft['description'] : null,
                    'priority' => $draft['priority'] ?: Priority::None->value,
                ], drafted: true);

                foreach ($draft['steps'] ?? [] as $position => $body) {
                    $task->checklistItems()->create(['body' => $body, 'position' => $position]);
                }
            }
        });
    }
}
