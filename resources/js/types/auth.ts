export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};

export type ApiToken = {
    id: number;
    name: string;
    team: { id: number; name: string };
    abilities: string[];
    lastUsedAt: string | null;
    expiresAt: string | null;
    createdAt: string | null;
};

/**
 * A token just created, flashed once with its plain-text value.
 */
export type NewApiToken = {
    id: number;
    plainTextToken: string;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
