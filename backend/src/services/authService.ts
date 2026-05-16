import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { AuthTokens, AuthenticatedUser, UserRole } from '../auth/types';
import { AuthRequest } from '../types/authRequest';
import {
    createAuditLog,
    createLoginHistory,
    createUser,
    createUserSession,
    getSessionById,
    getUserById,
    getUserByUsername,
    listAuditLogs,
    listLoginHistory,
    listUsers,
    revokeSession,
    revokeSessionsForUser,
    setAppSetting,
    updateSession,
    updateUser,
} from '../utils/securityDb';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'scada-water-station-dev-secret';
const ACCESS_TOKEN_EXPIRATION_SECONDS = 30 * 60;
const REFRESH_TOKEN_EXPIRATION_MS = 12 * 60 * 60 * 1000;
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

const hashValue = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const buildUserProfile = (user: Awaited<ReturnType<typeof getUserById>>): AuthenticatedUser => {
    if (!user) {
        throw new Error('User not found');
    }

    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        active: user.active,
    };
};

const signAccessToken = (payload: AuthenticatedUser & { sessionId: string; csrfToken: string }): string =>
    jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRATION_SECONDS,
    });

export const getClientIp = (req: Request): string | null => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0]?.trim() || null;
    }

    return req.socket.remoteAddress || null;
};

export const generateTokensForUser = async (
    userId: number,
    req: Request,
    existingSessionId?: string,
): Promise<{ user: AuthenticatedUser; tokens: AuthTokens; sessionId: string }> => {
    const user = await getUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const sessionId = existingSessionId || crypto.randomUUID();
    const csrfToken = crypto.randomBytes(24).toString('hex');
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const now = Date.now();
    const expiresAt = new Date(now + REFRESH_TOKEN_EXPIRATION_MS).toISOString();
    const lastActivityAt = new Date(now).toISOString();

    if (existingSessionId) {
        await updateSession(existingSessionId, {
            refreshTokenHash: hashValue(refreshToken),
            csrfToken,
            expiresAt,
            lastActivityAt,
            revokedAt: null,
            lastIp: getClientIp(req),
            userAgent: req.headers['user-agent'] || null,
        } as any);
    } else {
        await createUserSession({
            id: sessionId,
            userId: user.id,
            refreshTokenHash: hashValue(refreshToken),
            csrfToken,
            expiresAt,
            lastActivityAt,
            revokedAt: null,
            createdAt: lastActivityAt,
            lastIp: getClientIp(req),
            userAgent: req.headers['user-agent'] || null,
        });
    }

    const profile = buildUserProfile(user);
    return {
        user: profile,
        sessionId,
        tokens: {
            accessToken: signAccessToken({ ...profile, sessionId, csrfToken }),
            refreshToken,
            csrfToken,
            expiresInSeconds: ACCESS_TOKEN_EXPIRATION_SECONDS,
        },
    };
};

export const login = async (username: string, password: string, req: Request) => {
    const normalizedUsername = username.trim().toLowerCase();
    const user = await getUserByUsername(normalizedUsername);
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || null;

    if (!user) {
        await createLoginHistory({
            username: normalizedUsername,
            success: false,
            ip: clientIp,
            userAgent,
            reason: 'unknown-user',
        });
        throw new Error('Identifiants incorrects.');
    }

    if (!user.active) {
        await createLoginHistory({
            userId: user.id,
            username: user.username,
            success: false,
            ip: clientIp,
            userAgent,
            reason: 'inactive-account',
        });
        throw new Error('Ce compte est desactive.');
    }

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
        await createLoginHistory({
            userId: user.id,
            username: user.username,
            success: false,
            ip: clientIp,
            userAgent,
            reason: 'locked',
        });
        throw new Error('Compte verrouille temporairement apres plusieurs tentatives.');
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
        const failedAttempts = user.failedAttempts + 1;
        await updateUser(user.id, {
            failedAttempts,
            lockedUntil: failedAttempts >= 3 ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null,
        });
        await createLoginHistory({
            userId: user.id,
            username: user.username,
            success: false,
            ip: clientIp,
            userAgent,
            reason: 'invalid-password',
        });
        throw new Error(failedAttempts >= 3 ? 'Compte verrouille apres 3 tentatives echouees.' : 'Identifiants incorrects.');
    }

    await updateUser(user.id, {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date().toISOString(),
    });

    await revokeSessionsForUser(user.id);
    const session = await generateTokensForUser(user.id, req);

    await createLoginHistory({
        userId: user.id,
        username: user.username,
        success: true,
        ip: clientIp,
        userAgent,
        reason: 'login-success',
    });

    await createAuditLog({
        userId: user.id,
        username: user.username,
        role: user.role,
        action: 'auth.login',
        entityType: 'session',
        entityId: session.sessionId,
        ip: clientIp,
        details: JSON.stringify({ userAgent }),
    });

    return session;
};

