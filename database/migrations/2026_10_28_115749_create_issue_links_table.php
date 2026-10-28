<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('issue_links', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('issue_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('repository');
            $table->string('external_id');
            $table->string('title');
            $table->string('url', 2048);
            $table->string('state')->nullable();
            $table->string('author')->nullable();
            $table->timestamps();

            $table->unique(['issue_id', 'type', 'repository', 'external_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('issue_links');
    }
};
