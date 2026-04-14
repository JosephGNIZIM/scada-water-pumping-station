import { Request, Response } from 'express';
import * as sensorService from '../services/sensorService';

export class SensorController {
    async getSensorReadings(req: Request, res: Response) {
        try {
            const readings = await sensorService.getSensorReadings();
            res.status(200).json(readings);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving sensor readings', error });
        }
    }

    async getSensorStatus(req: Request, res: Response) {
        try {
            const sensorId = req.query.id ? Number(req.query.id) : undefined;
            const status = await sensorService.getSensorStatus(sensorId);
            res.status(200).json(status);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving sensor status', error });
        }
    }
}
