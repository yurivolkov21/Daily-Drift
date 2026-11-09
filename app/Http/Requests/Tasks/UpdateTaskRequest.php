<?php

namespace App\Http\Requests\Tasks;

use App\Enums\Priority;
use App\Models\Task;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request. Fields can be
     * sent together or one at a time.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'priority' => ['sometimes', 'required', Rule::enum(Priority::class)],
            'due_on' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            // Only members of the project's team can be assigned (spec 0004).
            'assignee_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('team_members', 'user_id')->where('team_id', $this->task()->project->team_id),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'assignee_id.exists' => __('Only members of this team can be assigned.'),
        ];
    }

    private function task(): Task
    {
        $task = $this->route('task');

        return $task instanceof Task ? $task : throw new \LogicException('The route has no task.');
    }
}
