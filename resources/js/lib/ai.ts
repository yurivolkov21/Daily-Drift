/**
 * What to show when an AI helper's request fails (spec 0011). The server
 * answers each case with a message; this reads it from the error the
 * request threw.
 */
export function aiError(error: unknown): string {
    const response =
        typeof error === 'object' && error !== null && 'response' in error
            ? (error as { response?: { status?: number; data?: unknown } })
                  .response
            : undefined;

    if (!response) {
        return 'The server could not be reached. Check your connection and try again.';
    }

    let body: { message?: unknown; errors?: Record<string, unknown> } = {};

    try {
        body =
            typeof response.data === 'string'
                ? (JSON.parse(response.data) as typeof body)
                : ((response.data as typeof body | undefined) ?? {});
    } catch {
        // Not JSON, such as a proxy's error page.
    }

    const first = body.errors ? Object.values(body.errors).flat()[0] : null;

    if (typeof first === 'string') {
        return first;
    }

    if (typeof body.message === 'string' && body.message !== '') {
        return body.message;
    }

    return response.status === 429
        ? 'Too many AI requests. Try again in a minute.'
        : 'Something went wrong. Try again.';
}
