import { Request, Response } from 'express';
import {
    getMeasurementRange,
    getLatestMeasurement,
    getMeasurementStats,
} from '../utils/db';

export class MeasurementController {
    async getRange(req: Request, res: Response) {
        try {
            const fromStr = req.query.from as string | undefined;
            const toStr = req.query.to as string | undefined;
            const resolution = req.query.resolution
                ? Number(req.query.resolution)
                : 200;

            // Default: last 1 hour
            const to = toStr ? new Date(toStr) : new Date();
            const from = fromStr
                ? new Date(fromStr)
                : new Date(to.getTime() - 60 * 60 * 1000);

            const result = await getMeasurementRange(from, to, resolution);

            res.status(200).json({
                data: result.data,
                count: result.count,
                from: from.toISOString(),
                to: to.toISOString(),
            });
        } catch (error) {
            console.error('[MeasurementController] getRange error:', error);
            res.status(500).json({
                message: 'Error retrieving measurement range',
                error,
            });
        }
    }

    async getLatest(req: Request, res: Response) {
        try {
            const measurement = await getLatestMeasurement();

            if (!measurement) {
                res.status(200).json(null);
                return;
            }

            res.status(200).json(measurement);
        } catch (error) {
            console.error('[MeasurementController] getLatest error:', error);
            res.status(500).json({
                message: 'Error retrieving latest measurement',
                error,
            });
        }
    }

    async getStats(req: Request, res: Response) {
        try {
            const period = (req.query.period as string) || '24h';
            const now = new Date();

            let from: Date;
            switch (period) {
                case '1h':
                    from = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case '24h':
                    from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }

            const stats = await getMeasurementStats(from, now);

            if (!stats) {
                res.status(200).json({
                    message: 'No data available for this period',
                });
                return;
            }

            res.status(200).json({
                period,
                from: from.toISOString(),
                to: now.toISOString(),
                stats,
            });
        } catch (error) {
            console.error('[MeasurementController] getStats error:', error);
            res.status(500).json({
                message: 'Error retrieving measurement stats',
                error,
            });
        }
    }
}
