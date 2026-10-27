<?php

namespace App\Http\Requests\Issues;

use App\Concerns\IssueValidationRules;
use App\Models\Project;
use App\Models\Team;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIssueRequest extends FormRequest
{
    use IssueValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Team $team */
        $team = $this->route('current_team');

        return [
            'project_id' => [
                'required',
                'string',
                Rule::exists(Project::class, 'id')->where('team_id', $team->id),
            ],
            ...$this->issueRules($team),
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
