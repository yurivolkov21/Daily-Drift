<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('team.{teamId}', function (User $user, string $teamId): bool {
    return $user->teams()->whereKey($teamId)->exists();
});
