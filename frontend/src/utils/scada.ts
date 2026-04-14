import { Alarm, SensorReading } from '../services/api';

export type AlarmPriority = 'critical' | 'high' | 'medium' | 'low';

export const getSensorLabel = (type: string): string => {
    switch (type) {
        case 'water-level':
            return 'Water Level Avg';
        case 'tank1-level':
            return 'Tank 1 Level';
        case 'tank2-level':
            return 'Tank 2 Level';
        case 'pump-temperature':
            return 'Pump 1 Temp';
        case 'pump2-temperature':
            return 'Pump 2 Temp';
        case 'line-pressure':
            return 'Pressure';
        case 'flow-rate':
            return 'Flow';
        case 'energy':
            return 'Energy';
        default:
            return type;
    }
};

export const getSensorUnit = (type: string): string => {
    switch (type) {
        case 'water-level':
        case 'tank1-level':
        case 'tank2-level':
            return '%';
        case 'pump-temperature':
        case 'pump2-temperature':
            return 'C';
        case 'line-pressure':
            return 'bar';
        case 'flow-rate':
            return 'L/min';
        case 'energy':
            return 'kW';
        default:
            return '';
    }
};

export const getSensorMax = (type: string): number => {
    switch (type) {
        case 'water-level':
        case 'tank1-level':
        case 'tank2-level':
            return 100;
        case 'pump-temperature':
        case 'pump2-temperature':
            return 100;
        case 'line-pressure':
            return 10;
        case 'flow-rate':
            return 120;
        case 'energy':
            return 20;
        default:
            return 100;
    }
};

export const getAlarmPriority = (alarm: Alarm): AlarmPriority => {
    const text = `${alarm.type ?? ''} ${alarm.description}`.toLowerCase();
    if (text.includes('temperature') || text.includes('critical') || text.includes('defaut')) {
        return 'critical';
    }
    if (text.includes('level')) {
        return 'high';
    }
    if (text.includes('pressure') || text.includes('sensor') || text.includes('communication')) {
        return 'medium';
    }
    return 'low';
};

export const makeSparklineData = (reading: SensorReading): number[] =>
    Array.from({ length: 10 }, (_, index) => {
        const drift = Math.sin(index * 0.8 + reading.id) * 0.8;
        const trend = (index - 5) * 0.15;
        return Number((reading.value + drift + trend).toFixed(1));
    });

export const buildHealthScore = (readings: SensorReading[], alarms: Alarm[]): number => {
    let score = 100;

    for (const reading of readings) {
        if ((reading.type === 'pump-temperature' || reading.type === 'pump2-temperature') && reading.value > 70) score -= 20;
        if (reading.type === 'water-level' && (reading.value < 20 || reading.value > 90)) score -= 12;
        if ((reading.type === 'tank1-level' || reading.type === 'tank2-level') && (reading.value < 15 || reading.value > 95)) score -= 10;
        if (reading.type === 'line-pressure' && reading.value > 8) score -= 15;
    }

    const activeAlarms = alarms.filter((alarm) => !alarm.acknowledged);
    score -= activeAlarms.length * 8;
    score -= activeAlarms.filter((alarm) => getAlarmPriority(alarm) === 'critical').length * 12;

    return Math.max(8, Math.min(100, Math.round(score)));
};

export const buildMultiSeries = (readings: SensorReading[]) =>
    readings.map((reading) => ({
        label: getSensorLabel(reading.type),
        color:
            reading.type === 'water-level' || reading.type === 'tank1-level'
                ? '#00d4ff'
                : reading.type === 'tank2-level'
                    ? '#ff9f1c'
                    : reading.type === 'pump-temperature' || reading.type === 'pump2-temperature'
                        ? '#ff7a18'
                        : reading.type === 'energy'
                            ? '#ffd166'
                            : '#00ff88',
        values: makeSparklineData(reading),
    }));

export const buildAlarmTimeline = (alarms: Alarm[]): number[] => {
    const base = [1, 3, 2, 4, 1, 0, 2, 1];
    const activeCount = alarms.filter((alarm) => !alarm.acknowledged).length;
    return base.map((value, index) => value + (index % 3 === 0 ? activeCount : 0));
};

export const computeStatistics = (values: number[]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;

    return {
        min: Number(min.toFixed(2)),
        max: Number(max.toFixed(2)),
        avg: Number(avg.toFixed(2)),
        stddev: Number(Math.sqrt(variance).toFixed(2)),
    };
};
