<?php

namespace Database\Factories;

use App\Enums\Priority;
use App\Models\Task;
use App\Models\TaskList;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'task_list_id' => TaskList::factory(),
            'project_id' => fn (array $attributes) => TaskList::query()->whereKey($attributes['task_list_id'])->value('project_id'),
            'title' => rtrim(fake()->sentence(4), '.'),
            'description' => fake()->optional()->paragraph(),
            'priority' => fake()->randomElement(Priority::cases()),
            'due_on' => fake()->boolean(60) ? fake()->dateTimeBetween('-1 week', '+2 weeks')->format('Y-m-d') : null,
            'position' => 0,
        ];
    }

    /**
     * Indicate that the task is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'completed_at' => now(),
        ]);
    }
}
