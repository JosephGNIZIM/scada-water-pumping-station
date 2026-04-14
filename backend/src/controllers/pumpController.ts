import { Request, Response } from 'express';
import * as pumpService from '../services/pumpService';

export class PumpController {
    async startPump(req: Request, res: Response) {
        const pumpId = Number(req.body.id ?? 1);
        const pump = await pumpService.startPump(pumpId);
        res.status(200).json(pump ?? { message: 'Pump not found' });
    }

    async stopPump(req: Request, res: Response) {
        const pumpId = Number(req.body.id ?? 1);
        const pump = await pumpService.stopPump(pumpId);
        res.status(200).json(pump ?? { message: 'Pump not found' });
    }

    async getPumpStatus(req: Request, res: Response) {
        const pumpId = Number(req.query.id ?? 1);
        const pump = await pumpService.getPumpStatus(pumpId);

        if (!pump) {
            res.status(404).json({ message: 'Pump not found' });
            return;
        }

        res.status(200).json({
            ...pump,
            lastUpdated: pump.lastUpdated.toISOString(),
        });
    }
}
