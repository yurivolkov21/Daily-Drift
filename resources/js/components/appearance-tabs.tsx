import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { SegmentedTabs } from '@/components/segmented-tabs';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';

const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
];

export default function AppearanceToggleTab(
    props: Omit<HTMLAttributes<HTMLDivElement>, 'onChange'>,
) {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <SegmentedTabs
            {...props}
            label="Theme"
            options={tabs}
            value={appearance}
            onChange={updateAppearance}
        />
    );
}
