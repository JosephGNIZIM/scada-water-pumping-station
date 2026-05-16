import express from 'express';
import rateLimit from 'express-rate-limit';
import { ROLES } from '../auth/types';
import { authenticate, requireCsrf, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types/authRequest';
import {
    createUserAccount,
    getAuditTrail,
    getUserLoginHistory,
    listUserProfiles,
    login,
    logout,
    refreshSession,
    resetUserPassword,
    updateApplicationSettings,
    updateUserAccount,
} from '../services/authService';
import { getAppSetting } from '../utils/securityDb';

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop de tentatives de connexion. Reessayez dans une minute.' },
});

const setSessionCookies = (res: express.Response, refreshToken: string, sessionId: string, csrfToken: string) => {
    const cookieBase = {
        sameSite: 'strict' as const,
        secure: false,
        path: '/',
    };

    res.cookie('scada_refresh_token', refreshToken, {
        ...cookieBase,
        httpOnly: true,
        maxAge: 12 * 60 * 60 * 1000,
    });
    res.cookie('scada_session_id', sessionId, {
        ...cookieBase,
        httpOnly: true,
        maxAge: 12 * 60 * 60 * 1000,
    });
    res.cookie('scada_csrf', csrfToken, {
        ...cookieBase,
        httpOnly: false,
        maxAge: 12 * 60 * 60 * 1000,
    });
};

const clearSessionCookies = (res: express.Response) => {
    res.clearCookie('scada_refresh_token', { path: '/' });
    res.clearCookie('scada_session_id', { path: '/' });
    res.clearCookie('scada_csrf', { path: '/' });
};

router.post('/login', loginLimiter, async (req, res) => {
    try {
        const username = String(req.body?.username ?? '');
        const password = String(req.body?.password ?? '');
        const result = await login(username, password, req);
        setSessionCookies(res, result.tokens.refreshToken, result.sessionId, result.tokens.csrfToken);
        res.json({
            user: result.user,
            accessToken: result.tokens.accessToken,
            csrfToken: result.tokens.csrfToken,
            expiresInSeconds: result.tokens.expiresInSeconds,
        });
    } catch (error: any) {
        res.status(401).json({ message: error.message || 'Connexion impossible.' });
    }
});

router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = String(req.cookies?.scada_refresh_token ?? '');
        const sessionId = String(req.cookies?.scada_session_id ?? '');
        const result = await refreshSession(refreshToken, sessionId, req);
        setSessionCookies(res, result.tokens.refreshToken, result.sessionId, result.tokens.csrfToken);
        res.json({
            user: result.user,
            accessToken: result.tokens.accessToken,
            csrfToken: result.tokens.csrfToken,
            expiresInSeconds: result.tokens.expiresInSeconds,
        });
    } catch (error: any) {
        clearSessionCookies(res);
        res.status(401).json({ message: error.message || 'Session expirée.' });
    }
});

router.post('/logout', authenticate, async (req: AuthRequest, res) => {
    if (req.auth) {
        await logout(req.auth.sessionId, req);
    }
    clearSessionCookies(res);
    res.status(204).send();
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
    res.json({ user: req.auth });
});

router.get('/users', authenticate, requireRole(['ingenieur']), async (_req, res) => {
    res.json(await listUserProfiles());
});

router.post('/users', authenticate, requireCsrf, requireRole(['ingenieur']), async (req: AuthRequest, res) => {
    const role = String(req.body?.role ?? '') as any;
    if (!ROLES.includes(role)) {
        res.status(400).json({ message: 'Role invalide.' });
        return;
    }

    const created = await createUserAccount({
        username: String(req.body?.username ?? ''),
        displayName: String(req.body?.displayName ?? ''),
        password: String(req.body?.password ?? ''),
        role,
        active: req.body?.active !== false,
    }, req.auth!, req);

    res.status(201).json(created);
});

router.patch('/users/:id', authenticate, requireCsrf, requireRole(['ingenieur']), async (req: AuthRequest, res) => {
    const updated = await updateUserAccount(Number(req.params.id), {
        username: req.body?.username,
        displayName: req.body?.displayName,
        role: req.body?.role,
        active: typeof req.body?.active === 'boolean' ? req.body.active : undefined,
    }, req.auth!, req);

    res.json(updated);
});

router.post('/users/:id/reset-password', authenticate, requireCsrf, requireRole(['ingenieur']), async (req: AuthRequest, res) => {
    const updated = await resetUserPassword(Number(req.params.id), String(req.body?.password ?? ''), req.auth!, req);
    res.json(updated);
});

router.get('/users/:id/login-history', authenticate, requireRole(['ingenieur']), async (req, res) => {
    res.json(await getUserLoginHistory(Number(req.params.id)));
});

router.get('/audit-logs', authenticate, requireRole(['ingenieur']), async (_req, res) => {
    res.json(await getAuditTrail());
});

router.get('/settings', authenticate, requireRole(['ingenieur', 'technicien']), async (_req, res) => {
    const settings = await getAppSetting('system', {
        mqtt: { enabled: true, brokerUrl: 'mqtt://127.0.0.1:1883' },
        websocket: { enabled: true, url: 'ws://127.0.0.1:3000' },
    });

    res.json(settings);
});

router.put('/settings', authenticate, requireCsrf, requireRole(['ingenieur']), async (req: AuthRequest, res) => {
    await updateApplicationSettings('system', req.body ?? {}, req.auth!, req);
    res.status(204).send();
});

export default router;
