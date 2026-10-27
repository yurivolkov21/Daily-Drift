<?php

namespace App\Http\Requests\Issues;

use App\Models\Project;
use App\Models\Team;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SaveProjectRequest extends FormRequest
{
    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('key'))) {
            $this->merge(['key' => Str::upper($this->input('key'))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Team $team */
        $team = $this->route('current_team');

        /** @var Project|null $project */
        $project = $this->route('project');

        return [
            'name' => ['required', 'string', 'max:255'],
            'key' => [
                'required',
                'string',
                'regex:/^[A-Z][A-Z0-9]{1,4}$/',
                Rule::unique(Project::class)->where('team_id', $team->id)->ignore($project?->id),
            ],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * Get the custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'key.regex' => __('The key must be 2 to 5 letters or digits and start with a letter.'),
        ];
    }
}
