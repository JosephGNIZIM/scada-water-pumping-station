export interface Pump {
    id: number;
    status: 'running' | 'stopped' | 'faulted';
    lastUpdated: Date;
}