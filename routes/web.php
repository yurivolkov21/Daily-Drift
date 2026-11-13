<?php

use App\Http\Controllers\Auth\SocialAuthController;
use App\Http\Controllers\Comments\CommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Labels\LabelController;
use App\Http\Controllers\Lists\TaskListController;
use App\Http\Controllers\MyTasksController;
use App\Http\Controllers\Notifications\NotificationController;
use App\Http\Controllers\Projects\ProjectArchiveController;
use App\Http\Controllers\Projects\ProjectController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\Tasks\TaskActivityController;
use App\Http\Controllers\Tasks\TaskController;
use App\Http\Controllers\Tasks\TaskLabelController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Middleware\EnsureTeamMembership;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Spec 0009: sign in, sign up or connect with Google or GitHub.
Route::get('auth/{provider}/redirect', [SocialAuthController::class, 'redirect'])->name('social.redirect');
Route::get('auth/{provider}/callback', [SocialAuthController::class, 'callback'])->middleware('throttle:10,1')->name('social.callback');

Route::prefix('{current_team}')
    ->middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');
        Route::get('my-tasks', MyTasksController::class)->name('my-tasks');

        // Spec 0006. A notification belongs to a person, not to the team's models, so these are not scoped.
        Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::get('notifications/recent', [NotificationController::class, 'recent'])->name('notifications.recent');
        Route::patch('notifications/{notification}/read', [NotificationController::class, 'read'])->whereUuid('notification')->name('notifications.read');
        Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');

        // Spec 0007: the Ctrl K search box.
        Route::get('search', SearchController::class)->name('search');

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

            Route::put('tasks/{task}/labels', [TaskLabelController::class, 'update'])->name('tasks.labels.update');
            Route::get('tasks/{task}/activity', TaskActivityController::class)->name('tasks.activity');
            Route::post('tasks/{task}/comments', [CommentController::class, 'store'])->name('comments.store');
            // A team has no direct relation to comments; the controller checks the team.
            Route::patch('comments/{comment}', [CommentController::class, 'update'])->withoutScopedBindings()->name('comments.update');
            Route::delete('comments/{comment}', [CommentController::class, 'destroy'])->withoutScopedBindings()->name('comments.destroy');

            // Spec 0007: the team's labels.
            Route::post('labels', [LabelController::class, 'store'])->name('labels.store');
            Route::patch('labels/{label}', [LabelController::class, 'update'])->name('labels.update');
            Route::delete('labels/{label}', [LabelController::class, 'destroy'])->name('labels.destroy');
        });
    });

Route::middleware(['auth'])->group(function () {
    Route::post('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{invitation}', [TeamInvitationController::class, 'decline'])->name('invitations.decline');
});

require __DIR__.'/settings.php';
