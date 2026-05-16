import express from 'express';
import { PumpController } from '../controllers/pumpController';
import { SensorController } from '../controllers/sensorController';
import { AlarmController } from '../controllers/alarmController';
import { SimulationController } from '../controllers/simulationController';
import authRoutes from './auth';
import { authenticate, requireCsrf, requireRole } from '../middleware/auth';

const router = express.Router();

const pumpController = new PumpController();
const sensorController = new SensorController();
const alarmController = new AlarmController();
const simulationController = new SimulationController();

router.use('/auth', authRoutes);
router.use(authenticate);

// Pump routes
router.post('/pumps/start', requireCsrf, requireRole(['ingenieur', 'technicien']), pumpController.startPump);
router.post('/pumps/stop', requireCsrf, requireRole(['ingenieur', 'technicien']), pumpController.stopPump);
router.get('/pumps/status', requireRole(['ingenieur', 'technicien', 'operateur']), pumpController.getPumpStatus);

// Sensor routes
router.get('/sensors', requireRole(['ingenieur', 'technicien', 'operateur']), sensorController.getSensorReadings);
router.get('/sensors/readings', requireRole(['ingenieur', 'technicien', 'operateur']), sensorController.getSensorReadings);
router.get('/sensors/status', requireRole(['ingenieur', 'technicien', 'operateur']), sensorController.getSensorStatus);

// Alarm routes
router.get('/alarms', requireRole(['ingenieur', 'technicien', 'operateur']), alarmController.getAlarms);
router.post('/alarms/acknowledge/:id', requireCsrf, requireRole(['ingenieur', 'technicien']), alarmController.acknowledgeAlarm);
router.delete('/alarms/:id', requireCsrf, requireRole(['ingenieur']), alarmController.deleteAlarm);
router.post('/alarms/trigger', requireCsrf, requireRole(['ingenieur']), alarmController.triggerAlarm);

// Simulation routes
router.get('/simulation', requireRole(['ingenieur', 'technicien', 'operateur']), simulationController.getState);
router.get('/simulation/scenarios', requireRole(['ingenieur', 'technicien', 'operateur']), simulationController.getScenarios);
router.get('/simulation/report', requireRole(['ingenieur', 'technicien', 'operateur']), simulationController.getReport);
router.get('/simulation/report/pdf', requireRole(['ingenieur', 'technicien']), simulationController.exportReportPdf);
router.get('/simulation/log/export', requireRole(['ingenieur', 'technicien']), simulationController.exportLog);
router.post('/simulation/start', requireCsrf, requireRole(['ingenieur', 'technicien']), simulationController.start);
router.post('/simulation/pause', requireCsrf, requireRole(['ingenieur', 'technicien']), simulationController.pause);
router.post('/simulation/reset', requireCsrf, requireRole(['ingenieur', 'technicien']), simulationController.reset);
router.post('/simulation/settings', requireCsrf, requireRole(['ingenieur', 'technicien']), simulationController.updateSettings);
router.post('/simulation/fault', requireCsrf, requireRole(['ingenieur', 'technicien']), simulationController.injectFault);
router.post('/simulation/scenarios/:id', requireCsrf, requireRole(['ingenieur', 'technicien']), simulationController.loadScenario);
router.post('/simulation/connect-real', requireCsrf, requireRole(['ingenieur', 'technicien']), simulationController.connectReal);

export default router;
