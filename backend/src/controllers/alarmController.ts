import { Request, Response } from 'express';
import * as alertService from '../services/alertService';

export class AlarmController {
    constructor() {
        this.getAlarms = this.getAlarms.bind(this);
        this.acknowledgeAlarm = this.acknowledgeAlarm.bind(this);
        this.triggerAlarm = this.triggerAlarm.bind(this);
    }

    public getAlarms = async (_req: Request, res: Response) => {
        const alarms = await alertService.getAlarms();
        res.json(alarms);
    }

    public acknowledgeAlarm = async (req: Request, res: Response) => {
        const { id } = req.params;
        const alarm = await alertService.acknowledgeAlarm(parseInt(id, 10));

        if (alarm) {
            res.status(200).json(alarm);
        } else {
            res.status(404).json({ message: 'Alarm not found' });
        }
    }

    public triggerAlarm = async (req: Request, res: Response) => {
        const { description, type = 'general' } = req.body;

        if (!description) {
            res.status(400).json({ message: 'Alarm description is required' });
            return;
        }

        const newAlarm = await alertService.triggerAlarm({ description, type });
        res.status(201).json(newAlarm);
    }
}
