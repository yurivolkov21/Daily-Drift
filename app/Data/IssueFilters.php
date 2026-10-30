<?php

namespace App\Data;

use App\Enums\DoneFilter;
use App\Enums\DueFilter;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * The filters of the issues page, as its query parameters name them. A
 * parameter that takes several values lists them with commas, such as
 * "status=todo,in_progress"; an issue passes a filter when it matches any
 * of its values, and the page shows the issues passing every filter.
 */
readonly class IssueFilters
{
    /**
     * The assignee filter value standing for the reader.
     */
    public const string ME = 'me';

    /**
     * The assignee filter value standing for no one.
     */
    public const string UNASSIGNED = 'none';

    /**
     * @param  array<int, int|string>  $assignees  Member ids, "me" for the reader and "none" for no one
     * @param  array<int, IssueStatus>  $statuses
     * @param  array<int, IssuePriority>  $priorities
     * @param  array<int, string>  $labelIds
     */
    public function __construct(
        public ?Project $project = null,
        public array $assignees = [],
        public array $statuses = [],
        public array $priorities = [],
        public array $labelIds = [],
        public ?DueFilter $due = null,
        public ?DoneFilter $done = null,
    ) {
        //
    }

    /**
     * Read the filters from the request, keeping the values the team has and
     * dropping the rest. The reader's own id reads as "me".
     */
    public static function fromRequest(Request $request, Team $team): self
    {
        $reader = $request->user();

        $assignees = self::listed($request, 'assignee')
            ->map(fn (string $value) => match (true) {
                $value === self::ME, $value === self::UNASSIGNED => $value,
                ctype_digit($value) => (int) $value,
                default => null,
            })
            ->filter(fn (int|string|null $value) => $value !== null);

        $memberIds = $team->members()
            ->whereKey($assignees->filter(fn (int|string $value) => is_int($value))->all())
            ->pluck('users.id');

        $labelIds = self::listed($request, 'label');

        return new self(
            project: $request->filled('project')
                ? $team->projects()->where('key', $request->string('project')->upper()->toString())->first()
                : null,
            assignees: $assignees
                ->filter(fn (int|string $value) => is_string($value) || $memberIds->contains($value))
                ->map(fn (int|string $value) => $value === $reader?->id ? self::ME : $value)
                ->unique()
                ->values()
                ->all(),
            statuses: self::listed($request, 'status')
                ->map(fn (string $value) => IssueStatus::tryFrom($value))
                ->filter()
                ->values()
                ->all(),
            priorities: self::listed($request, 'priority')
                ->filter(fn (string $value) => ctype_digit($value))
                ->map(fn (string $value) => IssuePriority::tryFrom((int) $value))
                ->filter()
                ->values()
                ->all(),
            labelIds: $labelIds
                ->intersect($team->labels()->whereKey($labelIds->all())->pluck('id'))
                ->values()
                ->all(),
            due: DueFilter::tryFrom($request->string('due')->toString()),
            done: DoneFilter::tryFrom($request->string('done')->toString()),
        );
    }

    /**
     * Get the ids of the members whose issues pass the assignee filter, the
     * reader's own for "me".
     *
     * @return array<int, int>
     */
    public function assigneeIds(User $reader): array
    {
        return array_values(array_filter(
            array_map(fn (int|string $value) => $value === self::ME ? $reader->id : $value, $this->assignees),
            is_int(...),
        ));
    }

    /**
     * Whether the assignee filter passes the issues assigned to no one.
     */
    public function includesUnassigned(): bool
    {
        return in_array(self::UNASSIGNED, $this->assignees, true);
    }

    /**
     * Get the filters as the page receives them.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'project' => $this->project?->key,
            'assignee' => $this->assignees,
            'status' => array_map(fn (IssueStatus $status) => $status->value, $this->statuses),
            'priority' => array_map(fn (IssuePriority $priority) => $priority->value, $this->priorities),
            'label' => $this->labelIds,
            'due' => $this->due?->value,
            'done' => $this->done?->value,
        ];
    }

    /**
     * Get the values listed in the query parameter, such as "todo,done".
     *
     * @return Collection<int, non-empty-string>
     */
    protected static function listed(Request $request, string $key): Collection
    {
        $value = $request->query($key);

        return collect(is_string($value) ? explode(',', $value) : [])
            ->map(fn (string $value) => trim($value))
            ->filter(fn (string $value) => $value !== '')
            ->unique()
            ->values();
    }
}
