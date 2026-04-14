import { Alarm } from '../models/event';
import { Pump } from '../models/pump';
import {
    acknowledgeAlarmById,
    clearSimulationHistory,
    clearSimulationLogs,
    createAlarm,
    createSimulationHistory,
    createSimulationLog,
    getLatestSimulationReport,
    listAlarms,
    listSimulationHistory,
    listSimulationLogs,
    savePumpStatus,
    saveSensorSnapshot,
    saveSimulationReport,
} from '../utils/db';

type SimulationMode = 'real' | 'simulation';
type SimulationRunState = 'idle' | 'running' | 'paused';
type LogLevel = 'normal' | 'warning' | 'alarm';
type FaultType = 'leak-tank1' | 'pump1-failure' | 'sensor-failure' | 'network-cut' | 'overload';

interface SimulationSettings {
    inletFlow: number;
    initialTank1Level: number;
    initialTank2Level: number;
    networkPressure: number;
}

interface ScenarioDefinition {
    id: string;
    name: string;
    description: string;
}

interface PumpRuntime {
    id: number;
    label: string;
    commandedOn: boolean;
    running: boolean;
    status: Pump['status'];
    startProgress: number;
    temperature: number;
    dryRunSeconds: number;
    runtimeSeconds: number;
    faultReason?: string;
}

interface SimulationLogEntry {
    id: number;
    level: LogLevel;
    message: string;
    timestamp: string;
}

interface HistoryPoint {
    simulatedAt: string;
    tank1Level: number;
    tank2Level: number;
    pressure: number;
    flow: number;
    energy: number;
}

interface SimulationState {
    mode: SimulationMode;
    runState: SimulationRunState;
    speed: number;
    scenarioId: string | null;
    scenarioTimeSeconds: number;
    communicationOk: boolean;
    generatedReportAt: string | null;
    settings: SimulationSettings;
    tank1Level: number;
    tank2Level: number;
    tank1Volume: number;
    tank2Volume: number;
    valveOpenings: number[];
    valveTargets: number[];
    pumps: PumpRuntime[];
    measuredPressure: number;
    measuredFlow: number;
    estimatedEnergyKw: number;
    treatedVolumeLiters: number;
    totalEnergyKwh: number;
    durationSeconds: number;
    alarmCount: number;
    acknowledgedCount: number;
    pressureDrift: number;
    sensorFailureMode: 'stuck' | 'aberrant';
    sensorFrozenValue: number | null;
    sensorFailureTarget: string | null;
    leakTank1Active: boolean;
    pump1FailureActive: boolean;
    networkCutActive: boolean;
    overloadActive: boolean;
    history: HistoryPoint[];
    logs: SimulationLogEntry[];
}

interface SimulationReportPayload {
    generatedAt: string;
    durationSeconds: number;
    alarmCount: number;
    acknowledgedCount: number;
    energyKwh: number;
    treatedVolumeLiters: number;
    availabilityRate: number;
    summarySeries: Array<{ label: string; values: number[]; color: string }>;
}

export type { FaultType, SimulationMode, SimulationReportPayload, SimulationRunState, SimulationState };

const TANK_CAPACITY_L = 2000;
const LOOP_INTERVAL_MS = 250;
const EVAPORATION_RATIO_PER_SECOND = 0.0001;
const DEFAULT_SETTINGS: SimulationSettings = {
    inletFlow: 30,
    initialTank1Level: 50,
    initialTank2Level: 50,
    networkPressure: 3.8,
};

const scenarioDefinitions: ScenarioDefinition[] = [
    { id: 'normal-start', name: 'Demarrage normal', description: 'Bacs a 50%, demarrage progressif des pompes.' },
    { id: 'high-demand', name: 'Forte demande', description: 'Bac 2 se vide rapidement, pompes sollicitees.' },
    { id: 'critical-failure', name: 'Panne critique', description: 'Fuite bac 1 et panne pompe 2 avec cascade d alarmes.' },
    { id: 'maintenance', name: 'Maintenance programmee', description: 'Arret sequentiel, vidange controlee et vannes manipulees.' },
    { id: 'full-day', name: 'Journee complete', description: 'Cycle accelere x60 avec demande variable matin, midi et soir.' },
];

const round = (value: number, digits = 2): number => Number(value.toFixed(digits));
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

