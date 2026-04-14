import React, { useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { startPumpAsync, stopPumpAsync } from '../store/slices/pumpSlice';
import { useI18n } from '../i18n';
import SynopticView from '../components/SynopticView';

const SynopticPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useI18n();
    const { status, id } = useAppSelector((state) => state.pump);
    const readings = useAppSelector((state) => state.sensor.readings);
    const [secondaryPumpRunning, setSecondaryPumpRunning] = useState(false);
    const [valves, setValves] = useState([true, true, false]);

    const waterLevel = readings.find((reading) => reading.type === 'water-level')?.value ?? 72;
    const pressure = readings.find((reading) => reading.type === 'line-pressure')?.value ?? 5.6;

    const tankLevelB = useMemo(() => Math.max(20, Math.min(95, waterLevel - pressure * 3)), [waterLevel, pressure]);

    const togglePrimaryPump = () => {
        if (status === 'running') {
            dispatch(stopPumpAsync(id));
            return;
        }
        dispatch(startPumpAsync(id));
    };

    return (
        <div className="dashboard-shell">
            <section className="hero-card">
                <div>
                    <p className="eyebrow">Synoptic</p>
                    <h1>{t('nav.dashboard')} / Synoptic</h1>
                    <p className="hero-copy">
                        Interactive station schematic with animated flow, clickable equipment and hover tooltips.
                    </p>
                </div>
            </section>
            <section className="panel glow-ok">
                <div className="panel-heading">
                    <div>
                        <p className="eyebrow">Station View</p>
                        <h2>Process Synoptic</h2>
                    </div>
                </div>
                <SynopticView
                    primaryPumpRunning={status === 'running'}
                    secondaryPumpRunning={secondaryPumpRunning}
                    valves={valves}
                    tankLevelA={waterLevel}
                    tankLevelB={tankLevelB}
                    onPrimaryPumpToggle={togglePrimaryPump}
                    onSecondaryPumpToggle={() => setSecondaryPumpRunning((value) => !value)}
                    onValveToggle={(index) => setValves((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))}
                />
                <div className="summary-grid">
                    <article className="summary-card glow-ok">
                        <p className="eyebrow">Pump P1</p>
                        <h3>{status === 'running' ? 'Running' : 'Stopped'}</h3>
                        <p>Primary transfer pump controlled through the backend API.</p>
                    </article>
                    <article className={`summary-card ${secondaryPumpRunning ? 'glow-ok' : 'glow-warning'}`}>
                        <p className="eyebrow">Pump P2</p>
                        <h3>{secondaryPumpRunning ? 'Running' : 'Standby'}</h3>
                        <p>Secondary assist pump for redundancy scenarios.</p>
                    </article>
                    <article className="summary-card glow-warning">
                        <p className="eyebrow">Valves</p>
                        <h3>{valves.filter(Boolean).length} / 3 open</h3>
                        <p>Click valves directly on the SVG to simulate routing changes.</p>
                    </article>
                </div>
            </section>
        </div>
    );
};

export default SynopticPage;
