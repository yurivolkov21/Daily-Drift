<?php

namespace App\Http\Requests\Checklists;

use App\Models\ChecklistItem;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateChecklistItemRequest extends FormRequest
{
    /**
     * An item is one line: line breaks in edited text become spaces.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('body'))) {
            $this->merge(['body' => trim((string) preg_replace('/\s*\R\s*/u', ' ', $this->input('body')))]);
        }
    }

    /**
     * The text and the check can change together or one at a time.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'body' => ['sometimes', 'required', 'string', 'max:'.ChecklistItem::MAX_LENGTH],
            'checked' => ['sometimes', 'boolean'],
        ];
    }
}
