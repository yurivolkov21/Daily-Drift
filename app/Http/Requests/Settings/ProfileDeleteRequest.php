<?php

namespace App\Http\Requests\Settings;

use App\Concerns\PasswordValidationRules;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ProfileDeleteRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'password' => $this->currentPasswordRules(),
        ];
    }

    /**
     * Configure the validator instance.
     *
     * A team keeps its owner: whoever owns a team that holds other people
     * deletes it or removes them before deleting their account.
     *
     * @return array<int, Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $teams = $this->user()->ownedTeams()
                    ->whereHas('memberships', fn (Builder $query) => $query->where('user_id', '!=', $this->user()->id))
                    ->orderBy('teams.name')
                    ->pluck('teams.name');

                if ($teams->isNotEmpty()) {
                    $validator->errors()->add('teams', __('Delete these teams or remove their other members first: :teams.', [
                        'teams' => $teams->join(', '),
                    ]));
                }
            },
        ];
    }
}