class SimulationEngine {
    private state: SimulationState = this.createBaseState();
    private interval: NodeJS.Timeout | null = null;
    private activeAlarmKeys = new Set<string>();
    private nextLogId = 1;
    private historyAccumulatorSeconds = 0;
    private scenarioActions: Array<{ at: number; run: () => void }> = [];
    private lastPersistedReportSignature = '';

    public async initialize(): Promise<void> {
        await this.syncOutputs();
    }

    public getState(): SimulationState {
        return {
            ...this.state,
            settings: { ...this.state.settings },
            valveOpenings: [...this.state.valveOpenings],
            valveTargets: [...this.state.valveTargets],
            pumps: this.state.pumps.map((pump) => ({ ...pump })),
            history: [...this.state.history],
            logs: [...this.state.logs],
        };
    }

    public getScenarios(): ScenarioDefinition[] {
        return scenarioDefinitions;
    }

    public async start(speed = this.state.speed): Promise<SimulationState> {
        this.state.mode = 'simulation';
        this.state.runState = 'running';
        this.state.speed = speed;
        this.ensureLoop();
        await this.log('normal', `Simulation demarree a x${speed}`);
        await this.syncOutputs();
        return this.getState();
    }

    public async pause(): Promise<SimulationState> {
        this.state.runState = 'paused';
        await this.log('warning', 'Simulation mise en pause');
        await this.generateAndStoreReport();
        return this.getState();
    }

    public async reset(): Promise<SimulationState> {
        const settings = { ...this.state.settings };
        this.state = this.createBaseState(settings);
        this.activeAlarmKeys.clear();
        this.scenarioActions = [];
        this.lastPersistedReportSignature = '';
        await clearSimulationLogs();
        await clearSimulationHistory();
        this.state.logs = [];
        await this.log('normal', 'Simulation reinitialisee');
        await this.syncOutputs();
        return this.getState();
    }

    public async connectReal(): Promise<SimulationState> {
        this.state.mode = 'real';
        this.state.runState = 'idle';
        this.state.speed = 1;
        await this.log('warning', 'Retour au mode ESP32 reel');
        await this.syncOutputs();
        return this.getState();
    }

    public async updateSettings(nextSettings: Partial<SimulationSettings> & { speed?: number }): Promise<SimulationState> {
        this.state.settings = {
            ...this.state.settings,
            inletFlow: clamp(nextSettings.inletFlow ?? this.state.settings.inletFlow, 0, 100),
            initialTank1Level: clamp(nextSettings.initialTank1Level ?? this.state.settings.initialTank1Level, 0, 100),
            initialTank2Level: clamp(nextSettings.initialTank2Level ?? this.state.settings.initialTank2Level, 0, 100),
            networkPressure: clamp(nextSettings.networkPressure ?? this.state.settings.networkPressure, 1, 6),
        };

        if (typeof nextSettings.speed === 'number') {
            this.state.speed = nextSettings.speed;
        }

        if (this.state.runState === 'idle') {
            this.applyInitialLevels();
            await this.syncOutputs();
        }

        await this.log('normal', `Parametres de simulation mis a jour (x${this.state.speed})`);
        return this.getState();
    }

    public async injectFault(type: FaultType): Promise<SimulationState> {
        switch (type) {
            case 'leak-tank1':
                this.state.leakTank1Active = true;
                await this.log('alarm', 'Fuite du bac 1 simulee');
                break;
            case 'pump1-failure':
                this.state.pump1FailureActive = true;
                this.failPump(1, 'Panne simulee');
                await this.log('alarm', 'Panne pompe 1 simulee');
                break;
            case 'sensor-failure':
                this.state.sensorFailureMode = Math.random() > 0.5 ? 'stuck' : 'aberrant';
                this.state.sensorFailureTarget = 'line-pressure';
                this.state.sensorFrozenValue = this.state.measuredPressure;
                await this.log('warning', `Capteur ${this.state.sensorFailureTarget} defaillant (${this.state.sensorFailureMode})`);
                break;
            case 'network-cut':
                this.state.networkCutActive = true;
                this.state.communicationOk = false;
                await this.log('alarm', 'Coupure reseau MQTT simulee');
                break;
            case 'overload':
                this.state.overloadActive = true;
                await this.log('alarm', 'Surcharge generale simulee');
                break;
        }

        await this.syncOutputs();
        return this.getState();
    }

