<?php

namespace App\Http\Requests\Settings;

use App\Enums\TokenAbility;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreApiTokenRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * A token works on one of the user's teams. Access is "read" or "write",
     * and a token without an expiry in days never expires.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'team_id' => [
                'required',
                'integer',
                Rule::exists('team_members', 'team_id')->where('user_id', $this->user()->id),
            ],
            'access' => ['required', Rule::enum(TokenAbility::class)],
            'expires_in_days' => ['nullable', 'integer', Rule::in([30, 90, 365])],
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'team_id' => 'team',
            'expires_in_days' => 'expiry',
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
            'team_id.exists' => __('Pick one of your teams.'),
        ];
    }

    /**
     * Get the abilities the chosen access gives: writing includes reading.
     *
     * @return array<int, TokenAbility>
     */
    public function abilities(): array
    {
        return $this->enum('access', TokenAbility::class) === TokenAbility::Write
            ? [TokenAbility::Read, TokenAbility::Write]
            : [TokenAbility::Read];
    }
}
