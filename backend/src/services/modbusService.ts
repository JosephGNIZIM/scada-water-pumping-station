import ModbusRTU from 'modbus-serial';

export interface SensorData {
    pressure: number;
    flow: number;
    tankLevel: number;
    pump1Status: boolean;
    pump2Status: boolean;
}

export interface ModbusConfig {
    host: string;
    port: number;
    unitId: number;
    reconnectDelayMs: number;
}

type ModbusLogLevel = 'info' | 'warn' | 'error';

const logModbus = (
    level: ModbusLogLevel,
    event: string,
    details: Record<string, unknown> = {},
) => {
    const payload = {
        service: 'modbus',
        event,
        timestamp: new Date().toISOString(),
        ...details,
    };

    if (level === 'error') {
        console.error('[Modbus]', JSON.stringify(payload));
        return;
    }

    if (level === 'warn') {
        console.warn('[Modbus]', JSON.stringify(payload));
        return;
    }

    console.log('[Modbus]', JSON.stringify(payload));
};

export class ModbusService {
    private client: ModbusRTU;
    private config: ModbusConfig;
    private connected = false;
    private connecting = false;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private stopped = false;
    private lastError: Error | null = null;

    constructor(config: ModbusConfig) {
        this.client = new ModbusRTU();
        this.config = config;
    }

    async connect(): Promise<void> {
        if (this.connected || this.connecting || this.stopped) {
            return;
        }

        this.connecting = true;

        try {
            logModbus('info', 'connect.attempt', {
                host: this.config.host,
                port: this.config.port,
                unitId: this.config.unitId,
            });

            await this.client.connectTCP(this.config.host, {
                port: this.config.port,
            });

            this.client.setID(this.config.unitId);
            this.connected = true;
            this.lastError = null;

            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }

            logModbus('info', 'connect.success', {
                host: this.config.host,
                port: this.config.port,
                unitId: this.config.unitId,
            });
        } catch (error) {
            this.connected = false;
            this.lastError = error instanceof Error ? error : new Error(String(error));
            logModbus('error', 'connect.failure', {
                message: this.lastError.message,
                retryInMs: this.config.reconnectDelayMs,
            });
            this.scheduleReconnect();
        } finally {
            this.connecting = false;
        }
    }

    private scheduleReconnect(): void {
        if (this.stopped || this.reconnectTimeout) {
            return;
        }

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            void this.connect();
        }, this.config.reconnectDelayMs);
    }

    private async ensureConnected(): Promise<boolean> {
        if (this.connected) {
            return true;
        }

        await this.connect();
        return this.connected;
    }

    async readSensors(): Promise<SensorData | null> {
        const isReady = await this.ensureConnected();
        if (!isReady) {
            return null;
        }

        try {
            const holdingRegisters = await this.client.readHoldingRegisters(0, 3);
            const coils = await this.client.readCoils(0, 2);

            return {
                pressure: Number(holdingRegisters.data[0]) / 10,
                flow: Number(holdingRegisters.data[1]) / 10,
                tankLevel: Number(holdingRegisters.data[2]) / 10,
                pump1Status: Boolean(coils.data[0]),
                pump2Status: Boolean(coils.data[1]),
            };
        } catch (error) {
            this.connected = false;
            this.lastError = error instanceof Error ? error : new Error(String(error));
            logModbus('error', 'read.failure', {
                message: this.lastError.message,
                retryInMs: this.config.reconnectDelayMs,
            });
            this.scheduleReconnect();
            return null;
        }
    }

    async writePump(pumpId: number, state: boolean): Promise<boolean> {
        if (![1, 2].includes(pumpId)) {
            logModbus('warn', 'write.invalid_pump', { pumpId, state });
            return false;
        }

        const isReady = await this.ensureConnected();
        if (!isReady) {
            logModbus('warn', 'write.skipped_not_connected', { pumpId, state });
            return false;
        }

        const coilAddress = pumpId - 1;

        try {
            await this.client.writeCoil(coilAddress, state);
            logModbus('info', 'write.success', {
                pumpId,
                coilAddress,
                state,
            });
            return true;
        } catch (error) {
            this.connected = false;
            this.lastError = error instanceof Error ? error : new Error(String(error));
            logModbus('error', 'write.failure', {
                pumpId,
                coilAddress,
                state,
                message: this.lastError.message,
                retryInMs: this.config.reconnectDelayMs,
            });
            this.scheduleReconnect();
            return false;
        }
    }

    isConnected(): boolean {
        return this.connected;
    }

    getLastError(): Error | null {
        return this.lastError;
    }

    async disconnect(): Promise<void> {
        this.stopped = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        try {
            this.client.close(() => {
                logModbus('info', 'disconnect.success');
            });
        } catch (error) {
            logModbus('error', 'disconnect.failure', {
                message: error instanceof Error ? error.message : String(error),
            });
        } finally {
            this.connected = false;
            this.connecting = false;
        }
    }
}

let modbusServiceInstance: ModbusService | null = null;

export const initializeModbusService = async (
    config: ModbusConfig,
): Promise<ModbusService> => {
    if (modbusServiceInstance) {
        return modbusServiceInstance;
    }

    modbusServiceInstance = new ModbusService(config);
    await modbusServiceInstance.connect();
    return modbusServiceInstance;
};

export const getModbusService = (): ModbusService | null => modbusServiceInstance;

export const shutdownModbusService = async (): Promise<void> => {
    if (modbusServiceInstance) {
        await modbusServiceInstance.disconnect();
        modbusServiceInstance = null;
    }
};
