<?php

namespace App\Http\Middleware;

use App\Models\Label;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'currentTeam' => fn () => $user?->currentTeam ? $user->toUserTeam($user->currentTeam) : null,
            'teams' => fn () => $user?->toUserTeams(includeCurrent: true) ?? [],
            'workspace' => fn () => $user?->currentTeam ? $this->workspace($user->currentTeam) : null,
        ];
    }

    /**
     * Get the projects, labels and members of the team that the issue tracker offers everywhere.
     *
     * @return array{
     *     projects: Collection<int, array{id: string, key: string, name: string, icon: string, color: string}>,
     *     labels: Collection<int, array{id: string, name: string, color: string}>,
     *     members: Collection<int, array{id: int, name: string, email: string}>
     * }
     */
    protected function workspace(Team $team): array
    {
        return [
            'projects' => $team->projects()->orderBy('name')->get()->map(fn (Project $project) => [
                'id' => $project->id,
                'key' => $project->key,
                'name' => $project->name,
                'icon' => $project->icon,
                'color' => $project->color,
            ]),
            'labels' => $team->labels()->orderBy('name')->get()->map(fn (Label $label) => [
                'id' => $label->id,
                'name' => $label->name,
                'color' => $label->color,
            ]),
            'members' => $team->members()->orderBy('name')->get()->map(fn (User $member) => [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
            ]),
        ];
    }
}
