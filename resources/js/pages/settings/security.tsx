import { Form, Head } from '@inertiajs/react';
import { useRef, useState } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import InputError from '@/components/input-error';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
import PasswordInput from '@/components/password-input';
import { PasswordStrength } from '@/components/password-strength';
import {
    BUTTON,
    Divider,
    FIELD,
    SettingsSection,
    SubHeading,
} from '@/components/settings/section';
import type { ConnectedAccount } from '@/components/settings/connected-accounts';
import { ConnectedAccounts } from '@/components/settings/connected-accounts';
import type { Props as TwoFactorProps } from '@/components/settings/two-factor';
import TwoFactorSettings from '@/components/settings/two-factor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Info } from 'lucide-react';
import { settingsCrumbs } from '@/lib/breadcrumbs';
import { cn } from '@/lib/utils';
import { edit } from '@/routes/security';

// oxfmt-ignore
type Props = {
    passwordRules: string;
    /** False for an account made with Google or GitHub until it sets one (spec 0009). */
    hasPassword: boolean;
    connectedAccounts: ConnectedAccount[];
    signInMethods: number;
} & ManagePasskeysProps &
    TwoFactorProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const [password, setPassword] = useState('');

    return (
        <>
            <Head title="Security settings" />

            <SettingsSection
                id="security"
                title="Security"
                description="Your password and a second step when you sign in."
            >
                {!props.hasPassword && (
                    <div className="flex flex-col gap-3">
                        <SubHeading
                            title="Set a password"
                            description="No current password is needed."
                        />
                        <p className="flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 text-[13.5px] leading-normal">
                            <Info
                                className="mt-0.5 size-4 shrink-0 text-primary"
                                aria-hidden="true"
                            />
                            You signed up with Google or GitHub, so there is no
                            password yet. Set one to also sign in with your
                            email, and to turn on two-factor authentication or
                            add a passkey.
                        </p>
                    </div>
                )}

                <Form
                    {...SecurityController.update.form()}
                    options={{ preserveScroll: true }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onSuccess={() => setPassword('')}
                    onError={(errors) => {
                        setPassword('');

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        } else if (errors.password) {
                            passwordInput.current?.focus();
                        }
                    }}
                    className="flex flex-col gap-5"
                >
                    {({ errors, processing, recentlySuccessful }) => (
                        <>
                            <div
                                className={cn(
                                    'grid items-start gap-3.5',
                                    props.hasPassword
                                        ? 'xl:grid-cols-3'
                                        : 'xl:grid-cols-2',
                                )}
                            >
                                {props.hasPassword && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="current_password">
                                            Current password
                                        </Label>
                                        <PasswordInput
                                            id="current_password"
                                            ref={currentPasswordInput}
                                            name="current_password"
                                            autoComplete="current-password"
                                            className={FIELD}
                                        />
                                        <InputError
                                            message={errors.current_password}
                                        />
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="password">
                                        New password
                                    </Label>
                                    <PasswordInput
                                        id="password"
                                        ref={passwordInput}
                                        name="password"
                                        autoComplete="new-password"
                                        passwordrules={props.passwordRules}
                                        onChange={(event) =>
                                            setPassword(event.target.value)
                                        }
                                        className={FIELD}
                                    />
                                    <PasswordStrength
                                        password={password}
                                        stacked
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">
                                        Confirm new password
                                    </Label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        autoComplete="new-password"
                                        passwordrules={props.passwordRules}
                                        className={FIELD}
                                    />
                                    <InputError
                                        message={errors.password_confirmation}
                                    />
                                </div>
                            </div>

                            <div>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    data-test="update-password-button"
                                    className={BUTTON}
                                >
                                    {processing && <Spinner />}
                                    {recentlySuccessful
                                        ? props.hasPassword
                                            ? 'Password updated'
                                            : 'Password set'
                                        : props.hasPassword
                                          ? 'Update password'
                                          : 'Set password'}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                {props.connectedAccounts.length > 0 && (
                    <>
                        <Divider />
                        <ConnectedAccounts
                            accounts={props.connectedAccounts}
                            signInMethods={props.signInMethods}
                        />
                    </>
                )}

                {props.canManageTwoFactor && (
                    <>
                        <Divider />
                        <TwoFactorSettings
                            needsPassword={!props.hasPassword}
                            canManageTwoFactor={props.canManageTwoFactor}
                            requiresConfirmation={props.requiresConfirmation}
                            twoFactorEnabled={props.twoFactorEnabled}
                        />
                    </>
                )}

                {props.canManagePasskeys && (
                    <>
                        <Divider />
                        <ManagePasskeys
                            needsPassword={!props.hasPassword}
                            canManagePasskeys={props.canManagePasskeys}
                            passkeys={props.passkeys}
                        />
                    </>
                )}
            </SettingsSection>
        </>
    );
}

Security.layout = {
    breadcrumbs: settingsCrumbs('Security', edit()),
};
