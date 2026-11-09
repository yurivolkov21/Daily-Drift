import { Form, Head, usePage } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

const COOLDOWN_SECONDS = 30;

/**
 * "Check your inbox" after sign up. Resending waits 30 seconds between
 * sends; Fortify also throttles the endpoint on the server.
 */
export default function VerifyEmail({ status }: { status?: string }) {
    const { auth } = usePage().props;
    const sent = status === 'verification-link-sent';
    const [wait, setWait] = useState(sent ? COOLDOWN_SECONDS : 0);

    useEffect(() => {
        if (wait <= 0) {
            return;
        }

        const timer = window.setTimeout(() => setWait(wait - 1), 1000);

        return () => window.clearTimeout(timer);
    }, [wait]);

    return (
        <>
            <Head title="Email verification" />

            <div
                role="status"
                className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-secondary p-5"
            >
                <span className="flex size-13 animate-pop items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_14px_28px_-14px_var(--primary)]">
                    <Mail className="size-6" />
                </span>
                <p className="text-[14.5px] leading-relaxed">
                    {sent
                        ? 'A new verification link is on its way'
                        : 'We sent a verification link'}{' '}
                    to <strong>{auth.user.email}</strong>. Open it to finish
                    setting up your account.
                </p>
                <Form
                    {...send.form()}
                    onSuccess={() => setWait(COOLDOWN_SECONDS)}
                    className="flex flex-wrap gap-2.5"
                >
                    {({ processing }) => (
                        <Button
                            type="submit"
                            variant="outline"
                            disabled={processing || wait > 0}
                            className="h-11 rounded-xl tabular-nums"
                        >
                            {processing && <Spinner />}
                            {wait > 0
                                ? `Resend in ${wait}s`
                                : 'Resend the email'}
                        </Button>
                    )}
                </Form>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                Wrong address?{' '}
                <TextLink href={logout()}>Log out and start over</TextLink>
            </p>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Check your inbox',
    description: '',
};
