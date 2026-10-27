<?php

namespace App\Enums;

enum IssuePriority: int
{
    case None = 0;
    case Low = 1;
    case Medium = 2;
    case High = 3;
    case Urgent = 4;
}
