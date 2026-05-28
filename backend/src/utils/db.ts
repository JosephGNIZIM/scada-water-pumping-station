import fs from 'fs';
import { QueryTypes, Sequelize } from 'sequelize';
import path from 'path';
import { Alarm } from '../models/event';
import { Pump } from '../models/pump';
import { Sensor } from '../models/sensor';

const resolveStoragePath = (): string => {
    if (process.env.DB_STORAGE) {
        return path.resolve(process.env.DB_STORAGE);
    }

    return path.resolve(__dirname, '..', '..', 'data', 'scada.sqlite');
};

const storagePath = resolveStoragePath();
fs.mkdirSync(path.dirname(storagePath), { recursive: true });

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false,
});

interface PumpRow {
    id: number;
    status: Pump['status'];
    lastUpdated: string;
}

interface SensorRow {
    id: number;
    type: string;
    value: number;
    timestamp: string;
}

interface AlarmRow {
    id: number;
    type: string;
    description: string;
    timestamp: string;
    acknowledged: number;
}

interface SimulationLogRow {
    id: number;
    level: string;
    message: string;
    timestamp: string;
}

interface SimulationHistoryRow {
    id: number;
    simulatedAt: string;
    tank1Level: number;
    tank2Level: number;
    pressure: number;
    flow: number;
    energy: number;
}

interface SimulationReportRow {
    id: number;
    generatedAt: string;
    durationSeconds: number;
    alarmCount: number;
    acknowledgedCount: number;
    energyKwh: number;
    treatedVolumeLiters: number;
    availabilityRate: number;
    payload: string;
}

const toPump = (row: PumpRow): Pump => ({
    id: Number(row.id),
    status: row.status,
    lastUpdated: new Date(row.lastUpdated),
});

const toSensor = (row: SensorRow): Sensor => ({
    id: Number(row.id),
    type: row.type,
    value: Number(row.value),
    timestamp: new Date(row.timestamp),
});

const toAlarm = (row: AlarmRow): Alarm => ({
    id: Number(row.id),
    type: row.type,
    description: row.description,
    timestamp: row.timestamp,
    acknowledged: Boolean(row.acknowledged),
});

