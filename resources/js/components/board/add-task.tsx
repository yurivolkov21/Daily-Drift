import type { FormComponentRef } from '@inertiajs/core';
import { Form } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { store } from '@/routes/tasks';

type Props = {
    teamSlug: string;
    listId: number;
};

/** "Add task" at the bottom of a column; stays open to add several in a row. */
export function AddTask({ teamSlug, listId }: Props) {
    const [open, setOpen] = useState(false);
    const form = useRef<FormComponentRef>(null);
    const field = useRef<HTMLTextAreaElement>(null);

    if (!open) {
        return (
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(true)}
                className="justify-start text-muted-foreground hover:bg-background/60"
            >
                <Plus /> Add task
            </Button>
        );
    }

    return (
        <Form
            ref={form}
            {...store.form({ current_team: teamSlug, list: listId })}
            options={{ preserveScroll: true, preserveState: true }}
            resetOnSuccess
            onSuccess={() => field.current?.focus()}
            className="flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-xs"
        >
            {({ errors, processing }) => (
                <>
                    <Textarea
                        ref={field}
                        name="title"
                        aria-label="Task title"
                        placeholder="What needs doing?"
                        maxLength={255}
                        rows={2}
                        required
                        autoFocus
                        className="min-h-0 resize-none border-none px-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                form.current?.submit();
                            }

                            if (event.key === 'Escape') {
                                setOpen(false);
                            }
                        }}
                    />
                    <InputError message={errors.title} />
                    <div className="flex items-center gap-2">
                        <Button type="submit" size="sm" disabled={processing}>
                            Add task
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <span className="ml-auto text-xs text-muted-foreground">
                            Enter to add
                        </span>
                    </div>
                </>
            )}
        </Form>
    );
}
