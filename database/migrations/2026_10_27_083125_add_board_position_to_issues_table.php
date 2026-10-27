<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Existing issues keep the order the board showed so far: highest priority
     * first, then newest first, counted per team.
     */
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->double('board_position')->nullable()->after('due_date');
        });

        $positions = [];

        DB::table('issues')
            ->join('projects', 'projects.id', '=', 'issues.project_id')
            ->orderBy('projects.team_id')
            ->orderByDesc('issues.priority')
            ->orderByDesc('issues.created_at')
            ->get(['issues.id', 'projects.team_id'])
            ->each(function (object $issue) use (&$positions) {
                $positions[$issue->team_id] = ($positions[$issue->team_id] ?? 0) + 1;

                DB::table('issues')
                    ->where('id', $issue->id)
                    ->update(['board_position' => $positions[$issue->team_id]]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn('board_position');
        });
    }
};