export const initializeDatabase = async (): Promise<void> => {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS pumps (
            id INTEGER PRIMARY KEY,
            status TEXT NOT NULL,
            lastUpdated TEXT NOT NULL
        )
    `);

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS sensors (
            id INTEGER PRIMARY KEY,
            type TEXT NOT NULL,
            value REAL NOT NULL,
            timestamp TEXT NOT NULL
        )
    `);

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS alarms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            acknowledged INTEGER NOT NULL DEFAULT 0
        )
    `);

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS simulation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    `);

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS simulation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            simulatedAt TEXT NOT NULL,
            tank1Level REAL NOT NULL,
            tank2Level REAL NOT NULL,
            pressure REAL NOT NULL,
            flow REAL NOT NULL,
            energy REAL NOT NULL
        )
    `);

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS simulation_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            generatedAt TEXT NOT NULL,
            durationSeconds REAL NOT NULL,
            alarmCount INTEGER NOT NULL,
            acknowledgedCount INTEGER NOT NULL,
            energyKwh REAL NOT NULL,
            treatedVolumeLiters REAL NOT NULL,
            availabilityRate REAL NOT NULL,
            payload TEXT NOT NULL
        )
    `);

    // Measurements table for historical data
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            pressure REAL NOT NULL,
            flow_rate REAL NOT NULL,
            tank_level REAL NOT NULL,
            pump1_status INTEGER NOT NULL DEFAULT 0,
            pump2_status INTEGER NOT NULL DEFAULT 0
        )
    `);

    // Create index on timestamp for fast range queries
    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_measurements_timestamp 
        ON measurements(timestamp)
    `);

    const pumpCount = await sequelize.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM pumps',
        { type: QueryTypes.SELECT },
    );
    if (Number(pumpCount[0]?.count ?? 0) === 0) {
        const now = new Date().toISOString();
        await sequelize.query(
            `
            INSERT INTO pumps (id, status, lastUpdated) VALUES
            (1, :statusA, :lastUpdated),
            (2, :statusB, :lastUpdated)
            `,
            {
                replacements: { statusA: 'running', statusB: 'stopped', lastUpdated: now },
            },
        );
    }

    const bootstrapPumpTimestamp = new Date().toISOString();
    await sequelize.query(
        `
        INSERT OR IGNORE INTO pumps (id, status, lastUpdated) VALUES
        (1, 'running', :timestamp),
        (2, 'stopped', :timestamp)
        `,
        {
            replacements: { timestamp: bootstrapPumpTimestamp },
        },
    );

    const sensorCount = await sequelize.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM sensors',
        { type: QueryTypes.SELECT },
    );
    if (Number(sensorCount[0]?.count ?? 0) === 0) {
        const now = new Date().toISOString();
        await sequelize.query(
            `
            INSERT INTO sensors (id, type, value, timestamp) VALUES
            (1, 'water-level', 50, :timestamp),
            (2, 'pump-temperature', 41, :timestamp),
            (3, 'line-pressure', 3.8, :timestamp),
            (4, 'tank1-level', 50, :timestamp),
            (5, 'tank2-level', 50, :timestamp),
            (6, 'flow-rate', 36, :timestamp),
            (7, 'pump2-temperature', 37, :timestamp),
            (8, 'energy', 4.2, :timestamp)
            `,
            {
                replacements: { timestamp: now },
            },
        );
    }

    const bootstrapSensorTimestamp = new Date().toISOString();
    await sequelize.query(
        `
        INSERT OR IGNORE INTO sensors (id, type, value, timestamp) VALUES
        (1, 'water-level', 50, :timestamp),
        (2, 'pump-temperature', 41, :timestamp),
        (3, 'line-pressure', 3.8, :timestamp),
        (4, 'tank1-level', 50, :timestamp),
        (5, 'tank2-level', 50, :timestamp),
        (6, 'flow-rate', 36, :timestamp),
        (7, 'pump2-temperature', 37, :timestamp),
        (8, 'energy', 4.2, :timestamp)
        `,
        {
            replacements: { timestamp: bootstrapSensorTimestamp },
        },
    );

    const alarmCount = await sequelize.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM alarms',
        { type: QueryTypes.SELECT },
    );
    if (Number(alarmCount[0]?.count ?? 0) === 0) {
        const now = new Date().toISOString();
        await sequelize.query(
            `
            INSERT INTO alarms (type, description, timestamp, acknowledged) VALUES
            ('level', 'High water level detected', :timestamp, 0),
            ('temperature', 'Pump motor temperature high', :timestamp, 0)
            `,
            {
                replacements: { timestamp: now },
            },
        );
    }
};

export const testConnection = async (): Promise<boolean> => {
    try {
        await sequelize.authenticate();
        console.log(`Connection to the database has been established successfully at ${storagePath}.`);
        return true;
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        return false;
    }
};

export const getPumpById = async (pumpId: number): Promise<Pump | null> => {
    const rows = await sequelize.query<PumpRow>(
        'SELECT id, status, lastUpdated FROM pumps WHERE id = :pumpId',
        {
            replacements: { pumpId },
            type: QueryTypes.SELECT,
        },
    );

    if (rows.length === 0) {
        return null;
    }

    return toPump(rows[0]);
};

export const savePumpStatus = async (
    pumpId: number,
    status: Pump['status'],
): Promise<Pump> => {
    const lastUpdated = new Date().toISOString();
    await sequelize.query(
        `
        INSERT INTO pumps (id, status, lastUpdated)
        VALUES (:pumpId, :status, :lastUpdated)
        ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            lastUpdated = excluded.lastUpdated
        `,
        {
            replacements: { pumpId, status, lastUpdated },
        },
    );

    const pump = await getPumpById(pumpId);
    if (!pump) {
        throw new Error('Pump could not be saved');
    }

    return pump;
};

