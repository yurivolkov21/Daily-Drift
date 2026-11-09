import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Heading from '@/components/heading';
import MotionTabs from '@/components/motion-tabs';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title="Appearance settings" />

            <h1 className="sr-only">Appearance settings</h1>

            <div className="space-y-10">
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Appearance settings"
                        description="Update the appearance settings for your account"
                    />
                    <AppearanceTabs />
                </div>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Motion"
                        description="Entrance animations, count-ups and sliding panels. Match device follows your system's reduce-motion setting."
                    />
                    <MotionTabs />
                </div>
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
