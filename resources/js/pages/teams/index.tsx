import { Head, Link } from '@inertiajs/react';
import { ChevronRight, LogOut, Plus } from 'lucide-react';
import { useState } from 'react';
import CreateTeamModal from '@/components/create-team-modal';
import LeaveTeamModal from '@/components/leave-team-modal';
import { BUTTON, Pill, SettingsSection } from '@/components/settings/section';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { settingsCrumbs } from '@/lib/breadcrumbs';
import { HUE_NAMES, HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';
import { edit, index } from '@/routes/teams';
import type { Team } from '@/types';

type Props = {
    teams: Team[];
};

export default function TeamsIndex({ teams }: Props) {
    const [teamLeaving, setTeamLeaving] = useState<Team | null>(null);

    return (
        <>
            <Head title="Teams" />

            <SettingsSection
                id="teams"
                title="Teams"
                description="The teams you belong to. Open one to manage its members and invitations."
                aside={
                    <CreateTeamModal>
                        <Button
                            data-test="teams-new-team-button"
                            className={BUTTON}
                        >
                            <Plus /> New team
                        </Button>
                    </CreateTeamModal>
                }
            >
                {teams.length === 0 ? (
                    <p className="rounded-2xl bg-muted p-8 text-center text-sm text-muted-foreground">
                        You don't belong to any teams yet.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {teams.map((team) => {
                            const canLeave =
                                !team.isPersonal && team.role !== 'owner';
                            const hue = HUE_NAMES[team.id % HUE_NAMES.length];

                            return (
                                <li
                                    key={team.id}
                                    data-test="team-row"
                                    className="group flex items-center gap-2 rounded-[14px] transition-colors hover:bg-muted/70"
                                >
                                    <Link
                                        href={edit(team.slug)}
                                        data-test="team-edit-button"
                                        className="flex min-w-0 flex-1 items-center gap-3.5 rounded-[14px] p-2.5 text-foreground no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'flex size-9 shrink-0 items-center justify-center rounded-[11px] text-sm font-bold',
                                                HUES[hue].tile,
                                            )}
                                        >
                                            {team.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="flex items-center gap-2 text-sm font-semibold">
                                                <span className="truncate">
                                                    {team.name}
                                                </span>
                                                {team.isPersonal && (
                                                    <Pill>Personal</Pill>
                                                )}
                                                {team.isCurrent && (
                                                    <Pill tone="indigo">
                                                        Current
                                                    </Pill>
                                                )}
                                            </span>
                                            <span className="text-[12.5px] text-muted-foreground">
                                                {team.roleLabel}
                                            </span>
                                        </span>
                                        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                    </Link>
                                    {canLeave && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    data-test="team-leave-button"
                                                    aria-label={`Leave ${team.name}`}
                                                    onClick={() =>
                                                        setTeamLeaving(team)
                                                    }
                                                    className="mr-1.5 rounded-[10px]"
                                                >
                                                    <LogOut />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Leave team
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </SettingsSection>

            <LeaveTeamModal
                team={teamLeaving}
                open={teamLeaving !== null}
                onOpenChange={(open) => !open && setTeamLeaving(null)}
            />
        </>
    );
}

TeamsIndex.layout = {
    breadcrumbs: settingsCrumbs('Teams', index()),
};
