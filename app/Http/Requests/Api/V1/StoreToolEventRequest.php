<?php

namespace App\Http\Requests\Api\V1;

use App\Models\Issue;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreToolEventRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * The tool and the event are short names the tool picks, such as
     * "codex" and "session_started". The issue comes from the branch unless
     * the report names it.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'tool' => ['required', 'string', 'max:50', 'regex:/^[a-z0-9][a-z0-9._-]*$/i'],
            'event' => ['required', 'string', 'max:50', 'regex:/^[a-z0-9][a-z0-9._-]*$/i'],
            'branch' => ['nullable', 'string', 'max:255'],
            'issue' => ['nullable', 'string', 'regex:/^'.Issue::IDENTIFIER_PATTERN.'$/'],
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
            'tool.regex' => __('The tool must be a short name, like claude-code.'),
            'event.regex' => __('The event must be a short name, like session_started.'),
            'issue.regex' => __('The issue must be an identifier, like DD-12.'),
        ];
    }

    /**
     * Get the report in the shape RecordToolEvent takes.
     *
     * @return array{tool: string, event: string, branch: string|null, issue: string|null}
     */
    public function report(): array
    {
        return [
            'tool' => $this->safe()->string('tool')->lower()->toString(),
            'event' => $this->safe()->string('event')->lower()->toString(),
            'branch' => $this->safe()->string('branch')->toString() ?: null,
            'issue' => $this->safe()->string('issue')->toString() ?: null,
        ];
    }
}
