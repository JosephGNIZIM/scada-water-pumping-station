import express from 'express';
import { PumpController } from '../controllers/pumpController';
import { SensorController } from '../controllers/sensorController';
import { AlarmController } from '../controllers/alarmController';
import { SimulationController } from '../controllers/simulationController';

const router = express.Router();

const pumpController = new PumpController();
const sensorController = new SensorController();
const alarmController = new AlarmController();
const simulationController = new SimulationController();

// Pump routes
router.post('/pumps/start', pumpController.startPump);
router.post('/pumps/stop', pumpController.stopPump);
router.get('/pumps/status', pumpController.getPumpStatus);

// Sensor routes
router.get('/sensors/readings', sensorController.getSensorReadings);
router.get('/sensors/status', sensorController.getSensorStatus);

// Alarm routes
router.get('/alarms', alarmController.getAlarms);
router.post('/alarms/acknowledge/:id', alarmController.acknowledgeAlarm);
router.post('/alarms/trigger', alarmController.triggerAlarm);

// Simulation routes
router.get('/simulation', simulationController.getState);
router.get('/simulation/scenarios', simulationController.getScenarios);
router.get('/simulation/report', simulationController.getReport);
router.get('/simulation/report/pdf', simulationController.exportReportPdf);
router.get('/simulation/log/export', simulationController.exportLog);
router.post('/simulation/start', simulationController.start);
router.post('/simulation/pause', simulationController.pause);
router.post('/simulation/reset', simulationController.reset);
router.post('/simulation/settings', simulationController.updateSettings);
router.post('/simulation/fault', simulationController.injectFault);
router.post('/simulation/scenarios/:id', simulationController.loadScenario);
router.post('/simulation/connect-real', simulationController.connectReal);

export default router;
