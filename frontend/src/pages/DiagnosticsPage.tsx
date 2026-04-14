import React from 'react';
import { useAppSelector } from '../store/hooks';

const DiagnosticsPage: React.FC = () => {
    const pump = useAppSelector((state) => state.pump);
    const sensors = useAppSelector((state) => state.sensor.readings);
    const alarms = useAppSelector((state) => state.alarm.alarms);

    const diagnostics = [
        { label: 'Application shell', value: 'React + Electron ready' },
        { label: 'User agent', value: navigator.userAgent },
        { label: 'Online state', value: navigator.onLine ? 'Online' : 'Offline' },
        { label: 'Language', value: document.documentElement.lang || 'fr' },
        { label: 'Pump state', value: `${pump.status} / ${new Date(pump.lastUpdated).toLocaleString()}` },
        { label: 'Sensors loaded', value: `${sensors.length}` },
        { label: 'Active alarms', value: `${alarms.filter((alarm) => !alarm.acknowledged).length}` },
        { label: 'Tutorial flag', value: window.localStorage.getItem('scada-tutorial-completed') ? 'Completed' : 'Pending' },
        { label: 'Saved language', value: window.localStorage.getItem('app-language') || 'fr' },
    ];

    return (
        <div className="dashboard-shell">
            <section className="hero-card">
                <div>
                    <p className="eyebrow">Diagnostic</p>
                    <h1>System Diagnostic Panel</h1>
                    <p className="hero-copy">
                        Quick runtime information for support, deployment checks and operator troubleshooting.
                    </p>
                </div>
            </section>
            <section className="summary-grid">
                {diagnostics.map((item) => (
                    <article key={item.label} className="summary-card glow-ok">
                        <p className="eyebrow">{item.label}</p>
                        <h3>{item.value}</h3>
                    </article>
                ))}
            </section>
            <section className="panel glow-warning">
                <div className="panel-heading">
                    <div>
                        <p className="eyebrow">Checklist</p>
                        <h2>Support checklist</h2>
                    </div>
                </div>
                <ul className="settings-list">
                    <li>Verify ports 3000 and 3001 are free before desktop startup.</li>
                    <li>Check Electron logs in the userData/logs folder if startup fails.</li>
                    <li>Confirm frontend/dist and backend/dist exist before packaging.</li>
                    <li>Install Mosquitto or define MOSQUITTO_PATH when MQTT auto-start is required.</li>
                </ul>
            </section>
        </div>
    );
};

export default DiagnosticsPage;
