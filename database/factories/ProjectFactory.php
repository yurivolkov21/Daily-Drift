<?php

namespace Database\Factories;

use App\Enums\ProjectStatus;
use App\Models\Project;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

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
            'name' => fake()->unique()->company(),
            'key' => Str::upper(fake()->unique()->lexify('???')),
            'description' => fake()->sentence(),
            'icon' => fake()->randomElement(['rocket', 'globe', 'monitor', 'code', 'palette', 'box']),
            'color' => fake()->randomElement(['#5e6ad2', '#26b5ce', '#4cb782', '#f2994a', '#bb87fc', '#eb5757']),
            'status' => ProjectStatus::Planned,
        ];
    }

    /**
     * Indicate that the project has the given status.
     */
    public function withStatus(ProjectStatus $status): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => $status,
        ]);
    }
}
