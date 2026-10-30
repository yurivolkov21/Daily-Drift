<?php

namespace App\Enums;

use Carbon\CarbonInterface;

/**
 * The completion filters of the issues page, as the "done" query parameter
 * names them.
 */
enum DoneFilter: string
{
    case Week = 'week';

    /**
     * Get the earliest moment a reader may still count as the filter's
     * period: for this week, the start of the week that held yesterday, less
     * a day for their time zone.
     */
    public function since(): CarbonInterface
    {
        return match ($this) {
            self::Week => today()->subDay()->startOfWeek(CarbonInterface::MONDAY)->subDay(),
        };
    }
}
