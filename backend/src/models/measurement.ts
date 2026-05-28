export interface Measurement {
    id: number;
    timestamp: Date;
    pressure: number;
    flow_rate: number;
    tank_level: number;
    pump1_status: boolean;
    pump2_status: boolean;
}

export interface MeasurementStats {
    min: number;
    max: number;
    avg: number;
}

export interface SensorStats {
    pressure: MeasurementStats;
    flow_rate: MeasurementStats;
    tank_level: MeasurementStats;
}

export interface MeasurementRange {
    data: Measurement[];
    count: number;
    from: string;
    to: string;
}
