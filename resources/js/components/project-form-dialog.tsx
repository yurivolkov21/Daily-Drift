import { Form } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
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
import { suggestProjectKey } from '@/lib/issues';
import { store, update } from '@/routes/projects';
import type { ProjectSummary } from '@/types';

type Props = {
    teamSlug: string;
    project?: ProjectSummary | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function ProjectFormDialog({
    teamSlug,
    project = null,
    open,
    onOpenChange,
}: Props) {
    const [name, setName] = useState(project?.name ?? '');
    const [key, setKey] = useState(project?.key ?? '');
    const [keyEdited, setKeyEdited] = useState(project !== null);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <Form
                    {...(project
                        ? update.form([teamSlug, project.id])
                        : store.form(teamSlug))}
                    options={{ preserveScroll: true }}
                    className="space-y-6"
                    onSuccess={() => onOpenChange(false)}
                >
                    {({ errors, processing }) => (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    {project ? 'Edit project' : 'New project'}
                                </DialogTitle>
                                <DialogDescription>
                                    The key prefixes every issue in the project,
                                    like {key || 'DD'}-1.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="project-name">Name</Label>
                                    <Input
                                        id="project-name"
                                        name="name"
                                        data-test="project-name"
                                        placeholder="Daily Drift"
                                        value={name}
                                        onChange={(event) => {
                                            setName(event.target.value);

                                            if (!keyEdited) {
                                                setKey(
                                                    suggestProjectKey(
                                                        event.target.value,
                                                    ),
                                                );
                                            }
                                        }}
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="project-key">Key</Label>
                                    <Input
                                        id="project-key"
                                        name="key"
                                        data-test="project-key"
                                        placeholder="DD"
                                        maxLength={5}
                                        value={key}
                                        onChange={(event) => {
                                            setKeyEdited(true);
                                            setKey(
                                                event.target.value.toUpperCase(),
                                            );
                                        }}
                                        required
                                    />
                                    <InputError message={errors.key} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="project-description">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="project-description"
                                        name="description"
                                        placeholder="What is this project about?"
                                        defaultValue={
                                            project?.description ?? ''
                                        }
                                    />
                                    <InputError message={errors.description} />
                                </div>
                            </div>

                            <DialogFooter className="gap-2">
                                <DialogClose
                                    render={<Button variant="secondary" />}
                                >
                                    Cancel
                                </DialogClose>
                                <Button
                                    type="submit"
                                    data-test="project-submit"
                                    disabled={processing}
                                >
                                    {project ? 'Save' : 'Create project'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
