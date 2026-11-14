<?php

namespace Database\Seeders;

use App\Enums\Hue;

/**
 * The demo workspace tells the story of building Daily-Drift itself: one
 * project per phase, the design rounds and the docs and tooling, with the
 * tasks taken from the specs, ADRs and pull requests.
 *
 * Days count from today (0); -3 is three days ago, 2 is the day after
 * tomorrow. People are keys of PEOPLE. A task's list follows from what
 * happened to it: done, started (In progress) or neither (To do).
 */
final class DemoData
{
    /** The demo owner signs in as test@example.com with "password". */
    public const array PEOPLE = [
        'me' => ['name' => 'Mai Nguyen', 'email' => 'test@example.com', 'role' => 'owner'],
        'an' => ['name' => 'Minh An', 'email' => 'an@example.com', 'role' => 'admin'],
        'linh' => ['name' => 'Thu Linh', 'email' => 'linh@example.com', 'role' => 'member'],
        'khoa' => ['name' => 'Dang Khoa', 'email' => 'khoa@example.com', 'role' => 'member'],
    ];

    public const string TEAM = 'Daily-Drift Studio';

    /** Someone invited who has not answered yet. */
    public const array INVITATION = ['email' => 'hoa@example.com', 'role' => 'member', 'day' => -1];

