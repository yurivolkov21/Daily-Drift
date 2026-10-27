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
        Schema::create('issue_label', function (Blueprint $table) {
            $table->foreignUlid('issue_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('label_id')->constrained()->cascadeOnDelete();

            $table->primary(['issue_id', 'label_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('issue_label');
    }
};
