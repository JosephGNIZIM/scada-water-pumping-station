import { Request, Response } from 'express';
import * as alertService from '../services/alertService';
import { getClientIp } from '../services/authService';
import { createAuditLog } from '../utils/securityDb';
import { AuthRequest } from '../types/authRequest';

export class AlarmController {
    constructor() {
        this.getAlarms = this.getAlarms.bind(this);
        this.acknowledgeAlarm = this.acknowledgeAlarm.bind(this);
        this.deleteAlarm = this.deleteAlarm.bind(this);
        this.triggerAlarm = this.triggerAlarm.bind(this);
    }

    public getAlarms = async (_req: AuthRequest, res: Response) => {
        const alarms = await alertService.getAlarms();
        res.json(alarms);
    }

    public acknowledgeAlarm = async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const alarm = await alertService.acknowledgeAlarm(parseInt(id, 10));

        if (alarm) {
            await createAuditLog({
                userId: req.auth?.id,
                username: req.auth?.username,
                role: req.auth?.role,
                action: 'alarm.acknowledge',
                entityType: 'alarm',
                entityId: id,
                ip: getClientIp(req),
            });
            res.status(200).json(alarm);
        } else {
            res.status(404).json({ message: 'Alarm not found' });
        }
    }

    public deleteAlarm = async (req: AuthRequest, res: Response) => {
        const deleted = await alertService.deleteAlarm(parseInt(req.params.id, 10));

        if (!deleted) {
            res.status(404).json({ message: 'Alarm not found' });
            return;
        }

        await createAuditLog({
            userId: req.auth?.id,
            username: req.auth?.username,
            role: req.auth?.role,
            action: 'alarm.delete',
            entityType: 'alarm',
            entityId: req.params.id,
            ip: getClientIp(req),
        });
        res.status(204).send();
    }

    public triggerAlarm = async (req: AuthRequest, res: Response) => {
        const { description, type = 'general' } = req.body;

        if (!description) {
            res.status(400).json({ message: 'Alarm description is required' });
            return;
        }

        const newAlarm = await alertService.triggerAlarm({ description, type });
        await createAuditLog({
            userId: req.auth?.id,
            username: req.auth?.username,
            role: req.auth?.role,
            action: 'alarm.trigger',
            entityType: 'alarm',
            entityId: String(newAlarm.id),
            ip: getClientIp(req),
            details: JSON.stringify({ type }),
        });
        res.status(201).json(newAlarm);
    }
}
