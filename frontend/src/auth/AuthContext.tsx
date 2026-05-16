import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    AuthResponse,
    AuthUser,
    clearAuthSession,
    getCurrentUser,
    login as loginRequest,
    logout as logoutRequest,
    refreshAuth,
    setAuthSession,
    UserRole,
} from '../services/api';

const STORAGE_KEY = 'scada-auth-session';
const INACTIVITY_WARNING_MS = 28 * 60 * 1000;
const INACTIVITY_LOGOUT_MS = 30 * 60 * 1000;

interface StoredSession {
    accessToken: string;
    csrfToken: string;
    expiresAt: number;
    user: AuthUser;
}

interface AuthContextValue {
    user: AuthUser | null;
    role: UserRole | null;
    loading: boolean;
    loginError: string | null;
    warningVisible: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    clearLoginError: () => void;
    hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStoredSession = (): StoredSession | null => {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as StoredSession;
    } catch {
        return null;
    }
};

const storeSession = (session: StoredSession | null) => {
    if (!session) {
        window.sessionStorage.removeItem(STORAGE_KEY);
        return;
    }

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

const applyAuthResponse = (response: AuthResponse): StoredSession => {
    const nextSession = {
        accessToken: response.accessToken,
        csrfToken: response.csrfToken,
        expiresAt: Date.now() + response.expiresInSeconds * 1000,
        user: response.user,
    };

    setAuthSession({
        accessToken: response.accessToken,
        csrfToken: response.csrfToken,
    });
    storeSession(nextSession);
    return nextSession;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<StoredSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [warningVisible, setWarningVisible] = useState(false);
    const lastActivityRef = useRef(Date.now());
    const refreshPromiseRef = useRef<Promise<void> | null>(null);

    const clearSession = React.useCallback(() => {
        setSession(null);
        clearAuthSession();
        storeSession(null);
    }, []);

    const refreshSession = React.useCallback(async () => {
        if (refreshPromiseRef.current) {
            await refreshPromiseRef.current;
            return;
        }

        refreshPromiseRef.current = (async () => {
            const response = await refreshAuth();
            const next = applyAuthResponse(response);
            setSession(next);
            setWarningVisible(false);
        })();

        try {
            await refreshPromiseRef.current;
        } finally {
            refreshPromiseRef.current = null;
        }
    }, []);

    const logout = React.useCallback(async () => {
        try {
            await logoutRequest();
        } catch {
        }
        clearSession();
        setWarningVisible(false);
    }, [clearSession]);

    const bootstrap = React.useCallback(async () => {
        const stored = readStoredSession();
        if (!stored) {
            clearSession();
            setLoading(false);
            return;
        }

        setAuthSession({ accessToken: stored.accessToken, csrfToken: stored.csrfToken });
        setSession(stored);

        try {
            if (stored.expiresAt <= Date.now() + 60_000) {
                await refreshSession();
            } else {
                const currentUser = await getCurrentUser();
                setSession((prev) => prev ? { ...prev, user: currentUser } : prev);
            }
        } catch {
            clearSession();
        } finally {
            setLoading(false);
        }
    }, [clearSession, refreshSession]);

    useEffect(() => {
        bootstrap();
    }, [bootstrap]);

    useEffect(() => {
        const markActivity = () => {
            lastActivityRef.current = Date.now();
            setWarningVisible(false);
        };

        const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach((eventName) => window.addEventListener(eventName, markActivity));

        const timer = window.setInterval(async () => {
            if (!session) {
                return;
            }

            const inactiveFor = Date.now() - lastActivityRef.current;
            if (inactiveFor >= INACTIVITY_LOGOUT_MS) {
                await logout();
                return;
            }

            if (inactiveFor >= INACTIVITY_WARNING_MS) {
                setWarningVisible(true);
            }

            if (session.expiresAt <= Date.now() + 120_000) {
                try {
                    await refreshSession();
                } catch {
                    await logout();
                }
            }
        }, 15_000);

        return () => {
            events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
            window.clearInterval(timer);
        };
    }, [logout, refreshSession, session]);

    const login = React.useCallback(async (username: string, password: string) => {
        setLoginError(null);
        try {
            const response = await loginRequest(username, password);
            const next = applyAuthResponse(response);
            setSession(next);
            lastActivityRef.current = Date.now();
            return true;
        } catch (error: any) {
            setLoginError(error?.response?.data?.message || 'Connexion impossible.');
            return false;
        }
    }, []);

    const value = useMemo<AuthContextValue>(() => ({
        user: session?.user ?? null,
        role: session?.user.role ?? null,
        loading,
        loginError,
        warningVisible,
        login,
        logout,
        clearLoginError: () => setLoginError(null),
        hasRole: (roles) => !!session?.user && roles.includes(session.user.role),
    }), [loading, loginError, warningVisible, login, logout, session]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
};
