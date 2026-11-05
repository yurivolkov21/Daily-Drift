import { Form } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { store } from '@/routes/lists';

type Props = {
    teamSlug: string;
    projectId: number;
};

/**
 * A dashed "Add list" button that turns into a name field. It stays open
 * after adding, so several lists can be added in a row.
 */
export function AddList({ teamSlug, projectId }: Props) {
    const [open, setOpen] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-12 w-[19rem] shrink-0 items-center gap-2 rounded-2xl border border-dashed px-4 text-sm text-muted-foreground transition-colors outline-none hover:border-ring/50 hover:bg-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
                <Plus className="size-4" /> Add list
            </button>
        );
    }

    return (
        <div className="w-[19rem] shrink-0 rounded-2xl border bg-card p-2 shadow-xs">
            <Form
                {...store.form({ current_team: teamSlug, project: projectId })}
                options={{ preserveScroll: true }}
                resetOnSuccess
                onSuccess={() => input.current?.focus()}
                className="flex flex-col gap-2"
            >
                {({ errors, processing }) => (
                    <>
                        <Input
                            ref={input}
                            name="name"
                            placeholder="List name"
                            aria-label="List name"
                            maxLength={80}
                            required
                            autoFocus
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    setOpen(false);
                                }
                            }}
                        />
                        <InputError message={errors.name} />
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={processing}
                            >
                                Add list
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}
