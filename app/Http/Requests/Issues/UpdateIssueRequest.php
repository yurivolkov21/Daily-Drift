<?php

namespace App\Http\Requests\Issues;

use App\Concerns\IssueValidationRules;
use App\Models\Team;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateIssueRequest extends FormRequest
{
    use IssueValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * Every attribute is optional so a single property can be changed at a time.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Team $team */
        $team = $this->route('current_team');

        return collect($this->issueRules($team))
            ->map(fn (array $rules) => ['sometimes', ...$rules])
            ->all();
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
