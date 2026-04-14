import axios from 'axios';

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
});

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
