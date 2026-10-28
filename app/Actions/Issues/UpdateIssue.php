<?php

namespace App\Actions\Issues;

use App\Enums\IssueActivityType;
use App\Events\WorkspaceChanged;
use App\Models\Issue;
use App\Models\Label;
use App\Models\User;
use App\Notifications\IssueAssigned;
use BackedEnum;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class UpdateIssue
{
    /**
     * The issue attributes whose changes are recorded, with the activity type of each.
     *
     * @var array<string, IssueActivityType>
     */
    protected const TRACKED_ATTRIBUTES = [
        'title' => IssueActivityType::TitleChanged,
        'description' => IssueActivityType::DescriptionChanged,
        'status' => IssueActivityType::StatusChanged,
        'priority' => IssueActivityType::PriorityChanged,
        'assignee_id' => IssueActivityType::AssigneeChanged,
        'due_date' => IssueActivityType::DueDateChanged,
    ];

    /**
     * Update the issue and record each change in its history.
     *
     * @param  array<string, mixed>  $attributes
     * @param  array<int, string>|null  $labelIds  The issue's complete set of labels, or null to keep the current ones.
     */
    public function handle(User $actor, Issue $issue, array $attributes, ?array $labelIds = null): Issue
    {
        return DB::transaction(function () use ($actor, $issue, $attributes, $labelIds) {
            $issue->fill($attributes);

            $originals = collect($issue->getDirty())
                ->map(fn (mixed $value, string $attribute) => $issue->getOriginal($attribute));

            $issue->save();

            foreach ($originals as $attribute => $original) {
                $type = self::TRACKED_ATTRIBUTES[$attribute] ?? null;

                if ($type !== null) {
                    $issue->recordActivity($type, $actor, $this->changeProperties(
                        $type,
                        $original,
                        $issue->getAttribute($attribute),
                    ));
                }
            }

            if ($labelIds !== null) {
                $this->syncLabels($actor, $issue, $labelIds);
            }

            $newAssignee = $originals->has('assignee_id') ? $issue->load('assignee')->assignee : null;

            if ($newAssignee !== null && $newAssignee->isNot($actor)) {
                $newAssignee->notify(new IssueAssigned($issue, $actor));
            }

            broadcast(WorkspaceChanged::forIssue($issue, 'issue', 'updated'))->toOthers();

            return $issue;
        });
    }

    /**
     * Describe a change for the issue's history.
     *
     * @return array<string, mixed>|null
     */
    protected function changeProperties(IssueActivityType $type, mixed $from, mixed $to): ?array
    {
        return match ($type) {
            IssueActivityType::DescriptionChanged => null,
            IssueActivityType::AssigneeChanged => [
                'from' => $this->userSnapshot($from),
                'to' => $this->userSnapshot($to),
            ],
            default => [
                'from' => $this->plainValue($from),
                'to' => $this->plainValue($to),
            ],
        };
    }

    /**
     * Replace the issue's labels and record which were added and removed.
     *
     * @param  array<int, string>  $labelIds
     */
    protected function syncLabels(User $actor, Issue $issue, array $labelIds): void
    {
        $result = $issue->labels()->sync($labelIds);

        if ($result['attached'] === [] && $result['detached'] === []) {
            return;
        }

        $labels = Label::query()
            ->whereKey([...$result['attached'], ...$result['detached']])
            ->get()
            ->keyBy('id');

        $snapshot = fn (array $ids): array => $labels->only($ids)
            ->map(fn (Label $label) => [
                'id' => $label->id,
                'name' => $label->name,
                'color' => $label->color,
            ])
            ->values()
            ->all();

        $issue->recordActivity(IssueActivityType::LabelsChanged, $actor, [
            'added' => $snapshot($result['attached']),
            'removed' => $snapshot($result['detached']),
        ]);
    }

    /**
     * Keep the user's name with the change so the history stays readable after they leave.
     *
     * @return array{id: int, name: string}|null
     */
    protected function userSnapshot(mixed $userId): ?array
    {
        $user = $userId === null ? null : User::query()->whereKey($userId)->first();

        return $user ? ['id' => $user->id, 'name' => $user->name] : null;
    }

    /**
     * Turn enums and dates into the plain values stored in the history.
     */
    protected function plainValue(mixed $value): mixed
    {
        return match (true) {
            $value instanceof BackedEnum => $value->value,
            $value instanceof CarbonInterface => $value->toDateString(),
            default => $value,
        };
    }
}
