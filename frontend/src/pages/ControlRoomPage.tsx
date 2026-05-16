import React, { useEffect, useMemo, useState } from 'react';
import SynopticView from '../components/SynopticView';
import LineChartPanel from '../components/LineChartPanel';
import { useAppSelector } from '../store/hooks';
import { buildMultiSeries } from '../utils/scada';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';

const ControlRoomPage: React.FC = () => {
    const { status } = useAppSelector((state) => state.pump);
    const readings = useAppSelector((state) => state.sensor.readings);
    const { hasRole } = useAuth();
    const { tr, language } = useI18n();
    const [viewIndex, setViewIndex] = useState(0);
    const [clock, setClock] = useState(new Date());

    useEffect(() => {
        const rotateTimer = window.setInterval(() => setViewIndex((value) => (value + 1) % 2), 7000);
        const clockTimer = window.setInterval(() => setClock(new Date()), 1000);
        return () => {
            window.clearInterval(rotateTimer);
            window.clearInterval(clockTimer);
        };
    }, []);

    const series = useMemo(() => buildMultiSeries(readings, language), [readings, language]);
    const waterLevel = readings.find((reading) => reading.type === 'water-level')?.value ?? 70;
    const canFullscreen = hasRole(['ingenieur']);

    return (
        <div className="control-room">
            <section className="panel control-room-header glow-ok">
                <div>
                    <p className="eyebrow">{tr('Salle de controle', 'Control Room')}</p>
                    <h1>{tr('Mode grand ecran', 'Large Screen Mode')}</h1>
                </div>
                <div className="control-room-clock">{clock.toLocaleTimeString()}</div>
                <button
                    className="btn btn-primary"
                    onClick={() => document.documentElement.requestFullscreen?.()}
                    disabled={!canFullscreen}
                    title={canFullscreen ? '' : 'Acces reserve aux Ingenieurs'}
                >
                    {tr('Plein ecran', 'Fullscreen')}
                </button>
            </section>
            {viewIndex === 0 ? (
                <section className="panel glow-ok">
                    <SynopticView
                        primaryPumpRunning={status === 'running'}
                        secondaryPumpRunning={status === 'running'}
                        valves={[true, true, true]}
                        tankLevelA={waterLevel}
                        tankLevelB={Math.max(20, waterLevel - 10)}
                    />
                </section>
            ) : (
                <LineChartPanel series={series} title={tr('Tendances procede en rotation', 'Rotating process trends')} />
            )}
        </div>
    );
};

export default ControlRoomPage;
