<?php

namespace App\Support;

/**
 * The icons a label can take (spec 0007): Lucide icon names in six groups.
 * The browser maps each name to its Lucide component.
 */
final class LabelIcons
{
    public const array GROUPS = [
        'Work' => ['tag', 'flag', 'target', 'star', 'bookmark', 'briefcase', 'calendar', 'clock', 'inbox', 'archive', 'pin', 'paperclip', 'list', 'circle-check', 'trophy', 'chart-column'],
        'Build' => ['bug', 'sparkles', 'code', 'terminal', 'git-branch', 'server', 'database', 'cloud', 'cpu', 'monitor', 'smartphone', 'globe', 'package', 'layers', 'settings', 'wrench', 'key', 'link', 'flask-conical', 'rocket', 'zap', 'gauge'],
        'Design' => ['palette', 'pen', 'brush', 'image', 'layout-panel-top', 'type', 'eye', 'crop'],
        'Talk' => ['book-open', 'file-text', 'message-circle', 'mail', 'megaphone', 'video', 'mic', 'circle-help', 'info', 'users', 'user'],
        'Status' => ['triangle-alert', 'shield', 'lock', 'flame', 'hourglass', 'circle-x', 'ban', 'thumbs-up', 'refresh-cw', 'lightbulb'],
        'Life' => ['heart', 'smile', 'coffee', 'house', 'map-pin', 'gift', 'dollar-sign', 'music', 'graduation-cap', 'leaf', 'plane', 'puzzle'],
    ];

    /**
     * Every icon name, in group order.
     *
     * @return array<int, string>
     */
    public static function all(): array
    {
        return array_merge(...array_values(self::GROUPS));
    }
}
