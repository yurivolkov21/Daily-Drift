<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Issues\CommentController;
use App\Http\Controllers\Issues\IssueController;
use App\Http\Controllers\Issues\IssueSearchController;
use App\Http\Controllers\Issues\LabelController;
use App\Http\Controllers\Issues\ProjectController;
use App\Http\Controllers\Issues\SubtaskController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Middleware\EnsureTeamMembership;
use App\Models\Issue;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::prefix('{current_team}')
    ->middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->scopeBindings()
    ->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        Route::get('issues', [IssueController::class, 'index'])->name('issues.index');
        Route::post('issues', [IssueController::class, 'store'])->name('issues.store');
        Route::get('issues/search', IssueSearchController::class)->name('issues.search');

        Route::where(['issue' => Issue::IDENTIFIER_PATTERN])->group(function () {
            Route::get('issues/{issue}', [IssueController::class, 'show'])->name('issues.show');
            Route::patch('issues/{issue}', [IssueController::class, 'update'])->name('issues.update');
            Route::delete('issues/{issue}', [IssueController::class, 'destroy'])->name('issues.destroy');

            Route::post('issues/{issue}/comments', [CommentController::class, 'store'])->name('issues.comments.store');
            Route::patch('issues/{issue}/comments/{comment}', [CommentController::class, 'update'])->name('issues.comments.update');
            Route::delete('issues/{issue}/comments/{comment}', [CommentController::class, 'destroy'])->name('issues.comments.destroy');

            Route::post('issues/{issue}/subtasks', [SubtaskController::class, 'store'])->name('issues.subtasks.store');
            Route::patch('issues/{issue}/subtasks/{subtask}', [SubtaskController::class, 'update'])->name('issues.subtasks.update');
            Route::delete('issues/{issue}/subtasks/{subtask}', [SubtaskController::class, 'destroy'])->name('issues.subtasks.destroy');
        });

        Route::get('projects', [ProjectController::class, 'index'])->name('projects.index');
        Route::post('projects', [ProjectController::class, 'store'])->name('projects.store');
        Route::patch('projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
        Route::delete('projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');

        Route::post('labels', [LabelController::class, 'store'])->name('labels.store');
        Route::delete('labels/{label}', [LabelController::class, 'destroy'])->name('labels.destroy');
    });

Route::middleware(['auth'])->group(function () {
    Route::post('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{invitation}', [TeamInvitationController::class, 'decline'])->name('invitations.decline');
});

require __DIR__.'/settings.php';
