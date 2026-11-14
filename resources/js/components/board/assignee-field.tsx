import { usePage } from '@inertiajs/react';
import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { MemberAvatar } from '@/components/member-avatar';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type Member = { id: number; name: string };

function Unassigned({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'size-6 shrink-0 rounded-full border-2 border-dashed border-input',
                className,
            )}
        />
    );
}

/**
 * Who a task is assigned to (spec 0004): a searchable menu with _Assign to
 * me_ first and _Unassigned_ last. Each person shows how many open tasks of
 * this project they already have.
 */
export function AssigneeField({
    members,
    value,
    openCounts,
    disabled = false,
    onChange,
}: {
    members: Member[];
    value: number | null;
    /** Open tasks per member id in this project. */
    openCounts: Record<number, number>;
    disabled?: boolean;
    onChange: (assigneeId: number | null) => void;
}) {
    const { auth } = usePage().props;
    const [open, setOpen] = useState(false);
    const me = members.find((member) => member.id === auth.user.id);
    const others = members.filter((member) => member.id !== auth.user.id);
    const current = members.find((member) => member.id === value) ?? null;

    const pick = (assigneeId: number | null) => {
        setOpen(false);

        if (assigneeId !== value) {
            onChange(assigneeId);
        }
    };

    const openText = (id: number) => {
        const count = openCounts[id] ?? 0;

        return `${count} open in this project`;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Assignee"
                    disabled={disabled}
                    data-test="assignee-trigger"
                    className="flex h-9 w-full min-w-0 items-center gap-2 rounded-md px-3 text-left text-sm outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-70"
                >
                    {current ? (
                        <MemberAvatar id={current.id} name={current.name} />
                    ) : (
                        <Unassigned />
                    )}
                    <span
                        className={cn(
                            'min-w-0 flex-1 truncate',
                            !current && 'text-muted-foreground',
                        )}
                    >
                        {current
                            ? `${current.name}${current.id === auth.user.id ? ' (you)' : ''}`
                            : 'Unassigned'}
                    </span>
                    {!disabled && (
                        <ChevronDown
                            className={cn(
                                'size-4 shrink-0 text-muted-foreground transition-transform duration-300',
                                open && 'rotate-180',
                            )}
                        />
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-(--radix-popover-trigger-width) min-w-64 overflow-hidden rounded-2xl p-0"
            >
                <Command>
                    <CommandInput placeholder="Search people" />
                    <CommandList className="thin-scrollbar max-h-72">
                        <CommandEmpty>Nobody in the team matches.</CommandEmpty>
                        <CommandGroup>
                            {me && (
                                <CommandItem
                                    value={`me ${me.name}`}
                                    onSelect={() => pick(me.id)}
                                    className="gap-2.5 rounded-lg py-2"
                                >
                                    <MemberAvatar
                                        id={me.id}
                                        name={me.name}
                                        className="size-7"
                                    />
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="font-semibold">
                                            Assign to me
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {me.name} · {openText(me.id)}
                                        </span>
                                    </span>
                                    <Check
                                        className={cn(
                                            'text-primary',
                                            value !== me.id && 'opacity-0',
                                        )}
                                    />
                                </CommandItem>
                            )}
                            {others.map((member) => (
                                <CommandItem
                                    key={member.id}
                                    value={`${member.name} ${member.id}`}
                                    onSelect={() => pick(member.id)}
                                    className="gap-2.5 rounded-lg py-2"
                                >
                                    <MemberAvatar
                                        id={member.id}
                                        name={member.name}
                                        className="size-7"
                                    />
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate font-semibold">
                                            {member.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {openText(member.id)}
                                        </span>
                                    </span>
                                    <Check
                                        className={cn(
                                            'text-primary',
                                            value !== member.id && 'opacity-0',
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                            <CommandItem
                                value="unassigned nobody"
                                onSelect={() => pick(null)}
                                className="gap-2.5 rounded-lg py-2"
                            >
                                <Unassigned className="size-7" />
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="font-semibold">
                                        Unassigned
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Nobody owns it yet
                                    </span>
                                </span>
                                <Check
                                    className={cn(
                                        'text-primary',
                                        value !== null && 'opacity-0',
                                    )}
                                />
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