    public async loadScenario(id: string): Promise<SimulationState> {
        await this.reset();
        this.state.scenarioId = id;

        if (id === 'normal-start') {
            this.state.settings = { ...DEFAULT_SETTINGS, inletFlow: 35, initialTank1Level: 50, initialTank2Level: 50, networkPressure: 3.6 };
            this.applyInitialLevels();
            this.state.valveTargets = [100, 90, 70];
            this.state.pumps[0].commandedOn = true;
            this.scenarioActions = [
                { at: 8, run: () => { this.state.pumps[1].commandedOn = true; void this.log('normal', 'Scenario: pompe 2 engagee'); } },
            ];
        } else if (id === 'high-demand') {
            this.state.settings = { ...DEFAULT_SETTINGS, inletFlow: 45, initialTank1Level: 65, initialTank2Level: 35, networkPressure: 5.2 };
            this.applyInitialLevels();
            this.state.valveTargets = [100, 100, 100];
            this.state.pumps.forEach((pump) => { pump.commandedOn = true; });
        } else if (id === 'critical-failure') {
            this.state.settings = { ...DEFAULT_SETTINGS, inletFlow: 18, initialTank1Level: 40, initialTank2Level: 55, networkPressure: 2.2 };
            this.applyInitialLevels();
            this.state.pumps.forEach((pump) => { pump.commandedOn = true; });
            this.scenarioActions = [
                { at: 5, run: () => { this.state.leakTank1Active = true; void this.log('alarm', 'Scenario: fuite bac 1 activee'); } },
                { at: 7, run: () => { this.failPump(2, 'Defaut critique'); void this.log('alarm', 'Scenario: pompe 2 en defaut'); } },
            ];
        } else if (id === 'maintenance') {
            this.state.settings = { ...DEFAULT_SETTINGS, inletFlow: 12, initialTank1Level: 55, initialTank2Level: 60, networkPressure: 3.1 };
            this.applyInitialLevels();
            this.state.pumps.forEach((pump) => { pump.commandedOn = true; });
            this.scenarioActions = [
                { at: 10, run: () => { this.state.valveTargets[2] = 0; void this.log('warning', 'Scenario: vanne de distribution fermee'); } },
                { at: 20, run: () => { this.state.pumps[1].commandedOn = false; void this.log('warning', 'Scenario: arret pompe 2'); } },
                { at: 30, run: () => { this.state.pumps[0].commandedOn = false; void this.log('warning', 'Scenario: arret pompe 1'); } },
            ];
        } else if (id === 'full-day') {
            this.state.settings = { ...DEFAULT_SETTINGS, inletFlow: 42, initialTank1Level: 68, initialTank2Level: 52, networkPressure: 4.6 };
            this.applyInitialLevels();
            this.state.speed = 60;
            this.state.pumps.forEach((pump) => { pump.commandedOn = true; });
            this.state.valveTargets = [100, 100, 85];
        }

        await this.log('normal', `Scenario charge: ${scenarioDefinitions.find((scenario) => scenario.id === id)?.name ?? id}`);
        await this.start(this.state.speed);
        return this.getState();
    }

    public async acknowledgeAlarm(alarmId: number): Promise<Alarm | null> {
        const alarm = await acknowledgeAlarmById(alarmId);
        if (alarm) {
            this.state.acknowledgedCount += 1;
            await this.log('normal', `Alarme ${alarmId} acquittee`);
            await this.generateAndStoreReport();
        }
        return alarm;
    }

    public async exportLogsCsv(): Promise<string> {
        const rows = ['timestamp,level,message'];
        for (const log of this.state.logs) {
            const message = `"${log.message.replace(/"/g, '""')}"`;
            rows.push([log.timestamp, log.level, message].join(','));
        }

        return rows.join('\n');
    }

    public async getLatestReport(): Promise<SimulationReportPayload | null> {
        await this.generateAndStoreReport();
        const report = await getLatestSimulationReport();
        if (!report) {
            return null;
        }

        return JSON.parse(report.payload) as SimulationReportPayload;
    }

