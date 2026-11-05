<?php

namespace App\Http\Requests\Lists;

use App\Models\TaskList;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class MoveTaskListRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var TaskList $list */
        $list = $this->route('list');
        $last = TaskList::query()->where('project_id', $list->project_id)->count() - 1;

        return [
            'index' => ['required', 'integer', 'min:0', 'max:'.$last],
        ];
    }
}
