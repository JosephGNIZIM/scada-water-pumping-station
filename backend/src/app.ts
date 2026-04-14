import express from 'express';
import { Server } from 'http';
import { initializeDatabase, testConnection } from './utils/db';
import routes from './routes/index';
import { initializeSimulation } from './services/simulationService';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up routes
app.use('/api', routes);

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
    await initializeSimulation();

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
}
