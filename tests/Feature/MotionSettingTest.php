<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MotionSettingTest extends TestCase
{
    use RefreshDatabase;

    public function test_pages_follow_the_device_by_default()
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertSee('data-motion="system"', false);
    }

    public function test_the_motion_cookie_sets_the_page_attribute()
    {
        $this->withUnencryptedCookie('motion', 'reduced')
            ->get(route('login'))
            ->assertSee('data-motion="reduced"', false);

        $this->withUnencryptedCookie('motion', 'full')
            ->get(route('login'))
            ->assertSee('data-motion="full"', false);
    }

    public function test_unknown_motion_values_fall_back_to_the_device_setting()
    {
        $this->withUnencryptedCookie('motion', '"><script>')
            ->get(route('login'))
            ->assertSee('data-motion="system"', false)
            ->assertDontSee('"><script>', false);
    }
}