export const listPumps = async (): Promise<Pump[]> => {
    const rows = await sequelize.query<PumpRow>(
        'SELECT id, status, lastUpdated FROM pumps ORDER BY id ASC',
        {
            type: QueryTypes.SELECT,
        },
    );

    return rows.map(toPump);
};

export const listSensorReadings = async (): Promise<Sensor[]> => {
    const rows = await sequelize.query<SensorRow>(
        'SELECT id, type, value, timestamp FROM sensors ORDER BY id ASC',
        {
            type: QueryTypes.SELECT,
        },
    );

    return rows.map(toSensor);
};

export const getSensorById = async (sensorId: number): Promise<Sensor | null> => {
    const rows = await sequelize.query<SensorRow>(
        'SELECT id, type, value, timestamp FROM sensors WHERE id = :sensorId',
        {
            replacements: { sensorId },
            type: QueryTypes.SELECT,
        },
    );

    if (rows.length === 0) {
        return null;
    }

    return toSensor(rows[0]);
};

export const updateSensorReading = async (
    sensorId: number,
    value: number,
): Promise<Sensor | null> => {
    const current = await getSensorById(sensorId);
    if (!current) {
        return null;
    }

    const timestamp = new Date().toISOString();
    await sequelize.query(
        'UPDATE sensors SET value = :value, timestamp = :timestamp WHERE id = :sensorId',
        {
            replacements: { value, timestamp, sensorId },
        },
    );

    return getSensorById(sensorId);
};

export const updateSensorReadingByType = async (
    type: string,
    value: number,
): Promise<Sensor | null> => {
    const rows = await sequelize.query<SensorRow>(
        'SELECT id, type, value, timestamp FROM sensors WHERE type = :type LIMIT 1',
        {
            replacements: { type },
            type: QueryTypes.SELECT,
        },
    );

    if (rows.length === 0) {
        return null;
    }

    return updateSensorReading(Number(rows[0].id), value);
};

export const saveSensorSnapshot = async (
    readings: Array<{ type: string; value: number }>,
): Promise<void> => {
    for (const reading of readings) {
        await updateSensorReadingByType(reading.type, reading.value);
    }
};

export const listAlarms = async (): Promise<Alarm[]> => {
    const rows = await sequelize.query<AlarmRow>(
        'SELECT id, type, description, timestamp, acknowledged FROM alarms ORDER BY acknowledged ASC, timestamp DESC, id DESC',
        {
            type: QueryTypes.SELECT,
        },
    );

    return rows.map(toAlarm);
};

export const acknowledgeAlarmById = async (alarmId: number): Promise<Alarm | null> => {
    await sequelize.query(
        'UPDATE alarms SET acknowledged = 1 WHERE id = :alarmId',
        {
            replacements: { alarmId },
        },
    );

    const rows = await sequelize.query<AlarmRow>(
        'SELECT id, type, description, timestamp, acknowledged FROM alarms WHERE id = :alarmId',
        {
            replacements: { alarmId },
            type: QueryTypes.SELECT,
        },
    );

    if (rows.length === 0) {
        return null;
    }

    return toAlarm(rows[0]);
};

export const deleteAlarmById = async (alarmId: number): Promise<boolean> => {
    const rows = await sequelize.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM alarms WHERE id = :alarmId',
        {
            replacements: { alarmId },
            type: QueryTypes.SELECT,
        },
    );

    if (Number(rows[0]?.count ?? 0) === 0) {
        return false;
    }

    await sequelize.query(
        'DELETE FROM alarms WHERE id = :alarmId',
        {
            replacements: { alarmId },
        },
    );

    return true;
};

export const createAlarm = async (
    alarmData: Pick<Alarm, 'description' | 'type'>,
): Promise<Alarm> => {
    const timestamp = new Date().toISOString();
    await sequelize.query(
        `
        INSERT INTO alarms (type, description, timestamp, acknowledged)
        VALUES (:type, :description, :timestamp, 0)
        `,
        {
            replacements: {
                type: alarmData.type,
                description: alarmData.description,
                timestamp,
            },
        },
    );

    const rows = await sequelize.query<AlarmRow>(
        'SELECT id, type, description, timestamp, acknowledged FROM alarms ORDER BY id DESC LIMIT 1',
        {
            type: QueryTypes.SELECT,
        },
    );

    return toAlarm(rows[0]);
};

