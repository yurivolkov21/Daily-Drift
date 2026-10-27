<?php

namespace App\Http\Requests\Issues;

use App\Enums\ProjectStatus;
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

        if (is_string($this->input('color'))) {
            $this->merge(['color' => Str::lower($this->input('color'))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Updates may send a single field, such as a new status picked in the
     * projects list, so the name and key are only required when creating.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Team $team */
        $team = $this->route('current_team');

        /** @var Project|null $project */
        $project = $this->route('project');

        $presence = $project === null ? ['required'] : ['sometimes', 'required'];

        return [
            'name' => [...$presence, 'string', 'max:255'],
            'key' => [
                ...$presence,
                'string',
                'regex:/^[A-Z][A-Z0-9]{1,4}$/',
                Rule::unique(Project::class)->where('team_id', $team->id)->ignore($project?->id),
            ],
            'description' => ['nullable', 'string', 'max:2000'],
            'icon' => ['sometimes', 'required', 'string', 'max:50', 'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/'],
            'color' => ['sometimes', 'required', 'string', 'regex:/^#[0-9a-f]{6}$/'],
            'status' => ['sometimes', 'required', Rule::enum(ProjectStatus::class)],
            'lead_id' => ['nullable', 'integer', Rule::exists('team_members', 'user_id')->where('team_id', $team->id)],
            'target_date' => ['nullable', 'date'],
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
            'icon.regex' => __('The icon must be the name of an icon, like rocket.'),
            'color.regex' => __('The color must be a hex color, like #5e6ad2.'),
            'lead_id.exists' => __('The lead must be a member of this team.'),
        ];
    }
}
