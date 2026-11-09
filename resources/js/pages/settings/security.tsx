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
} from '@/components/settings/section';
import type { Props as TwoFactorProps } from '@/components/settings/two-factor';
import TwoFactorSettings from '@/components/settings/two-factor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { settingsCrumbs } from '@/lib/breadcrumbs';
import { edit } from '@/routes/security';

// oxfmt-ignore
type Props = {
    passwordRules: string;
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
                            <div className="grid items-start gap-3.5 xl:grid-cols-3">
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
                                        ? 'Password updated'
                                        : 'Update password'}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                {props.canManageTwoFactor && (
                    <>
                        <Divider />
                        <TwoFactorSettings
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
