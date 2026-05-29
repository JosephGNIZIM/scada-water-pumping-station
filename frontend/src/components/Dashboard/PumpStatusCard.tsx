import React, { useEffect, useMemo, useState } from 'react';
import { controlPump } from '../../services/api';

interface PumpStatusCardProps {
    id: number;
    label: string;
    isOn: boolean;
    lastStartedAt: string | null;
    canControl: boolean;
    onCommandComplete?: () => Promise<void> | void;
}

const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const PumpStatusCard: React.FC<PumpStatusCardProps> = ({
    id,
    label,
    isOn,
    lastStartedAt,
    canControl,
    onCommandComplete,
}) => {
    const [runtimeSeconds, setRuntimeSeconds] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const lastStartedDate = useMemo(() => {
        if (!lastStartedAt) {
            return null;
        }

        const parsed = new Date(lastStartedAt);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }, [lastStartedAt]);

    useEffect(() => {
        const updateRuntime = () => {
            if (!isOn || !lastStartedDate) {
                setRuntimeSeconds(0);
                return;
            }

            setRuntimeSeconds(Math.max(0, Math.floor((Date.now() - lastStartedDate.getTime()) / 1000)));
        };

        updateRuntime();
        const timer = window.setInterval(updateRuntime, 1000);
        return () => window.clearInterval(timer);
    }, [isOn, lastStartedDate]);

    const sendCommand = async (command: 'start' | 'stop') => {
        if (!canControl || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            await controlPump(id, command);
            await onCommandComplete?.();
        } catch (error: any) {
            setMessage(error?.response?.data?.message || 'Commande pompe impossible.');
            console.error('Pump command failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <article className="panel pump-card">
            <div className="panel-heading">
                <div>
                    <p className="eyebrow">{label}</p>
                    <h3>Statut pompe</h3>
                </div>
                <div className={`status-pill ${isOn ? 'status-on' : 'status-off'}`}>
                    <span className="status-dot" />
                    <span>{isOn ? 'ON' : 'OFF'}</span>
                </div>
            </div>

            <div className="pump-metrics">
                <div>
                    <p className="eyebrow">Temps de fonctionnement</p>
                    <strong>{formatDuration(runtimeSeconds)}</strong>
                </div>
                <div>
                    <p className="eyebrow">Dernier demarrage</p>
                    <span>{lastStartedDate ? lastStartedDate.toLocaleTimeString() : '-'}</span>
                </div>
            </div>

            <div className="action-row pump-actions">
                <button
                    className="btn btn-primary"
                    onClick={() => sendCommand('start')}
                    disabled={!canControl || isSubmitting || isOn}
                    type="button"
                >
                    Demarrer
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={() => sendCommand('stop')}
                    disabled={!canControl || isSubmitting || !isOn}
                    type="button"
                >
                    Arreter
                </button>
            </div>

            {!canControl && (
                <p className="status-note">Etat desactive : role superviseur requis.</p>
            )}
            {message && <p className="status-note status-note--error">{message}</p>}
        </article>
    );
};

export default PumpStatusCard;
