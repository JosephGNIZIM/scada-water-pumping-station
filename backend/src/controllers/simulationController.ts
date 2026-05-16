import { Request, Response } from 'express';
import {
    connectRealEquipment,
    exportSimulationLogCsv,
    getLatestSimulationReportPayload,
    getSimulationScenarios,
    getSimulationState,
    injectSimulationFault,
    loadSimulationScenario,
    pauseSimulation,
    resetSimulation,
    startSimulation,
    updateSimulationSettings,
} from '../services/simulationService';
import { buildSimulationReportPdf } from '../utils/simulationPdf';
import { createAuditLog } from '../utils/securityDb';
import { getClientIp } from '../services/authService';
import { AuthRequest } from '../types/authRequest';

export class SimulationController {
    constructor() {
        this.getState = this.getState.bind(this);
        this.start = this.start.bind(this);
        this.pause = this.pause.bind(this);
        this.reset = this.reset.bind(this);
        this.updateSettings = this.updateSettings.bind(this);
        this.injectFault = this.injectFault.bind(this);
        this.loadScenario = this.loadScenario.bind(this);
        this.connectReal = this.connectReal.bind(this);
        this.exportLog = this.exportLog.bind(this);
        this.getReport = this.getReport.bind(this);
        this.exportReportPdf = this.exportReportPdf.bind(this);
        this.getScenarios = this.getScenarios.bind(this);
    }

    public getState(_req: AuthRequest, res: Response) {
        res.json(getSimulationState());
    }

    public async start(req: AuthRequest, res: Response) {
        const speed = req.body?.speed ? Number(req.body.speed) : undefined;
        const state = await startSimulation(speed);
        await createAuditLog({
            userId: req.auth?.id,
            username: req.auth?.username,
            role: req.auth?.role,
            action: 'simulation.start',
            entityType: 'simulation',
            entityId: 'state',
            ip: getClientIp(req),
            details: JSON.stringify({ speed }),
        });
        res.json(state);
    }

    public async pause(req: AuthRequest, res: Response) {
        const state = await pauseSimulation();
        await createAuditLog({
            userId: req.auth?.id,
            username: req.auth?.username,
            role: req.auth?.role,
            action: 'simulation.pause',
            entityType: 'simulation',
            entityId: 'state',
            ip: getClientIp(req),
        });
        res.json(state);
    }

    public async reset(req: AuthRequest, res: Response) {
        const state = await resetSimulation();
        await createAuditLog({
            userId: req.auth?.id,
            username: req.auth?.username,
            role: req.auth?.role,
            action: 'simulation.reset',
            entityType: 'simulation',
            entityId: 'state',
            ip: getClientIp(req),
        });
        res.json(state);
    }

    public async updateSettings(req: AuthRequest, res: Response) {
        const state = await updateSimulationSettings(req.body ?? {});
        await createAuditLog({
            userId: req.auth?.id,
            username: req.auth?.username,
            role: req.auth?.role,
            action: 'simulation.settings.update',
            entityType: 'simulation-settings',
            entityId: 'default',
            ip: getClientIp(req),
            details: JSON.stringify(req.body ?? {}),
        });
        res.json(state);
    }

    public async injectFault(req: AuthRequest, res: Response) {
        const type = String(req.body?.type ?? '');
        if (!type) {
            res.status(400).json({ message: 'Fault type is required' });
            return;
        }

        const state = await injectSimulationFault(type as any);
        await createAuditLog({
            userId: req.auth?.id,
            username: req.auth?.username,
            role: req.auth?.role,
            action: 'simulation.fault.inject',
            entityType: 'simulation-fault',
            entityId: type,
            ip: getClientIp(req),
        });
        res.json(state);
    }

    public async loadScenario(req: AuthRequest, res: Response) {
        const state = await loadSimulationScenario(String(req.params.id));
        await createAuditLog({
            userId: req.auth?.id,
            username: req.auth?.username,
            role: req.auth?.role,
            action: 'simulation.scenario.load',
            entityType: 'simulation-scenario',
            entityId: String(req.params.id),
            ip: getClientIp(req),
        });
        res.json(state);
    }

    public async connectReal(req: AuthRequest, res: Response) {
        const state = await connectRealEquipment();
        await createAuditLog({
            userId: req.auth?.id,
            username: req.auth?.username,
            role: req.auth?.role,
            action: 'simulation.connect-real',
            entityType: 'simulation',
            entityId: 'equipment',
            ip: getClientIp(req),
        });
        res.json(state);
    }

    public async exportLog(_req: AuthRequest, res: Response) {
        const csv = await exportSimulationLogCsv();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="simulation-log.csv"');
        res.send(csv);
    }

    public async getReport(_req: AuthRequest, res: Response) {
        res.json(await getLatestSimulationReportPayload());
    }

    public async exportReportPdf(_req: AuthRequest, res: Response) {
        const report = await getLatestSimulationReportPayload();
        if (!report) {
            res.status(404).json({ message: 'No simulation report available' });
            return;
        }

        const pdf = buildSimulationReportPdf(report);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="simulation-report.pdf"');
        res.send(pdf);
    }

    public getScenarios(_req: AuthRequest, res: Response) {
        res.json(getSimulationScenarios());
    }
}
