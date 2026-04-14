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

    public getState(_req: Request, res: Response) {
        res.json(getSimulationState());
    }

    public async start(req: Request, res: Response) {
        const speed = req.body?.speed ? Number(req.body.speed) : undefined;
        res.json(await startSimulation(speed));
    }

    public async pause(_req: Request, res: Response) {
        res.json(await pauseSimulation());
    }

    public async reset(_req: Request, res: Response) {
        res.json(await resetSimulation());
    }

    public async updateSettings(req: Request, res: Response) {
        res.json(await updateSimulationSettings(req.body ?? {}));
    }

    public async injectFault(req: Request, res: Response) {
        const type = String(req.body?.type ?? '');
        if (!type) {
            res.status(400).json({ message: 'Fault type is required' });
            return;
        }

        res.json(await injectSimulationFault(type as any));
    }

    public async loadScenario(req: Request, res: Response) {
        res.json(await loadSimulationScenario(String(req.params.id)));
    }

    public async connectReal(_req: Request, res: Response) {
        res.json(await connectRealEquipment());
    }

    public async exportLog(_req: Request, res: Response) {
        const csv = await exportSimulationLogCsv();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="simulation-log.csv"');
        res.send(csv);
    }

    public async getReport(_req: Request, res: Response) {
        res.json(await getLatestSimulationReportPayload());
    }

    public async exportReportPdf(_req: Request, res: Response) {
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

    public getScenarios(_req: Request, res: Response) {
        res.json(getSimulationScenarios());
    }
}
