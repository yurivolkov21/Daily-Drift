export type NotificationType = 'issue-assigned' | 'comment-mention';

/**
 * A notification as NotificationResource sends it. Its data is a snapshot
 * taken when it was sent, so it still reads well after the issue changes.
 */
export type AppNotification = {
    id: string;
    type: NotificationType;
    data: {
        team: { slug: string; name: string };
        issue: { identifier: string; title: string };
        actor: { id: number; name: string };
        comment?: { id: string; excerpt: string };
    };
    readAt: string | null;
    createdAt: string;
};
