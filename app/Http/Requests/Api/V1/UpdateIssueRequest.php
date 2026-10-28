<?php

namespace App\Http\Requests\Api\V1;

use App\Concerns\IssueValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateIssueRequest extends FormRequest
{
    use IssueValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * Every attribute is optional, so a hook can change the status alone.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $team = $this->user()->currentAccessToken()->team;

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
