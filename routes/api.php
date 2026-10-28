<?php

use App\Http\Controllers\Api\V1\CommentController;
use App\Http\Controllers\Api\V1\IssueController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Webhooks\GithubWebhookController;
use App\Models\Issue;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API for scripts and Claude Code hooks
|--------------------------------------------------------------------------
|
| Every request carries a personal access token, which acts as its owner on
| the token's team. A read token may only look; a write token may also
| create and change issues and add comments. Nothing here deletes.
|
*/

Route::prefix('v1')
    ->name('api.v1.')
    ->middleware(['auth:sanctum', 'throttle:api'])
    ->where(['issue' => Issue::IDENTIFIER_PATTERN])
    ->group(function () {
        Route::get('user', UserController::class)->name('user');

        Route::middleware('abilities:read')->group(function () {
            Route::get('projects', [ProjectController::class, 'index'])->name('projects.index');
            Route::get('issues', [IssueController::class, 'index'])->name('issues.index');
            Route::get('issues/{issue}', [IssueController::class, 'show'])->name('issues.show');
        });

        Route::middleware('abilities:write')->group(function () {
            Route::post('issues', [IssueController::class, 'store'])->name('issues.store');
            Route::patch('issues/{issue}', [IssueController::class, 'update'])->name('issues.update');
            Route::post('issues/{issue}/comments', [CommentController::class, 'store'])->name('issues.comments.store');
        });
    });

/*
|--------------------------------------------------------------------------
| GitHub webhook
|--------------------------------------------------------------------------
|
| A team's repositories post their push and pull request events here. Each
| delivery is signed with the team's webhook secret instead of a token.
|
*/

Route::post('webhooks/github/{webhook}', GithubWebhookController::class)->name('webhooks.github');
