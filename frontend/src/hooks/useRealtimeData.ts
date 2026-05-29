import { useEffect, useMemo, useRef, useState } from 'react';

export interface RealtimeMeasurement {
    pressure: number;
    flow: number;
    tankLevel: number;
    pump1Status: boolean;
    pump2Status: boolean;
    timestamp: string;
}

interface RealtimeState {
    latest: RealtimeMeasurement | null;
    isConnected: boolean;
    lastUpdate: Date | null;
}

const toNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeMeasurement = (payload: any): RealtimeMeasurement | null => {
    if (!payload) {
        return null;
    }

    return {
        pressure: toNumber(payload.pressure),
        flow: toNumber(payload.flow ?? payload.flow_rate),
        tankLevel: toNumber(payload.tankLevel ?? payload.tank_level),
        pump1Status: Boolean(payload.pump1Status ?? payload.pump1_status),
        pump2Status: Boolean(payload.pump2Status ?? payload.pump2_status),
        timestamp: String(payload.timestamp ?? new Date().toISOString()),
    };
};

const buildWebSocketUrl = (): string => {
    if (typeof window === 'undefined') {
        return '';
    }

    if (window.location.protocol === 'file:') {
        return 'ws://127.0.0.1:3000/realtime';
    }

    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const isLocalVite =
        ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
        !['3000', ''].includes(window.location.port);
    const host = isLocalVite ? `${window.location.hostname}:3000` : window.location.host;

    return `${scheme}://${host}/realtime`;
};

export const useRealtimeData = (): RealtimeState => {
    const [latest, setLatest] = useState<RealtimeMeasurement | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const reconnectAttemptsRef = useRef(0);

    const url = useMemo(buildWebSocketUrl, []);

    useEffect(() => {
        if (!url) {
            return undefined;
        }

        let socket: WebSocket | null = null;
        let reconnectTimer: number | null = null;
        let shouldReconnect = true;

        const scheduleReconnect = () => {
            if (!shouldReconnect) {
                return;
            }

            const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 10000);
            reconnectAttemptsRef.current += 1;
            reconnectTimer = window.setTimeout(connect, delay);
        };

        const connect = () => {
            socket = new WebSocket(url);

            socket.onopen = () => {
                reconnectAttemptsRef.current = 0;
                setIsConnected(true);
            };

            socket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload?.type !== 'measurement') {
                        return;
                    }

                    const measurement = normalizeMeasurement(payload.data);
                    if (measurement) {
                        setLatest(measurement);
                        setLastUpdate(new Date(measurement.timestamp));
                    }
                } catch (error) {
                    console.error('RealtimeData parse error:', error);
                }
            };

            socket.onclose = () => {
                setIsConnected(false);
                scheduleReconnect();
            };

            socket.onerror = () => {
                socket?.close();
            };
        };

        connect();

        return () => {
            shouldReconnect = false;
            if (reconnectTimer) {
                window.clearTimeout(reconnectTimer);
            }
            socket?.close();
        };
    }, [url]);

    return { latest, isConnected, lastUpdate };
};
