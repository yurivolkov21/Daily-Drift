<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Recurring tasks (spec 0010): a rule, the date it counts from, and the
     * occurrence a task was created from when the previous one was completed.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('repeat_unit', 10)->nullable()->after('due_on');
            $table->unsignedTinyInteger('repeat_every')->nullable()->after('repeat_unit');
            $table->date('repeat_anchor')->nullable()->after('repeat_every');
            $table->foreignId('repeated_from_id')->nullable()->unique()->after('repeat_anchor')->constrained('tasks')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('repeated_from_id');
            $table->dropColumn(['repeat_unit', 'repeat_every', 'repeat_anchor']);
        });
    }
};
