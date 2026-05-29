import { MeasurementModel } from '../models/measurementModel';

export interface CleanupConfig {
    retentionDays: number;
    intervalHours: number;
}

export class CleanupService {
    private config: CleanupConfig;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;

    constructor(config: CleanupConfig) {
        this.config = config;
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        console.log(
            `[CleanupService] Starting with retention ${this.config.retentionDays} days, ` +
            `check every ${this.config.intervalHours}h`
        );

        // Run cleanup immediately
        await this.cleanup();

        // Schedule recurring cleanup
        this.cleanupInterval = setInterval(async () => {
            await this.cleanup();
        }, this.config.intervalHours * 60 * 60 * 1000);
    }

    private async cleanup(): Promise<void> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(
                cutoffDate.getDate() - this.config.retentionDays
            );

            const deleted = await MeasurementModel.deleteBefore(cutoffDate);

            if (deleted > 0) {
                console.log(
                    `[CleanupService] Deleted ${deleted} measurements older than ` +
                    `${this.config.retentionDays} days (before ${cutoffDate.toISOString()})`
                );
            }
        } catch (error) {
            console.error('[CleanupService] Cleanup failed:', error);
        }
    }

    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        this.isRunning = false;
        console.log('[CleanupService] Stopped');
    }

    isRunning_(): boolean {
        return this.isRunning;
    }
}

// Singleton instance
let cleanupServiceInstance: CleanupService | null = null;

export const initializeCleanupService = (
    config: CleanupConfig
): CleanupService => {
    if (cleanupServiceInstance) {
        return cleanupServiceInstance;
    }

    cleanupServiceInstance = new CleanupService(config);
    return cleanupServiceInstance;
};

export const getCleanupService = (): CleanupService | null => {
    return cleanupServiceInstance;
};

export const shutdownCleanupService = async (): Promise<void> => {
    if (cleanupServiceInstance) {
        await cleanupServiceInstance.stop();
        cleanupServiceInstance = null;
    }
};
