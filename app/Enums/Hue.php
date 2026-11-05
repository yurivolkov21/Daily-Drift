<?php

namespace App\Enums;

/**
 * The color palette shared by projects and lists. The frontend maps each
 * value to its own set of Tailwind classes.
 */
enum Hue: string
{
    case Slate = 'slate';
    case Red = 'red';
    case Orange = 'orange';
    case Amber = 'amber';
    case Green = 'green';
    case Teal = 'teal';
    case Blue = 'blue';
    case Indigo = 'indigo';
    case Violet = 'violet';
    case Pink = 'pink';
}
