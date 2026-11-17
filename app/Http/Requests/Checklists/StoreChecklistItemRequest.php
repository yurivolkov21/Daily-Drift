<?php

namespace App\Http\Requests\Checklists;

use App\Models\ChecklistItem;
use App\Models\Task;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreChecklistItemRequest extends FormRequest
{
    /**
     * One item, or one per line when several lines are pasted (spec 0010).
     * `index` and `checked` put back an item whose deletion was undone.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:20000'],
            'index' => ['sometimes', 'integer', 'min:0'],
            'checked' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $lines = $this->lines();

                if ($lines === []) {
                    $validator->errors()->add('body', __('Write the item first.'));

                    return;
                }

                if (collect($lines)->contains(fn (string $line) => mb_strlen($line) > ChecklistItem::MAX_LENGTH)) {
                    $validator->errors()->add('body', __('An item can be up to :max characters long.', ['max' => ChecklistItem::MAX_LENGTH]));

                    return;
                }

                if ($this->task()->checklistItems()->count() + count($lines) > ChecklistItem::LIMIT) {
                    $validator->errors()->add('body', __('A checklist holds up to :limit items.', ['limit' => ChecklistItem::LIMIT]));
                }
            },
        ];
    }

    /**
     * The non-empty lines of the text, trimmed.
     *
     * @return list<string>
     */
    public function lines(): array
    {
        $lines = preg_split('/\R/u', $this->string('body')->toString()) ?: [];

        return array_values(array_filter(array_map(trim(...), $lines), fn (string $line) => $line !== ''));
    }

    private function task(): Task
    {
        $task = $this->route('task');

        return $task instanceof Task ? $task : throw new \LogicException('The route has no task.');
    }
}
