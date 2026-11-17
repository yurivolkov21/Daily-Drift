import { useHttp } from '@inertiajs/react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
    CalendarClock,
    CheckCheck,
    Copy,
    ScrollText,
    Sparkles,
    TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { aiError } from '@/lib/ai';
import { cn } from '@/lib/utils';
import { show, store } from '@/routes/ai/summary';
import type { Project, ProjectSummary } from '@/types';

type Props = {
    teamSlug: string;
    project: Pick<Project, 'id' | 'name'>;
    /** Whether the viewer may have Claude write a new summary. */
    canWrite: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/**
 * Weekly summary (spec 0011): the project's saved summary of the last 7
 * days, which any member can have Claude write again.
 */
export function WeeklySummaryDialog({
    teamSlug,
    project,
    canWrite,
    open,
    onOpenChange,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
                {open && (
                    <WeeklySummary
                        teamSlug={teamSlug}
                        project={project}
                        canWrite={canWrite}
                        onDone={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

const range = (summary: ProjectSummary) =>
    `${format(parseISO(summary.startsOn), 'd MMM')} to ${format(parseISO(summary.endsOn), 'd MMM yyyy')}`;

/** The summary as plain text, for a chat or an email. */
const asText = (projectName: string, summary: ProjectSummary) =>
    [
        `Weekly summary: ${projectName} (${range(summary)})`,
        summary.headline,
        ...(
            [
                ['Done', summary.done],
                ['At risk', summary.risks],
                ['Next', summary.next],
            ] as const
        )
            .filter(([, points]) => points.length > 0)
            .map(
                ([title, points]) =>
                    `\n${title}\n${points.map((point) => `- ${point}`).join('\n')}`,
            ),
    ].join('\n');

function WeeklySummary({
    teamSlug,
    project,
    canWrite,
    onDone,
}: Omit<Props, 'open' | 'onOpenChange'> & { onDone: () => void }) {
    const { submit } = useHttp();
    const [summary, setSummary] = useState<ProjectSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [writing, setWriting] = useState(false);
    const [notice, setNotice] = useState<{
        text: string;
        tone: 'info' | 'error';
    } | null>(null);
    const parameters = { current_team: teamSlug, project: project.id };

    const load = useCallback(async () => {
        try {
            const reply = (await submit(
                show({ current_team: teamSlug, project: project.id }),
            )) as { summary: ProjectSummary | null };
            setSummary(reply.summary);
        } catch (error) {
            setNotice({ text: aiError(error), tone: 'error' });
        } finally {
            setLoading(false);
        }
    }, [submit, teamSlug, project.id]);

    useEffect(() => {
        void load();
    }, [load]);

    const write = async () => {
        setNotice(null);
        setWriting(true);

        try {
            // A quiet week or a refusal is a 422, which resolves without a reply.
            const reply = (await submit(store(parameters), {
                onError: (errors) =>
                    setNotice(
                        errors.summary
                            ? { text: errors.summary, tone: 'info' }
                            : {
                                  text:
                                      Object.values(errors)[0] ??
                                      'Something went wrong. Try again.',
                                  tone: 'error',
                              },
                    ),
            })) as { summary: ProjectSummary } | undefined;

            if (reply) {
                setSummary(reply.summary);
            }
        } catch (error) {
            setNotice({ text: aiError(error), tone: 'error' });
        } finally {
            setWriting(false);
        }
    };

    const copy = async () => {
        if (!summary) {
            return;
        }

        try {
            await navigator.clipboard.writeText(asText(project.name, summary));
            toast.success('Copied the summary.');
        } catch {
            toast.error('The summary could not be copied.');
        }
    };

    return (
        <>
            <div className="flex items-center gap-3 border-b bg-primary/[0.04] px-6 py-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ScrollText className="size-5" />
                </span>
                <DialogHeader className="min-w-0 gap-0.5 text-left">
                    <DialogTitle>Weekly summary</DialogTitle>
                    <DialogDescription>
                        {summary
                            ? `${range(summary)} · ${summary.author ? `asked for by ${summary.author.name}, ` : ''}${formatDistanceToNow(new Date(summary.writtenAt), { addSuffix: true })}`
                            : `The last 7 days of ${project.name}.`}
                    </DialogDescription>
                </DialogHeader>
            </div>

            <div
                aria-live="polite"
                aria-busy={loading || writing}
                className="flex thin-scrollbar max-h-[min(62vh,34rem)] flex-col gap-5 overflow-y-auto px-6 py-5"
            >
                {(loading || writing) && (
                    <div className="flex flex-col gap-3">
                        {writing && (
                            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                                <Spinner className="text-primary" />
                                Claude is writing the summary. This can take up
                                to a minute.
                            </p>
                        )}
                        <Skeleton className="h-5 w-4/5" />
                        <Skeleton className="h-3.5 w-11/12" />
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3.5 w-5/6" />
                    </div>
                )}

                {!loading && !writing && summary && (
                    <>
                        <p className="text-[15px] leading-snug font-semibold text-balance">
                            {summary.headline}
                        </p>
                        <Points
                            icon={<CheckCheck />}
                            title="Done"
                            tone="text-green-600 dark:text-green-400"
                            points={summary.done}
                            empty="Nothing was finished in these 7 days."
                        />
                        <Points
                            icon={<TriangleAlert />}
                            title="At risk"
                            tone="text-amber-600 dark:text-amber-400"
                            points={summary.risks}
                            empty="Nothing looks at risk."
                        />
                        <Points
                            icon={<CalendarClock />}
                            title="Next"
                            tone="text-primary"
                            points={summary.next}
                            empty="Nothing is planned next."
                        />
                    </>
                )}

                {!loading && !writing && !summary && (
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        <p className="font-semibold text-foreground">
                            No summary yet.
                        </p>
                        <p>
                            Claude reads the last 7 days of this project&apos;s
                            history and its open tasks, then writes what got
                            done, what is at risk and what comes next. The
                            summary is saved for the whole team.
                        </p>
                        <p className="text-[12.5px]">
                            Comments and file contents are not sent, only that
                            someone commented or attached a file.
                        </p>
                    </div>
                )}

                {notice && (
                    <p
                        role={notice.tone === 'error' ? 'alert' : 'status'}
                        className={cn(
                            'rounded-lg px-3 py-2 text-[13px]',
                            notice.tone === 'error'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-muted text-muted-foreground',
                        )}
                    >
                        {notice.text}
                    </p>
                )}
            </div>

            <DialogFooter className="border-t bg-muted/30 px-6 py-4 sm:justify-between">
                <Button
                    type="button"
                    variant="outline"
                    onClick={summary ? () => void copy() : onDone}
                    disabled={writing}
                    className="max-sm:order-last"
                >
                    {summary ? (
                        <>
                            <Copy /> Copy
                        </>
                    ) : (
                        'Close'
                    )}
                </Button>
                {canWrite && (
                    <Button
                        type="button"
                        onClick={() => void write()}
                        disabled={loading || writing}
                    >
                        {writing ? <Spinner /> : <Sparkles />}
                        {summary ? 'Write a new summary' : 'Write the summary'}
                    </Button>
                )}
            </DialogFooter>
        </>
    );
}

function Points({
    icon,
    title,
    tone,
    points,
    empty,
}: {
    icon: ReactNode;
    title: string;
    tone: string;
    points: string[];
    empty: string;
}) {
    return (
        <section className="flex flex-col gap-2">
            <h3
                className={cn(
                    'flex items-center gap-2 text-[12.5px] font-bold tracking-wide uppercase [&_svg]:size-4',
                    tone,
                )}
            >
                {icon}
                {title}
            </h3>
            {points.length > 0 ? (
                <ul className="flex flex-col gap-1.5 pl-1">
                    {points.map((point) => (
                        <li
                            key={point}
                            className="flex gap-2.5 text-[13.5px] leading-snug"
                        >
                            <span
                                aria-hidden="true"
                                className="mt-[7px] size-1.5 shrink-0 rounded-full bg-current opacity-40"
                            />
                            {point}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="pl-1 text-[13px] text-muted-foreground">
                    {empty}
                </p>
            )}
        </section>
    );
}