    private createBaseState(settings = DEFAULT_SETTINGS): SimulationState {
        return {
            mode: 'real',
            runState: 'idle',
            speed: 1,
            scenarioId: null,
            scenarioTimeSeconds: 0,
            communicationOk: true,
            generatedReportAt: null,
            settings: { ...settings },
            tank1Level: settings.initialTank1Level,
            tank2Level: settings.initialTank2Level,
            tank1Volume: (settings.initialTank1Level / 100) * TANK_CAPACITY_L,
            tank2Volume: (settings.initialTank2Level / 100) * TANK_CAPACITY_L,
            valveOpenings: [0, 0, 0],
            valveTargets: [100, 100, 100],
            pumps: [
                { id: 1, label: 'Pompe 1', commandedOn: false, running: false, status: 'stopped', startProgress: 0, temperature: 38, dryRunSeconds: 0, runtimeSeconds: 0 },
                { id: 2, label: 'Pompe 2', commandedOn: false, running: false, status: 'stopped', startProgress: 0, temperature: 36, dryRunSeconds: 0, runtimeSeconds: 0 },
            ],
            measuredPressure: settings.networkPressure,
            measuredFlow: 0,
            estimatedEnergyKw: 0,
            treatedVolumeLiters: 0,
            totalEnergyKwh: 0,
            durationSeconds: 0,
            alarmCount: 0,
            acknowledgedCount: 0,
            pressureDrift: 0,
            sensorFailureMode: 'stuck',
            sensorFrozenValue: null,
            sensorFailureTarget: null,
            leakTank1Active: false,
            pump1FailureActive: false,
            networkCutActive: false,
            overloadActive: false,
            history: [],
            logs: [],
        };
    }

    private applyInitialLevels(): void {
        this.state.tank1Level = this.state.settings.initialTank1Level;
        this.state.tank2Level = this.state.settings.initialTank2Level;
        this.state.tank1Volume = (this.state.tank1Level / 100) * TANK_CAPACITY_L;
        this.state.tank2Volume = (this.state.tank2Level / 100) * TANK_CAPACITY_L;
        this.state.measuredPressure = this.state.settings.networkPressure;
        this.state.measuredFlow = 0;
    }

    private ensureLoop(): void {
        if (!this.interval) {
            this.interval = setInterval(() => {
                void this.tick(LOOP_INTERVAL_MS / 1000);
            }, LOOP_INTERVAL_MS);
        }
    }

    private async tick(realDeltaSeconds: number): Promise<void> {
        if (this.state.runState !== 'running' || this.state.mode !== 'simulation') {
            return;
        }

        const simulatedDelta = realDeltaSeconds * this.state.speed;
        this.state.durationSeconds += simulatedDelta;
        this.state.scenarioTimeSeconds += simulatedDelta;

        this.runScenarioActions();
        this.updateActuators(simulatedDelta);

        const valveFactor = this.state.valveOpenings.reduce((sum, opening) => sum + opening, 0) / (this.state.valveOpenings.length * 100);
        const activePumps = this.state.pumps.filter((pump) => pump.running && pump.status !== 'faulted').length;
        const pumpPotential = activePumps * 34 * clamp(this.state.settings.networkPressure / 4, 0.45, 1.5) * clamp(valveFactor + 0.2, 0.2, 1);
        const dryLimitFlow = simulatedDelta > 0 ? Math.min(this.state.tank1Volume / simulatedDelta, pumpPotential || 0) : 0;
        const transferFlow = Math.max(0, dryLimitFlow);
        const leakLoss = this.state.leakTank1Active ? 60 : 0;
        const evaporationTank1 = this.state.tank1Volume * EVAPORATION_RATIO_PER_SECOND * simulatedDelta;
        const evaporationTank2 = this.state.tank2Volume * EVAPORATION_RATIO_PER_SECOND * simulatedDelta;
        const demand = this.computeDemandLpm();

        this.state.tank1Volume += this.state.settings.inletFlow * simulatedDelta;
        this.state.tank1Volume -= transferFlow * simulatedDelta;
        this.state.tank1Volume -= leakLoss * simulatedDelta;
        this.state.tank1Volume -= evaporationTank1;

        this.state.tank2Volume += transferFlow * simulatedDelta;
        this.state.tank2Volume -= demand * simulatedDelta;
        this.state.tank2Volume -= evaporationTank2;

        this.state.tank1Volume = clamp(this.state.tank1Volume, 0, TANK_CAPACITY_L);
        this.state.tank2Volume = clamp(this.state.tank2Volume, 0, TANK_CAPACITY_L);
        this.state.tank1Level = round((this.state.tank1Volume / TANK_CAPACITY_L) * 100, 2);
        this.state.tank2Level = round((this.state.tank2Volume / TANK_CAPACITY_L) * 100, 2);
        this.state.measuredFlow = round(transferFlow, 2);
        this.state.treatedVolumeLiters += transferFlow * simulatedDelta;

        const dryRunning = this.state.tank1Volume <= 25 && activePumps > 0;
        this.updatePumps(simulatedDelta, dryRunning);
        this.updateProcessValues(activePumps, valveFactor, demand);
        await this.evaluateAlarms();

        this.historyAccumulatorSeconds += simulatedDelta;
        if (this.historyAccumulatorSeconds >= 5) {
            this.historyAccumulatorSeconds = 0;
            await this.persistHistoryPoint();
        }

        await this.syncOutputs();
    }

