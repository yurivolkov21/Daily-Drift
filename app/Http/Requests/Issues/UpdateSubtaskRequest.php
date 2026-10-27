<?php

namespace App\Http\Requests\Issues;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSubtaskRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * Both attributes are optional so a sub-task can be renamed or ticked on its own.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'completed' => ['sometimes', 'boolean'],
        ];
    }
}
