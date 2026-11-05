<?php

namespace App\Http\Requests\Lists;

use App\Enums\Hue;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskListRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request. Name and color can
     * be changed together or one at a time.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'color' => ['sometimes', 'required', Rule::enum(Hue::class)],
        ];
    }
}
