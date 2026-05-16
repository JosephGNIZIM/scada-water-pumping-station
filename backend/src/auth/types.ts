export const ROLES = ['ingenieur', 'technicien', 'operateur'] as const;

export type UserRole = typeof ROLES[number];

export interface AuthenticatedUser {
    id: number;
    username: string;
    displayName: string;
    role: UserRole;
    active: boolean;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
    expiresInSeconds: number;
}
