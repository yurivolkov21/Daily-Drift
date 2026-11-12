<?php

namespace App\Http\Requests\Tasks;

use App\Models\Task;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncTaskLabelsRequest extends FormRequest
{
    public const int MAX_LABELS = 5;

    /**
     * The task's whole set of labels: up to 5, from the task's own team.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Task $task */
        $task = $this->route('task');

        return [
            'labels' => ['present', 'array', 'max:'.self::MAX_LABELS],
            'labels.*' => ['integer', 'distinct', Rule::exists('labels', 'id')->where('team_id', $task->project->team_id)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'labels.max' => __('A task takes up to :max labels.'),
            'labels.*.exists' => __('That label belongs to another team.'),
        ];
    }

    /**
     * @return array<int, int>
     */
    public function labelIds(): array
    {
        return array_values(array_map(intval(...), (array) $this->validated('labels', [])));
    }
}
