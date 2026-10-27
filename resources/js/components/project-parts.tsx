import { Link, router, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronDown,
    Ellipsis,
    Link2,
    ListTodo,
    Pencil,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { MemberAvatar } from '@/components/member-avatar';
import { ProjectIcon } from '@/components/project-icon';
import { ProjectStatusIcon } from '@/components/project-status-icon';
import { PropertyPicker } from '@/components/property-picker';
import type { PropertyOption } from '@/components/property-picker';
import { Avatar, AvatarFallback, AvatarGroup } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useClipboard } from '@/hooks/use-clipboard';
import { useInitials } from '@/hooks/use-initials';
import {
    daysUntilTarget,
    formatTargetDate,
    isProjectClosed,
    isProjectOverdue,
    projectProgress,
    projectStatusLabel,
    projectStatuses,
} from '@/lib/projects';
import { cn } from '@/lib/utils';
import { index as issuesIndex } from '@/routes/issues';
import { update } from '@/routes/projects';
import type { ProjectStatus, ProjectSummary, WorkspaceMember } from '@/types';

export type ProjectActions = {
    edit: (project: ProjectSummary) => void;
    delete: ((project: ProjectSummary) => void) | null;
};

export function projectStatusOptions(
    includeCanceled = true,
): PropertyOption<ProjectStatus>[] {
    return projectStatuses
        .filter((status) => includeCanceled || status.value !== 'canceled')
        .map((status) => ({
            value: status.value,
            label: status.label,
            icon: <ProjectStatusIcon status={status.value} />,
        }));
}

/**
 * Members as lead choices. "No lead" stays plain text, with no avatar.
 */
export function useLeadOptions(): PropertyOption<number | null>[] {
    const members = usePage().props.workspace?.members ?? [];

    return [
        {
            value: null,
            label: 'No lead',
            display: (
                <span className="truncate text-muted-foreground">No lead</span>
            ),
        },
        ...members.map((member) => ({
            value: member.id,
            label: member.name,
            icon: <MemberAvatar name={member.name} className="size-4" />,
        })),
    ];
}

export function useMember(id: number | null): WorkspaceMember | null {
    const members = usePage().props.workspace?.members ?? [];

    return members.find((member) => member.id === id) ?? null;
}

/**
 * Saves one field of a project straight from a row, card or item.
 */
export function useUpdateProject(): (
    project: ProjectSummary,
    data: Record<string, string | number | null>,
) => void {
    const teamSlug = usePage().props.currentTeam?.slug ?? '';

    return (project, data) =>
        router.patch(update.url([teamSlug, project.id]), data, {
            preserveScroll: true,
            preserveState: true,
        });
}

export function useProjectIssuesUrl(): (project: ProjectSummary) => string {
    const teamSlug = usePage().props.currentTeam?.slug ?? '';

    return (project) =>
        issuesIndex.url(teamSlug, { query: { project: project.key } });
}

/**
 * The status as an outline pill that opens the status list (shadcnuikit Table 3).
 */
export function ProjectStatusPill({ project }: { project: ProjectSummary }) {
    const updateProject = useUpdateProject();
    const label = projectStatusLabel(project.status);

    return (
        <PropertyPicker
            trigger={
                <Button
                    variant="outline"
                    size="xs"
                    aria-label={`Status: ${label}`}
                    className="h-7 gap-1.5 px-2.5"
                >
                    <ProjectStatusIcon status={project.status} />
                    {label}
                    <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
            }
            options={projectStatusOptions()}
            selected={[project.status]}
            onSelect={(status) => updateProject(project, { status })}
            placeholder="Set status..."
            searchable={false}
        />
    );
}

/**
 * The status as a quiet uppercase badge that opens the same list.
 */
