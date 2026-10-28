<?php

namespace Database\Factories;

use App\Enums\IssueLinkType;
use App\Enums\PullRequestState;
use App\Models\Issue;
use App\Models\IssueLink;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IssueLink>
 */
class IssueLinkFactory extends Factory
{
    /**
     * Define the model's default state: an open pull request.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $number = (string) fake()->numberBetween(1, 500);

        return [
            'issue_id' => Issue::factory(),
            'type' => IssueLinkType::PullRequest,
            'repository' => 'yurivolkov21/Daily-Drift',
            'external_id' => $number,
            'title' => fake()->sentence(4),
            'url' => "https://github.com/yurivolkov21/Daily-Drift/pull/{$number}",
            'state' => PullRequestState::Open,
            'author' => fake()->userName(),
        ];
    }

    /**
     * Make the link a commit.
     */
    public function commit(): static
    {
        return $this->state(function (array $attributes) {
            $sha = fake()->sha1();

            return [
                'type' => IssueLinkType::Commit,
                'external_id' => $sha,
                'url' => "https://github.com/{$attributes['repository']}/commit/{$sha}",
                'state' => null,
            ];
        });
    }
}
