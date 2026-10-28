<?php

namespace App\Http\Requests\Api\V1;

use App\Concerns\IssueValidationRules;
use App\Models\Project;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreIssueRequest extends FormRequest
{
    use IssueValidationRules;

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('project'))) {
            $this->merge(['project' => Str::upper($this->input('project'))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * The project is named by its key, such as "DD". The status and priority
     * may be left out.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $team = $this->user()->currentAccessToken()->team;

        $rules = $this->issueRules($team);

        return [
            'project' => [
                'required',
                'string',
                Rule::exists(Project::class, 'key')->where('team_id', $team->id),
            ],
            ...$rules,
            'status' => ['sometimes', ...$rules['status']],
            'priority' => ['sometimes', ...$rules['priority']],
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return $this->issueAttributeNames();
    }
}
