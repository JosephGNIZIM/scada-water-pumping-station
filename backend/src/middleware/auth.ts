import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../auth/types';
import { createAuditLog } from '../utils/securityDb';
import { getClientIp, touchSession, validateSession, verifyAccessToken } from '../services/authService';
import { AuthRequest } from '../types/authRequest';

const readBearerToken = (req: Request): string | null => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return null;
    }

    return header.slice('Bearer '.length).trim();
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = readBearerToken(req);
        if (!token) {
            res.status(401).json({ message: 'Authentification requise.' });
            return;
        }

        const decoded = verifyAccessToken(token);
        const csrfToken = typeof req.headers['x-csrf-token'] === 'string'
            ? req.headers['x-csrf-token']
            : undefined;

        const { user, session } = await validateSession(decoded.sessionId, req.method === 'GET' ? undefined : csrfToken);
        await touchSession(session.id, req);

        req.auth = {
            ...user,
            sessionId: session.id,
            csrfToken: session.csrfToken,
        };

        res.setHeader('x-session-expires-in', `${30 * 60}`);
        next();
    } catch (error: any) {
        res.status(401).json({ message: error.message || 'Session invalide.' });
    }
};

export const requireRole = (roles: UserRole[]) => async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
        res.status(401).json({ message: 'Authentification requise.' });
        return;
    }

    if (!roles.includes(req.auth.role)) {
        await createAuditLog({
            userId: req.auth.id,
            username: req.auth.username,
            role: req.auth.role,
            action: 'access.denied',
            entityType: 'route',
            entityId: req.originalUrl,
            ip: getClientIp(req),
            details: JSON.stringify({ method: req.method, allowedRoles: roles }),
        });
        res.status(403).json({ message: 'Acces non autorise pour ce role.' });
        return;
    }

    next();
};

export const requireCsrf = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
        next();
        return;
    }

    const headerToken = req.headers['x-csrf-token'];
    if (!req.auth || typeof headerToken !== 'string' || headerToken !== req.auth.csrfToken) {
        res.status(403).json({ message: 'Jeton CSRF invalide.' });
        return;
    }

    next();
};
