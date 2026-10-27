import { cn } from '@/lib/utils';
import type { ProjectStatus } from '@/types';

const statusColors: Record<ProjectStatus, string> = {
    planned: 'text-muted-foreground',
    in_progress: 'text-amber-500',
    paused: 'text-foreground/60',
    completed: 'text-indigo-500',
    canceled: 'text-muted-foreground',
};

/**
 * Circumference of the inner progress circle (r = 2).
 */
const progressCircumference = 2 * Math.PI * 2;

/**
 * Drawn like the issue status icons: dashed when planned, half full in
 * progress, two bars when paused, filled when closed.
 */
export function ProjectStatusIcon({
    status,
    className,
}: {
    status: ProjectStatus;
    className?: string;
}) {
    return (
        <svg
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className={cn('size-3.5 shrink-0', statusColors[status], className)}
        >
            {status === 'completed' || status === 'canceled' ? (
                <>
                    <circle cx="7" cy="7" r="7" fill="currentColor" />
                    <path
                        d={
                            status === 'completed'
                                ? 'M4.2 7.3 6.1 9.2 9.8 5.2'
                                : 'M4.8 4.8 9.2 9.2M9.2 4.8 4.8 9.2'
                        }
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </>
            ) : (
                <>
                    <circle
                        cx="7"
                        cy="7"
                        r="6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeDasharray={
                            status === 'planned' ? '1.4 1.74' : undefined
                        }
                    />
                    {status === 'in_progress' ? (
                        <circle
                            cx="7"
                            cy="7"
                            r="2"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeDasharray={`${progressCircumference * 0.5} ${progressCircumference}`}
                            transform="rotate(-90 7 7)"
                        />
                    ) : null}
                    {status === 'paused' ? (
                        <path
                            d="M5.6 4.9v4.2M8.4 4.9v4.2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    ) : null}
                </>
            )}
        </svg>
    );
}
