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
        Schema::create('github_webhooks', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->unique()->constrained()->cascadeOnDelete();
            $table->text('secret');
            $table->timestamp('last_delivery_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('github_webhooks');
    }
};
