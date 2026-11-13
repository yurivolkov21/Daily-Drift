import { Form, Head } from '@inertiajs/react';
import { CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { AuthTabs } from '@/components/auth-tabs';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { PasswordStrength } from '@/components/password-strength';
import TeamInvitationAlert from '@/components/team-invitation-alert';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';
import type { SocialProvider } from '@/components/auth/social-sign-in';
import { SocialSignIn } from '@/components/auth/social-sign-in';
import type { TeamInvitationContext } from '@/types';

type Props = {
    passwordRules: string;
    teamInvitation?: TeamInvitationContext | null;
    /** Google and GitHub when configured (spec 0009). */
    socialProviders?: SocialProvider[];
};

export default function Register({
    passwordRules,
    teamInvitation,
    socialProviders = [],
}: Props) {
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');

    return (
        <>
            <Head title="Register" />
            <AuthTabs current="register" invitation={teamInvitation?.code} />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        {teamInvitation && (
                            <TeamInvitationAlert
                                invitation={teamInvitation}
                                action="Register"
                            />
                        )}

                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    placeholder="Your name"
                                    className="h-11 rounded-xl bg-muted"
                                />
                                <InputError
                                    message={errors.name}
                                    className="mt-2"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    className="h-11 rounded-xl bg-muted"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="At least 8 characters"
                                    passwordrules={passwordRules}
                                    className="h-11 rounded-xl bg-muted"
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                />
                                <PasswordStrength password={password} />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirm password
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Confirm password"
                                    passwordrules={passwordRules}
                                    className="h-11 rounded-xl bg-muted pr-16"
                                    onChange={(event) =>
                                        setConfirmation(event.target.value)
                                    }
                                />
                                {confirmation !== '' &&
                                    confirmation === password && (
                                        <span className="flex animate-pop items-center gap-1.5 text-xs font-semibold text-green-600">
                                            <CircleCheck className="size-4" />
                                            The passwords match
                                        </span>
                                    )}
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-12 w-full rounded-xl text-[15px] font-bold"
                                tabIndex={5}
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Create account
                            </Button>
                        </div>

                        <SocialSignIn
                            providers={socialProviders}
                            mode="register"
                        />

                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink
                                href={
                                    teamInvitation
                                        ? login.url({
                                              query: {
                                                  invitation:
                                                      teamInvitation.code,
                                              },
                                          })
                                        : login()
                                }
                                data-test="team-invitation-login-link"
                                tabIndex={6}
                            >
                                Sign in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Create your account',
    description: 'Free for small teams. Your first board is ready in a minute.',
};
