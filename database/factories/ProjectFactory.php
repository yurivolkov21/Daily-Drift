<?php

namespace Database\Factories;

use App\Enums\Hue;
use App\Models\Project;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
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
            'name' => rtrim(fake()->unique()->sentence(3), '.'),
            'description' => fake()->optional()->sentence(),
            'color' => fake()->randomElement(Hue::cases()),
        ];
    }

    /**
     * Indicate that the project has been archived.
     */
    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'archived_at' => now(),
        ]);
    }
}
