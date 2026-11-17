<?php

namespace App\Http\Requests\Ai;

use App\Ai\DraftTasks;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class DraftTasksRequest extends FormRequest
{
    /**
     * A few sentences about the project (spec 0011).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'brief' => ['required', 'string', 'max:'.DraftTasks::BRIEF_LENGTH],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'brief.required' => __('Write a few sentences about the project first.'),
        ];
    }
}
