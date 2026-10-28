import { http, router } from '@inertiajs/react';
import { useEcho, useSocketId } from '@laravel/echo-react';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { index as issuesIndex } from '@/routes/issues';

/**
 * Whether the app was built with a Reverb server to listen to.
 */
export const realtimeEnabled = Boolean(import.meta.env.VITE_REVERB_APP_KEY);

/**
 * How long to wait for more changes before reloading, so a burst of them
 * costs one request.
 */
const RELOAD_DELAY_MS = 300;

/**
 * Keep the open page in step with what teammates change. The team's channel
 * only says that something changed, so the page reloads its data through its
 * normal, authorized request.
 */
export function WorkspaceUpdates({
    teamId,
    teamSlug,
}: {
    teamId: number;
    teamSlug: string;
}): null {
    const socketId = useSocketId();
    const reloadTimer = useRef<number | undefined>(undefined);
    const cancelReload = useRef<(() => void) | null>(null);
    const savesInFlight = useRef(0);
    const reloadOwed = useRef(false);

    // Name this tab's connection on every request, so the changes it makes
    // are not announced back to it.
    useEffect(() => {
        if (!socketId) {
            return;
        }

        return http.onRequest((config) => {
            config.headers = { ...config.headers, 'X-Socket-ID': socketId };

            return config;
        });
    }, [socketId]);

    const reload = useCallback(() => {
        // Wait until the user's own saves land and the tab is in view again.
        if (savesInFlight.current > 0 || document.hidden) {
            reloadOwed.current = true;

            return;
        }

        reloadOwed.current = false;

        router.reload({
            onCancelToken: ({ cancel }) => {
                cancelReload.current = cancel;
            },
            onFinish: () => {
                cancelReload.current = null;
            },
            onHttpException: (response) => {
                if (response.status !== 404) {
                    return;
                }

                // Only an issue page goes missing: a teammate deleted its issue.
                toast.info('This issue was deleted.');
                router.visit(issuesIndex.url(teamSlug), { replace: true });

                return false;
            },
        });
    }, [teamSlug]);

    const scheduleReload = useCallback(() => {
        window.clearTimeout(reloadTimer.current);
        reloadTimer.current = window.setTimeout(reload, RELOAD_DELAY_MS);
    }, [reload]);

    useEffect(() => {
        const removeStartListener = router.on('start', (event) => {
            if (event.detail.visit.method === 'get') {
                return;
            }

            savesInFlight.current += 1;

            // A reload already on its way could answer with data from before
            // this save and undo it on screen, so ask again afterwards.
            if (cancelReload.current) {
                cancelReload.current();
                reloadOwed.current = true;
            }
        });

        const removeFinishListener = router.on('finish', (event) => {
            if (event.detail.visit.method === 'get') {
                return;
            }

            savesInFlight.current = Math.max(0, savesInFlight.current - 1);

            if (savesInFlight.current === 0 && reloadOwed.current) {
                scheduleReload();
            }
        });

        const reloadWhenVisible = () => {
            if (!document.hidden && reloadOwed.current) {
                scheduleReload();
            }
        };

        document.addEventListener('visibilitychange', reloadWhenVisible);

        return () => {
            removeStartListener();
            removeFinishListener();
            document.removeEventListener('visibilitychange', reloadWhenVisible);
            window.clearTimeout(reloadTimer.current);
        };
    }, [scheduleReload]);

    useEcho(`team.${teamId}`, '.workspace.changed', scheduleReload, [
        scheduleReload,
    ]);

    return null;
}