    private runScenarioActions(): void {
        const remaining: Array<{ at: number; run: () => void }> = [];
        for (const action of this.scenarioActions) {
            if (this.state.scenarioTimeSeconds >= action.at) {
                action.run();
            } else {
                remaining.push(action);
            }
        }
        this.scenarioActions = remaining;
    }

    private updateActuators(deltaSeconds: number): void {
        this.state.valveOpenings = this.state.valveOpenings.map((opening, index) => {
            const target = this.state.valveTargets[index];
            const change = (100 / 3) * deltaSeconds;
            if (Math.abs(target - opening) <= change) {
                return round(target, 1);
            }
            return round(opening + Math.sign(target - opening) * change, 1);
        });

        for (const pump of this.state.pumps) {
            if (pump.status === 'faulted') {
                pump.running = false;
                pump.startProgress = 0;
                continue;
            }

            if (pump.commandedOn) {
                pump.startProgress = clamp(pump.startProgress + deltaSeconds / 2, 0, 1);
                pump.running = pump.startProgress >= 1;
                pump.status = pump.running ? 'running' : 'stopped';
            } else {
                pump.startProgress = clamp(pump.startProgress - deltaSeconds / 1.5, 0, 1);
                pump.running = false;
                pump.status = 'stopped';
            }
        }
    }

    private updatePumps(deltaSeconds: number, dryRunning: boolean): void {
        for (const pump of this.state.pumps) {
            if (pump.running) {
                pump.runtimeSeconds += deltaSeconds;
            }

            if (pump.running && dryRunning) {
                pump.dryRunSeconds += deltaSeconds;
                pump.temperature = round(clamp(pump.temperature + 7 * deltaSeconds, 20, 110), 2);
                if (pump.dryRunSeconds >= 8) {
                    this.failPump(pump.id, 'Surchauffe a sec');
                }
            } else if (pump.running) {
                pump.dryRunSeconds = Math.max(0, pump.dryRunSeconds - deltaSeconds * 0.5);
                pump.temperature = round(clamp(pump.temperature + 0.4 * deltaSeconds, 20, 95), 2);
            } else {
                pump.dryRunSeconds = Math.max(0, pump.dryRunSeconds - deltaSeconds);
                pump.temperature = round(clamp(pump.temperature - 1.4 * deltaSeconds, 20, 95), 2);
            }
        }
    }

    private updateProcessValues(activePumps: number, valveFactor: number, demand: number): void {
        const pressureBase = this.state.settings.networkPressure + activePumps * 0.35 + valveFactor * 0.8 - demand / 110;
        this.state.pressureDrift = clamp(this.state.pressureDrift + (Math.random() - 0.5) * 0.015, -0.4, 0.4);
        let pressure = pressureBase + this.state.pressureDrift;
        if (this.state.overloadActive) {
            pressure = 8.4;
        }

        const totalPowerKw = this.state.pumps.reduce((sum, pump) => {
            if (!pump.running || pump.status === 'faulted') {
                return sum;
            }
            const loadFactor = clamp(this.state.measuredFlow / 40, 0.4, 1.6);
            return sum + 4.5 * loadFactor;
        }, 0);

        this.state.estimatedEnergyKw = round(totalPowerKw, 2);
        this.state.totalEnergyKwh += (totalPowerKw / 3600) * LOOP_INTERVAL_MS / 1000 * this.state.speed;
        this.state.measuredPressure = round(this.applySensorNoise('line-pressure', pressure), 2);
    }

    private computeDemandLpm(): number {
        if (this.state.scenarioId === 'high-demand') {
            return 65;
        }

        if (this.state.scenarioId === 'maintenance') {
            return this.state.scenarioTimeSeconds < 20 ? 12 : 4;
        }

        if (this.state.scenarioId === 'full-day') {
            const dayFraction = (this.state.durationSeconds % 86400) / 86400;
            if (dayFraction < 0.25) return 18;
            if (dayFraction < 0.45) return 48;
            if (dayFraction < 0.7) return 30;
            if (dayFraction < 0.9) return 56;
            return 20;
        }

        return 24;
    }

