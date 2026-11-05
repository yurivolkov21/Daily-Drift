<?php

namespace App\Http\Requests\Tasks;

use App\Models\Task;
use App\Models\TaskList;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class MoveTaskRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request. The target list
     * must belong to the task's project.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'list_id' => [
                'required',
                'integer',
                Rule::exists('task_lists', 'id')->where('project_id', $this->task()->project_id),
            ],
            'index' => ['required', 'integer', 'min:0'],
        ];
    }

    /**
     * The index may point one past the last task of the target list.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $task = $this->task();
                $others = Task::query()
                    ->where('task_list_id', $this->integer('list_id'))
                    ->whereKeyNot($task->getKey())
                    ->count();

                if ($this->integer('index') > $others) {
                    $validator->errors()->add('index', __('The index is past the end of the list.'));
                }
            },
        ];
    }

    /**
     * The target list, after validation.
     */
    public function targetList(): TaskList
    {
        return TaskList::query()->findOrFail($this->integer('list_id'));
    }

    private function task(): Task
    {
        /** @var Task */
        return $this->route('task');
    }
}
