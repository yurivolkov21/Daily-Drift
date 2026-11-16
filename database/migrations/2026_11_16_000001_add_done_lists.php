<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Completing moves a task to its project's Done list (spec 0010): each
     * project marks at most one list, and a completed task remembers the list
     * it left.
     */
    public function up(): void
    {
        Schema::table('task_lists', function (Blueprint $table) {
            $table->boolean('is_done')->default(false)->after('position');
        });

        // At most one Done list per project. SQLite and PostgreSQL have
        // partial indexes; elsewhere the app keeps the rule on its own.
        if (in_array(DB::getDriverName(), ['sqlite', 'pgsql'], true)) {
            DB::statement('create unique index task_lists_one_done_per_project on task_lists (project_id) where is_done');
        }

        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('completed_from_list_id')->nullable()->after('completed_at')->constrained('task_lists')->nullOnDelete();
        });

        // Each existing project marks its first list named "Done", if any.
        // Nothing moves: tasks stay where they are until their next change.
        $marked = [];

        DB::table('task_lists')
            ->whereRaw('lower(name) = ?', ['done'])
            ->orderBy('project_id')
            ->orderBy('position')
            ->orderBy('id')
            ->get(['id', 'project_id'])
            ->each(function (object $list) use (&$marked) {
                if (isset($marked[$list->project_id])) {
                    return;
                }

                $marked[$list->project_id] = true;
                DB::table('task_lists')->where('id', $list->id)->update(['is_done' => true]);
            });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('completed_from_list_id');
        });

        if (in_array(DB::getDriverName(), ['sqlite', 'pgsql'], true)) {
            DB::statement('drop index task_lists_one_done_per_project');
        }

        Schema::table('task_lists', function (Blueprint $table) {
            $table->dropColumn('is_done');
        });
    }
};
