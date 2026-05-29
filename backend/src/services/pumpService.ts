import { Pump } from '../models/pump';
import { getModbusService } from './modbusService';
import { getPumpById, savePumpStatus } from '../utils/db';

export const startPump = async (pumpId: number): Promise<Pump> => {
    if (process.env.MODBUS_ENABLED === 'true') {
        const written = await getModbusService()?.writePump(pumpId, true);
        if (!written) {
            throw new Error(`Unable to start pump ${pumpId} via Modbus`);
        }
    }

    return savePumpStatus(pumpId, 'running');
};

export const stopPump = async (pumpId: number): Promise<Pump> => {
    if (process.env.MODBUS_ENABLED === 'true') {
        const written = await getModbusService()?.writePump(pumpId, false);
        if (!written) {
            throw new Error(`Unable to stop pump ${pumpId} via Modbus`);
        }
    }

    return savePumpStatus(pumpId, 'stopped');
};

export const getPumpStatus = async (pumpId: number): Promise<Pump | null> => {
    return getPumpById(pumpId);
};
