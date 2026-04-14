import { Alarm } from '../models/event';
import { acknowledgeAlarmById, createAlarm, listAlarms } from '../utils/db';

export const getAlarms = async (): Promise<Alarm[]> => {
    return listAlarms();
};

export const acknowledgeAlarm = async (alarmId: number): Promise<Alarm | null> => {
    return acknowledgeAlarmById(alarmId);
};

export const triggerAlarm = async (
    alarmData: Pick<Alarm, 'description' | 'type'>,
): Promise<Alarm> => {
    return createAlarm(alarmData);
};
