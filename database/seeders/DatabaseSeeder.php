<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database: a demo workspace to sign in to as
     * test@example.com with the password "password".
     *
     * Model events stay on: the demo relies on them to write its history.
     */
    public function run(): void
    {
        $this->call(DemoSeeder::class);
    }
}
