import { cn } from '@/lib/utils';
import type { IssueStatus } from '@/types';

const statusColors: Record<IssueStatus, string> = {
    backlog: 'text-muted-foreground',
    todo: 'text-foreground/60',
    in_progress: 'text-amber-500',
    in_review: 'text-emerald-500',
    done: 'text-indigo-500',
    canceled: 'text-muted-foreground',
};

/**
 * Circumference of the inner progress circle (r = 2).
 */
const progressCircumference = 2 * Math.PI * 2;

export function IssueStatusIcon({
    status,
    className,
}: {
    status: IssueStatus;
    className?: string;
}) {
    return (
        <svg
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className={cn('size-3.5 shrink-0', statusColors[status], className)}
        >
            {status === 'done' || status === 'canceled' ? (
                <>
                    <circle cx="7" cy="7" r="7" fill="currentColor" />
                    <path
                        d={
                            status === 'done'
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
                            status === 'backlog' ? '1.4 1.74' : undefined
                        }
                    />
                    {status === 'in_progress' || status === 'in_review' ? (
                        <circle
                            cx="7"
                            cy="7"
                            r="2"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeDasharray={`${progressCircumference * (status === 'in_progress' ? 0.5 : 0.75)} ${progressCircumference}`}
                            transform="rotate(-90 7 7)"
                        />
                    ) : null}
                </>
            )}
        </svg>
    );
}