export const createSimulationLog = async (
    level: string,
    message: string,
    timestamp = new Date().toISOString(),
): Promise<void> => {
    await sequelize.query(
        `
        INSERT INTO simulation_logs (level, message, timestamp)
        VALUES (:level, :message, :timestamp)
        `,
        {
            replacements: { level, message, timestamp },
        },
    );
};

export const listSimulationLogs = async (
    limit = 250,
): Promise<Array<{ id: number; level: string; message: string; timestamp: string }>> => {
    const rows = await sequelize.query<SimulationLogRow>(
        `
        SELECT id, level, message, timestamp
        FROM simulation_logs
        ORDER BY id DESC
        LIMIT :limit
        `,
        {
            replacements: { limit },
            type: QueryTypes.SELECT,
        },
    );

    return rows.reverse().map((row) => ({
        id: Number(row.id),
        level: row.level,
        message: row.message,
        timestamp: row.timestamp,
    }));
};

export const clearSimulationLogs = async (): Promise<void> => {
    await sequelize.query('DELETE FROM simulation_logs');
};

export const createSimulationHistory = async (entry: {
    simulatedAt: string;
    tank1Level: number;
    tank2Level: number;
    pressure: number;
    flow: number;
    energy: number;
}): Promise<void> => {
    await sequelize.query(
        `
        INSERT INTO simulation_history (simulatedAt, tank1Level, tank2Level, pressure, flow, energy)
        VALUES (:simulatedAt, :tank1Level, :tank2Level, :pressure, :flow, :energy)
        `,
        {
            replacements: entry,
        },
    );
};

export const listSimulationHistory = async (
    limit = 720,
): Promise<Array<{
    id: number;
    simulatedAt: string;
    tank1Level: number;
    tank2Level: number;
    pressure: number;
    flow: number;
    energy: number;
}>> => {
    const rows = await sequelize.query<SimulationHistoryRow>(
        `
        SELECT id, simulatedAt, tank1Level, tank2Level, pressure, flow, energy
        FROM simulation_history
        ORDER BY id DESC
        LIMIT :limit
        `,
        {
            replacements: { limit },
            type: QueryTypes.SELECT,
        },
    );

    return rows.reverse().map((row) => ({
        id: Number(row.id),
        simulatedAt: row.simulatedAt,
        tank1Level: Number(row.tank1Level),
        tank2Level: Number(row.tank2Level),
        pressure: Number(row.pressure),
        flow: Number(row.flow),
        energy: Number(row.energy),
    }));
};

export const clearSimulationHistory = async (): Promise<void> => {
    await sequelize.query('DELETE FROM simulation_history');
};

export const saveSimulationReport = async (report: {
    generatedAt: string;
    durationSeconds: number;
    alarmCount: number;
    acknowledgedCount: number;
    energyKwh: number;
    treatedVolumeLiters: number;
    availabilityRate: number;
    payload: string;
}): Promise<void> => {
    await sequelize.query(
        `
        INSERT INTO simulation_reports (
            generatedAt,
            durationSeconds,
            alarmCount,
            acknowledgedCount,
            energyKwh,
            treatedVolumeLiters,
            availabilityRate,
            payload
        ) VALUES (
            :generatedAt,
            :durationSeconds,
            :alarmCount,
            :acknowledgedCount,
            :energyKwh,
            :treatedVolumeLiters,
            :availabilityRate,
            :payload
        )
        `,
        {
            replacements: report,
        },
    );
};

