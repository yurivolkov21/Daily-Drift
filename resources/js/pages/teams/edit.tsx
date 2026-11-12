import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ArrowRight, Check, ChevronDown, Mail } from 'lucide-react';
import { useState } from 'react';
import DeleteTeamModal from '@/components/delete-team-modal';
import InputError from '@/components/input-error';
import { TeamLabels } from '@/components/labels/team-labels';
import RemoveMemberModal from '@/components/remove-member-modal';
import { SegmentedTabs } from '@/components/segmented-tabs';
import {
    BUTTON,
    DANGER,
    Divider,
    FIELD,
    Pill,
    SettingsSection,
    SubHeading,
} from '@/components/settings/section';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useInitials } from '@/hooks/use-initials';
import { settingsCrumbs } from '@/lib/breadcrumbs';
import { HUE_NAMES, HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';
import { edit, index, update } from '@/routes/teams';
import {
    destroy as cancelInvitation,
    store as storeInvitation,
} from '@/routes/teams/invitations';
import { update as updateMember } from '@/routes/teams/members';
import type {
    RoleOption,
    Team,
    TeamInvitation,
    TeamMember,
    TeamLabel,
    TeamPermissions,
} from '@/types';

type Props = {
    team: Team;
    members: TeamMember[];
    invitations: TeamInvitation[];
    permissions: TeamPermissions;
    availableRoles: RoleOption[];
    labels: TeamLabel[];
    canManageLabels: boolean;
};

const YOU_ARE: Record<string, string> = {
    owner: 'You are the owner',
    admin: 'You are an admin',
    member: 'You are a member',
};

/** Invitations offer the everyday role first. */
const INVITE_ORDER = ['member', 'admin'];

const ROLE_HINTS: Record<string, string> = {
    admin: 'Renames the team, invites people and manages projects',
    member: 'Works on boards, cannot manage the team',
};

export default function TeamEdit({
    team,
    members,
    invitations,
    permissions,
    availableRoles,
    labels,
    canManageLabels,
}: Props) {
    const { auth } = usePage().props;
    const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(
        null,
    );
    const [deleteOpen, setDeleteOpen] = useState(false);
    const me = members.find((member) => member.id === auth.user.id);
    const canManageMembers =
        permissions.canUpdateMember || permissions.canRemoveMember;
    const canDelete = permissions.canDeleteTeam && !team.isPersonal;

    return (
        <>
            <Head title={team.name} />

            <SettingsSection
                id="team"
                title={`Team · ${team.name}`}
                description="Owners and admins can manage the team. Everyone can see every board."
                aside={
                    <div className="flex items-center gap-3">
                        {me && <Pill tone="indigo">{YOU_ARE[me.role]}</Pill>}
                        <Link
                            href={index()}
                            className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary no-underline"
                        >
                            All teams{' '}
                            <ArrowRight
                                className="size-3.5"
                                aria-hidden="true"
                            />
                        </Link>
                    </div>
                }
            >
                {permissions.canUpdateTeam && (
                    <Form
                        {...update.form(team.slug)}
                        options={{ preserveScroll: true }}
                        className="grid max-w-[420px] gap-2"
                    >
                        {({ errors, processing, isDirty }) => (
                            <>
                                <Label htmlFor="team-name">Team name</Label>
                                <div className="flex gap-2.5">
                                    <Input
                                        id="team-name"
                                        name="name"
                                        data-test="team-name-input"
                                        defaultValue={team.name}
                                        required
                                        className={FIELD}
                                    />
                                    <Button
                                        type="submit"
                                        data-test="team-save-button"
                                        disabled={processing || !isDirty}
                                        className={cn(BUTTON, 'h-11')}
                                    >
                                        {processing && <Spinner />}
                                        Save
                                    </Button>
                                </div>
                                <span className="text-[12.5px] text-muted-foreground">
                                    Address:{' '}
                                    <strong className="font-semibold text-foreground">
                                        /{team.slug}
                                    </strong>
                                    . Renaming the team changes it.
                                </span>
                                <InputError message={errors.name} />
                            </>
                        )}
                    </Form>
                )}

                {permissions.canUpdateTeam && <Divider />}

                <div className="flex flex-col gap-1">
                    <h3 className="mb-1.5 text-[14.5px] font-bold">
                        Members{' '}
                        <span className="font-medium text-muted-foreground">
                            {members.length}
                        </span>
                    </h3>
                    <ul className="flex flex-col gap-1">
                        {members.map((member) => (
                            <MemberRow
                                key={member.id}
                                member={member}
                                isYou={member.id === auth.user.id}
                                roles={availableRoles}
                                canChangeRole={permissions.canUpdateMember}
                                canRemove={permissions.canRemoveMember}
                                menu={canManageMembers}
                                onRole={(role) =>
                                    router.visit(
                                        updateMember([team.slug, member.id]),
                                        {
                                            data: { role },
                                            preserveScroll: true,
                                        },
                                    )
                                }
                                onRemove={() => setMemberToRemove(member)}
                            />
                        ))}
                    </ul>
                </div>

                {(permissions.canCreateInvitation ||
                    invitations.length > 0) && (
                    <Invitations
                        team={team}
                        invitations={invitations}
                        roles={availableRoles}
                        canInvite={permissions.canCreateInvitation}
                        canCancel={permissions.canCancelInvitation}
                    />
                )}

                <Divider />
                <TeamLabels
                    teamSlug={team.slug}
                    labels={labels}
                    canManage={canManageLabels}
                />

                {canDelete && (
                    <>
                        <Divider />
                        <div className="flex flex-wrap items-center justify-between gap-3.5">
                            <SubHeading
                                title={
                                    <span className="text-rose-700 dark:text-rose-400">
                                        Delete team
                                    </span>
                                }
                                description="Removes the team with its projects, lists and tasks. This cannot be undone."
                            />
                            <Button
                                type="button"
                                data-test="delete-team-button"
                                onClick={() => setDeleteOpen(true)}
                                className={cn(BUTTON, DANGER)}
                            >
                                Delete team
                            </Button>
                        </div>
                    </>
                )}
            </SettingsSection>

            <RemoveMemberModal
                team={team}
                member={memberToRemove}
                open={memberToRemove !== null}
                onOpenChange={(open) => !open && setMemberToRemove(null)}
            />

            {canDelete && (
                <DeleteTeamModal
                    team={team}
                    open={deleteOpen}
                    onOpenChange={setDeleteOpen}
                />
            )}
        </>
    );
}

function MemberRow({
    member,
    isYou,
    roles,
    canChangeRole,
    canRemove,
    menu,
    onRole,
    onRemove,
}: {
    member: TeamMember;
    isYou: boolean;
    roles: RoleOption[];
    canChangeRole: boolean;
    canRemove: boolean;
    menu: boolean;
    onRole: (role: string) => void;
    onRemove: () => void;
}) {
    const getInitials = useInitials();
    const hue = HUE_NAMES[member.id % HUE_NAMES.length];
    const fixed = member.role === 'owner' || !menu;

    return (
        <li
            data-test="member-row"
            className="flex items-center gap-3.5 rounded-[14px] p-2.5 transition-colors hover:bg-muted/70"
        >
            <span
                aria-hidden="true"
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    HUES[hue].tile,
                )}
            >
                {getInitials(member.name)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold">
                    {member.name}
                    {isYou && (
                        <span className="font-normal text-muted-foreground">
                            {' '}
                            (you)
                        </span>
                    )}
                </span>
                <span className="truncate text-[12.5px] text-muted-foreground">
                    {member.email}
                </span>
            </span>
            {fixed ? (
                <span
                    className={cn(
                        'flex h-[34px] items-center rounded-[10px] px-3 text-[13px] font-semibold',
                        member.role === 'owner'
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground',
                    )}
                >
                    {member.role_label}
                </span>
            ) : (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            data-test="member-role-trigger"
                            aria-label={`Role for ${member.name}: ${member.role_label}`}
                            className="group flex h-[34px] items-center gap-1.5 rounded-[10px] border bg-card pr-2.5 pl-3 text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary"
                        >
                            {member.role_label}
                            <ChevronDown className="size-3.5 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-60 rounded-[14px] p-1.5"
                    >
                        {canChangeRole &&
                            roles.map((role) => (
                                <DropdownMenuItem
                                    key={role.value}
                                    data-test="member-role-option"
                                    onSelect={() =>
                                        role.value !== member.role &&
                                        onRole(role.value)
                                    }
                                    className="items-start gap-2.5 rounded-[10px] px-2.5 py-2"
                                >
                                    <span className="flex flex-1 flex-col gap-0.5">
                                        <span className="text-[13.5px] font-semibold">
                                            {role.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {ROLE_HINTS[role.value]}
                                        </span>
                                    </span>
                                    <Check
                                        className={cn(
                                            'mt-0.5 size-[15px] text-primary',
                                            role.value !== member.role &&
                                                'opacity-0',
                                        )}
                                    />
                                </DropdownMenuItem>
                            ))}
                        {canChangeRole && canRemove && (
                            <DropdownMenuSeparator />
                        )}
                        {canRemove && (
                            <DropdownMenuItem
                                data-test="member-remove-button"
                                onSelect={onRemove}
                                className="flex-col items-start gap-0.5 rounded-[10px] px-2.5 py-2"
                            >
                                <span className="text-[13.5px] font-semibold text-rose-700 dark:text-rose-400">
                                    Remove from team
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    They lose access to every board
                                </span>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </li>
    );
}

function Invitations({
    team,
    invitations,
    roles,
    canInvite,
    canCancel,
}: {
    team: Team;
    invitations: TeamInvitation[];
    roles: RoleOption[];
    canInvite: boolean;
    canCancel: boolean;
}) {
    const [role, setRole] = useState<RoleOption['value']>('member');

    return (
        <div className="flex flex-col gap-3 rounded-2xl bg-muted p-4">
            <h3 className="text-[14.5px] font-bold">
                {canInvite ? 'Invite people' : 'Pending invitations'}
            </h3>
            {canInvite && (
                <Form
                    {...storeInvitation.form(team.slug)}
                    options={{ preserveScroll: true }}
                    resetOnSuccess={['email']}
                    className="flex flex-col gap-2"
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="flex flex-wrap gap-2.5">
                                <Input
                                    name="email"
                                    type="email"
                                    required
                                    data-test="invite-email"
                                    aria-label="Email to invite"
                                    placeholder="name@example.com"
                                    aria-invalid={Boolean(errors.email)}
                                    className="h-11 min-w-0 flex-[1_1_16rem] rounded-xl bg-card"
                                />
                                <input type="hidden" name="role" value={role} />
                                <SegmentedTabs
                                    label="Invite as"
                                    options={[...roles]
                                        .sort(
                                            (a, b) =>
                                                INVITE_ORDER.indexOf(a.value) -
                                                INVITE_ORDER.indexOf(b.value),
                                        )
                                        .map((option) => ({
                                            value: option.value,
                                            label: option.label,
                                        }))}
                                    value={role}
                                    onChange={setRole}
                                />
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    data-test="invite-submit"
                                    className={cn(BUTTON, 'h-11')}
                                >
                                    {processing && <Spinner />}
                                    Send invite
                                </Button>
                            </div>
                            <InputError message={errors.email || errors.role} />
                        </>
                    )}
                </Form>
            )}
            {invitations.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {invitations.map((invitation) => (
                        <li
                            key={invitation.code}
                            data-test="invitation-row"
                            className="flex animate-pop items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-card px-3 py-2.5"
                        >
                            <Mail className="size-4 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1 truncate text-[13.5px]">
                                {invitation.email}{' '}
                                <span className="text-muted-foreground">
                                    · {invitation.role_label} · sent{' '}
                                    {formatDistanceToNow(
                                        parseISO(invitation.created_at),
                                        { addSuffix: true },
                                    )}
                                </span>
                            </span>
                            {canCancel && (
                                <Form
                                    {...cancelInvitation.form([
                                        team.slug,
                                        invitation.code,
                                    ])}
                                    options={{ preserveScroll: true }}
                                >
                                    {({ processing }) => (
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            disabled={processing}
                                            data-test="invitation-cancel-button"
                                            aria-label={`Cancel the invitation to ${invitation.email}`}
                                            className={cn(BUTTON, 'h-8 px-2.5')}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </Form>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

TeamEdit.layout = (props: { team: { name: string; slug: string } }) => ({
    breadcrumbs: settingsCrumbs('Team', edit(props.team.slug)),
});
