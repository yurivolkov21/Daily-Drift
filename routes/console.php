<?php

use App\Models\TeamInvitation;
use Illuminate\Support\Facades\Schedule;

// Spec 0012: each scheduled task runs on one server only, so a second
// instance later would not run it twice.

Schedule::call(function () {
    TeamInvitation::query()
        ->whereNotNull('expires_at')
        ->where('expires_at', '<', now())
        ->delete();
})->daily()->description('Delete expired team invitations')->onOneServer();

// Supabase's free plan keeps no backups, so the app makes its own.
Schedule::command('db:backup')
    ->weeklyOn(0, '03:00')
    ->timezone('Asia/Ho_Chi_Minh')
    ->description('Back up the database to the bucket')
    ->onOneServer();
