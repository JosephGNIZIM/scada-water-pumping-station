import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import { Server } from 'http';
import { initializeDatabase, testConnection } from './utils/db';
import { initializeSecurityDatabase } from './utils/securityDb';
import routes from './routes/index';
import measurementsRouter from './routes/measurementsRouter';
import { initializeSimulation } from './services/simulationService';
import {
    initializeModbusService,
    shutdownModbusService,
    ModbusConfig,
} from './services/modbusService';
import {
    initializePollingService,
    shutdownPollingService,
    PollingConfig,
} from './services/pollingService';
import {
    initializeCleanupService,
    shutdownCleanupService,
    CleanupConfig,
} from './services/cleanupService';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Set up routes
app.use('/api', routes);
app.use('/api/measurements', measurementsRouter);

let activeServer: Server | null = null;

export const startServer = async (port = Number(process.env.PORT || 3000)): Promise<Server> => {
    if (activeServer) {
        return activeServer;
    }

    const databaseReady = await testConnection();
    if (!databaseReady) {
        process.exit(1);
    }

    await initializeDatabase();
    await initializeSecurityDatabase();
    await initializeSimulation();

    // Initialize Modbus service if enabled
    if (process.env.MODBUS_ENABLED === 'true') {
        try {
            const modbusConfig: ModbusConfig = {
                host: process.env.MODBUS_HOST || '192.168.1.100',
                port: Number(process.env.MODBUS_PORT || 502),
                unitId: Number(process.env.MODBUS_UNIT_ID || 1),
                reconnectDelayMs:
                    Number(process.env.MODBUS_RECONNECT_DELAY_MS || 5000),
            };

            await initializeModbusService(modbusConfig);
            console.log('[App] Modbus service initialized');
        } catch (error) {
            console.error(
                '[App] Failed to initialize Modbus service:',
                error
            );
        }
    }

    // Initialize polling service
    try {
        const pollingConfig: PollingConfig = {
            intervalMs: Number(process.env.MODBUS_POLL_INTERVAL_MS || 2000),
            modbusEnabled: process.env.MODBUS_ENABLED === 'true',
        };

        const pollingService = initializePollingService(pollingConfig);
        await pollingService.start();
        console.log('[App] Polling service started');
    } catch (error) {
        console.error('[App] Failed to initialize polling service:', error);
    }

    // Initialize cleanup service
    try {
        const cleanupConfig: CleanupConfig = {
            retentionDays: Number(process.env.DATA_RETENTION_DAYS || 90),
            intervalHours: 1,
        };

        const cleanupService = initializeCleanupService(cleanupConfig);
        await cleanupService.start();
        console.log('[App] Cleanup service started');
    } catch (error) {
        console.error('[App] Failed to initialize cleanup service:', error);
    }

    return new Promise((resolve) => {
        activeServer = app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            resolve(activeServer as Server);
        });
    });
};

export const stopServer = async (): Promise<void> => {
    if (!activeServer) {
        return;
    }

    // Shutdown cleanup service
    try {
        await shutdownCleanupService();
        console.log('[App] Cleanup service stopped');
    } catch (error) {
        console.error('[App] Error stopping cleanup service:', error);
    }

    // Shutdown polling service
    try {
        await shutdownPollingService();
        console.log('[App] Polling service stopped');
    } catch (error) {
        console.error('[App] Error stopping polling service:', error);
    }

    // Shutdown Modbus service
    try {
        await shutdownModbusService();
        console.log('[App] Modbus service stopped');
    } catch (error) {
        console.error('[App] Error stopping Modbus service:', error);
    }

    await new Promise<void>((resolve, reject) => {
        activeServer?.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });

    activeServer = null;
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error('Unable to start server:', error);
        process.exit(1);
    });

    // Graceful shutdown on SIGTERM/SIGINT
    process.on('SIGTERM', async () => {
        console.log('[App] SIGTERM received, shutting down gracefully...');
        await stopServer();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        console.log('[App] SIGINT received, shutting down gracefully...');
        await stopServer();
        process.exit(0);
    });
}
