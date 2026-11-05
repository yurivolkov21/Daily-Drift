import { Form } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { HuePicker } from '@/components/projects/hue-picker';
import { ProjectTile } from '@/components/projects/project-tile';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Hue } from '@/lib/hues';
import { HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';
import { store, update } from '@/routes/projects';
import type { Project } from '@/types';

const DEFAULT_LISTS: [string, Hue][] = [
    ['To do', 'slate'],
    ['In progress', 'amber'],
    ['Done', 'green'],
];

type Props = {
    teamSlug: string;
    /** The project to edit; leave it out to create one. */
    project?: Project;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function ProjectDialog({
    teamSlug,
    project,
    open,
    onOpenChange,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
                {/* Remount on open so the fields start from the project again. */}
                {open && (
                    <ProjectForm
                        teamSlug={teamSlug}
                        project={project}
                        onDone={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function ProjectForm({
    teamSlug,
    project,
    onDone,
}: {
    teamSlug: string;
    project?: Project;
    onDone: () => void;
}) {
    const [name, setName] = useState(project?.name ?? '');
    const [color, setColor] = useState<Hue>(project?.color ?? 'indigo');
    const action = project
        ? update.form({ current_team: teamSlug, project: project.id })
        : store.form({ current_team: teamSlug });

    return (
        <Form {...action} options={{ preserveScroll: true }} onSuccess={onDone}>
            {({ errors, processing }) => (
                <>
                    <div
                        className={cn(
                            'flex items-center gap-3 border-b px-6 py-5',
                            HUES[color].column,
                        )}
                    >
                        <ProjectTile
                            name={name || 'P'}
                            color={color}
                            className="bg-background shadow-xs"
                        />
                        <DialogHeader className="gap-0.5 text-left">
                            <DialogTitle>
                                {project ? 'Edit project' : 'New project'}
                            </DialogTitle>
                            <DialogDescription>
                                {project
                                    ? 'Change the name, description or color.'
                                    : 'A board for your team, with its own lists and tasks.'}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="grid gap-5 px-6 py-5">
                        <div className="grid gap-2">
                            <Label htmlFor="project-name">Name</Label>
                            <Input
                                id="project-name"
                                name="name"
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                maxLength={120}
                                required
                                autoFocus
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="project-description">
                                Description{' '}
                                <span className="font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </Label>
                            <Textarea
                                id="project-description"
                                name="description"
                                defaultValue={project?.description ?? ''}
                                placeholder="What is this project about?"
                                maxLength={2000}
                                className="min-h-20"
                            />
                            <InputError message={errors.description} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Color</Label>
                            <HuePicker
                                name="color"
                                value={color}
                                onChange={setColor}
                            />
                            <InputError message={errors.color} />
                        </div>

                        {!project && (
                            <div className="grid gap-2">
                                <Label>Starts with these lists</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {DEFAULT_LISTS.map(([list, hue]) => (
                                        <span
                                            key={list}
                                            className={cn(
                                                'rounded-md px-2 py-1 text-xs font-medium',
                                                HUES[hue].pill,
                                            )}
                                        >
                                            {list}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t bg-muted/30 px-6 py-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={processing}>
                            {project ? 'Save changes' : 'Create project'}
                        </Button>
                    </DialogFooter>
                </>
            )}
        </Form>
    );
}
