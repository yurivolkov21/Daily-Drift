import { Form } from '@inertiajs/react';
import { Check, Copy, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import InputError from '@/components/input-error';
import {
    BUTTON,
    Collapse,
    DANGER,
    Pill,
    SubHeading,
} from '@/components/settings/section';
import { NeedsPassword } from '@/components/settings/connected-accounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useClipboard } from '@/hooks/use-clipboard';
import { OTP_MAX_LENGTH, useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { cn } from '@/lib/utils';
import {
    confirm,
    disable,
    enable,
    regenerateRecoveryCodes,
} from '@/routes/two-factor';

export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
    /** An account made with Google or GitHub sets a password first (spec 0009). */
    needsPassword?: boolean;
};

/** Stand-ins shown blurred until the real codes are asked for. */
const HIDDEN_CODES = Array.from({ length: 8 }, () => 'XXXXXXXXXX-XXXXXXXXXX');

/**
 * Two-factor authentication in place: "Set up" opens the QR code and a field
 * for the 6-digit code; once on, the recovery codes stay hidden until shown.
 */
export default function TwoFactorSettings({
    canManageTwoFactor = false,
    requiresConfirmation = false,
    twoFactorEnabled = false,
    needsPassword = false,
}: Props) {
    const auth = useTwoFactorAuth();
    const [settingUp, setSettingUp] = useState(false);
    const [codesShown, setCodesShown] = useState(false);
    const wasEnabled = useRef(twoFactorEnabled);
    const { clearTwoFactorAuthData } = auth;

    useEffect(() => {
        if (wasEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
            setCodesShown(false);
        }

        wasEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    if (!canManageTwoFactor) {
        return null;
    }

    const state = twoFactorEnabled ? 'on' : settingUp ? 'setup' : 'off';

    const startSetup = () => {
        setSettingUp(true);
        void auth.fetchSetupData();
    };

    const finishSetup = () => {
        setSettingUp(false);
        auth.clearSetupData();
    };

    const showCodes = async () => {
        if (!codesShown && auth.recoveryCodesList.length === 0) {
            await auth.fetchRecoveryCodes();
        }

        setCodesShown(!codesShown);
    };

    return (
        <div className="flex flex-col">
            <div className="flex flex-wrap items-start gap-3.5">
                <span
                    aria-hidden="true"
                    className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-[13px] transition-colors duration-300',
                        state === 'on'
                            ? 'bg-green-500/12 text-green-700 dark:text-green-400'
                            : 'bg-secondary text-primary',
                    )}
                >
                    {state === 'on' ? (
                        <ShieldCheck className="size-[22px]" />
                    ) : (
                        <ShieldAlert className="size-[22px]" />
                    )}
                </span>
                <SubHeading
                    className="min-w-52 flex-1"
                    title={
                        <>
                            Two-factor authentication
                            {state === 'on' ? (
                                <Pill tone="green">On</Pill>
                            ) : state === 'setup' ? (
                                <Pill tone="amber">Setting up</Pill>
                            ) : (
                                <Pill>Off</Pill>
                            )}
                        </>
                    }
                    description={
                        state === 'on'
                            ? 'You will be asked for a code from your authenticator app when you sign in.'
                            : 'Add a second step at sign-in with an authenticator app.'
                    }
                />
                {state === 'on' ? (
                    <Form
                        {...disable.form()}
                        options={{ preserveScroll: true }}
                    >
                        {({ processing }) => (
                            <Button
                                type="submit"
                                disabled={processing}
                                className={cn(BUTTON, DANGER)}
                            >
                                {processing && <Spinner />}
                                Turn off
                            </Button>
                        )}
                    </Form>
                ) : state === 'setup' ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={finishSetup}
                        className={BUTTON}
                    >
                        Cancel
                    </Button>
                ) : needsPassword ? (
                    <Button
                        type="button"
                        variant="outline"
                        disabled
                        className={BUTTON}
                    >
                        Set up
                    </Button>
                ) : (
                    <Form
                        {...enable.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={startSetup}
                    >
                        {({ processing }) => (
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={processing}
                                className={BUTTON}
                            >
                                {processing && <Spinner />}
                                Set up
                            </Button>
                        )}
                    </Form>
                )}
            </div>

            {needsPassword && !twoFactorEnabled && (
                <div className="pt-2">
                    <NeedsPassword action="turning this on" />
                </div>
            )}

            <Collapse open={settingUp} className="pt-3.5">
                <SetupPanel
                    qrCodeSvg={auth.qrCodeSvg}
                    manualSetupKey={auth.manualSetupKey}
                    errors={auth.errors}
                    requiresConfirmation={requiresConfirmation}
                    onConfirmed={() => {
                        finishSetup();
                        setCodesShown(true);
                        void auth.fetchRecoveryCodes();
                    }}
                    onDone={finishSetup}
                />
            </Collapse>

            <Collapse open={twoFactorEnabled} className="pt-3.5">
                <div className="flex flex-col gap-3 rounded-2xl bg-muted p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <span className="text-[13.5px] font-semibold">
                            Recovery codes
                        </span>
                        <div className="flex gap-2">
                            {codesShown && (
                                <Form
                                    {...regenerateRecoveryCodes.form()}
                                    options={{ preserveScroll: true }}
                                    onSuccess={() =>
                                        void auth.fetchRecoveryCodes()
                                    }
                                >
                                    {({ processing }) => (
                                        <Button
                                            type="submit"
                                            variant="ghost"
                                            disabled={processing}
                                            className={cn(BUTTON, 'h-[34px]')}
                                        >
                                            <RefreshCw />
                                            New codes
                                        </Button>
                                    )}
                                </Form>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void showCodes()}
                                aria-expanded={codesShown}
                                aria-controls="recovery-codes"
                                className={cn(BUTTON, 'h-[34px] bg-card')}
                            >
                                {codesShown ? 'Hide' : 'Show'}
                            </Button>
                        </div>
                    </div>
                    {auth.errors.length > 0 && twoFactorEnabled ? (
                        <AlertError errors={auth.errors} />
                    ) : (
                        <ul
                            id="recovery-codes"
                            aria-label="Recovery codes"
                            aria-hidden={!codesShown}
                            className={cn(
                                'grid grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))] gap-2 font-mono text-[13px] transition-[filter] duration-300',
                                !codesShown && 'blur-[5px] select-none',
                            )}
                        >
                            {(codesShown && auth.recoveryCodesList.length > 0
                                ? auth.recoveryCodesList
                                : HIDDEN_CODES
                            ).map((code, index) => (
                                <li
                                    key={index}
                                    className="rounded-[9px] bg-card p-2 text-center break-all"
                                >
                                    {code}
                                </li>
                            ))}
                        </ul>
                    )}
                    <span className="text-[12.5px] text-muted-foreground">
                        Each code works once. Keep them somewhere safe.
                    </span>
                </div>
            </Collapse>
        </div>
    );
}

function SetupPanel({
    qrCodeSvg,
    manualSetupKey,
    errors,
    requiresConfirmation,
    onConfirmed,
    onDone,
}: {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    errors: string[];
    requiresConfirmation: boolean;
    onConfirmed: () => void;
    onDone: () => void;
}) {
    const [code, setCode] = useState('');
    const [copied, copy] = useClipboard();
    const CopyIcon = copied && copied === manualSetupKey ? Check : Copy;

    if (errors.length > 0) {
        return <AlertError errors={errors} />;
    }

    return (
        <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-muted p-4">
            <span
                role="img"
                aria-label="QR code to scan"
                className="flex size-28 shrink-0 items-center justify-center rounded-xl bg-white p-2 [&_svg]:size-full"
                {...(qrCodeSvg
                    ? { dangerouslySetInnerHTML: { __html: qrCodeSvg } }
                    : { children: <Spinner className="text-primary" /> })}
            />
            <div className="flex min-w-60 flex-1 flex-col gap-2.5">
                <span className="text-[13.5px] leading-normal text-foreground/80">
                    {requiresConfirmation
                        ? 'Scan this with an authenticator app, then type the 6-digit code it shows.'
                        : 'Scan this with an authenticator app. It will ask for a code from now on.'}
                </span>
                {manualSetupKey && (
                    <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                        Or enter this key:
                        <code className="rounded-md bg-card px-1.5 py-0.5 font-mono text-foreground">
                            {manualSetupKey}
                        </code>
                        <button
                            type="button"
                            onClick={() => void copy(manualSetupKey)}
                            aria-label="Copy the key"
                            className="rounded-md p-1 outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <CopyIcon className="size-3.5" />
                        </button>
                    </span>
                )}
                {requiresConfirmation ? (
                    <Form
                        {...confirm.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={() => {
                            setCode('');
                            onConfirmed();
                        }}
                        resetOnError
                        className="flex flex-col gap-2"
                    >
                        {({ processing, errors: formErrors }) => (
                            <>
                                <div className="flex flex-wrap gap-2.5">
                                    <Input
                                        name="code"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        pattern="[0-9]*"
                                        maxLength={OTP_MAX_LENGTH}
                                        placeholder="123456"
                                        aria-label="6-digit code"
                                        value={code}
                                        onChange={(event) =>
                                            setCode(
                                                event.target.value.replace(
                                                    /\D/g,
                                                    '',
                                                ),
                                            )
                                        }
                                        className="h-10 w-40 rounded-xl bg-card tracking-[0.2em] tabular-nums"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={
                                            processing ||
                                            code.length < OTP_MAX_LENGTH
                                        }
                                        className={BUTTON}
                                    >
                                        {processing && <Spinner />}
                                        Confirm
                                    </Button>
                                </div>
                                <InputError
                                    message={
                                        (
                                            formErrors as {
                                                confirmTwoFactorAuthentication?: {
                                                    code?: string;
                                                };
                                            }
                                        ).confirmTwoFactorAuthentication?.code
                                    }
                                />
                            </>
                        )}
                    </Form>
                ) : (
                    <Button
                        type="button"
                        onClick={onDone}
                        className={cn(BUTTON, 'self-start')}
                    >
                        Done
                    </Button>
                )}
            </div>
        </div>
    );
}
