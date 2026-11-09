import type { LucideIcon } from 'lucide-react';
import { Gauge, Monitor, Turtle } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { SegmentedTabs } from '@/components/segmented-tabs';
import type { Motion } from '@/hooks/use-motion';
import { useMotion } from '@/hooks/use-motion';

const tabs: { value: Motion; icon: LucideIcon; label: string }[] = [
    { value: 'system', icon: Monitor, label: 'Match device' },
    { value: 'reduced', icon: Turtle, label: 'Reduced' },
    { value: 'full', icon: Gauge, label: 'Full' },
];

export default function MotionTabs(
    props: Omit<HTMLAttributes<HTMLDivElement>, 'onChange'>,
) {
    const { motion, updateMotion } = useMotion();

    return (
        <SegmentedTabs
            {...props}
            label="Motion"
            options={tabs}
            value={motion}
            onChange={updateMotion}
        />
    );
}