export const getLatestSimulationReport = async (): Promise<{
    id: number;
    generatedAt: string;
    durationSeconds: number;
    alarmCount: number;
    acknowledgedCount: number;
    energyKwh: number;
    treatedVolumeLiters: number;
    availabilityRate: number;
    payload: string;
} | null> => {
    const rows = await sequelize.query<SimulationReportRow>(
        `
        SELECT id, generatedAt, durationSeconds, alarmCount, acknowledgedCount, energyKwh, treatedVolumeLiters, availabilityRate, payload
        FROM simulation_reports
        ORDER BY id DESC
        LIMIT 1
        `,
        {
            type: QueryTypes.SELECT,
        },
    );

    if (rows.length === 0) {
        return null;
    }

    const row = rows[0];
    return {
        id: Number(row.id),
        generatedAt: row.generatedAt,
        durationSeconds: Number(row.durationSeconds),
        alarmCount: Number(row.alarmCount),
        acknowledgedCount: Number(row.acknowledgedCount),
        energyKwh: Number(row.energyKwh),
        treatedVolumeLiters: Number(row.treatedVolumeLiters),
        availabilityRate: Number(row.availabilityRate),
        payload: row.payload,
    };
};

export { sequelize };

// Measurement functions for historical data
interface MeasurementRow {
    id: number;
    timestamp: string;
    pressure: number;
    flow_rate: number;
    tank_level: number;
    pump1_status: number;
    pump2_status: number;
}

const toMeasurement = (row: MeasurementRow) => ({
    id: Number(row.id),
    timestamp: new Date(row.timestamp),
    pressure: Number(row.pressure),
    flow_rate: Number(row.flow_rate),
    tank_level: Number(row.tank_level),
    pump1_status: Boolean(row.pump1_status),
    pump2_status: Boolean(row.pump2_status),
});

export const insertMeasurement = async (data: {
    pressure: number;
    flow_rate: number;
    tank_level: number;
    pump1_status: boolean;
    pump2_status: boolean;
}): Promise<void> => {
    const timestamp = new Date().toISOString();
    await sequelize.query(
        `
        INSERT INTO measurements (timestamp, pressure, flow_rate, tank_level, pump1_status, pump2_status)
        VALUES (:timestamp, :pressure, :flow_rate, :tank_level, :pump1_status, :pump2_status)
        `,
        {
            replacements: {
                timestamp,
                pressure: data.pressure,
                flow_rate: data.flow_rate,
                tank_level: data.tank_level,
                pump1_status: data.pump1_status ? 1 : 0,
                pump2_status: data.pump2_status ? 1 : 0,
            },
        }
    );
};

export const getMeasurementRange = async (
    from: Date,
    to: Date,
    resolution: number = 200
): Promise<{ data: ReturnType<typeof toMeasurement>[]; count: number }> => {
    // Get total count first
    const countResult = await sequelize.query<{ count: number }>(
        `
        SELECT COUNT(*) as count FROM measurements
        WHERE timestamp BETWEEN :from AND :to
        `,
        {
            replacements: {
                from: from.toISOString(),
                to: to.toISOString(),
            },
            type: QueryTypes.SELECT,
        }
    );

    const totalCount = Number(countResult[0]?.count ?? 0);

    if (totalCount === 0) {
        return { data: [], count: 0 };
    }

    // If total count <= resolution, return all points
    if (totalCount <= resolution) {
        const rows = await sequelize.query<MeasurementRow>(
            `
            SELECT id, timestamp, pressure, flow_rate, tank_level, pump1_status, pump2_status
            FROM measurements
            WHERE timestamp BETWEEN :from AND :to
            ORDER BY timestamp ASC
            `,
            {
                replacements: {
                    from: from.toISOString(),
                    to: to.toISOString(),
                },
                type: QueryTypes.SELECT,
            }
        );

        return {
            data: rows.map(toMeasurement),
            count: totalCount,
        };
    }

    // Downsample: group by bins and take average
    const binSize = Math.ceil(totalCount / resolution);
    const rows = await sequelize.query<{
        id: number;
        timestamp: string;
        pressure: number;
        flow_rate: number;
        tank_level: number;
        pump1_status: number;
        pump2_status: number;
    }>(
        `
        SELECT
            id,
            timestamp,
            pressure,
            flow_rate,
            tank_level,
            pump1_status,
            pump2_status
        FROM measurements
        WHERE timestamp BETWEEN :from AND :to
        ORDER BY timestamp ASC
        `,
        {
            replacements: {
                from: from.toISOString(),
                to: to.toISOString(),
            },
            type: QueryTypes.SELECT,
        }
    );

    // Group by bins and average
    const downsampled: typeof rows = [];
    for (let i = 0; i < rows.length; i += binSize) {
        const bin = rows.slice(i, i + binSize);
        if (bin.length > 0) {
            const avg = {
                id: bin[Math.floor(bin.length / 2)].id,
                timestamp: bin[0].timestamp,
                pressure:
                    bin.reduce((sum, r) => sum + r.pressure, 0) / bin.length,
                flow_rate:
                    bin.reduce((sum, r) => sum + r.flow_rate, 0) / bin.length,
                tank_level:
                    bin.reduce((sum, r) => sum + r.tank_level, 0) / bin.length,
                pump1_status: bin.some((r) => Boolean(r.pump1_status)) ? 1 : 0,
                pump2_status: bin.some((r) => Boolean(r.pump2_status)) ? 1 : 0,
            };
            downsampled.push(avg);
        }
    }

    return {
        data: downsampled.map(toMeasurement),
        count: totalCount,
    };
};

