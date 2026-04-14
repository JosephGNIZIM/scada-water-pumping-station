import { Sensor } from '../models/sensor';
import { getSensorById, listSensorReadings } from '../utils/db';

export const getSensorReadings = async (): Promise<Sensor[]> => {
    return listSensorReadings();
};

export const getSensorStatus = async (sensorId?: number): Promise<Sensor | null> => {
    if (sensorId === undefined) {
        return null;
    }

    return getSensorById(sensorId);
};
