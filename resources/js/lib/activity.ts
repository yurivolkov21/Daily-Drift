import { format, parseISO } from 'date-fns';
import { PRIORITIES } from '@/lib/tasks';
import type { Priority, TaskEvent } from '@/types';

const day = (value: unknown): string =>
    typeof value === 'string' ? format(parseISO(value), 'd MMM') : '';

const priority = (value: unknown): string =>
    PRIORITIES[value as Priority]?.label ?? String(value);

/** What an event did, for the task sheet: "moved it from To do to Done". */
export function describeEvent(event: TaskEvent): string {
    const { from, to, name, list } = event.properties;

    switch (event.type) {
        case 'task.created':
            return list ? `created the task in ${list}` : 'created the task';
        case 'task.renamed':
            return `renamed it to “${to}”`;
        case 'task.described':
            return 'edited the description';
        case 'task.moved':
            return `moved it from ${from} to ${to}`;
        case 'task.assigned':
            return `assigned it to ${name ?? 'someone'}`;
        case 'task.unassigned':
            return event.actor
                ? `unassigned ${name ?? 'it'}`
                : `${name ?? 'The assignee'} left the team, so it is unassigned`;
        case 'task.priority_changed':
            return to === 'none'
                ? 'removed the priority'
                : `set the priority to ${priority(to)}`;
        case 'task.due_changed':
            if (!to) {
                return 'removed the due date';
            }

            return from
                ? `changed the due date from ${day(from)} to ${day(to)}`
                : `set the due date to ${day(to)}`;
        case 'task.completed':
            return 'completed it';
        case 'task.reopened':
            return 'reopened it';
        default:
            return 'changed it';
    }
}

/**
 * The same event for the team feed, around the task's name:
 * "moved [Event log] to Done".
 */
export function feedPhrase(event: TaskEvent): { verb: string; tail: string } {
    const { to, name } = event.properties;

    switch (event.type) {
        case 'task.created':
            return { verb: 'created', tail: '' };
        case 'task.renamed':
            return { verb: 'renamed', tail: '' };
        case 'task.described':
            return { verb: 'edited the description of', tail: '' };
        case 'task.moved':
            return { verb: 'moved', tail: `to ${to}` };
        case 'task.assigned':
            return { verb: 'assigned', tail: `to ${name ?? 'someone'}` };
        case 'task.unassigned':
            return { verb: 'unassigned', tail: '' };
        case 'task.priority_changed':
            return {
                verb: 'set the priority of',
                tail: `to ${priority(to)}`,
            };
        case 'task.due_changed':
            return {
                verb: to
                    ? 'changed the due date of'
                    : 'removed the due date of',
                tail: to ? `to ${day(to)}` : '',
            };
        case 'task.completed':
            return { verb: 'completed', tail: '' };
        case 'task.reopened':
            return { verb: 'reopened', tail: '' };
        case 'task.deleted':
            return { verb: 'deleted', tail: '' };
        case 'comment.added':
            return { verb: 'commented on', tail: '' };
        default:
            return { verb: 'changed', tail: '' };
    }
}

/**
 * Split a comment into plain text and the `@Name` mentions it holds, longest
 * names first so "@Minh An" wins over "@Minh".
 */
export function splitMentions(
    body: string,
    names: string[],
): { text: string; mention: boolean }[] {
    const tokens = names
        .map((name) => `@${name}`)
        .sort((a, b) => b.length - a.length);
    const parts: { text: string; mention: boolean }[] = [];
    let rest = body;

    while (rest !== '') {
        let at = -1;
        let found = '';

        for (const token of tokens) {
            const index = rest.indexOf(token);

            if (index >= 0 && (at < 0 || index < at)) {
                at = index;
                found = token;
            }
        }

        if (at < 0) {
            parts.push({ text: rest, mention: false });
            break;
        }

        if (at > 0) {
            parts.push({ text: rest.slice(0, at), mention: false });
        }

        parts.push({ text: found, mention: true });
        rest = rest.slice(at + found.length);
    }

    return parts;
}
