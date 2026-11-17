<?php

namespace App\Http\Requests\Ai;

use App\Ai\DraftTasks;
use App\Enums\Priority;
use App\Models\ChecklistItem;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddDraftedTasksRequest extends FormRequest
{
    /**
     * The drafted tasks a person kept (spec 0011), checked like tasks
     * typed by hand.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'tasks' => ['required', 'array', 'list', 'max:'.DraftTasks::MOST],
            'tasks.*' => ['required', 'array:title,description,priority,steps'],
            'tasks.*.title' => ['required', 'string', 'max:255'],
            'tasks.*.description' => ['nullable', 'string', 'max:10000'],
            'tasks.*.priority' => ['required', Rule::enum(Priority::class)],
            'tasks.*.steps' => ['sometimes', 'array', 'list', 'max:'.ChecklistItem::LIMIT],
            'tasks.*.steps.*' => ['required', 'string', 'max:'.ChecklistItem::MAX_LENGTH],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'tasks.required' => __('Choose at least one task to add.'),
        ];
    }

    /**
     * @return list<array{title: string, description?: string|null, priority: string, steps?: list<string>}>
     */
    public function drafts(): array
    {
        /** @var list<array{title: string, description?: string|null, priority: string, steps?: list<string>}> */
        return $this->validated('tasks');
    }
}