    /** Team labels: key => [name, Lucide icon]. */
    public const array LABELS = [
        'backend' => ['Backend', 'server'],
        'frontend' => ['Frontend', 'monitor'],
        'design' => ['Design', 'palette'],
        'docs' => ['Docs', 'book-open'],
        'bug' => ['Bug', 'bug'],
        'tests' => ['Testing', 'flask-conical'],
        'security' => ['Security', 'shield'],
        'devops' => ['DevOps', 'rocket'],
        'ai' => ['AI', 'sparkles'],
        'phone' => ['Phones', 'smartphone'],
    ];

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function projects(): array
    {
        return [
            [
                'name' => 'Phase 1 · Core kanban',
                'description' => 'Projects, lists and tasks with drag and drop, the dashboard, then the new design and a time zone per person.',
                'color' => Hue::Indigo,
                'created' => -24,
                'archived' => -12,
                'tasks' => [
                    ['title' => 'Projects: create, archive, restore and delete', 'by' => 'me', 'who' => 'me', 'priority' => 'high', 'labels' => ['backend'], 'created' => -24, 'started' => -23, 'done' => -22, 'due' => -21,
                        'description' => 'Spec 0001. Owners and admins manage projects, only owners delete them; a new project starts with To do, In progress and Done.'],
                    ['title' => 'Lists: add, rename, recolor and reorder', 'by' => 'me', 'who' => 'an', 'priority' => 'medium', 'labels' => ['backend', 'frontend'], 'created' => -24, 'started' => -22, 'done' => -21, 'due' => -20],
                    ['title' => 'Tasks: drag and drop between lists', 'by' => 'an', 'who' => 'khoa', 'priority' => 'high', 'labels' => ['frontend'], 'created' => -23, 'started' => -21, 'done' => -19, 'due' => -19,
                        'description' => 'ReUI Kanban on dnd-kit (ADR 0005), with Alt and the arrow keys for keyboard moves.',
                        'comments' => [['khoa', -20, 'Keyboard moves work too: Alt and an arrow key moves a card to the next list.']]],
                    ['title' => 'Dashboard: stats, throughput and My focus', 'by' => 'me', 'who' => 'me', 'priority' => 'medium', 'labels' => ['frontend'], 'created' => -22, 'started' => -19, 'done' => -17],
                    ['title' => 'Floating sidebar and the design tokens', 'by' => 'me', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['design', 'frontend'], 'created' => -22, 'started' => -20, 'done' => -18,
                        'description' => 'Spec 0002 and ADR 0007: a night-blue sidebar that folds to an icon rail, and motion with a reduced path.'],
                    ['title' => 'Time zone per person', 'by' => 'me', 'who' => 'an', 'priority' => 'high', 'labels' => ['backend'], 'created' => -20, 'started' => -17, 'done' => -15,
                        'description' => 'Spec 0003 and ADR 0008: "today" and "overdue" follow the local day of the person looking.',
                        'comments' => [['me', -16, 'Overdue now turns at midnight in each person\'s own day, not in UTC.']]],
                    ['title' => 'Feature tests for the board', 'by' => 'an', 'who' => 'khoa', 'priority' => 'medium', 'labels' => ['tests'], 'created' => -19, 'started' => -16, 'done' => -14],
                ],
            ],
            [
                'name' => 'Phase 2 · Collaboration',
                'description' => 'Assignees, activity and comments, notifications, labels and search, and the list and calendar views.',
                'color' => Hue::Violet,
                'created' => -16,
                'tasks' => [
                    ['title' => 'Assignees and My tasks', 'by' => 'me', 'who' => 'me', 'priority' => 'high', 'labels' => ['backend', 'frontend'], 'created' => -16, 'started' => -15, 'done' => -13, 'due' => -13,
                        'description' => 'Spec 0004: one assignee per task, a searchable menu in the task sheet, and a My tasks page grouped by day.'],
                    ['title' => 'Activity history and comments', 'by' => 'me', 'who' => 'an', 'priority' => 'high', 'labels' => ['backend'], 'created' => -16, 'started' => -14, 'done' => -11, 'due' => -11,
                        'description' => 'Spec 0005: one event log for the task sheet, the dashboard and notifications; comments with mentions.',
                        'comments' => [['linh', -12, '@Mai Nguyen the folded "2 changes" pill reads well on a phone too.', ['me']]]],
                    ['title' => 'Notifications: bell, panel and page', 'by' => 'an', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['frontend'], 'created' => -14, 'started' => -11, 'done' => -8, 'due' => -9],
                    ['title' => 'Labels with icons', 'by' => 'an', 'who' => 'khoa', 'priority' => 'medium', 'labels' => ['design', 'frontend'], 'created' => -13, 'started' => -10, 'done' => -7,
                        'description' => 'Spec 0007: outline badges with one of 79 Lucide icons instead of a color, at most five per task.'],
                    ['title' => 'Board filters kept in the link', 'by' => 'me', 'who' => 'an', 'priority' => 'low', 'labels' => ['frontend'], 'created' => -12, 'started' => -8, 'done' => -6],
                    ['title' => 'Search with Ctrl K', 'by' => 'an', 'who' => 'me', 'priority' => 'high', 'labels' => ['frontend', 'backend'], 'created' => -12, 'started' => -7, 'done' => -5],
                    ['title' => 'List and calendar views', 'by' => 'me', 'who' => 'khoa', 'priority' => 'high', 'labels' => ['frontend'], 'created' => -10, 'started' => -6, 'done' => -3,
                        'description' => 'Spec 0008: a view switch in the filter row, tinted list sections and a month with a side panel.',
                        'comments' => [['an', -4, 'Dragging a chip to another day saves the due date; Alt and an arrow key moves it a day.']]],
                    ['title' => 'Phone layout for folded lists', 'by' => 'linh', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['phone', 'design'], 'created' => -6, 'due' => 5],
                    ['title' => 'Mention menu loses focus on Safari', 'by' => 'khoa', 'who' => null, 'priority' => 'low', 'labels' => ['bug'], 'created' => -2],
                ],
            ],
            [
                'name' => 'Phase 3 · Advanced',
                'description' => 'Sign in with Google and GitHub, checklists, files and recurring tasks, the AI helpers and production readiness.',
                'color' => Hue::Teal,
                'created' => -4,
                'tasks' => [
                    ['title' => 'Sign in with Google and GitHub', 'by' => 'me', 'who' => 'me', 'priority' => 'high', 'labels' => ['backend', 'security'], 'created' => -4, 'started' => -3, 'done' => -1, 'due' => -1,
                        'description' => 'Spec 0009: Laravel Socialite, connected accounts in Settings, and a rule that keeps one way to sign in.'],
                    ['title' => 'Spec 0010: checklists, attachments and recurring tasks', 'by' => 'me', 'who' => 'me', 'priority' => 'medium', 'labels' => ['docs'], 'created' => -2, 'started' => -2, 'done' => 0],
                    ['title' => 'Checklist items: table, routes and policy', 'by' => 'an', 'who' => 'me', 'priority' => 'high', 'labels' => ['backend'], 'created' => -1, 'started' => 0, 'due' => 0,
                        'description' => 'Up to 50 items per task; checking and unchecking go to the history, nothing else does.'],
                    ['title' => 'Attachments: upload, safe download and cleanup', 'by' => 'me', 'who' => 'an', 'priority' => 'high', 'labels' => ['backend', 'security'], 'created' => -1, 'due' => 2,
                        'description' => 'Files outside public/, served only to the team, 10 MB each and 20 per task; SVG and HTML refused.'],
                    ['title' => 'Repeat rule and the next occurrence', 'by' => 'me', 'who' => 'khoa', 'priority' => 'medium', 'labels' => ['backend'], 'created' => -1, 'due' => 4,
                        'comments' => [
                            ['an', 0, '@Mai Nguyen do we count the next date from the due date or from the day it was done?', ['me']],
                            ['me', 0, 'From the due date, skipping the days already past: decision 2 in the spec.'],
                        ]],
                    ['title' => 'Completing moves a task to Done', 'by' => 'an', 'who' => 'me', 'priority' => 'high', 'labels' => ['frontend', 'backend'], 'created' => -1, 'due' => 3],
                    ['title' => 'AI: split a task into subtasks', 'by' => 'me', 'who' => null, 'priority' => 'medium', 'labels' => ['ai'], 'created' => -1, 'due' => 10],
                    ['title' => 'AI: draft a project plan from a description', 'by' => 'me', 'who' => null, 'priority' => 'low', 'labels' => ['ai'], 'created' => -1, 'due' => 14],
                    ['title' => 'Weekly progress summary', 'by' => 'me', 'who' => 'linh', 'priority' => 'low', 'labels' => ['ai'], 'created' => -1],
                    ['title' => 'Production: PostgreSQL, queue worker and scheduler', 'by' => 'me', 'who' => 'an', 'priority' => 'medium', 'labels' => ['devops'], 'created' => -1, 'due' => 12],
                    ['title' => 'Email notifications: assigned and due soon', 'by' => 'me', 'who' => null, 'priority' => 'medium', 'labels' => ['backend'], 'created' => -1],
                ],
            ],
            [
                'name' => 'Design rounds',
                'description' => 'Interactive wireframes before any code, one round per feature, and the screens the owner picked.',
                'color' => Hue::Pink,
                'created' => -22,
                'tasks' => [
                    ['title' => 'Round 1: dashboard and scrollbars', 'by' => 'me', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['design'], 'created' => -22, 'started' => -22, 'done' => -21],
                    ['title' => 'Round 2: projects and the board', 'by' => 'me', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['design'], 'created' => -21, 'started' => -21, 'done' => -20],
                    ['title' => 'Round 3: sign in and settings', 'by' => 'me', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['design'], 'created' => -20, 'started' => -20, 'done' => -19],
                    ['title' => 'Round 4: My tasks and the assignee field', 'by' => 'me', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['design'], 'created' => -16, 'started' => -16, 'done' => -15],
                    ['title' => 'Round 5: task activity and the Activity card', 'by' => 'me', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['design'], 'created' => -14, 'started' => -14, 'done' => -13],
                    ['title' => 'Round 6: the notification panel and page', 'by' => 'me', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['design'], 'created' => -11, 'started' => -11, 'done' => -10],
                    ['title' => 'Round 7: labels, filters and search', 'by' => 'me', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['design'], 'created' => -10, 'started' => -10, 'done' => -9],
                    ['title' => 'Round 8: list and calendar views', 'by' => 'me', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['design'], 'created' => -8, 'started' => -8, 'done' => -7,
                        'comments' => [['me', -7, 'Going with List 4 and Calendar 4, with the view switch in the filter row.']]],
                    ['title' => 'Round 9: Google and GitHub sign-in', 'by' => 'me', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['design'], 'created' => -5, 'started' => -5, 'done' => -4],
                    ['title' => 'Round 10: checklist, files and repeat', 'by' => 'me', 'who' => 'linh', 'priority' => 'medium', 'labels' => ['design'], 'created' => -2, 'started' => -2, 'done' => -1],
                    ['title' => 'A pass over every screen on a desktop and a phone', 'by' => 'me', 'who' => 'me', 'priority' => 'high', 'labels' => ['design', 'bug'], 'created' => -1, 'started' => -1, 'done' => 0],
                    ['title' => 'Dark theme pass', 'by' => 'me', 'who' => 'linh', 'priority' => 'low', 'labels' => ['design'], 'created' => -6, 'due' => 9],
                    ['title' => 'A landing page for the site root', 'by' => 'linh', 'who' => null, 'priority' => 'medium', 'labels' => ['design'], 'created' => -1, 'due' => 6],
                ],
            ],
            [
                'name' => 'Docs and tooling',
                'description' => 'Specs and ADRs, the README, CI, dependency updates and the fixes that keep the project healthy.',
                'color' => Hue::Amber,
                'created' => -23,
                'tasks' => [
                    ['title' => 'Roadmap, spec and ADR folders', 'by' => 'me', 'who' => 'me', 'priority' => 'medium', 'labels' => ['docs'], 'created' => -23, 'started' => -23, 'done' => -22],
                    ['title' => 'Switch to pnpm and Node 24', 'by' => 'me', 'who' => 'khoa', 'priority' => 'medium', 'labels' => ['devops'], 'created' => -23, 'started' => -23, 'done' => -22],
                    ['title' => 'CI: build, lint, types, Pint, PHPStan and tests', 'by' => 'me', 'who' => 'khoa', 'priority' => 'high', 'labels' => ['devops', 'tests'], 'created' => -23, 'started' => -22, 'done' => -21],
                    ['title' => 'Require PHP 8.4.27 or newer', 'by' => 'an', 'who' => 'an', 'priority' => 'urgent', 'labels' => ['security', 'devops'], 'created' => -21, 'started' => -21, 'done' => -20,
                        'description' => 'ADR 0003: 8.4.0 to 8.4.26 are hit by PHP2Shell, so composer.json refuses them.'],
                    ['title' => 'Dependabot: group minor updates, majors alone', 'by' => 'an', 'who' => 'khoa', 'priority' => 'low', 'labels' => ['devops'], 'created' => -19, 'started' => -19, 'done' => -18],
                    ['title' => 'README: what to do after cloning', 'by' => 'me', 'who' => 'me', 'priority' => 'medium', 'labels' => ['docs'], 'created' => -2, 'started' => -2, 'done' => -1],
                    ['title' => 'Thin scrollbars in every scrolling area', 'by' => 'linh', 'who' => 'linh', 'priority' => 'low', 'labels' => ['design', 'bug'], 'created' => -2, 'started' => -1, 'done' => -1],
                    ['title' => 'Social sign-in landed on a 404', 'by' => 'me', 'who' => 'me', 'priority' => 'urgent', 'labels' => ['bug', 'security'], 'created' => 0, 'started' => 0, 'done' => 0,
                        'description' => 'The callback redirected to /dashboard; dashboards live under the team, at /{team}/dashboard.'],
                    ['title' => 'Sign-in guide: Google shows a client secret only once', 'by' => 'an', 'who' => 'me', 'priority' => 'high', 'labels' => ['docs'], 'created' => -3, 'due' => -1],
                    ['title' => 'Check Safari and Firefox', 'by' => 'me', 'who' => 'khoa', 'priority' => 'medium', 'labels' => ['tests', 'bug'], 'created' => -4, 'due' => -2],
                    ['title' => 'Seed a demo workspace from the project\'s history', 'by' => 'me', 'who' => 'me', 'priority' => 'medium', 'labels' => ['backend', 'docs'], 'created' => -1, 'started' => 0, 'due' => 1],
                ],
            ],
        ];
    }

    /**
     * The owner's personal team holds a small project of their own.
     *
     * @return array<string, mixed>
     */
    public static function personalProject(): array
    {
        return [
            'name' => 'Reading list',
            'description' => 'Things to read and try between tasks.',
            'color' => Hue::Blue,
            'created' => -9,
            'tasks' => [
                ['title' => 'Tailwind 4.3 scrollbar utilities', 'by' => 'me', 'who' => 'me', 'priority' => 'low', 'labels' => [], 'created' => -3, 'started' => -2, 'done' => -1],
                ['title' => 'Try Laravel Herd on Windows', 'by' => 'me', 'who' => 'me', 'priority' => 'low', 'labels' => [], 'created' => -9, 'started' => -2],
                ['title' => 'Read the Inertia 3 upgrade notes', 'by' => 'me', 'who' => 'me', 'priority' => 'none', 'labels' => [], 'created' => -9, 'due' => 3],
            ],
        ];
    }
}
