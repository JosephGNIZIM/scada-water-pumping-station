import { Request, Response } from 'express';
import * as pumpService from '../services/pumpService';
import { createAuditLog } from '../utils/securityDb';
import { getClientIp } from '../services/authService';
import { AuthRequest } from '../types/authRequest';

export class PumpController {
    async startPump(req: AuthRequest, res: Response) {
        const pumpId = Number(req.body.id ?? 1);
        const pump = await pumpService.startPump(pumpId);
        await createAuditLog({
            userId: req.auth?.id,
            username: req.auth?.username,
            role: req.auth?.role,
            action: 'pump.start',
            entityType: 'pump',
            entityId: String(pumpId),
            ip: getClientIp(req),
        });
        res.status(200).json(pump ?? { message: 'Pump not found' });
    }

    async stopPump(req: AuthRequest, res: Response) {
        const pumpId = Number(req.body.id ?? 1);
        const pump = await pumpService.stopPump(pumpId);
        await createAuditLog({
            userId: req.auth?.id,
            username: req.auth?.username,
            role: req.auth?.role,
            action: 'pump.stop',
            entityType: 'pump',
            entityId: String(pumpId),
            ip: getClientIp(req),
        });
        res.status(200).json(pump ?? { message: 'Pump not found' });
    }

    async getPumpStatus(req: AuthRequest, res: Response) {
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
