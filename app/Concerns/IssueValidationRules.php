<?php

namespace App\Concerns;

use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Models\Label;
use App\Models\Membership;
use App\Models\Team;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait IssueValidationRules
{
    /**
     * Get the validation rules used to validate an issue's attributes.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function issueRules(Team $team): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:20000'],
            'status' => ['required', Rule::enum(IssueStatus::class)],
            'priority' => ['required', Rule::enum(IssuePriority::class)],
            'assignee_id' => [
                'nullable',
                'integer',
                Rule::exists(Membership::class, 'user_id')->where('team_id', $team->id),
            ],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
            'label_ids' => ['array'],
            'label_ids.*' => [
                'string',
                'distinct',
                Rule::exists(Label::class, 'id')->where('team_id', $team->id),
            ],
        ];
    }

    /**
     * Get the names of the issue attributes shown in validation messages.
     *
     * @return array<string, string>
     */
    protected function issueAttributeNames(): array
    {
        return [
            'project_id' => 'project',
            'assignee_id' => 'assignee',
            'label_ids' => 'labels',
            'label_ids.*' => 'label',
        ];
    }
}
