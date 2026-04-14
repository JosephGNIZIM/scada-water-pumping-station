export interface Event {
    id: number;
    type: string;
    description: string;
    timestamp: string;
}

export interface Alarm extends Event {
    acknowledged: boolean;
}
