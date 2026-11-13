import { Form, Head, Link, useForm, usePage } from '@inertiajs/react';
import { Check } from 'lucide-react';
import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { NeedsPassword } from '@/components/settings/connected-accounts';
import TextLink from '@/components/text-link';
import { TimeZoneField } from '@/components/settings/time-zone-field';
import {
    BUTTON,
    Collapse,
    DANGER,
    Divider,
    FIELD,
    Pill,
    SettingsSection,
    SubHeading,
} from '@/components/settings/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useInitials } from '@/hooks/use-initials';
import { settingsCrumbs } from '@/lib/breadcrumbs';
import { cn } from '@/lib/utils';
import { edit } from '@/routes/profile';
import { edit as securityEdit } from '@/routes/security';
import { send } from '@/routes/verification';

export default function Profile({
    mustVerifyEmail,
    status,
    timeZones,
    deviceTimeZone,
    hasPassword = true,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    timeZones: string[];
    deviceTimeZone: string | null;
    /** False for an account made with Google or GitHub until it sets one (spec 0009). */
    hasPassword?: boolean;
}) {
    const { auth } = usePage().props;
    const getInitials = useInitials();
    const form = useForm({
        name: auth.user.name,
        email: auth.user.email,
        timezone: auth.user.timezone,
    });
    const verified = auth.user.email_verified_at !== null;

    const save = (event?: FormEvent) => {
        event?.preventDefault();
        form.submit(ProfileController.update(), {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(),
        });
    };

    const discard = () => {
        form.reset();
        form.clearErrors();
    };

    const barShown = form.isDirty || form.processing || form.recentlySuccessful;
    const saved = form.recentlySuccessful && !form.isDirty;

    return (
        <>
            <Head title="Profile settings" />

            <SettingsSection
                id="profile"
                title="Profile"
                description="How you show up on boards, cards and invitations."
                className="relative min-h-full overflow-clip rounded-[22px] pb-0 sm:pb-0"
            >
                <div className="flex items-center gap-3.5">
                    <span
                        aria-hidden="true"
                        className="flex size-[72px] shrink-0 items-center justify-center rounded-[22px] bg-linear-135 from-fuchsia-200 to-violet-300 font-display text-2xl font-extrabold text-violet-900"
                    >
                        {getInitials(form.data.name) || '?'}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                        <strong className="truncate text-[15px]">
                            {form.data.name || 'Your name'}
                        </strong>
                        <span className="text-[13px] text-muted-foreground">
                            Your initials are your avatar. Photos come in a
                            later phase.
                        </span>
                    </div>
                </div>

                <form
                    id="profile-form"
                    onSubmit={save}
                    className="grid gap-4 sm:grid-cols-2"
                >
                    <div className="grid content-start gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            name="name"
                            required
                            autoComplete="name"
                            placeholder="Full name"
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            aria-invalid={Boolean(form.errors.name)}
                            className={FIELD}
                        />
                        <InputError message={form.errors.name} />
                    </div>

                    <div className="grid content-start gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="email">Email</Label>
                            {mustVerifyEmail &&
                                (verified ? (
                                    <Pill tone="green" className="px-2 py-px">
                                        <Check className="size-3 stroke-[3.4]" />
                                        Verified
                                    </Pill>
                                ) : (
                                    <Pill tone="amber" className="px-2 py-px">
                                        Not verified
                                    </Pill>
                                ))}
                        </div>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            required
                            autoComplete="username"
                            placeholder="Email address"
                            value={form.data.email}
                            onChange={(event) =>
                                form.setData('email', event.target.value)
                            }
                            aria-invalid={Boolean(form.errors.email)}
                            className={FIELD}
                        />
                        <InputError message={form.errors.email} />
                        {mustVerifyEmail && !verified && (
                            <p className="text-[12.5px] text-muted-foreground">
                                {status === 'verification-link-sent' ? (
                                    <span className="font-medium text-green-600">
                                        A new verification link is on its way.
                                    </span>
                                ) : (
                                    <>
                                        Check your inbox for the link, or{' '}
                                        <Link
                                            href={send()}
                                            as="button"
                                            className="font-semibold text-primary"
                                        >
                                            send it again
                                        </Link>
                                        .
                                    </>
                                )}
                            </p>
                        )}
                    </div>

                    <div className="grid content-start gap-2">
                        <Label htmlFor="timezone">Time zone</Label>
                        <TimeZoneField
                            id="timezone"
                            value={form.data.timezone}
                            zones={timeZones}
                            device={deviceTimeZone}
                            onChange={(zone) => form.setData('timezone', zone)}
                            invalid={Boolean(form.errors.timezone)}
                        />
                        <InputError message={form.errors.timezone} />
                    </div>
                </form>

                <Divider />

                <DeleteAccount hasPassword={hasPassword} />

                <div
                    role="status"
                    inert={!barShown}
                    className={cn(
                        'sticky bottom-0 z-10 -mx-4 mt-auto flex flex-wrap items-center gap-3 bg-night px-4 py-3.5 text-white transition-[translate,opacity] duration-400 ease-panel sm:-mx-6 sm:px-6',
                        barShown
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-[120%] opacity-0',
                    )}
                >
                    <span
                        aria-hidden="true"
                        className={cn(
                            'size-2 rounded-full',
                            saved ? 'bg-green-500' : 'bg-amber-500',
                        )}
                    />
                    <span className="flex-1 text-[13.5px]">
                        {saved ? 'Profile saved' : 'You have unsaved changes'}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={discard}
                        disabled={!form.isDirty || form.processing}
                        className={cn(
                            BUTTON,
                            'border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white dark:bg-transparent',
                        )}
                    >
                        Discard
                    </Button>
                    <Button
                        type="submit"
                        form="profile-form"
                        disabled={!form.isDirty || form.processing}
                        data-test="update-profile-button"
                        className={BUTTON}
                    >
                        {form.processing && <Spinner />}
                        {form.processing
                            ? 'Saving…'
                            : saved
                              ? 'Saved'
                              : 'Save changes'}
                    </Button>
                </div>
            </SettingsSection>
        </>
    );
}

