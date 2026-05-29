import React, { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';
import GaugeCard from './Dashboard/GaugeCard';
import PumpStatusCard from './Dashboard/PumpStatusCard';
import TrendChart from './Dashboard/TrendChart';
import { useRealtimeData } from '../hooks/useRealtimeData';

const Dashboard: React.FC = () => {
    const { t } = useI18n();
    const { hasRole } = useAuth();
    const canControlPumps = hasRole(['ingenieur', 'technicien']);
    const { latest, isConnected, lastUpdate } = useRealtimeData();
    const [manualPumpStarts, setManualPumpStarts] = useState<Record<number, string | null>>({});

    const pressure = latest?.pressure ?? 0;
    const flow = latest?.flow ?? 0;
    const tankLevel = latest?.tankLevel ?? 0;

    const pumpStatuses = useMemo(() => ([
        {
            id: 1,
            label: 'Pompe 1',
            isOn: Boolean(latest?.pump1Status),
            lastStartedAt: latest?.pump1Status
                ? manualPumpStarts[1] ?? latest.timestamp
                : null,
        },
        {
            id: 2,
            label: 'Pompe 2',
            isOn: Boolean(latest?.pump2Status),
            lastStartedAt: latest?.pump2Status
                ? manualPumpStarts[2] ?? latest.timestamp
                : null,
        },
    ]), [latest, manualPumpStarts]);

    const timestampLabel = useMemo(() => {
        if (!lastUpdate) {
            return 'Aucune mise a jour';
        }
        return `Derniere mise a jour ${lastUpdate.toLocaleTimeString()}`;
    }, [lastUpdate]);

    const handlePumpCommandComplete = (pumpId: number, wasStart: boolean) => {
        setManualPumpStarts((current) => ({
            ...current,
            [pumpId]: wasStart ? new Date().toISOString() : null,
        }));
    };

    return (
        <div className="dashboard-shell">
            <section className="hero-card fade-in">
                <div>
                    <p className="eyebrow">{t('dashboard.eyebrow')}</p>
                    <h1>{t('dashboard.title')}</h1>
                    <p className="hero-copy">
                        Surveillance temps reel de la pression, du debit, du niveau reservoir et des pompes.
                    </p>
                </div>
                <div className="hero-actions">
                    <span className={`status-pill ${isConnected ? 'status-on' : 'status-off'}`}>
                        <span className="status-dot" /> {isConnected ? 'Connecte' : 'Deconnecte'}
                    </span>
                    <span>{timestampLabel}</span>
                </div>
            </section>

            <section className="dashboard-grid fade-in" aria-label="Mesures temps reel">
                <GaugeCard
                    label="Pression"
                    unit="bar"
                    value={pressure}
                    min={0}
                    max={10}
                    warningThreshold={4.5}
                    dangerThreshold={5.5}
                />
                <GaugeCard
                    label="Debit"
                    unit="m3/h"
                    value={flow}
                    min={0}
                    max={120}
                    warningThreshold={30}
                    dangerThreshold={40}
                />
                <GaugeCard
                    label="Niveau reservoir"
                    unit="%"
                    value={tankLevel}
                    min={0}
                    max={100}
                    warningThreshold={80}
                    dangerThreshold={92}
                />
            </section>

            <section className="pump-status-grid fade-in" aria-label="Statuts pompes">
                {pumpStatuses.map((pump) => (
                    <PumpStatusCard
                        key={pump.id}
                        id={pump.id}
                        label={pump.label}
                        isOn={pump.isOn}
                        lastStartedAt={pump.lastStartedAt}
                        canControl={canControlPumps}
                        onCommandComplete={() => handlePumpCommandComplete(pump.id, !pump.isOn)}
                    />
                ))}
            </section>

            <TrendChart />
        </div>
    );
};

export default Dashboard;
