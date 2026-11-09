<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Lists\TaskListController;
use App\Http\Controllers\MyTasksController;
use App\Http\Controllers\Projects\ProjectArchiveController;
use App\Http\Controllers\Projects\ProjectController;
use App\Http\Controllers\Tasks\TaskController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Middleware\EnsureTeamMembership;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::prefix('{current_team}')
    ->middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');
        Route::get('my-tasks', MyTasksController::class)->name('my-tasks');

        Route::scopeBindings()->group(function () {
            Route::get('projects', [ProjectController::class, 'index'])->name('projects.index');
            Route::post('projects', [ProjectController::class, 'store'])->name('projects.store');
            Route::get('projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
            Route::patch('projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
            Route::delete('projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');
            Route::post('projects/{project}/archive', [ProjectArchiveController::class, 'store'])->name('projects.archive');
            Route::delete('projects/{project}/archive', [ProjectArchiveController::class, 'destroy'])->name('projects.restore');

            Route::post('projects/{project}/lists', [TaskListController::class, 'store'])->name('lists.store');
            Route::patch('lists/{list}', [TaskListController::class, 'update'])->name('lists.update');
            Route::patch('lists/{list}/move', [TaskListController::class, 'move'])->name('lists.move');
            Route::delete('lists/{list}', [TaskListController::class, 'destroy'])->name('lists.destroy');

            Route::post('lists/{list}/tasks', [TaskController::class, 'store'])->name('tasks.store');
            Route::patch('tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
            Route::patch('tasks/{task}/move', [TaskController::class, 'move'])->name('tasks.move');
            Route::patch('tasks/{task}/complete', [TaskController::class, 'complete'])->name('tasks.complete');
            Route::delete('tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');
        });
    });

Route::middleware(['auth'])->group(function () {
    Route::post('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{invitation}', [TeamInvitationController::class, 'decline'])->name('invitations.decline');
});

require __DIR__.'/settings.php';
