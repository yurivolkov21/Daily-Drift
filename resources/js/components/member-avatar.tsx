import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';

export function MemberAvatar({
    name,
    className,
}: {
    name: string;
    className?: string;
}) {
    const getInitials = useInitials();

    return (
        <Avatar size="sm" className={cn('size-5', className)}>
            <AvatarFallback className="text-[0.6rem]">
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}
