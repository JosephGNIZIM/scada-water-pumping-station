import bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';
import { UserRole } from '../auth/types';
import { sequelize } from './db';

export interface UserRecord {
    id: number;
    username: string;
    displayName: string;
    passwordHash: string;
    role: UserRole;
    active: boolean;
    failedAttempts: number;
    lockedUntil: string | null;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
}

export interface UserSessionRecord {
    id: string;
    userId: number;
    refreshTokenHash: string;
    csrfToken: string;
    expiresAt: string;
    lastActivityAt: string;
    revokedAt: string | null;
    createdAt: string;
    lastIp: string | null;
    userAgent: string | null;
}

export interface AuditLogRecord {
    id: number;
    userId: number | null;
    username: string | null;
    role: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    details: string | null;
    ip: string | null;
    createdAt: string;
}

export interface LoginHistoryRecord {
    id: number;
    userId: number | null;
    username: string;
    success: boolean;
    ip: string | null;
    userAgent: string | null;
    reason: string | null;
    createdAt: string;
}

const nowIso = () => new Date().toISOString();

const toUserRecord = (row: any): UserRecord => ({
    id: Number(row.id),
    username: String(row.username),
    displayName: String(row.displayName),
    passwordHash: String(row.passwordHash),
    role: row.role as UserRole,
    active: Boolean(row.active),
    failedAttempts: Number(row.failedAttempts),
    lockedUntil: row.lockedUntil ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    lastLoginAt: row.lastLoginAt ?? null,
});

