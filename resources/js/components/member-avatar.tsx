import { HUE_NAMES, HUES } from '@/lib/hues';
import { initials } from '@/lib/tasks';
import { cn } from '@/lib/utils';

/**
 * A team member's initials in a soft tile color that stays the same for
 * them everywhere (picked from their id).
 */
export function MemberAvatar({
    id,
    name,
    className,
}: {
    id: number;
    name: string;
    className?: string;
}) {
    const hue = HUE_NAMES[id % HUE_NAMES.length];

    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                HUES[hue].tile,
                className,
            )}
        >
            {initials(name)}
        </span>
    );
}