export const getLatestMeasurement = async (): Promise<ReturnType<
    typeof toMeasurement
> | null> => {
    const rows = await sequelize.query<MeasurementRow>(
        `
        SELECT id, timestamp, pressure, flow_rate, tank_level, pump1_status, pump2_status
        FROM measurements
        ORDER BY timestamp DESC
        LIMIT 1
        `,
        {
            type: QueryTypes.SELECT,
        }
    );

    if (rows.length === 0) {
        return null;
    }

    return toMeasurement(rows[0]);
};

export const getMeasurementStats = async (
    fromDate: Date,
    toDate: Date
): Promise<{
    pressure: { min: number; max: number; avg: number };
    flow_rate: { min: number; max: number; avg: number };
    tank_level: { min: number; max: number; avg: number };
} | null> => {
    const result = await sequelize.query<{
        pressure_min: number;
        pressure_max: number;
        pressure_avg: number;
        flow_rate_min: number;
        flow_rate_max: number;
        flow_rate_avg: number;
        tank_level_min: number;
        tank_level_max: number;
        tank_level_avg: number;
    }>(
        `
        SELECT
            MIN(pressure) as pressure_min,
            MAX(pressure) as pressure_max,
            AVG(pressure) as pressure_avg,
            MIN(flow_rate) as flow_rate_min,
            MAX(flow_rate) as flow_rate_max,
            AVG(flow_rate) as flow_rate_avg,
            MIN(tank_level) as tank_level_min,
            MAX(tank_level) as tank_level_max,
            AVG(tank_level) as tank_level_avg
        FROM measurements
        WHERE timestamp BETWEEN :from AND :to
        `,
        {
            replacements: {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
            },
            type: QueryTypes.SELECT,
        }
    );

    if (!result[0]) {
        return null;
    }

    const row = result[0];
    return {
        pressure: {
            min: Number(row.pressure_min),
            max: Number(row.pressure_max),
            avg: Number(row.pressure_avg),
        },
        flow_rate: {
            min: Number(row.flow_rate_min),
            max: Number(row.flow_rate_max),
            avg: Number(row.flow_rate_avg),
        },
        tank_level: {
            min: Number(row.tank_level_min),
            max: Number(row.tank_level_max),
            avg: Number(row.tank_level_avg),
        },
    };
};

export const deleteMeasurementsBefore = async (beforeDate: Date): Promise<number> => {
    const result = await sequelize.query(
        `
        DELETE FROM measurements
        WHERE timestamp < :beforeDate
        `,
        {
            replacements: {
                beforeDate: beforeDate.toISOString(),
            },
        }
    );

    return Array.isArray(result) ? (Number(result[0]) ?? 0) : 0;
};
