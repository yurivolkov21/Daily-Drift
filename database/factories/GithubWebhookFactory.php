<?php

namespace Database\Factories;

use App\Models\GithubWebhook;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GithubWebhook>
 */
class GithubWebhookFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'secret' => GithubWebhook::generateSecret(),
        ];
    }
}