export function ProjectStatusBadge({ project }: { project: ProjectSummary }) {
    const updateProject = useUpdateProject();
    const label = projectStatusLabel(project.status);

    return (
        <PropertyPicker
            trigger={
                <button
                    type="button"
                    aria-label={`Status: ${label}`}
                    className="-mx-1 inline-flex w-fit shrink-0 items-center gap-1.5 px-1 py-0.5 text-[0.625rem] font-semibold tracking-widest whitespace-nowrap text-muted-foreground uppercase transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 data-popup-open:bg-muted data-popup-open:text-foreground"
                >
                    <ProjectStatusIcon
                        status={project.status}
                        className="size-3"
                    />
                    {label}
                </button>
            }
            options={projectStatusOptions()}
            selected={[project.status]}
            onSelect={(status) => updateProject(project, { status })}
            placeholder="Set status..."
            searchable={false}
        />
    );
}

/**
 * The lead as a small avatar and a muted name, or plain "No lead".
 */
export function ProjectLeadButton({ project }: { project: ProjectSummary }) {
    const updateProject = useUpdateProject();
    const lead = useMember(project.leadId);

    return (
        <PropertyPicker
            trigger={
                <button
                    type="button"
                    aria-label={`Lead: ${lead?.name ?? 'No lead'}`}
                    className="-mx-1.5 flex max-w-full min-w-0 items-center gap-2 px-1.5 py-1 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 data-popup-open:bg-muted"
                >
                    {lead ? (
                        <>
                            <MemberAvatar name={lead.name} className="size-6" />
                            <span className="truncate">{lead.name}</span>
                        </>
                    ) : (
                        <span>No lead</span>
                    )}
                </button>
            }
            options={useLeadOptions()}
            selected={[project.leadId]}
            onSelect={(leadId) => updateProject(project, { lead_id: leadId })}
            placeholder="Find a member..."
        />
    );
}

/**
 * The target date; a late one turns red with a warning sign. With
 * `withIcon`, on-time dates get a calendar glyph so rows line up.
 */
export function ProjectTargetDate({
    project,
    withIcon = false,
    empty = '—',
    className,
}: {
    project: ProjectSummary;
    withIcon?: boolean;
    empty?: string;
    className?: string;
}) {
    if (project.targetDate === null) {
        return (
            <span className={cn('text-muted-foreground', className)}>
                {empty}
            </span>
        );
    }

    const overdue = isProjectOverdue(project);

    return (
        <span
            title={
                overdue
                    ? `${-daysUntilTarget(project.targetDate)} days late`
                    : undefined
            }
            className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums',
                overdue ? 'text-destructive' : 'text-muted-foreground',
                className,
            )}
        >
            {overdue ? (
                <TriangleAlert className="size-3.5" />
            ) : withIcon ? (
                <CalendarDays className="size-3.5" />
            ) : null}
            {formatTargetDate(project.targetDate)}
        </span>
    );
}

/**
 * A slim progress bar filled in the project's color, as shadcnspace
 * table-01 colors each project's bar.
 */
