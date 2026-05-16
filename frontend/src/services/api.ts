import axios from 'axios';

export type UserRole = 'ingenieur' | 'technicien' | 'operateur';

export interface AuthUser {
    id: number;
    username: string;
    displayName: string;
    role: UserRole;
    active: boolean;
    sessionId?: string;
    csrfToken?: string;
}

export interface AuthResponse {
    user: AuthUser;
    accessToken: string;
    csrfToken: string;
    expiresInSeconds: number;
}

export interface ManagedUser {
    id: number;
    username: string;
    displayName: string;
    role: UserRole;
    active: boolean;
    failedAttempts: number;
    lockedUntil: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface LoginHistoryEntry {
    id: number;
    userId: number | null;
    username: string;
    success: boolean;
    ip: string | null;
    userAgent: string | null;
    reason: string | null;
    createdAt: string;
}

export interface AuditLogEntry {
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

export interface PumpStatusResponse {
    id: number;
    status: string;
    lastUpdated: string;
}

export interface SensorReading {
    id: number;
    type: string;
    value: number;
    timestamp: string;
}

export interface Alarm {
    id: number;
    description: string;
    timestamp: string;
    acknowledged: boolean;
    type?: string;
}

export interface SimulationPump {
    id: number;
    label: string;
    commandedOn: boolean;
    running: boolean;
    status: string;
    startProgress: number;
    temperature: number;
    dryRunSeconds: number;
    runtimeSeconds: number;
    faultReason?: string;
}

export interface SimulationHistoryPoint {
    simulatedAt: string;
    tank1Level: number;
    tank2Level: number;
    pressure: number;
    flow: number;
    energy: number;
}

export interface SimulationLogEntry {
    id: number;
    level: 'normal' | 'warning' | 'alarm';
    message: string;
    timestamp: string;
}

export interface SimulationScenario {
    id: string;
    name: string;
    description: string;
}

export interface SimulationState {
    mode: 'real' | 'simulation';
    runState: 'idle' | 'running' | 'paused';
    speed: number;
    scenarioId: string | null;
    scenarioTimeSeconds: number;
    communicationOk: boolean;
    generatedReportAt: string | null;
    settings: {
        inletFlow: number;
        initialTank1Level: number;
        initialTank2Level: number;
        networkPressure: number;
    };
    tank1Level: number;
    tank2Level: number;
    valveOpenings: number[];
    valveTargets: number[];
    pumps: SimulationPump[];
    measuredPressure: number;
    measuredFlow: number;
    estimatedEnergyKw: number;
    treatedVolumeLiters: number;
    totalEnergyKwh: number;
    durationSeconds: number;
    alarmCount: number;
    acknowledgedCount: number;
    leakTank1Active: boolean;
    pump1FailureActive: boolean;
    networkCutActive: boolean;
    overloadActive: boolean;
    history: SimulationHistoryPoint[];
    logs: SimulationLogEntry[];
}

export interface SimulationReport {
    generatedAt: string;
    durationSeconds: number;
    alarmCount: number;
    acknowledgedCount: number;
    energyKwh: number;
    treatedVolumeLiters: number;
    availabilityRate: number;
    summarySeries: Array<{ label: string; values: number[]; color: string }>;
}

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

let authToken: string | null = null;
let csrfTokenValue: string | null = null;

export const setAuthSession = (session: { accessToken: string | null; csrfToken: string | null }) => {
    authToken = session.accessToken;
    csrfTokenValue = session.csrfToken;
};

export const clearAuthSession = () => {
    authToken = null;
    csrfTokenValue = null;
};

api.interceptors.request.use((config) => {
    const nextConfig = { ...config };
    nextConfig.headers = nextConfig.headers || {};

    if (authToken) {
        nextConfig.headers.Authorization = `Bearer ${authToken}`;
    }

    const method = (nextConfig.method || 'get').toLowerCase();
    if (method !== 'get' && csrfTokenValue) {
        nextConfig.headers['x-csrf-token'] = csrfTokenValue;
    }

    return nextConfig;
});

export const login = async (username: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', { username, password });
    return response.data;
};

export const refreshAuth = async () => {
    const response = await api.post<AuthResponse>('/auth/refresh');
    return response.data;
};

export const logout = async () => {
    await api.post('/auth/logout');
};

export const getCurrentUser = async () => {
    const response = await api.get<{ user: AuthUser }>('/auth/me');
    return response.data.user;
};

export const listUsers = async () => {
    const response = await api.get<ManagedUser[]>('/auth/users');
    return response.data;
};

export const createUser = async (payload: {
    username: string;
    displayName: string;
    password: string;
    role: UserRole;
    active?: boolean;
}) => {
    const response = await api.post<ManagedUser>('/auth/users', payload);
    return response.data;
};

export const updateUser = async (
    userId: number,
    payload: Partial<Pick<ManagedUser, 'username' | 'displayName' | 'role' | 'active'>>,
) => {
    const response = await api.patch<ManagedUser>(`/auth/users/${userId}`, payload);
    return response.data;
};

export const resetUserPassword = async (userId: number, password: string) => {
    const response = await api.post<ManagedUser>(`/auth/users/${userId}/reset-password`, { password });
    return response.data;
};

export const getUserLoginHistory = async (userId: number) => {
    const response = await api.get<LoginHistoryEntry[]>(`/auth/users/${userId}/login-history`);
    return response.data;
};

export const getAuditLogs = async () => {
    const response = await api.get<AuditLogEntry[]>('/auth/audit-logs');
    return response.data;
};

export const getSystemSettings = async () => {
    const response = await api.get('/auth/settings');
    return response.data;
};

export const updateSystemSettings = async (payload: unknown) => {
    await api.put('/auth/settings', payload);
};

export const getPumpStatus = async () => {
    try {
        const response = await api.get<PumpStatusResponse>('/pumps/status');
        return response.data;
    } catch (error) {
        console.error('Error fetching pump status:', error);
        throw error;
    }
};

export const startPump = async (pumpId: number) => {
    try {
        const response = await api.post<PumpStatusResponse>('/pumps/start', { id: pumpId });
        return response.data;
    } catch (error) {
        console.error('Error starting pump:', error);
        throw error;
    }
};

export const stopPump = async (pumpId: number) => {
    try {
        const response = await api.post<PumpStatusResponse>('/pumps/stop', { id: pumpId });
        return response.data;
    } catch (error) {
        console.error('Error stopping pump:', error);
        throw error;
    }
};

export const getSensorReadings = async () => {
    try {
        const response = await api.get<SensorReading[]>('/sensors/readings');
        return response.data;
    } catch (error) {
        console.error('Error fetching sensor readings:', error);
        throw error;
    }
};

export const getAlarms = async () => {
    try {
        const response = await api.get<Alarm[]>('/alarms');
        return response.data;
    } catch (error) {
        console.error('Error fetching alarms:', error);
        throw error;
    }
};

export const acknowledgeAlarm = async (alarmId: number) => {
    try {
        const response = await api.post<Alarm>(`/alarms/acknowledge/${alarmId}`);
        return response.data;
    } catch (error) {
        console.error('Error acknowledging alarm:', error);
        throw error;
    }
};

export const deleteAlarm = async (alarmId: number) => {
    await api.delete(`/alarms/${alarmId}`);
};

export const getSimulationState = async () => {
    const response = await api.get<SimulationState>('/simulation');
    return response.data;
};

export const getSimulationScenarios = async () => {
    const response = await api.get<SimulationScenario[]>('/simulation/scenarios');
    return response.data;
};

export const startSimulation = async (speed?: number) => {
    const response = await api.post<SimulationState>('/simulation/start', { speed });
    return response.data;
};

export const pauseSimulation = async () => {
    const response = await api.post<SimulationState>('/simulation/pause');
    return response.data;
};

export const resetSimulation = async () => {
    const response = await api.post<SimulationState>('/simulation/reset');
    return response.data;
};

export const updateSimulationSettings = async (payload: Partial<SimulationState['settings']> & { speed?: number }) => {
    const response = await api.post<SimulationState>('/simulation/settings', payload);
    return response.data;
};

export const injectSimulationFault = async (type: string) => {
    const response = await api.post<SimulationState>('/simulation/fault', { type });
    return response.data;
};

export const loadSimulationScenario = async (id: string) => {
    const response = await api.post<SimulationState>(`/simulation/scenarios/${id}`);
    return response.data;
};

export const connectRealEquipment = async () => {
    const response = await api.post<SimulationState>('/simulation/connect-real');
    return response.data;
};

export const getSimulationReport = async () => {
    const response = await api.get<SimulationReport | null>('/simulation/report');
    return response.data;
};
