<?php

namespace App\Http\Requests\Comments;

use App\Models\Comment;
use App\Models\Task;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveCommentRequest extends FormRequest
{
    /**
     * Get the validation rules for adding or editing a comment (spec 0005).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:5000'],
            'mentions' => ['sometimes', 'array', 'max:50'],
            // Only current members of the task's team can be mentioned.
            'mentions.*' => [
                'integer',
                'distinct',
                Rule::exists('team_members', 'user_id')->where('team_id', $this->task()->project->team_id),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['mentions.*.exists' => __('Only members of this team can be mentioned.')];
    }

    /**
     * The mentioned ids, in the order given.
     *
     * @return array<int, int>
     */
    public function mentions(): array
    {
        return array_values(array_map(intval(...), (array) $this->validated('mentions', [])));
    }

    private function task(): Task
    {
        $task = $this->route('task');
        $comment = $this->route('comment');

        return match (true) {
            $task instanceof Task => $task,
            $comment instanceof Comment => $comment->task,
            default => throw new \LogicException('The route has no task.'),
        };
    }
}
