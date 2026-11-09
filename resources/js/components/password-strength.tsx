import { cn } from '@/lib/utils';

const LEVELS = [
    { label: 'Too short', bar: 'bg-border', text: 'text-muted-foreground' },
    { label: 'Weak', bar: 'bg-red-500', text: 'text-red-600' },
    { label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-600' },
    { label: 'Good', bar: 'bg-sky-500', text: 'text-sky-600' },
    { label: 'Strong', bar: 'bg-green-500', text: 'text-green-600' },
];

/** A rough guide: length, mixed case, digits, and symbols or extra length. */
export function passwordScore(password: string): number {
    let score = 0;

    if (password.length >= 8) {
        score++;
    }

    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
        score++;
    }

    if (/\d/.test(password)) {
        score++;
    }

    if (/[^A-Za-z0-9]/.test(password) || password.length >= 14) {
        score++;
    }

    return score;
}

/**
 * Four segments that fill as the password gets stronger, with a label beside
 * them, or under them when `stacked` (for narrow columns).
 */
export function PasswordStrength({
    password,
    stacked = false,
}: {
    password: string;
    stacked?: boolean;
}) {
    const score = passwordScore(password);
    const level = LEVELS[score];

    return (
        <div
            className={cn(
                'flex gap-2.5',
                stacked ? 'flex-col gap-1.5' : 'items-center',
            )}
        >
            <span aria-hidden="true" className="grid flex-1 grid-cols-4 gap-1">
                {[0, 1, 2, 3].map((index) => (
                    <span
                        key={index}
                        className={cn(
                            'h-[5px] rounded-full transition-colors duration-300',
                            index < score ? level.bar : 'bg-border',
                        )}
                    />
                ))}
            </span>
            <span
                aria-live="polite"
                className={cn(
                    'text-xs font-semibold',
                    !stacked && 'min-w-36 text-right',
                    password ? level.text : 'text-muted-foreground',
                )}
            >
                {password ? level.label : 'Use 8 or more characters'}
            </span>
        </div>
    );
}
