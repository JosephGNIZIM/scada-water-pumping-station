import ModbusRTU from "modbus-serial";

export interface SensorData {
  pressure: number; // bar
  flow: number; // m³/h
  tankLevel: number; // %
  pump1Status: boolean;
  pump2Status: boolean;
}

export interface ModbusConfig {
  host: string;
  port: number;
  unitId: number;
  reconnectDelayMs: number;
}

export class ModbusService {
  private client: ModbusRTU;
  private config: ModbusConfig;
  private connected: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastError: Error | null = null;

  constructor(config: ModbusConfig) {
    this.client = new ModbusRTU();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      console.log(
        `[Modbus] Connecting to ${this.config.host}:${this.config.port}...`,
      );

      await this.client.connectTCP(this.config.host, {
        port: this.config.port,
      });

      this.client.setID(this.config.unitId);
      this.connected = true;
      this.lastError = null;

      console.log("[Modbus] ✅ Connected successfully");
    } catch (error) {
      this.connected = false;
      this.lastError =
        error instanceof Error ? error : new Error(String(error));
      console.error(`[Modbus] ❌ Connection failed: ${this.lastError.message}`);

      // Schedule reconnect
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log("[Modbus] Attempting to reconnect...");
      this.connect().catch((error) => {
        console.error(`[Modbus] Reconnect failed: ${error.message}`);
      });
    }, this.config.reconnectDelayMs);
  }

  async readSensors(): Promise<SensorData | null> {
    if (!this.connected) {
      if (!this.lastError) {
        await this.connect();
      }
      return null;
    }

    try {
      // Read holding registers (0-2)
      const holdingRegsResult = await this.client.readHoldingRegisters(0, 3);
      const holdingRegs = holdingRegsResult.data as number[];
      const pressure = holdingRegs[0] / 10; // Register 0: pressure / 10
      const flow = holdingRegs[1] / 10; // Register 1: flow / 10
      const tankLevel = holdingRegs[2] / 10; // Register 2: tank level / 10

      // Read coils (0-1)
      const coilsResult = await this.client.readCoils(0, 2);
      const coils = coilsResult.data as boolean[];
      const pump1Status = coils[0];
      const pump2Status = coils[1];

      return {
        pressure,
        flow,
        tankLevel,
        pump1Status,
        pump2Status,
      };
    } catch (error) {
      this.connected = false;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Modbus] Read failed: ${errorMsg}`);
      this.lastError = error instanceof Error ? error : new Error(errorMsg);

      // Attempt reconnect
      this.scheduleReconnect();
      return null;
    }
  }

  async writePump(pumpId: 1 | 2, state: boolean): Promise<boolean> {
    if (!this.connected) {
      console.error("[Modbus] Cannot write pump: not connected");
      return false;
    }

    try {
      const coilAddress = pumpId === 1 ? 0 : 1;
      console.log(`[Modbus] Writing pump ${pumpId} to ${state ? "ON" : "OFF"}`);

      await this.client.writeCoil(coilAddress, state);
      return true;
    } catch (error) {
      this.connected = false;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Modbus] Write pump failed: ${errorMsg}`);
      this.lastError = error instanceof Error ? error : new Error(errorMsg);
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
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.client) {
      try {
        this.client.close(() => {
          console.log("[Modbus] Disconnected");
        });
      } catch (error) {
        console.error(`[Modbus] Error during disconnect: ${error}`);
      }
    }

    this.connected = false;
  }
}

// Singleton instance
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

export const getModbusService = (): ModbusService | null => {
  return modbusServiceInstance;
};

export const shutdownModbusService = async (): Promise<void> => {
  if (modbusServiceInstance) {
    await modbusServiceInstance.disconnect();
    modbusServiceInstance = null;
  }
};