export const initializeSecurityDatabase = async (): Promise<void> => {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            displayName TEXT NOT NULL,
            passwordHash TEXT NOT NULL,
            role TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            failedAttempts INTEGER NOT NULL DEFAULT 0,
            lockedUntil TEXT NULL,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            lastLoginAt TEXT NULL
        )
    `);

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
            id TEXT PRIMARY KEY,
            userId INTEGER NOT NULL,
            refreshTokenHash TEXT NOT NULL,
            csrfToken TEXT NOT NULL,
            expiresAt TEXT NOT NULL,
            lastActivityAt TEXT NOT NULL,
            revokedAt TEXT NULL,
            createdAt TEXT NOT NULL,
            lastIp TEXT NULL,
            userAgent TEXT NULL,
            FOREIGN KEY(userId) REFERENCES users(id)
        )
    `);

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS login_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NULL,
            username TEXT NOT NULL,
            success INTEGER NOT NULL,
            ip TEXT NULL,
            userAgent TEXT NULL,
            reason TEXT NULL,
            createdAt TEXT NOT NULL
        )
    `);

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NULL,
            username TEXT NULL,
            role TEXT NULL,
            action TEXT NOT NULL,
            entityType TEXT NOT NULL,
            entityId TEXT NULL,
            details TEXT NULL,
            ip TEXT NULL,
            createdAt TEXT NOT NULL
        )
    `);

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            updatedByUserId INTEGER NULL
        )
    `);

    const existingUsers = await sequelize.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM users',
        { type: QueryTypes.SELECT },
    );

    if (Number(existingUsers[0]?.count ?? 0) > 0) {
        return;
    }

    const createdAt = nowIso();
    const defaults = [
        { username: 'ingenieur', displayName: 'Ingenieur', password: 'Ing@2024', role: 'ingenieur' as UserRole },
        { username: 'technicien', displayName: 'Technicien', password: 'Tech@2024', role: 'technicien' as UserRole },
        { username: 'operateur', displayName: 'Operateur', password: 'Op@2024', role: 'operateur' as UserRole },
    ];

    for (const account of defaults) {
        const passwordHash = await bcrypt.hash(account.password, 10);
        await sequelize.query(
            `
            INSERT INTO users (username, displayName, passwordHash, role, active, failedAttempts, createdAt, updatedAt)
            VALUES (:username, :displayName, :passwordHash, :role, 1, 0, :createdAt, :updatedAt)
            `,
            {
                replacements: {
                    username: account.username,
                    displayName: account.displayName,
                    passwordHash,
                    role: account.role,
                    createdAt,
                    updatedAt: createdAt,
                },
            },
        );
    }
};

export const listUsers = async (): Promise<UserRecord[]> => {
    const rows = await sequelize.query<any>(
        'SELECT * FROM users ORDER BY CASE role WHEN \'ingenieur\' THEN 1 WHEN \'technicien\' THEN 2 ELSE 3 END, username ASC',
        { type: QueryTypes.SELECT },
    );
    return rows.map(toUserRecord);
};

export const getUserByUsername = async (username: string): Promise<UserRecord | null> => {
    const rows = await sequelize.query<any>(
        'SELECT * FROM users WHERE username = :username LIMIT 1',
        { replacements: { username }, type: QueryTypes.SELECT },
    );
    return rows[0] ? toUserRecord(rows[0]) : null;
};

export const getUserById = async (id: number): Promise<UserRecord | null> => {
    const rows = await sequelize.query<any>(
        'SELECT * FROM users WHERE id = :id LIMIT 1',
        { replacements: { id }, type: QueryTypes.SELECT },
    );
    return rows[0] ? toUserRecord(rows[0]) : null;
};

export const createUser = async (user: {
    username: string;
    displayName: string;
    passwordHash: string;
    role: UserRole;
    active?: boolean;
}): Promise<UserRecord> => {
    const timestamp = nowIso();
    await sequelize.query(
        `
        INSERT INTO users (username, displayName, passwordHash, role, active, failedAttempts, createdAt, updatedAt)
        VALUES (:username, :displayName, :passwordHash, :role, :active, 0, :createdAt, :updatedAt)
        `,
        {
            replacements: {
                ...user,
                active: user.active === false ? 0 : 1,
                createdAt: timestamp,
                updatedAt: timestamp,
            },
        },
    );

    const created = await getUserByUsername(user.username);
    if (!created) {
        throw new Error('User creation failed.');
    }
    return created;
};

export const updateUser = async (id: number, updates: Partial<{
    username: string;
    displayName: string;
    role: UserRole;
    active: boolean;
    passwordHash: string;
    failedAttempts: number;
    lockedUntil: string | null;
    lastLoginAt: string | null;
}>): Promise<UserRecord | null> => {
    const current = await getUserById(id);
    if (!current) {
        return null;
    }

    const next = {
        username: updates.username ?? current.username,
        displayName: updates.displayName ?? current.displayName,
        role: updates.role ?? current.role,
        active: updates.active ?? current.active,
        passwordHash: updates.passwordHash ?? current.passwordHash,
        failedAttempts: updates.failedAttempts ?? current.failedAttempts,
        lockedUntil: Object.prototype.hasOwnProperty.call(updates, 'lockedUntil') ? updates.lockedUntil ?? null : current.lockedUntil,
        lastLoginAt: Object.prototype.hasOwnProperty.call(updates, 'lastLoginAt') ? updates.lastLoginAt ?? null : current.lastLoginAt,
        updatedAt: nowIso(),
    };

    await sequelize.query(
        `
        UPDATE users
        SET username = :username,
            displayName = :displayName,
            role = :role,
            active = :active,
            passwordHash = :passwordHash,
            failedAttempts = :failedAttempts,
            lockedUntil = :lockedUntil,
            lastLoginAt = :lastLoginAt,
            updatedAt = :updatedAt
        WHERE id = :id
        `,
        {
            replacements: {
                id,
                ...next,
                active: next.active ? 1 : 0,
            },
        },
    );

    return getUserById(id);
};

export const createUserSession = async (session: UserSessionRecord): Promise<void> => {
    await sequelize.query(
        `
        INSERT INTO user_sessions (
            id, userId, refreshTokenHash, csrfToken, expiresAt, lastActivityAt, revokedAt, createdAt, lastIp, userAgent
        ) VALUES (
            :id, :userId, :refreshTokenHash, :csrfToken, :expiresAt, :lastActivityAt, :revokedAt, :createdAt, :lastIp, :userAgent
        )
        `,
        { replacements: session as unknown as Record<string, unknown> },
    );
};

export const getSessionById = async (id: string): Promise<UserSessionRecord | null> => {
    const rows = await sequelize.query<any>(
        'SELECT * FROM user_sessions WHERE id = :id LIMIT 1',
        { replacements: { id }, type: QueryTypes.SELECT },
    );

    if (!rows[0]) {
        return null;
    }

    const row = rows[0];
    return {
        id: String(row.id),
        userId: Number(row.userId),
        refreshTokenHash: String(row.refreshTokenHash),
        csrfToken: String(row.csrfToken),
        expiresAt: String(row.expiresAt),
        lastActivityAt: String(row.lastActivityAt),
        revokedAt: row.revokedAt ?? null,
        createdAt: String(row.createdAt),
        lastIp: row.lastIp ?? null,
        userAgent: row.userAgent ?? null,
    };
};

export const updateSession = async (id: string, updates: Partial<UserSessionRecord>): Promise<void> => {
    const current = await getSessionById(id);
    if (!current) {
        return;
    }

    const next = { ...current, ...updates };
    await sequelize.query(
        `
        UPDATE user_sessions
        SET refreshTokenHash = :refreshTokenHash,
            csrfToken = :csrfToken,
            expiresAt = :expiresAt,
            lastActivityAt = :lastActivityAt,
            revokedAt = :revokedAt,
            lastIp = :lastIp,
            userAgent = :userAgent
        WHERE id = :id
        `,
        { replacements: next },
    );
};

export const revokeSession = async (id: string): Promise<void> => {
    await sequelize.query(
        'UPDATE user_sessions SET revokedAt = :revokedAt WHERE id = :id',
        { replacements: { id, revokedAt: nowIso() } },
    );
};

export const revokeSessionsForUser = async (userId: number): Promise<void> => {
    await sequelize.query(
        'UPDATE user_sessions SET revokedAt = :revokedAt WHERE userId = :userId AND revokedAt IS NULL',
        { replacements: { userId, revokedAt: nowIso() } },
    );
};

export const createLoginHistory = async (entry: {
    userId?: number | null;
    username: string;
    success: boolean;
    ip?: string | null;
    userAgent?: string | null;
    reason?: string | null;
}): Promise<void> => {
    await sequelize.query(
        `
        INSERT INTO login_history (userId, username, success, ip, userAgent, reason, createdAt)
        VALUES (:userId, :username, :success, :ip, :userAgent, :reason, :createdAt)
        `,
        {
            replacements: {
                userId: entry.userId ?? null,
                username: entry.username,
                success: entry.success ? 1 : 0,
                ip: entry.ip ?? null,
                userAgent: entry.userAgent ?? null,
                reason: entry.reason ?? null,
                createdAt: nowIso(),
            },
        },
    );
};

export const listLoginHistory = async (userId?: number): Promise<LoginHistoryRecord[]> => {
    const rows = await sequelize.query<any>(
        userId
            ? 'SELECT * FROM login_history WHERE userId = :userId ORDER BY id DESC LIMIT 100'
            : 'SELECT * FROM login_history ORDER BY id DESC LIMIT 250',
        {
            replacements: userId ? { userId } : undefined,
            type: QueryTypes.SELECT,
        },
    );

    return rows.map((row: any) => ({
        id: Number(row.id),
        userId: row.userId == null ? null : Number(row.userId),
        username: String(row.username),
        success: Boolean(row.success),
        ip: row.ip ?? null,
        userAgent: row.userAgent ?? null,
        reason: row.reason ?? null,
        createdAt: String(row.createdAt),
    }));
};

export const createAuditLog = async (entry: {
    userId?: number | null;
    username?: string | null;
    role?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    details?: string | null;
    ip?: string | null;
}): Promise<void> => {
    await sequelize.query(
        `
        INSERT INTO audit_logs (userId, username, role, action, entityType, entityId, details, ip, createdAt)
        VALUES (:userId, :username, :role, :action, :entityType, :entityId, :details, :ip, :createdAt)
        `,
        {
            replacements: {
                userId: entry.userId ?? null,
                username: entry.username ?? null,
                role: entry.role ?? null,
                action: entry.action,
                entityType: entry.entityType,
                entityId: entry.entityId ?? null,
                details: entry.details ?? null,
                ip: entry.ip ?? null,
                createdAt: nowIso(),
            },
        },
    );
};

export const listAuditLogs = async (): Promise<AuditLogRecord[]> => {
    const rows = await sequelize.query<any>(
        'SELECT * FROM audit_logs ORDER BY id DESC LIMIT 250',
        { type: QueryTypes.SELECT },
    );

    return rows.map((row: any) => ({
        id: Number(row.id),
        userId: row.userId == null ? null : Number(row.userId),
        username: row.username ?? null,
        role: row.role ?? null,
        action: String(row.action),
        entityType: String(row.entityType),
        entityId: row.entityId ?? null,
        details: row.details ?? null,
        ip: row.ip ?? null,
        createdAt: String(row.createdAt),
    }));
};

export const getAppSetting = async <T>(key: string, fallback: T): Promise<T> => {
    const rows = await sequelize.query<any>(
        'SELECT value FROM app_settings WHERE key = :key LIMIT 1',
        { replacements: { key }, type: QueryTypes.SELECT },
    );

    if (!rows[0]) {
        return fallback;
    }

    try {
        return JSON.parse(String(rows[0].value)) as T;
    } catch {
        return fallback;
    }
};

export const setAppSetting = async (key: string, value: unknown, updatedByUserId?: number | null): Promise<void> => {
    await sequelize.query(
        `
        INSERT INTO app_settings (key, value, updatedAt, updatedByUserId)
        VALUES (:key, :value, :updatedAt, :updatedByUserId)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updatedAt = excluded.updatedAt,
            updatedByUserId = excluded.updatedByUserId
        `,
        {
            replacements: {
                key,
                value: JSON.stringify(value),
                updatedAt: nowIso(),
                updatedByUserId: updatedByUserId ?? null,
            },
        },
    );
};
