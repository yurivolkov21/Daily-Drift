<?php

namespace App\Http\Requests\Checklists;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class MoveChecklistItemRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'index' => ['required', 'integer', 'min:0'],
        ];
    }
}
