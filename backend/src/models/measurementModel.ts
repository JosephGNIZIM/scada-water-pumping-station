import { QueryTypes } from 'sequelize';
import { sequelize } from '../utils/db';

export interface MeasurementInsertData {
    pressure: number;
    flow_rate: number;
    tank_level: number;
    pump1_status: boolean | number;
    pump2_status: boolean | number;
}

export interface MeasurementRecord {
    id: number;
    timestamp: string;
    pressure: number;
    flow_rate: number;
    tank_level: number;
    pump1_status: number;
    pump2_status: number;
}

export interface MeasurementStats {
    min: number;
    max: number;
    avg: number;
}

interface MeasurementRow {
    id: number;
    timestamp: string;
    pressure: number;
    flow_rate: number;
    tank_level: number;
    pump1_status: number;
    pump2_status: number;
}

interface StatsRow {
    pressure_min: number | null;
    pressure_max: number | null;
    pressure_avg: number | null;
    flow_rate_min: number | null;
    flow_rate_max: number | null;
    flow_rate_avg: number | null;
    tank_level_min: number | null;
    tank_level_max: number | null;
    tank_level_avg: number | null;
}

const toStatus = (value: boolean | number): number => (value ? 1 : 0);

const toMeasurement = (row: MeasurementRow): MeasurementRecord => ({
    id: Number(row.id),
    timestamp: new Date(row.timestamp).toISOString(),
    pressure: Number(row.pressure),
    flow_rate: Number(row.flow_rate),
    tank_level: Number(row.tank_level),
    pump1_status: toStatus(row.pump1_status),
    pump2_status: toStatus(row.pump2_status),
});

const normalizeResolution = (resolution: number): number => {
    if (!Number.isFinite(resolution)) {
        return 200;
    }

    return Math.max(1, Math.min(5000, Math.floor(resolution)));
};

export class MeasurementModel {
    static async initialize(): Promise<void> {
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

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_measurements_timestamp
            ON measurements(timestamp)
        `);
    }

    static async insert(data: MeasurementInsertData): Promise<void> {
        await sequelize.query(
            `
            INSERT INTO measurements (
                timestamp,
                pressure,
                flow_rate,
                tank_level,
                pump1_status,
                pump2_status
            )
            VALUES (
                :timestamp,
                :pressure,
                :flow_rate,
                :tank_level,
                :pump1_status,
                :pump2_status
            )
            `,
            {
                replacements: {
                    timestamp: new Date().toISOString(),
                    pressure: data.pressure,
                    flow_rate: data.flow_rate,
                    tank_level: data.tank_level,
                    pump1_status: toStatus(data.pump1_status),
                    pump2_status: toStatus(data.pump2_status),
                },
            },
        );
    }

    static async getRange(
        from: Date,
        to: Date,
        resolution = 200,
    ): Promise<{ data: MeasurementRecord[]; count: number }> {
        const maxPoints = normalizeResolution(resolution);
        const replacements = {
            from: from.toISOString(),
            to: to.toISOString(),
        };

        const countResult = await sequelize.query<{ count: number }>(
            `
            SELECT COUNT(*) as count
            FROM measurements
            WHERE timestamp BETWEEN :from AND :to
            `,
            { replacements, type: QueryTypes.SELECT },
        );

        const totalCount = Number(countResult[0]?.count ?? 0);
        if (totalCount === 0) {
            return { data: [], count: 0 };
        }

        const rows = await sequelize.query<MeasurementRow>(
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
            { replacements, type: QueryTypes.SELECT },
        );

        if (rows.length <= maxPoints) {
            return { data: rows.map(toMeasurement), count: totalCount };
        }

        const binSize = Math.ceil(rows.length / maxPoints);
        const downsampled: MeasurementRow[] = [];

        for (let index = 0; index < rows.length; index += binSize) {
            const bin = rows.slice(index, index + binSize);
            const midPoint = bin[Math.floor(bin.length / 2)];

            downsampled.push({
                id: midPoint.id,
                timestamp: midPoint.timestamp,
                pressure: bin.reduce((sum, row) => sum + Number(row.pressure), 0) / bin.length,
                flow_rate: bin.reduce((sum, row) => sum + Number(row.flow_rate), 0) / bin.length,
                tank_level: bin.reduce((sum, row) => sum + Number(row.tank_level), 0) / bin.length,
                pump1_status: bin.some((row) => Boolean(row.pump1_status)) ? 1 : 0,
                pump2_status: bin.some((row) => Boolean(row.pump2_status)) ? 1 : 0,
            });
        }

        return {
            data: downsampled.slice(0, maxPoints).map(toMeasurement),
            count: totalCount,
        };
    }

    static async getLatest(): Promise<Omit<MeasurementRecord, 'id'> | null> {
        const rows = await sequelize.query<MeasurementRow>(
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
            ORDER BY timestamp DESC, id DESC
            LIMIT 1
            `,
            { type: QueryTypes.SELECT },
        );

        if (rows.length === 0) {
            return null;
        }

        const { id, ...measurement } = toMeasurement(rows[0]);
        return measurement;
    }

    static async getStats(
        from: Date,
        to: Date,
    ): Promise<{
        pressure: MeasurementStats;
        flow_rate: MeasurementStats;
        tank_level: MeasurementStats;
    } | null> {
        const rows = await sequelize.query<StatsRow>(
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
                    from: from.toISOString(),
                    to: to.toISOString(),
                },
                type: QueryTypes.SELECT,
            },
        );

        const row = rows[0];
        if (!row || row.pressure_min === null) {
            return null;
        }

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
    }

    static async deleteBefore(beforeDate: Date): Promise<number> {
        await sequelize.query(
            `
            DELETE FROM measurements
            WHERE timestamp < :beforeDate
            `,
            {
                replacements: {
                    beforeDate: beforeDate.toISOString(),
                },
            },
        );

        const rows = await sequelize.query<{ deleted: number }>(
            'SELECT changes() as deleted',
            { type: QueryTypes.SELECT },
        );

        return Number(rows[0]?.deleted ?? 0);
    }
}