    private applySensorNoise(type: string, value: number): number {
        if (this.state.sensorFailureTarget === type) {
            if (this.state.sensorFailureMode === 'stuck') {
                return this.state.sensorFrozenValue ?? value;
            }
            return value * 1.8 + 2.4;
        }

        const amplitude = Math.max(Math.abs(value) * 0.02, 0.02);
        return value + (Math.random() * 2 - 1) * amplitude;
    }

    private failPump(pumpId: number, reason: string): void {
        const pump = this.state.pumps.find((entry) => entry.id === pumpId);
        if (!pump) {
            return;
        }

        pump.status = 'faulted';
        pump.running = false;
        pump.commandedOn = false;
        pump.startProgress = 0;
        pump.faultReason = reason;
    }

    private async evaluateAlarms(): Promise<void> {
        await this.raiseAlarmIf('tank1-low', this.state.tank1Level < 12, 'level', 'Niveau bas bac 1');
        await this.raiseAlarmIf('tank2-low', this.state.tank2Level < 15, 'level', 'Niveau bas bac 2');
        await this.raiseAlarmIf('tank2-high', this.state.tank2Level > 96, 'level', 'Niveau haut bac 2');
        await this.raiseAlarmIf('pressure-out', this.state.measuredPressure < 1 || this.state.measuredPressure > 6.8, 'pressure', 'Pression hors plage');
        await this.raiseAlarmIf('network-cut', this.state.networkCutActive, 'communication', 'Perte de communication MQTT');
        await this.raiseAlarmIf('sensor-failure', Boolean(this.state.sensorFailureTarget), 'sensor', 'Capteur defaillant detecte');

        for (const pump of this.state.pumps) {
            await this.raiseAlarmIf(
                `pump-${pump.id}-fault`,
                pump.status === 'faulted',
                'pump',
                `${pump.label} en defaut${pump.faultReason ? ` (${pump.faultReason})` : ''}`,
            );
            const limit = this.state.overloadActive ? 90 : 80;
            await this.raiseAlarmIf(`pump-${pump.id}-temp`, pump.temperature > limit, 'temperature', `${pump.label} temperature elevee`);
        }
    }

    private async raiseAlarmIf(key: string, condition: boolean, type: string, description: string): Promise<void> {
        if (condition && !this.activeAlarmKeys.has(key)) {
            this.activeAlarmKeys.add(key);
            this.state.alarmCount += 1;
            await createAlarm({ type, description });
            await this.log(type === 'pressure' || type === 'sensor' ? 'warning' : 'alarm', description);
        }

        if (!condition && this.activeAlarmKeys.has(key)) {
            this.activeAlarmKeys.delete(key);
            await this.log('normal', `Fin alarme: ${description}`);
        }
    }

    private async persistHistoryPoint(): Promise<void> {
        const simulatedAt = new Date(Date.now() + this.state.durationSeconds * 1000).toISOString();
        const point: HistoryPoint = {
            simulatedAt,
            tank1Level: this.state.tank1Level,
            tank2Level: this.state.tank2Level,
            pressure: this.state.measuredPressure,
            flow: this.state.measuredFlow,
            energy: this.state.estimatedEnergyKw,
        };

        this.state.history = [...this.state.history.slice(-359), point];
        await createSimulationHistory(point);
    }

