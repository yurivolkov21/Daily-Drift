import { usePage } from '@inertiajs/react';

/**
 * The Daily-Drift mark: an accent tile with the initial, then the name.
 * The name takes the surrounding text color.
 */
export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-[38px] shrink-0 items-center justify-center rounded-[11px] bg-primary font-display text-base font-extrabold text-primary-foreground">
                {name.charAt(0)}
            </div>
            <span className="truncate font-display text-[17px] font-bold">
                {name}
            </span>
        </>
    );
}
