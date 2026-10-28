<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller as BaseController;
use App\Models\Team;
use Illuminate\Http\Request;

abstract class Controller extends BaseController
{
    /**
     * Get the team the request's API token works on.
     *
     * Sanctum only accepts the token while its owner is a member of the team.
     */
    protected function team(Request $request): Team
    {
        return $request->user()->currentAccessToken()->team;
    }
}
