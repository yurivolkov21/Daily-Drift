import { Form } from '@inertiajs/react';
import { useState } from 'react';
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
import { destroy } from '@/routes/projects';
import type { Project } from '@/types';

type Props = {
    teamSlug: string;
    project: Project;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function DeleteProjectDialog({
    teamSlug,
    project,
    open,
    onOpenChange,
}: Props) {
    const [confirmation, setConfirmation] = useState('');

    const handleOpenChange = (next: boolean) => {
        onOpenChange(next);

        if (!next) {
            setConfirmation('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <Form
                    {...destroy.form({
                        current_team: teamSlug,
                        project: project.id,
                    })}
                    className="space-y-6"
                    onSuccess={() => handleOpenChange(false)}
                >
                    {({ processing }) => (
                        <>
                            <DialogHeader>
                                <DialogTitle>Delete this project?</DialogTitle>
                                <DialogDescription>
                                    This deletes <strong>{project.name}</strong>{' '}
                                    with its {project.lists.length} lists and
                                    all their tasks. It cannot be undone;
                                    archive the project instead to keep it
                                    read-only.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-2">
                                <Label htmlFor="delete-project-confirmation">
                                    Type <strong>{project.name}</strong> to
                                    confirm
                                </Label>
                                <Input
                                    id="delete-project-confirmation"
                                    value={confirmation}
                                    onChange={(event) =>
                                        setConfirmation(event.target.value)
                                    }
                                    autoComplete="off"
                                />
                            </div>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={
                                        processing ||
                                        confirmation !== project.name
                                    }
                                >
                                    Delete project
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
