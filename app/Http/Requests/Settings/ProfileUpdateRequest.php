<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use App\Support\LocalTime;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Store the IANA name when the browser sent an old one (spec 0003).
     */
    protected function prepareForValidation(): void
    {
        $zone = $this->input('timezone');

        if (is_string($zone)) {
            $this->merge(['timezone' => LocalTime::normalize($zone) ?? $zone]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules($this->user()->id),
            // Empty means "match my device" (spec 0003).
            'timezone' => ['nullable', 'string', 'timezone:all_with_bc'],
        ];
    }
}
