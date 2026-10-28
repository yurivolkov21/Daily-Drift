import { usePage } from '@inertiajs/react';
import { CornerDownLeft } from 'lucide-react';
import type { ComponentProps, KeyboardEvent } from 'react';
import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MemberAvatar } from '@/components/member-avatar';
import { Kbd } from '@/components/ui/kbd';
import { Textarea } from '@/components/ui/textarea';
import type { Mention } from '@/lib/mentions';
import { cn } from '@/lib/utils';
import type { WorkspaceMember } from '@/types';

/**
 * The longest list of people the "@" menu shows at once.
 */
const MENU_LIMIT = 6;

const MENU_WIDTH = 256;

/**
 * The CSS that decides where a textarea's text wraps, copied onto a hidden
 * twin to measure where a character sits.
 */
const MIRRORED_STYLES = [
    'box-sizing',
    'width',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'text-transform',
    'word-spacing',
    'tab-size',
];

/**
 * Find where a character of the textarea sits on screen.
 */
function caretPoint(
    textarea: HTMLTextAreaElement,
    position: number,
): { top: number; left: number; height: number } {
    const style = getComputedStyle(textarea);
    const mirror = document.createElement('div');

    for (const property of MIRRORED_STYLES) {
        mirror.style.setProperty(property, style.getPropertyValue(property));
    }

    Object.assign(mirror.style, {
        position: 'absolute',
        visibility: 'hidden',
        top: '0',
        left: '-9999px',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
    });
    mirror.textContent = textarea.value.slice(0, position);

    const marker = document.createElement('span');
    marker.textContent = textarea.value.slice(position) || '.';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const box = textarea.getBoundingClientRect();
    const point = {
        top: box.top + marker.offsetTop - textarea.scrollTop,
        left: box.left + marker.offsetLeft,
        height:
            parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5,
    };

    mirror.remove();

    return point;
}

/**
 * Whether a person matches what was typed after "@": the start of their
 * name or of any word in it.
 */
function matchesQuery(member: WorkspaceMember, query: string): boolean {
    const name = member.name.toLowerCase();
    const needle = query.toLowerCase();

    return (
        name.startsWith(needle) ||
        name.split(/\s+/).some((word) => word.startsWith(needle))
    );
}

type Query = { start: number; text: string; top: number; left: number };

/**
 * A comment box where "@" opens the team's members, laid out like
 * shadcnspace autocomplete-04 (avatar, name, email) in the list look of the
 * app's pickers. Picking someone writes "@Name"; the caller keeps the
 * people it mentions and stores them with writeMentions().
 */
export function MentionTextarea({
    value,
    onValueChange,
    onMention,
    onKeyDown,
    onBlur,
    ...props
}: Omit<ComponentProps<'textarea'>, 'value' | 'onChange'> & {
    value: string;
    onValueChange: (value: string) => void;
    onMention: (mention: Mention) => void;
}) {
    const page = usePage();
    const userId = page.props.auth.user.id;
    const members = (page.props.workspace?.members ?? []).filter(
        ({ id }) => id !== userId,
    );
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const listId = useId();
    const [query, setQuery] = useState<Query | null>(null);
    const [active, setActive] = useState(0);

    const matches =
        query === null
            ? []
            : members
                  .filter((member) => matchesQuery(member, query.text))
                  .slice(0, MENU_LIMIT);
    const open = query !== null && matches.length > 0;

    const detect = (textarea: HTMLTextAreaElement) => {
        const caret = textarea.selectionStart;
        const match =
            caret === textarea.selectionEnd
                ? textarea.value
                      .slice(0, caret)
                      .match(/(?:^|\s)@([^\s@]*(?: [^\s@]*)?)$/)
                : null;

        if (!match) {
            setQuery(null);

            return;
        }

        const start = caret - match[1].length - 1;
        const point = caretPoint(textarea, start);
        const box = textarea.getBoundingClientRect();

        setQuery({
            start,
            text: match[1],
            top: point.top + point.height + 4,
            left: Math.max(
                box.left,
                Math.min(point.left, window.innerWidth - MENU_WIDTH - 8),
            ),
        });
        setActive(0);
    };

    const pick = (member: WorkspaceMember) => {
        const textarea = textareaRef.current;

        if (!textarea || !query) {
            return;
        }

        const insert = `@${member.name} `;
        const position = query.start + insert.length;

        onValueChange(
            value.slice(0, query.start) +
                insert +
                value.slice(textarea.selectionStart),
        );
        onMention({ id: member.id, name: member.name });
        setQuery(null);
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(position, position);
        });
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (open) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setActive(
                    (index) =>
                        (index +
                            (event.key === 'ArrowDown'
                                ? 1
                                : matches.length - 1)) %
                        matches.length,
                );

                return;
            }

            if (
                event.key === 'Tab' ||
                (event.key === 'Enter' && !event.metaKey && !event.ctrlKey)
            ) {
                event.preventDefault();
                pick(matches[Math.min(active, matches.length - 1)]);

                return;
            }

            if (event.key === 'Escape') {
                // Close the list without cancelling the edit around it.
                event.preventDefault();
                event.stopPropagation();
                setQuery(null);

                return;
            }
        }

        onKeyDown?.(event);
    };

    // Open above the line when there is no room below it.
    const menuHeight = 36 + matches.length * 44;
    const menuTop =
        query && query.top + menuHeight > window.innerHeight - 8
            ? query.top - menuHeight - 28
            : (query?.top ?? 0);

    return (
        <>
            <Textarea
                ref={textareaRef}
                {...props}
                value={value}
                aria-autocomplete="list"
                aria-controls={open ? listId : undefined}
                aria-activedescendant={open ? `${listId}-${active}` : undefined}
                onChange={(event) => {
                    onValueChange(event.target.value);
                    detect(event.target);
                }}
                onSelect={(event) => detect(event.currentTarget)}
                onKeyDown={handleKeyDown}
                onBlur={(event) => {
                    setQuery(null);
                    onBlur?.(event);
                }}
            />
            {open
                ? createPortal(
                      <div
                          id={listId}
                          role="listbox"
                          aria-label="Mention someone"
                          className="fixed z-50 bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
                          style={{
                              top: menuTop,
                              left: query.left,
                              width: MENU_WIDTH,
                          }}
                      >
                          <div className="px-2 py-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                              Mention
                          </div>
                          {matches.map((member, index) => (
                              <div
                                  key={member.id}
                                  id={`${listId}-${index}`}
                                  role="option"
                                  aria-selected={index === active}
                                  onMouseDown={(event) => {
                                      // Keep the focus, and the caret, in the comment box.
                                      event.preventDefault();
                                      pick(member);
                                  }}
                                  onMouseEnter={() => setActive(index)}
                                  className={cn(
                                      'flex cursor-default items-center gap-2.5 px-2 py-1.5 text-sm',
                                      index === active &&
                                          'bg-accent text-accent-foreground',
                                  )}
                              >
                                  <MemberAvatar
                                      name={member.name}
                                      className="size-6"
                                  />
                                  <span className="flex min-w-0 flex-col">
                                      <span className="truncate font-medium">
                                          {member.name}
                                      </span>
                                      <span className="truncate text-xs text-muted-foreground">
                                          {member.email}
                                      </span>
                                  </span>
                                  {index === active ? (
                                      <Kbd className="ml-auto">
                                          <CornerDownLeft />
                                      </Kbd>
                                  ) : null}
                              </div>
                          ))}
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