    private async syncOutputs(): Promise<void> {
        const tank1 = round(this.applySensorNoise('tank1-level', this.state.tank1Level), 2);
        const tank2 = round(this.applySensorNoise('tank2-level', this.state.tank2Level), 2);
        const flow = round(this.applySensorNoise('flow-rate', this.state.overloadActive ? 110 : this.state.measuredFlow), 2);
        const pump1Temp = round(this.applySensorNoise('pump-temperature', this.state.overloadActive ? 92 : this.state.pumps[0].temperature), 2);
        const pump2Temp = round(this.applySensorNoise('pump2-temperature', this.state.overloadActive ? 90 : this.state.pumps[1].temperature), 2);
        const averageLevel = round((tank1 + tank2) / 2, 2);
        const energy = round(this.applySensorNoise('energy', this.state.estimatedEnergyKw), 2);

        await Promise.all([
            savePumpStatus(1, this.state.pumps[0].status),
            savePumpStatus(2, this.state.pumps[1].status),
            saveSensorSnapshot([
                { type: 'water-level', value: averageLevel },
                { type: 'pump-temperature', value: pump1Temp },
                { type: 'line-pressure', value: this.state.measuredPressure },
                { type: 'tank1-level', value: tank1 },
                { type: 'tank2-level', value: tank2 },
                { type: 'flow-rate', value: flow },
                { type: 'pump2-temperature', value: pump2Temp },
                { type: 'energy', value: energy },
            ]),
        ]);

        this.state.logs = (await listSimulationLogs()) as SimulationLogEntry[];
        this.state.history = (await listSimulationHistory(360)).slice(-360);

        const alarms = await listAlarms();
        this.state.acknowledgedCount = alarms.filter((alarm) => alarm.acknowledged).length;
    }

    private async log(level: LogLevel, message: string): Promise<void> {
        const entry: SimulationLogEntry = {
            id: this.nextLogId++,
            level,
            message,
            timestamp: new Date().toISOString(),
        };
        this.state.logs = [...this.state.logs.slice(-249), entry];
        await createSimulationLog(level, message, entry.timestamp);
    }

    private async generateAndStoreReport(): Promise<void> {
        const availabilityBase = this.state.pumps.reduce((sum, pump) => sum + (this.state.durationSeconds === 0 ? 1 : pump.runtimeSeconds / this.state.durationSeconds), 0) / this.state.pumps.length;
        const report: SimulationReportPayload = {
            generatedAt: new Date().toISOString(),
            durationSeconds: round(this.state.durationSeconds, 2),
            alarmCount: this.state.alarmCount,
            acknowledgedCount: this.state.acknowledgedCount,
            energyKwh: round(this.state.totalEnergyKwh, 3),
            treatedVolumeLiters: round(this.state.treatedVolumeLiters, 1),
            availabilityRate: round(clamp(availabilityBase, 0, 1) * 100, 2),
            summarySeries: [
                { label: 'Bac 1', color: '#00d4ff', values: this.state.history.slice(-24).map((point) => point.tank1Level) },
                { label: 'Bac 2', color: '#ff9f1c', values: this.state.history.slice(-24).map((point) => point.tank2Level) },
                { label: 'Debit', color: '#00ff88', values: this.state.history.slice(-24).map((point) => point.flow) },
            ],
        };

        const signature = JSON.stringify(report);
        if (signature === this.lastPersistedReportSignature) {
            return;
        }

        this.lastPersistedReportSignature = signature;
        this.state.generatedReportAt = report.generatedAt;
        await saveSimulationReport({
            generatedAt: report.generatedAt,
            durationSeconds: report.durationSeconds,
            alarmCount: report.alarmCount,
            acknowledgedCount: report.acknowledgedCount,
            energyKwh: report.energyKwh,
            treatedVolumeLiters: report.treatedVolumeLiters,
            availabilityRate: report.availabilityRate,
            payload: JSON.stringify(report),
        });
    }
}

const engine = new SimulationEngine();

export const initializeSimulation = async (): Promise<void> => {
    await engine.initialize();
};

export const getSimulationState = (): SimulationState => engine.getState();
export const getSimulationScenarios = (): ScenarioDefinition[] => engine.getScenarios();
export const startSimulation = async (speed?: number): Promise<SimulationState> => engine.start(speed);
export const pauseSimulation = async (): Promise<SimulationState> => engine.pause();
export const resetSimulation = async (): Promise<SimulationState> => engine.reset();
export const connectRealEquipment = async (): Promise<SimulationState> => engine.connectReal();
export const updateSimulationSettings = async (settings: Partial<SimulationSettings> & { speed?: number }): Promise<SimulationState> => engine.updateSettings(settings);
export const injectSimulationFault = async (type: FaultType): Promise<SimulationState> => engine.injectFault(type);
export const loadSimulationScenario = async (id: string): Promise<SimulationState> => engine.loadScenario(id);
export const acknowledgeSimulationAlarm = async (alarmId: number): Promise<Alarm | null> => engine.acknowledgeAlarm(alarmId);
export const exportSimulationLogCsv = async (): Promise<string> => engine.exportLogsCsv();
export const getLatestSimulationReportPayload = async (): Promise<SimulationReportPayload | null> => engine.getLatestReport();
