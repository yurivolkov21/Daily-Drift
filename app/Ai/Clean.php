<?php

namespace App\Ai;

/**
 * Tidies what the model wrote before anyone sees it (spec 0011). The reply
 * follows a schema, but lengths and counts are checked here.
 */
final class Clean
{
    /**
     * One line of plain text: trimmed, with runs of white space folded,
     * and cut to at most `$max` characters.
     */
    public static function text(mixed $value, int $max): string
    {
        if (! is_string($value)) {
            return '';
        }

        $text = trim((string) preg_replace('/\s+/u', ' ', $value));

        return mb_strlen($text) > $max ? rtrim(mb_substr($text, 0, $max - 1)).'…' : $text;
    }

    /**
     * Up to `$count` distinct lines, without list markers ("- ", "1. "),
     * empty lines or lines in `$exclude`, compared without case.
     *
     * @param  array<int, string>  $exclude
     * @return list<string>
     */
    public static function lines(mixed $values, int $count, int $max, array $exclude = []): array
    {
        if (! is_array($values) || $count < 1) {
            return [];
        }

        $seen = array_map(mb_strtolower(...), $exclude);
        $lines = [];

        foreach ($values as $value) {
            $line = self::text(is_string($value) ? preg_replace('/^\s*(?:[-*•]|\d{1,2}[.)])\s+/u', '', $value) : null, $max);
            $key = mb_strtolower($line);

            if ($line === '' || in_array($key, $seen, true)) {
                continue;
            }

            $seen[] = $key;
            $lines[] = $line;

            if (count($lines) === $count) {
                break;
            }
        }

        return $lines;
    }
}
