<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The weekly summary Claude wrote for a project (spec 0011): one per
     * project, replaced when someone writes a new one.
     */
    public function up(): void
    {
        Schema::create('project_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->date('starts_on');
            $table->date('ends_on');
            $table->json('content');
            $table->string('model', 100);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_summaries');
    }
};
