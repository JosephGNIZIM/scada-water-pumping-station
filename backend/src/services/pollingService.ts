import EventEmitter from 'events';
import { MeasurementModel } from '../models/measurementModel';
import { saveSensorSnapshot } from '../utils/db';
import { ModbusService, SensorData } from './modbusService';

export interface PollingConfig {
    intervalMs: number;
    modbusEnabled: boolean;
}

const logPolling = (event: string, details: Record<string, unknown> = {}) => {
    console.log('[PollingService]', JSON.stringify({
        service: 'polling',
        event,
        timestamp: new Date().toISOString(),
        ...details,
    }));
};

export class PollingService extends EventEmitter {
    private modbusService: ModbusService | null = null;
    private config: PollingConfig;
    private pollingInterval: NodeJS.Timeout | null = null;
    private _isRunning = false;
    private pollCount = 0;
    private lastSuccessfulRead: SensorData | null = null;

    constructor(config: PollingConfig) {
        super();
        this.config = config;
    }

    setModbusService(service: ModbusService | null): void {
        this.modbusService = service;
    }

    async start(): Promise<void> {
        if (this._isRunning) {
            return;
        }

        this._isRunning = true;
        logPolling('start', {
            intervalMs: this.config.intervalMs,
            source: this.config.modbusEnabled ? 'modbus' : 'simulation',
        });

        await this.poll();

        this.pollingInterval = setInterval(async () => {
            await this.poll();
        }, this.config.intervalMs);

        this.emit('started');
    }

    private async poll(): Promise<void> {
        this.pollCount += 1;

        let sensorData: SensorData | null = null;

        if (this.config.modbusEnabled) {
            if (!this.modbusService) {
                console.warn('[PollingService] Modbus enabled but service is not configured');
                return;
            }

            sensorData = await this.modbusService.readSensors();
        } else {
            sensorData = this.generateSimulatedData();
        }

        if (!sensorData) {
            if (this.config.modbusEnabled) {
                console.warn('[PollingService] Poll failed - Modbus disconnected');
            }
            return;
        }

        this.lastSuccessfulRead = sensorData;

        try {
            await saveSensorSnapshot([
                { type: 'line-pressure', value: sensorData.pressure },
                { type: 'flow-rate', value: sensorData.flow },
                { type: 'tank-level', value: sensorData.tankLevel },
            ]);

            await MeasurementModel.insert({
                pressure: sensorData.pressure,
                flow_rate: sensorData.flow,
                tank_level: sensorData.tankLevel,
                pump1_status: sensorData.pump1Status,
                pump2_status: sensorData.pump2Status,
            });
        } catch (error) {
            console.error('[PollingService] Failed to persist sensor data:', error);
        }

        this.emit('sensor-data', sensorData);

        if (this.pollCount % 10 === 0) {
            logPolling('poll.success', {
                pollCount: this.pollCount,
                pressure: Number(sensorData.pressure.toFixed(1)),
                flow: Number(sensorData.flow.toFixed(1)),
                tankLevel: Number(sensorData.tankLevel.toFixed(0)),
                pump1Status: sensorData.pump1Status,
                pump2Status: sensorData.pump2Status,
            });
        }
    }

    private generateSimulatedData(): SensorData {
        const now = Date.now();
        const cycle = (now / 10000) % (Math.PI * 2);
        const pressure = 3.5 + Math.sin(cycle) * 1.0;
        const flow = 25 + Math.sin(cycle + Math.PI / 4) * 10;
        const tankLevel = 65 + Math.sin(cycle + Math.PI / 2) * 25 + (Math.random() - 0.5) * 5;

        return {
            pressure: Math.max(2.5, Math.min(4.5, pressure)),
            flow: Math.max(15, Math.min(35, flow)),
            tankLevel: Math.max(40, Math.min(90, tankLevel)),
            pump1Status: flow > 20,
            pump2Status: flow > 28,
        };
    }

    async stop(): Promise<void> {
        if (!this._isRunning) {
            return;
        }

        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        this._isRunning = false;
        logPolling('stop', { pollCount: this.pollCount });
        this.emit('stopped');
    }

    isRunning(): boolean {
        return this._isRunning;
    }

    getLastSuccessfulRead(): SensorData | null {
        return this.lastSuccessfulRead;
    }

    getPollCount(): number {
        return this.pollCount;
    }
}

let pollingServiceInstance: PollingService | null = null;

export const initializePollingService = (
    config: PollingConfig,
    modbusService: ModbusService | null = null,
): PollingService => {
    if (pollingServiceInstance) {
        if (modbusService) {
            pollingServiceInstance.setModbusService(modbusService);
        }
        return pollingServiceInstance;
    }

    pollingServiceInstance = new PollingService(config);
    pollingServiceInstance.setModbusService(modbusService);
    return pollingServiceInstance;
};

export const getPollingService = (): PollingService | null => pollingServiceInstance;

export const shutdownPollingService = async (): Promise<void> => {
    if (pollingServiceInstance) {
        await pollingServiceInstance.stop();
        pollingServiceInstance = null;
    }
};