/**
 * "Delete account" opens a password field in place; deleting stays disabled
 * until a password is typed.
 */
function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const passwordInput = useRef<HTMLInputElement>(null);

    const toggle = () => {
        setOpen(!open);
        setPassword('');

        if (!open) {
            window.setTimeout(() => passwordInput.current?.focus(), 60);
        }
    };

    return (
        <div className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3.5">
                <SubHeading
                    title={
                        <span className="text-rose-700 dark:text-rose-400">
                            Delete account
                        </span>
                    }
                    description="Removes your account and the teams you own. This cannot be undone."
                />
                <Button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    aria-controls="delete-account"
                    data-test="delete-user-button"
                    className={cn(BUTTON, DANGER)}
                >
                    {open ? 'Keep my account' : 'Delete account'}
                </Button>
            </div>

            <Collapse open={open} className="pt-3">
                {!hasPassword ? (
                    <div
                        id="delete-account"
                        className="rounded-[14px] border border-rose-100 bg-rose-50/60 p-3.5 text-[13.5px] dark:border-rose-500/20 dark:bg-rose-500/5"
                    >
                        <NeedsPassword action="deleting your account" />{' '}
                        <TextLink href={securityEdit()}>
                            Set it under Security
                        </TextLink>
                        .
                    </div>
                ) : (
                    <Form
                        id="delete-account"
                        {...ProfileController.destroy.form()}
                        options={{ preserveScroll: true }}
                        onError={() => passwordInput.current?.focus()}
                        resetOnError
                        className="flex flex-wrap items-end gap-2.5 rounded-[14px] border border-rose-100 bg-rose-50/60 p-3.5 dark:border-rose-500/20 dark:bg-rose-500/5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid min-w-56 flex-1 gap-2">
                                    <Label htmlFor="delete-password">
                                        Confirm with your password
                                    </Label>
                                    <PasswordInput
                                        id="delete-password"
                                        name="password"
                                        ref={passwordInput}
                                        autoComplete="current-password"
                                        onChange={(event) =>
                                            setPassword(event.target.value)
                                        }
                                        className="h-11 rounded-xl bg-card"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={processing || password === ''}
                                    data-test="confirm-delete-user-button"
                                    className={cn(BUTTON, 'h-11')}
                                >
                                    {processing && <Spinner />}
                                    Delete for good
                                </Button>
                                <InputError
                                    message={errors.password}
                                    className="basis-full"
                                />
                            </>
                        )}
                    </Form>
                )}
            </Collapse>
        </div>
    );
}

Profile.layout = {
    breadcrumbs: settingsCrumbs('Profile', edit()),
};
