import express from 'express';
import { MeasurementController } from '../controllers/measurementController';
import { requireRole } from '../middleware/auth';

const router = express.Router();
const controller = new MeasurementController();

// GET /api/measurements - Get measurements in date range
// Query params: from (ISO date), to (ISO date), resolution (number)
router.get(
    '/',
    requireRole(['ingenieur', 'technicien', 'operateur']),
    (req, res) => controller.getRange(req, res)
);

// GET /api/measurements/latest - Get latest measurement
router.get(
    '/latest',
    requireRole(['ingenieur', 'technicien', 'operateur']),
    (req, res) => controller.getLatest(req, res)
);

// GET /api/measurements/stats - Get statistics for a period
// Query param: period (1h, 24h, 7d, 30d)
router.get(
    '/stats',
    requireRole(['ingenieur', 'technicien', 'operateur']),
    (req, res) => controller.getStats(req, res)
);

export default router;
