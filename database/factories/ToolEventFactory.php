<?php

namespace Database\Factories;

use App\Models\Team;
use App\Models\ToolEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ToolEvent>
 */
class ToolEventFactory extends Factory
{
    /**
     * Define the model's default state: a Claude Code session starting.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'user_id' => null,
            'issue_id' => null,
            'tool' => 'claude-code',
            'event' => 'session_started',
            'branch' => 'main',
        ];
    }
}
