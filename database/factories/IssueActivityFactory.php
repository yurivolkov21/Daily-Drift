<?php

namespace Database\Factories;

use App\Enums\IssueActivityType;
use App\Models\Issue;
use App\Models\IssueActivity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IssueActivity>
 */
class IssueActivityFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'issue_id' => Issue::factory(),
            'user_id' => null,
            'type' => IssueActivityType::Created,
            'properties' => null,
        ];
    }
}
