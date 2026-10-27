import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * A compact button that shows an issue property and opens its picker.
 */
export function PropertyButton({
    className,
    ...props
}: ComponentProps<typeof Button>) {
    return (
        <Button
            type="button"
            variant="outline"
            size="xs"
            className={cn(
                'h-7 justify-start gap-1.5 px-2 font-normal tracking-normal normal-case',
                className,
            )}
            {...props}
        />
    );
}
