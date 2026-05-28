import EventEmitter from 'events';
import { ModbusService, SensorData } from './modbusService';
import { saveSensorSnapshot, insertMeasurement } from '../utils/db';

export interface PollingConfig {
    intervalMs: number;
    modbusEnabled: boolean;
}

export class PollingService extends EventEmitter {
    private modbusService: ModbusService | null = null;
    private config: PollingConfig;
    private pollingInterval: NodeJS.Timeout | null = null;
    private _isRunning: boolean = false;
    private pollCount: number = 0;
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
        console.log(
            `[PollingService] Starting with interval ${this.config.intervalMs}ms`
        );

        // Initial poll immediately
        await this.poll();

        // Schedule recurring polls
        this.pollingInterval = setInterval(async () => {
            await this.poll();
        }, this.config.intervalMs);

        this.emit('started');
    }

    private async poll(): Promise<void> {
        this.pollCount++;

        let sensorData: SensorData | null = null;

        if (this.config.modbusEnabled && this.modbusService) {
            // Read from real Modbus device
            sensorData = await this.modbusService.readSensors();
        } else {
            // Generate simulated data
            sensorData = this.generateSimulatedData();
        }

        if (sensorData) {
            this.lastSuccessfulRead = sensorData;

            // Store in database - convert SensorData to Sensor[] format
            try {
                await saveSensorSnapshot([
                    { type: 'line-pressure', value: sensorData.pressure },
                    { type: 'flow-rate', value: sensorData.flow },
                    { type: 'tank-level', value: sensorData.tankLevel },
                ]);

                // Also insert into measurements table for historical analysis
                await insertMeasurement({
                    pressure: sensorData.pressure,
                    flow_rate: sensorData.flow,
                    tank_level: sensorData.tankLevel,
                    pump1_status: sensorData.pump1Status,
                    pump2_status: sensorData.pump2Status,
                });
            } catch (error) {
                console.error('[PollingService] Failed to save sensor snapshot:', error);
            }

            // Emit event for real-time updates
            this.emit('sensor-data', sensorData);

            if (this.pollCount % 10 === 0) {
                console.log(
                    `[PollingService] Poll #${this.pollCount}: P=${sensorData.pressure.toFixed(1)}bar, ` +
                    `F=${sensorData.flow.toFixed(1)}m³/h, L=${sensorData.tankLevel.toFixed(0)}%`
                );
            }
        } else {
            if (this.config.modbusEnabled) {
                console.warn('[PollingService] Poll failed - Modbus disconnected');
            }
        }
    }

    private generateSimulatedData(): SensorData {
        const now = Date.now();
        const cycle = (now / 10000) % (Math.PI * 2); // 10-second cycle

        // Realistic simulation with sine wave variation
        const pressure = 2.5 + 2.0 * Math.sin(cycle); // 2.5 - 4.5 bar
        const flow = 25 + 10 * Math.sin(cycle + Math.PI / 4); // 15 - 35 m³/h
        const tankLevel =
            65 + 25 * Math.sin(cycle + Math.PI / 2) + (Math.random() - 0.5) * 5; // 40 - 90%

        return {
            pressure: Math.max(0, pressure),
            flow: Math.max(0, flow),
            tankLevel: Math.max(0, Math.min(100, tankLevel)),
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
        console.log(
            `[PollingService] Stopped after ${this.pollCount} polls`
        );
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

// Singleton instance
let pollingServiceInstance: PollingService | null = null;

export const initializePollingService = (
    config: PollingConfig,
    modbusService: ModbusService | null = null
): PollingService => {
    if (pollingServiceInstance) {
        return pollingServiceInstance;
    }

    pollingServiceInstance = new PollingService(config);

    if (modbusService) {
        pollingServiceInstance.setModbusService(modbusService);
    }

    return pollingServiceInstance;
};

export const getPollingService = (): PollingService | null => {
    return pollingServiceInstance;
};

export const shutdownPollingService = async (): Promise<void> => {
    if (pollingServiceInstance) {
        await pollingServiceInstance.stop();
        pollingServiceInstance = null;
    }
};