export function ProjectProgressBar({
    project,
    className,
}: {
    project: ProjectSummary;
    className?: string;
}) {
    const { percent } = projectProgress(project);

    return (
        <div
            role="progressbar"
            aria-label={`${project.name} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className={cn(
                'relative flex h-1.5 w-full items-center overflow-x-hidden bg-muted',
                className,
            )}
        >
            <div
                className="h-full transition-all duration-300"
                style={{ width: `${percent}%`, backgroundColor: project.color }}
            />
        </div>
    );
}

/**
 * The people with issues in the project, stacked (shadcnstudio avatar-16).
 */
export function ProjectPeople({
    project,
    max = 3,
    className,
}: {
    project: ProjectSummary;
    max?: number;
    className?: string;
}) {
    const members = usePage().props.workspace?.members ?? [];
    const getInitials = useInitials();
    const people = project.assigneeIds
        .map((id) => members.find((member) => member.id === id))
        .filter((member) => member !== undefined);

    if (people.length === 0) {
        return null;
    }

    return (
        <AvatarGroup className={className}>
            {people.slice(0, max).map((person) => (
                <Tooltip key={person.id}>
                    <TooltipTrigger
                        render={
                            <Avatar
                                tabIndex={0}
                                className="outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                            />
                        }
                    >
                        <AvatarFallback className="text-xs">
                            {getInitials(person.name)}
                        </AvatarFallback>
                    </TooltipTrigger>
                    <TooltipContent>{person.name}</TooltipContent>
                </Tooltip>
            ))}
            {people.length > max ? (
                <Avatar>
                    <AvatarFallback className="text-xs">
                        +{people.length - max}
                    </AvatarFallback>
                </Avatar>
            ) : null}
        </AvatarGroup>
    );
}

/**
 * A short summary on hover (shadcnstudio tooltip-13).
 */
function ProjectPreview({ project }: { project: ProjectSummary }) {
    const { percent } = projectProgress(project);
    const lead = useMember(project.leadId);
    const target = project.targetDate;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                <span className="flex min-w-0 items-center gap-2">
                    <ProjectIcon project={project} size="xs" />
                    <span className="truncate">{project.name}</span>
                </span>
                <span className="tabular-nums">{percent}%</span>
            </div>
            <ProjectProgressBar project={project} className="h-1" />
            <p className="text-sm">
                {project.description || 'No description yet.'}
            </p>
            <p
                className={cn(
                    'flex items-center gap-2 text-xs',
                    isProjectOverdue(project)
                        ? 'text-destructive'
                        : 'text-muted-foreground',
                )}
            >
                <CalendarDays className="size-4" />
                {target === null
                    ? 'No target date'
                    : isProjectOverdue(project)
                      ? `Target ${formatTargetDate(target)}, ${-daysUntilTarget(target)} days late`
                      : isProjectClosed(project)
                        ? `Target ${formatTargetDate(target)}`
                        : `Target ${formatTargetDate(target)}, ${daysUntilTarget(target)} days left`}
            </p>
            <div className="flex items-center justify-between gap-2">
                <ProjectPeople project={project} />
                <span className="ml-auto text-xs text-muted-foreground">
                    {lead ? `Lead: ${lead.name}` : 'No lead'}
                </span>
            </div>
        </div>
    );
}

/**
 * The project name: a link to its issues with a summary on hover.
 */
export function ProjectName({
    project,
    className,
}: {
    project: ProjectSummary;
    className?: string;
}) {
    const issuesUrl = useProjectIssuesUrl();

    return (
        <HoverCard>
            <HoverCardTrigger
                delay={300}
                render={
                    <Link
                        href={issuesUrl(project)}
                        className={cn(
                            'block max-w-full truncate font-medium underline-offset-4 outline-none hover:underline focus-visible:underline',
                            className,
                        )}
                        onClick={(event) => event.stopPropagation()}
                    />
                }
            >
                {project.name}
            </HoverCardTrigger>
            <HoverCardContent align="start">
                <ProjectPreview project={project} />
            </HoverCardContent>
        </HoverCard>
    );
}

/**
 * Edit, open issues, copy link and delete (shadcnuikit Dropdown Menu 8).
 */
export function ProjectMenu({
    project,
    actions,
}: {
    project: ProjectSummary;
    actions: ProjectActions;
}) {
    const issuesUrl = useProjectIssuesUrl();
    const [, copy] = useClipboard();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Actions for ${project.name}`}
                        onClick={(event) => event.stopPropagation()}
                    />
                }
            >
                <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                    {project.key} · {project.name}
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => actions.edit(project)}>
                    <Pencil />
                    Edit project
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href={issuesUrl(project)} />}>
                    <ListTodo />
                    Open issues
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={async () => {
                        const copied = await copy(
                            window.location.origin + issuesUrl(project),
                        );

                        if (copied) {
                            toast.success(`Copied the link to ${project.name}`);
                        }
                    }}
                >
                    <Link2 />
                    Copy link
                </DropdownMenuItem>
                {actions.delete ? (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => actions.delete?.(project)}
                        >
                            <Trash2 />
                            Delete project
                        </DropdownMenuItem>
                    </>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
