import { Head } from '@inertiajs/react';
import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import MotionTabs from '@/components/motion-tabs';
import {
    Divider,
    SettingsSection,
    SubHeading,
} from '@/components/settings/section';
import type { Appearance as Theme } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { settingsCrumbs } from '@/lib/breadcrumbs';
import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';

/** Each theme with the colours of its little preview. */
const THEMES: {
    value: Theme;
    label: string;
    canvas: string;
    card: string;
}[] = [
    { value: 'light', label: 'Light', canvas: '#eef0f7', card: '#ffffff' },
    { value: 'dark', label: 'Dark', canvas: '#0d0c20', card: '#24214d' },
    {
        value: 'system',
        label: 'Match my device',
        canvas: 'linear-gradient(135deg, #eef0f7 50%, #0d0c20 50%)',
        card: 'rgb(255 255 255 / 0.55)',
    },
];

export default function Appearance() {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <>
            <Head title="Appearance settings" />

            <SettingsSection
                id="appearance"
                title="Appearance"
                description="Saved in this browser."
            >
                <fieldset className="grid gap-3.5 sm:grid-cols-3">
                    <legend className="sr-only">Theme</legend>
                    {THEMES.map((theme) => {
                        const checked = appearance === theme.value;

                        return (
                            <label
                                key={theme.value}
                                className={cn(
                                    'flex cursor-pointer flex-col gap-2.5 rounded-[18px] border-2 bg-card p-2.5 transition-[translate,box-shadow,border-color] duration-250 ease-slide hover:-translate-y-0.5 has-focus-visible:ring-2 has-focus-visible:ring-ring',
                                    checked
                                        ? 'border-primary shadow-[0_0_0_4px_rgb(110_91_245/0.14)]'
                                        : 'border-border',
                                )}
                            >
                                <input
                                    type="radio"
                                    name="theme"
                                    value={theme.value}
                                    checked={checked}
                                    onChange={() =>
                                        updateAppearance(theme.value)
                                    }
                                    className="sr-only"
                                />
                                <ThemePreview
                                    canvas={theme.canvas}
                                    card={theme.card}
                                />
                                <span className="flex items-center justify-between px-1">
                                    <span className="text-sm font-semibold">
                                        {theme.label}
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'flex size-5 items-center justify-center rounded-full border-2 transition-colors duration-250',
                                            checked
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-input bg-card text-transparent',
                                        )}
                                    >
                                        <Check className="size-[11px] stroke-4" />
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </fieldset>

                <Divider />

                <div className="flex flex-wrap items-center justify-between gap-3.5">
                    <SubHeading
                        title="Motion"
                        description="Entrance animations, count-ups and sliding panels. Match device follows its reduce-motion setting."
                        className="min-w-52 flex-1"
                    />
                    <MotionTabs className="w-full sm:w-auto" />
                </div>
            </SettingsSection>
        </>
    );
}

/** A tiny sidebar and three cards in the theme's colours. */
function ThemePreview({ canvas, card }: { canvas: string; card: string }) {
    const cardStyle: CSSProperties = { background: card };

    return (
        <span
            aria-hidden="true"
            className="flex h-[104px] gap-1.5 rounded-xl p-2"
            style={{ background: canvas }}
        >
            <span className="w-[34px] rounded-lg bg-night" />
            <span className="flex flex-1 flex-col gap-1.5">
                <span className="h-3.5 rounded-[5px]" style={cardStyle} />
                <span className="flex flex-1 gap-1.5">
                    <span className="flex-1 rounded-md" style={cardStyle} />
                    <span className="flex-1 rounded-md" style={cardStyle} />
                </span>
            </span>
        </span>
    );
}

Appearance.layout = {
    breadcrumbs: settingsCrumbs('Appearance', editAppearance()),
};
