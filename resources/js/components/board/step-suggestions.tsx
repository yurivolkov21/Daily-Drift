import { useHttp } from '@inertiajs/react';
import { Plus, RotateCcw, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { aiError } from '@/lib/ai';
import { cn } from '@/lib/utils';
import { steps } from '@/routes/ai';

type Suggestion = { text: string; keep: boolean };

type State =
    | { status: 'closed' }
    | { status: 'loading' }
    | { status: 'ready'; suggestions: Suggestion[] }
    | { status: 'failed'; message: string };

/**
 * Suggest steps (spec 0011): Claude drafts checklist steps for a task, and
 * the person keeps the ones they want. Nothing is saved here; the
 * checklist adds the kept steps.
 */
export function useStepSuggestions(teamSlug: string, taskId: number) {
    const { submit } = useHttp();
    const [state, setState] = useState<State>({ status: 'closed' });

    const suggest = useCallback(async () => {
        setState({ status: 'loading' });

        try {
            // A 422 (a refusal) resolves without a reply, through onError.
            const reply = (await submit(
                steps({ current_team: teamSlug, task: taskId }),
                {
                    onError: (errors) =>
                        setState({
                            status: 'failed',
                            message:
                                Object.values(errors)[0] ??
                                'Something went wrong. Try again.',
                        }),
                },
            )) as { steps: string[] } | undefined;

            if (reply) {
                setState({
                    status: 'ready',
                    suggestions: reply.steps.map((text) => ({
                        text,
                        keep: true,
                    })),
                });
            }
        } catch (error) {
            setState({ status: 'failed', message: aiError(error) });
        }
    }, [submit, teamSlug, taskId]);

    const toggle = (index: number) =>
        setState((current) =>
            current.status === 'ready'
                ? {
                      ...current,
                      suggestions: current.suggestions.map((entry, other) =>
                          other === index
                              ? { ...entry, keep: !entry.keep }
                              : entry,
                      ),
                  }
                : current,
        );

    return {
        state,
        suggest,
        toggle,
        close: () => setState({ status: 'closed' }),
    };
}

/**
 * The tinted panel under the checklist's header: Claude writing, the
 * suggestions with a checkbox each, or why there are none.
 */
export function StepSuggestions({
    state,
    onToggle,
    onAdd,
    onRetry,
    onClose,
}: {
    state: State;
    onToggle: (index: number) => void;
    onAdd: (steps: string[]) => void;
    onRetry: () => void;
    onClose: () => void;
}) {
    const section = useRef<HTMLElement>(null);

    // The panel opens under the header, which may be below the sheet's fold.
    useEffect(() => {
        if (state.status === 'loading' || state.status === 'ready') {
            section.current?.scrollIntoView({
                block: 'nearest',
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                    .matches
                    ? 'auto'
                    : 'smooth',
            });
        }
    }, [state.status]);

    if (state.status === 'closed') {
        return null;
    }

    const kept =
        state.status === 'ready'
            ? state.suggestions.filter((entry) => entry.keep)
            : [];

    return (
        <section
            ref={section}
            aria-label="Suggested steps"
            aria-busy={state.status === 'loading'}
            className="flex animate-pop flex-col gap-2 rounded-xl border border-primary/15 bg-primary/4 p-2.5"
        >
            <div className="flex min-h-7 items-center gap-2 pl-1">
                <Sparkles className="size-3.5 text-primary" />
                <span className="text-[12.5px] font-semibold">
                    Suggested steps
                </span>
                <span
                    aria-live="polite"
                    className="text-[12.5px] text-muted-foreground"
                >
                    {state.status === 'loading' && 'Claude is writing…'}
                    {state.status === 'ready' &&
                        state.suggestions.length > 0 &&
                        `${kept.length} of ${state.suggestions.length} chosen`}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close the suggestions"
                    onClick={onClose}
                    className="ml-auto size-7 text-muted-foreground"
                >
                    <X />
                </Button>
            </div>

            {state.status === 'loading' && (
                <ul className="flex flex-col gap-2 px-1 pb-1">
                    {[78, 64, 70].map((width) => (
                        <li key={width} className="flex items-center gap-2.5">
                            <Skeleton className="size-4 rounded-[5px]" />
                            <Skeleton
                                className="h-3.5"
                                style={{ width: `${width}%` }}
                            />
                        </li>
                    ))}
                </ul>
            )}

            {state.status === 'failed' && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                    <p className="flex-1 text-[12.5px] text-destructive">
                        {state.message}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onRetry}
                        className="h-7 rounded-lg bg-card text-[12.5px]"
                    >
                        <RotateCcw /> Try again
                    </Button>
                </div>
            )}

            {state.status === 'ready' && state.suggestions.length === 0 && (
                <p className="px-1 pb-1 text-[12.5px] text-muted-foreground">
                    Claude had no new steps for this task.
                </p>
            )}

            {state.status === 'ready' && state.suggestions.length > 0 && (
                <>
                    <ul className="flex flex-col gap-px">
                        {state.suggestions.map((entry, index) => (
                            <li key={`${index}-${entry.text}`}>
                                <label
                                    className={cn(
                                        'flex min-h-9 cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-2 text-[13.5px] transition-colors hover:bg-card',
                                        !entry.keep && 'text-muted-foreground',
                                    )}
                                >
                                    <Checkbox
                                        checked={entry.keep}
                                        onCheckedChange={() => onToggle(index)}
                                        className="mt-px bg-card"
                                    />
                                    <span
                                        className={cn(
                                            'min-w-0 flex-1 leading-snug wrap-break-word',
                                            !entry.keep && 'line-through',
                                        )}
                                    >
                                        {entry.text}
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-wrap items-center gap-1.5 px-1">
                        <Button
                            type="button"
                            size="sm"
                            disabled={kept.length === 0}
                            onClick={() =>
                                onAdd(kept.map((entry) => entry.text))
                            }
                            className="h-8 rounded-lg"
                        >
                            <Plus />
                            {kept.length === 1
                                ? 'Add 1 step'
                                : `Add ${kept.length} steps`}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onRetry}
                            className="h-8 rounded-lg text-muted-foreground"
                        >
                            <RotateCcw /> Try again
                        </Button>
                    </div>
                </>
            )}
        </section>
    );
}