export const verifyAccessToken = (token: string): (AuthenticatedUser & { sessionId: string; csrfToken: string }) => {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as AuthenticatedUser & { sessionId: string; csrfToken: string };
};

export const validateSession = async (sessionId: string, csrfToken?: string) => {
    const session = await getSessionById(sessionId);
    if (!session || session.revokedAt) {
        throw new Error('Session invalide.');
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
        await revokeSession(sessionId);
        throw new Error('Session expiree.');
    }

    if (new Date(session.lastActivityAt).getTime() + INACTIVITY_TIMEOUT_MS < Date.now()) {
        await revokeSession(sessionId);
        throw new Error('Session expiree apres inactivite.');
    }

    if (csrfToken && session.csrfToken !== csrfToken) {
        throw new Error('Jeton CSRF invalide.');
    }

    const user = await getUserById(session.userId);
    if (!user || !user.active) {
        throw new Error('Utilisateur invalide.');
    }

    return { session, user: buildUserProfile(user) };
};

export const touchSession = async (sessionId: string, req: Request): Promise<void> => {
    const session = await getSessionById(sessionId);
    if (!session || session.revokedAt) {
        return;
    }

    await updateSession(sessionId, {
        lastActivityAt: new Date().toISOString(),
        lastIp: getClientIp(req),
        userAgent: req.headers['user-agent'] || null,
    } as any);
};

export const refreshSession = async (refreshToken: string, sessionId: string, req: Request) => {
    const { session, user } = await validateSession(sessionId);
    if (session.refreshTokenHash !== hashValue(refreshToken)) {
        await revokeSession(sessionId);
        throw new Error('Refresh token invalide.');
    }

    return generateTokensForUser(user.id, req, sessionId);
};

export const logout = async (sessionId: string, req: AuthRequest): Promise<void> => {
    await revokeSession(sessionId);
    await createAuditLog({
        userId: req.auth?.id ?? null,
        username: req.auth?.username ?? null,
        role: req.auth?.role ?? null,
        action: 'auth.logout',
        entityType: 'session',
        entityId: sessionId,
        ip: getClientIp(req),
    });
};

export const listUserProfiles = async () => {
    const users = await listUsers();
    return users.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        active: user.active,
        failedAttempts: user.failedAttempts,
        lockedUntil: user.lockedUntil,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    }));
};

export const createUserAccount = async (
    payload: { username: string; displayName: string; password: string; role: UserRole; active?: boolean },
    actor: AuthenticatedUser,
    req: Request,
) => {
    const created = await createUser({
        username: payload.username.trim().toLowerCase(),
        displayName: payload.displayName.trim(),
        passwordHash: await bcrypt.hash(payload.password, 10),
        role: payload.role,
        active: payload.active !== false,
    });

    await createAuditLog({
        userId: actor.id,
        username: actor.username,
        role: actor.role,
        action: 'user.create',
        entityType: 'user',
        entityId: String(created.id),
        ip: getClientIp(req),
        details: JSON.stringify({ username: created.username, role: created.role }),
    });

    return created;
};

export const updateUserAccount = async (
    userId: number,
    payload: Partial<{ username: string; displayName: string; role: UserRole; active: boolean }>,
    actor: AuthenticatedUser,
    req: Request,
) => {
    const updated = await updateUser(userId, payload);
    if (!updated) {
        throw new Error('Utilisateur introuvable.');
    }

    await createAuditLog({
        userId: actor.id,
        username: actor.username,
        role: actor.role,
        action: 'user.update',
        entityType: 'user',
        entityId: String(userId),
        ip: getClientIp(req),
        details: JSON.stringify(payload),
    });

    return updated;
};

export const resetUserPassword = async (
    userId: number,
    nextPassword: string,
    actor: AuthenticatedUser,
    req: Request,
) => {
    const updated = await updateUser(userId, {
        passwordHash: await bcrypt.hash(nextPassword, 10),
        failedAttempts: 0,
        lockedUntil: null,
    });
    if (!updated) {
        throw new Error('Utilisateur introuvable.');
    }

    await revokeSessionsForUser(userId);
    await createAuditLog({
        userId: actor.id,
        username: actor.username,
        role: actor.role,
        action: 'user.reset-password',
        entityType: 'user',
        entityId: String(userId),
        ip: getClientIp(req),
    });

    return updated;
};

export const getUserLoginHistory = async (userId: number) => listLoginHistory(userId);

export const getAuditTrail = async () => listAuditLogs();

export const updateApplicationSettings = async (key: string, value: unknown, actor: AuthenticatedUser, req: Request) => {
    await setAppSetting(key, value, actor.id);
    await createAuditLog({
        userId: actor.id,
        username: actor.username,
        role: actor.role,
        action: 'settings.update',
        entityType: 'setting',
        entityId: key,
        ip: getClientIp(req),
        details: JSON.stringify(value),
    });
};
