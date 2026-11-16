<?php

namespace App\Enums;

/**
 * How a recurring task's schedule steps (spec 0010).
 */
enum RepeatUnit: string
{
    case Day = 'day';
    case Weekday = 'weekday';
    case Week = 'week';
    case Month = 'month';
    case Year = 'year';
}
