<?php

namespace App\Http\Requests\Labels;

use App\Models\Label;
use App\Models\Team;
use App\Support\LabelIcons;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveLabelRequest extends FormRequest
{
    /**
     * A label's name is unique in its team, ignoring case; its icon comes
     * from the list in spec 0007.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $team = $this->route('current_team');
        $label = $this->route('label');
        $editing = $label instanceof Label;
        $labelId = $editing ? $label->id : null;

        return [
            'name' => [
                $editing ? 'sometimes' : 'required',
                'string',
                'max:24',
                function (string $attribute, mixed $value, Closure $fail) use ($team, $labelId) {
                    $taken = $team instanceof Team && $team->labels()
                        ->whereRaw('lower(name) = ?', [mb_strtolower(trim((string) $value))])
                        ->when($labelId !== null, fn ($query) => $query->whereKeyNot($labelId))
                        ->exists();

                    if ($taken) {
                        $fail(__('This team already has a label with that name.'));
                    }
                },
            ],
            'icon' => [$editing ? 'sometimes' : 'required', 'string', Rule::in(LabelIcons::all())],
            // Creating from the task sheet also adds the label to that task.
            'task_id' => [$editing ? 'prohibited' : 'nullable', 'integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['icon.in' => __('Pick one of the label icons.')];
    }
}
