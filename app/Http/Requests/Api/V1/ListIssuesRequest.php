<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\IssueStatus;
use App\Models\Project;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ListIssuesRequest extends FormRequest
{
    /**
     * Prepare the data for validation.
     *
     * Several statuses may be given in one parameter, as in "status=todo,in_progress".
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->query('project'))) {
            $this->merge(['project' => Str::upper($this->query('project'))]);
        }

        if (is_string($this->query('status'))) {
            $this->merge(['status' => array_map(trim(...), explode(',', $this->query('status')))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $team = $this->user()->currentAccessToken()->team;

        return [
            'project' => [
                'sometimes',
                'string',
                Rule::exists(Project::class, 'key')->where('team_id', $team->id),
            ],
            'status' => ['sometimes', 'array'],
            'status.*' => [Rule::enum(IssueStatus::class)],
            'assignee' => ['sometimes', Rule::in(['me'])],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'status.*' => 'status',
        ];
    }
}
