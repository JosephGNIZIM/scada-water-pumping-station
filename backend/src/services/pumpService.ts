import { Pump } from '../models/pump';
import { getPumpById, savePumpStatus } from '../utils/db';

export const startPump = async (pumpId: number): Promise<Pump> => {
    return savePumpStatus(pumpId, 'running');
};

export const stopPump = async (pumpId: number): Promise<Pump> => {
    return savePumpStatus(pumpId, 'stopped');
};

export const getPumpStatus = async (pumpId: number): Promise<Pump | null> => {
    return getPumpById(pumpId);
};
