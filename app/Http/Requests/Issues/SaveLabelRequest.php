<?php

namespace App\Http\Requests\Issues;

use App\Models\Label;
use App\Models\Team;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveLabelRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Team $team */
        $team = $this->route('current_team');

        /** @var Label|null $label */
        $label = $this->route('label');

        return [
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique(Label::class)->where('team_id', $team->id)->ignore($label?->id),
            ],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ];
    }
}
