<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * Show who the token acts as, on which team, and what it may do.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user->currentAccessToken();

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'team' => [
                    'id' => $token->team->id,
                    'name' => $token->team->name,
                    'slug' => $token->team->slug,
                ],
                'token' => [
                    'name' => $token->name,
                    'abilities' => $token->abilities,
                    'expires_at' => $token->expires_at?->toISOString(),
                ],
            ],
        ]);
    }
}
