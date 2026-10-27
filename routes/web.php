<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Issues\IssueController;
use App\Http\Controllers\Issues\IssueSearchController;
use App\Http\Controllers\Issues\LabelController;
use App\Http\Controllers\Issues\ProjectController;
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

        Route::controller(IssueController::class)
            ->where(['issue' => Issue::IDENTIFIER_PATTERN])
            ->group(function () {
                Route::get('issues/{issue}', 'show')->name('issues.show');
                Route::patch('issues/{issue}', 'update')->name('issues.update');
                Route::delete('issues/{issue}', 'destroy')->name('issues.destroy');
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
