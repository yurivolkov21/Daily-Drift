import { router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    CircleAlert,
    Download,
    File,
    FileArchive,
    FileImage,
    FileSpreadsheet,
    FileText,
    MoreHorizontal,
    Paperclip,
    Presentation,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { destroy, show, store } from '@/routes/attachments';
import type { Attachment, Task } from '@/types';

/** Spec 0010: what can be attached, how big, and how many per task. */
export const FILE_LIMIT = 20;
export const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS = [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'pdf',
    'txt',
    'csv',
    'md',
    'markdown',
    'docx',
    'xlsx',
    'pptx',
    'zip',
];
export const ACCEPT = EXTENSIONS.map((extension) => `.${extension}`).join(',');

/** A file on its way up, or one that was refused. */
export type Upload = {
    key: string;
    name: string;
    /** 0 to 100 while it uploads. */
    progress: number;
    /** Why it was refused; the row turns red and can be dismissed. */
    error: string | null;
};

const extensionOf = (name: string) =>
    name.split('.').pop()?.toLowerCase() ?? '';

const sizeText = (bytes: number) =>
    bytes < 1024
        ? `${bytes} B`
        : bytes < 1024 * 1024
          ? `${Math.round(bytes / 1024)} KB`
          : `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;

/** A short type name and an icon for a file's row. */
function kindOf(file: Pick<Attachment, 'name' | 'mimeType' | 'isImage'>): {
    label: string;
    icon: LucideIcon;
    tint: string;
} {
    const extension = extensionOf(file.name).toUpperCase();

    if (file.isImage) {
        return {
            label: extension || 'Image',
            icon: FileImage,
            tint: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
        };
    }

    if (file.mimeType === 'application/pdf') {
        return {
            label: 'PDF',
            icon: FileText,
            tint: 'bg-red-500/10 text-red-700 dark:text-red-300',
        };
    }

    if (
        file.mimeType.includes('spreadsheet') ||
        extension === 'CSV' ||
        extension === 'XLSX'
    ) {
        return {
            label: extension || 'Sheet',
            icon: FileSpreadsheet,
            tint: 'bg-green-500/10 text-green-700 dark:text-green-300',
        };
    }

    if (file.mimeType.includes('presentation') || extension === 'PPTX') {
        return {
            label: 'PPTX',
            icon: Presentation,
            tint: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
        };
    }

    if (file.mimeType.includes('zip') && extension === 'ZIP') {
        return {
            label: 'ZIP',
            icon: FileArchive,
            tint: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
        };
    }

    if (file.mimeType.includes('word') || extension === 'DOCX') {
        return {
            label: 'DOCX',
            icon: FileText,
            tint: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
        };
    }

    return {
        label: extension || 'File',
        icon: file.mimeType.startsWith('text/') ? FileText : File,
        tint: 'bg-secondary text-muted-foreground',
    };
}

/**
 * Uploads for one task: each file goes up on its own with its progress, and
 * a file the app would refuse says why at once (spec 0010).
 */
export function useUploads(
    teamSlug: string,
    task: Pick<Task, 'id' | 'attachments'>,
) {
    const [uploads, setUploads] = useState<Upload[]>([]);
    const counter = useRef(0);

    const patch = useCallback(
        (key: string, change: Partial<Upload> | null) =>
            setUploads((current) =>
                change === null
                    ? current.filter((upload) => upload.key !== key)
                    : current.map((upload) =>
                          upload.key === key
                              ? { ...upload, ...change }
                              : upload,
                      ),
            ),
        [],
    );

    const start = useCallback(
        (files: File[]) => {
            let room =
                FILE_LIMIT -
                task.attachments.length -
                uploads.filter((upload) => upload.error === null).length;

            const added = files.map((file) => {
                counter.current += 1;
                const key = `${task.id}-${counter.current}`;
                let error: string | null = null;

                if (!EXTENSIONS.includes(extensionOf(file.name))) {
                    error = "This type of file can't be attached.";
                } else if (file.size > MAX_BYTES) {
                    error = 'Larger than 10 MB.';
                } else if (room <= 0) {
                    error = `A task holds up to ${FILE_LIMIT} files.`;
                } else {
                    room -= 1;
                }

                return {
                    file,
                    upload: { key, name: file.name, progress: 0, error },
                };
            });

            setUploads((current) => [
                ...current,
                ...added.map((entry) => entry.upload),
            ]);

            added
                .filter((entry) => entry.upload.error === null)
                .forEach(({ file, upload }) => {
                    router.post(
                        store({ current_team: teamSlug, task: task.id }).url,
                        { file },
                        {
                            forceFormData: true,
                            async: true,
                            showProgress: false,
                            preserveScroll: true,
                            preserveState: true,
                            errorBag: `upload-${upload.key}`,
                            onProgress: (progress) =>
                                patch(upload.key, {
                                    progress: Math.min(
                                        99,
                                        progress?.percentage ?? 0,
                                    ),
                                }),
                            onSuccess: () => patch(upload.key, null),
                            onError: (errors) =>
                                patch(upload.key, {
                                    error:
                                        errors.file ??
                                        'The file could not be attached.',
                                }),
                            onHttpException: (response) => {
                                patch(upload.key, {
                                    error:
                                        response.status === 413
                                            ? 'The server refused the file. It may be larger than its upload limit.'
                                            : response.status === 429
                                              ? 'Too many uploads. Try again in a minute.'
                                              : 'The file could not be attached.',
                                });

                                return false;
                            },
                            onNetworkError: () => {
                                patch(upload.key, {
                                    error: 'The connection dropped. Try again.',
                                });

                                return false;
                            },
                        },
                    );
                });
        },
        [teamSlug, task.id, task.attachments.length, uploads, patch],
    );

    return { uploads, start, dismiss: (key: string) => patch(key, null) };
}

/**
 * The task sheet's Attachments block (spec 0010, round 10): one row per file
 * with a thumbnail or an icon, its name, type, size, who added it and when,
 * and Download and Delete. Files can also be dropped anywhere on the sheet.
 */
export function TaskFiles({
    teamSlug,
    task,
    canManage,
    canDeleteAny,
    meId,
    uploads,
    onPick,
    onDismiss,
}: {
    teamSlug: string;
    task: Pick<Task, 'id' | 'attachments'>;
    canManage: boolean;
    canDeleteAny: boolean;
    meId: number;
    uploads: Upload[];
    onPick: (files: File[]) => void;
    onDismiss: (key: string) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [deleting, setDeleting] = useState<Attachment | null>(null);
    const files = task.attachments;

    if (!canManage && files.length === 0) {
        return null;
    }

    const url = (file: Attachment) =>
        show({ current_team: teamSlug, attachment: file.id }).url;
    const canDelete = (file: Attachment) =>
        canManage && (canDeleteAny || file.uploaderId === meId);

    return (
        <section
            aria-labelledby={`files-${task.id}`}
            className="flex flex-col gap-2.5"
        >
            <div className="flex min-h-8 items-center gap-2.5">
                <h3
                    id={`files-${task.id}`}
                    className="flex items-center gap-2 text-sm font-medium"
                >
                    <Paperclip className="size-4 text-muted-foreground" />
                    Attachments
                </h3>
                {files.length > 0 && (
                    <span className="text-[12.5px] font-semibold text-muted-foreground tabular-nums">
                        {files.length}
                    </span>
                )}
                {canManage && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => input.current?.click()}
                        className="ml-auto h-8 gap-1.5 rounded-lg"
                    >
                        <Upload /> Attach files
                    </Button>
                )}
                <input
                    ref={input}
                    type="file"
                    multiple
                    accept={ACCEPT}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="hidden"
                    onChange={(event) => {
                        onPick([...(event.target.files ?? [])]);
                        event.target.value = '';
                    }}
                />
            </div>

            {(files.length > 0 || uploads.length > 0) && (
                <ul aria-label="Files" className="flex flex-col gap-1">
                    {files.map((file) => {
                        const kind = kindOf(file);
                        const Icon = kind.icon;

                        return (
                            <li
                                key={file.id}
                                className="group/file relative flex animate-pop items-center gap-3 rounded-xl border px-2 py-1.5 transition-colors hover:border-primary/25"
                            >
                                <a
                                    href={url(file)}
                                    target={file.isImage ? '_blank' : undefined}
                                    rel="noreferrer"
                                    download={
                                        file.isImage ? undefined : file.name
                                    }
                                    aria-label={
                                        file.isImage
                                            ? `Open ${file.name}`
                                            : `Download ${file.name}`
                                    }
                                    className={cn(
                                        'relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[9px] outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        file.isImage
                                            ? 'bg-secondary'
                                            : kind.tint,
                                    )}
                                >
                                    {file.isImage ? (
                                        <img
                                            src={url(file)}
                                            alt=""
                                            loading="lazy"
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <Icon
                                            className="size-4.5"
                                            aria-hidden="true"
                                        />
                                    )}
                                </a>
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span
                                        title={file.name}
                                        className="truncate text-[13.5px] font-semibold"
                                    >
                                        {file.name}
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {kind.label} · {sizeText(file.size)}
                                        {file.uploaderName &&
                                            ` · ${file.uploaderName}`}
                                        {file.createdAt &&
                                            ` · ${formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}`}
                                    </span>
                                </span>
                                <Button
                                    asChild
                                    variant="ghost"
                                    size="icon-sm"
                                    className="shrink-0 text-muted-foreground opacity-0 group-hover/file:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
                                >
                                    <a
                                        href={url(file)}
                                        target={
                                            file.isImage ? '_blank' : undefined
                                        }
                                        rel="noreferrer"
                                        download={
                                            file.isImage ? undefined : file.name
                                        }
                                        aria-label={`${file.isImage ? 'Open' : 'Download'} ${file.name}`}
                                    >
                                        <Download />
                                    </a>
                                </Button>
                                {canDelete(file) && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`More for ${file.name}`}
                                                className="shrink-0 text-muted-foreground opacity-0 group-hover/file:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
                                            >
                                                <MoreHorizontal />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <a
                                                    href={url(file)}
                                                    target={
                                                        file.isImage
                                                            ? '_blank'
                                                            : undefined
                                                    }
                                                    rel="noreferrer"
                                                    download={
                                                        file.isImage
                                                            ? undefined
                                                            : file.name
                                                    }
                                                >
                                                    <Download />{' '}
                                                    {file.isImage
                                                        ? 'Open'
                                                        : 'Download'}
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onSelect={() =>
                                                    setDeleting(file)
                                                }
                                            >
                                                <Trash2 /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </li>
                        );
                    })}
                    {uploads.map((upload) => (
                        <li
                            key={upload.key}
                            className={cn(
                                'flex animate-pop items-center gap-3 rounded-xl border px-2 py-1.5',
                                upload.error &&
                                    'border-red-500/30 bg-red-500/5',
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'flex size-11 shrink-0 items-center justify-center rounded-[9px]',
                                    upload.error
                                        ? 'bg-red-500/10 text-red-600'
                                        : 'bg-secondary text-muted-foreground',
                                )}
                            >
                                {upload.error ? (
                                    <CircleAlert className="size-5" />
                                ) : (
                                    <Upload className="size-4.5" />
                                )}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                                <span
                                    title={upload.name}
                                    className="truncate text-[13.5px] font-semibold"
                                >
                                    {upload.name}
                                </span>
                                {upload.error ? (
                                    <span
                                        role="alert"
                                        className="text-xs font-medium text-red-700 dark:text-red-400"
                                    >
                                        {upload.error}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <span
                                            role="progressbar"
                                            aria-label={`Uploading ${upload.name}`}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={upload.progress}
                                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
                                        >
                                            <span
                                                className="block h-full rounded-full bg-primary transition-[width] duration-200"
                                                style={{
                                                    width: `${upload.progress}%`,
                                                }}
                                            />
                                        </span>
                                        <span className="text-[11.5px] font-semibold text-muted-foreground tabular-nums">
                                            {upload.progress}%
                                        </span>
                                    </span>
                                )}
                            </span>
                            {upload.error && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Dismiss ${upload.name}`}
                                    onClick={() => onDismiss(upload.key)}
                                    className="shrink-0 text-red-700 hover:bg-red-500/10 dark:text-red-400"
                                >
                                    <X />
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {canManage && (
                <button
                    type="button"
                    onClick={() => input.current?.click()}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-input text-[12.5px] font-semibold text-muted-foreground transition-colors outline-none hover:border-ring/50 hover:bg-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Upload className="size-4" />
                    Drop files here, or attach them
                </button>
            )}
            {canManage && (
                <p className="text-[11.5px] text-muted-foreground">
                    Images, PDF, text, Word, Excel, PowerPoint and ZIP, up to 10
                    MB each and {FILE_LIMIT} per task.
                </p>
            )}

            <AlertDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                        <AlertDialogDescription>
                            “{deleting?.name}” is deleted for everyone in the
                            team. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() =>
                                deleting &&
                                router.visit(
                                    destroy({
                                        current_team: teamSlug,
                                        attachment: deleting.id,
                                    }),
                                    {
                                        preserveScroll: true,
                                        preserveState: true,
                                    },
                                )
                            }
                        >
                            Delete file
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
