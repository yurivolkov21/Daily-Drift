<?php

namespace App\Enums;

/**
 * The due date filters of the issues page, as the "due" query parameter
 * names them.
 */
enum DueFilter: string
{
    case Overdue = 'overdue';
    case Today = 'today';
    case Week = 'week';
    case None = 'none';
}
