import type { Hue } from '@/lib/hues';
import { HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';

type Props = {
    name: string;
    color: Hue;
    className?: string;
};

export function ProjectTile({ name, color, className }: Props) {
    return (
        <div
            aria-hidden
            className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-semibold',
                HUES[color].tile,
                className,
            )}
        >
            {name.trim().charAt(0).toUpperCase() || '?'}
        </div>
    );
}
