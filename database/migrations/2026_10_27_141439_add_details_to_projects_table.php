<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('icon', 50)->default('box')->after('description');
            $table->string('color', 7)->default('#5e6ad2')->after('icon');
            $table->string('status')->default('planned')->after('color');
            $table->foreignId('lead_id')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->date('target_date')->nullable()->after('lead_id');
        });

        $colors = ['#5e6ad2', '#26b5ce', '#4cb782', '#f2994a', '#bb87fc', '#eb5757', '#f2c94c', '#95a2b3'];
        $counts = [];

        DB::table('projects')
            ->orderBy('team_id')
            ->orderBy('created_at')
            ->get(['id', 'team_id'])
            ->each(function (object $project) use ($colors, &$counts) {
                $index = $counts[$project->team_id] ?? 0;
                $counts[$project->team_id] = $index + 1;

                $isUnderWay = DB::table('issues')
                    ->where('project_id', $project->id)
                    ->whereIn('status', ['in_progress', 'in_review', 'done'])
                    ->exists();

                DB::table('projects')->where('id', $project->id)->update([
                    'color' => $colors[$index % count($colors)],
                    'status' => $isUnderWay ? 'in_progress' : 'planned',
                ]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lead_id');
            $table->dropColumn(['icon', 'color', 'status', 'target_date']);
        });
    }
};
