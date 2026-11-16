import { format, parseISO } from 'date-fns';
import { ruleShort } from '@/lib/repeat';
import { PRIORITIES } from '@/lib/tasks';
import type { Priority, TaskEvent } from '@/types';

const day = (value: unknown): string =>
    typeof value === 'string' ? format(parseISO(value), 'd MMM') : '';

const priority = (value: unknown): string =>
    PRIORITIES[value as Priority]?.label ?? String(value);

const isRule = (value: unknown): value is { unit: string; every: number } =>
    typeof value === 'object' && value !== null && 'unit' in value;

const text = (value: unknown): string =>
    typeof value === 'string' || typeof value === 'number' ? String(value) : '';

/**
 * What an event did, for the task sheet: "moved it from To do to Done".
 * `doneList` names the project's Done list, where completing moves a task.
 */
export function describeEvent(event: TaskEvent, doneList?: string): string {
    const { from, to, name, list } = event.properties;

    switch (event.type) {
        case 'task.created':
            if (event.properties.repeated_from) {
                return `created this occurrence${list ? ` in ${text(list)}` : ''} when the last one was completed`;
            }

            return list
                ? `created the task in ${text(list)}`
                : 'created the task';
        case 'task.renamed':
            return `renamed it to “${text(to)}”`;
        case 'task.described':
            return 'edited the description';
        case 'task.moved':
            return `moved it from ${text(from)} to ${text(to)}`;
        case 'task.assigned':
            return `assigned it to ${text(name) || 'someone'}`;
        case 'task.unassigned':
            return event.actor
                ? `unassigned ${text(name) || 'it'}`
                : `${text(name) || 'The assignee'} left the team, so it is unassigned`;
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
            return from && doneList
                ? `completed it and moved it to ${doneList}`
                : 'completed it';
        case 'task.reopened':
            return to
                ? `reopened it and moved it back to ${text(to)}`
                : 'reopened it';
        case 'task.labeled':
            return `added the label ${text(name)}`.trim();
        case 'task.unlabeled':
            return `removed the label ${text(name)}`.trim();
        case 'task.repeat_changed':
            return isRule(to)
                ? `set it to repeat ${ruleShort(to)}`
                : 'stopped the repeat';
        case 'checklist.checked':
            return `checked “${text(event.properties.text)}”`;
        case 'checklist.unchecked':
            return `unchecked “${text(event.properties.text)}”`;
        case 'attachment.added':
            return `attached ${text(name)}`;
        case 'attachment.removed':
            return `removed the file ${text(name)}`;
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
            return event.properties.repeated_from
                ? { verb: 'created the next occurrence of', tail: '' }
                : { verb: 'created', tail: '' };
        case 'task.renamed':
            return { verb: 'renamed', tail: '' };
        case 'task.described':
            return { verb: 'edited the description of', tail: '' };
        case 'task.moved':
            return { verb: 'moved', tail: `to ${text(to)}` };
        case 'task.assigned':
            return { verb: 'assigned', tail: `to ${text(name) || 'someone'}` };
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
        case 'task.labeled':
            return { verb: `added the label ${text(name)} to`, tail: '' };
        case 'task.unlabeled':
            return { verb: `removed the label ${text(name)} from`, tail: '' };
        case 'comment.added':
            return { verb: 'commented on', tail: '' };
        case 'task.repeat_changed':
            return isRule(to)
                ? { verb: 'set', tail: `to repeat ${ruleShort(to)}` }
                : { verb: 'stopped the repeat of', tail: '' };
        case 'checklist.checked':
            return {
                verb: `checked “${text(event.properties.text)}” on`,
                tail: '',
            };
        case 'checklist.unchecked':
            return {
                verb: `unchecked “${text(event.properties.text)}” on`,
                tail: '',
            };
        case 'attachment.added':
            return { verb: `attached ${text(name)} to`, tail: '' };
        case 'attachment.removed':
            return { verb: `removed ${text(name)} from`, tail: '' };
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
