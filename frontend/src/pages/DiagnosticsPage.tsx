import React from 'react';
import { useAppSelector } from '../store/hooks';
import { useI18n } from '../i18n';

const DiagnosticsPage: React.FC = () => {
    const pump = useAppSelector((state) => state.pump);
    const sensors = useAppSelector((state) => state.sensor.readings);
    const alarms = useAppSelector((state) => state.alarm.alarms);
    const { tr, formatDateTime } = useI18n();

    const diagnostics = [
        { label: tr('Interface application', 'Application shell'), value: tr('React + Electron pret', 'React + Electron ready') },
        { label: tr('Agent utilisateur', 'User agent'), value: navigator.userAgent },
        { label: tr('Etat en ligne', 'Online state'), value: navigator.onLine ? tr('En ligne', 'Online') : tr('Hors ligne', 'Offline') },
        { label: tr('Langue', 'Language'), value: document.documentElement.lang || 'fr' },
        { label: tr('Etat pompe', 'Pump state'), value: `${pump.status} / ${formatDateTime(pump.lastUpdated)}` },
        { label: tr('Capteurs charges', 'Sensors loaded'), value: `${sensors.length}` },
        { label: tr('Alarmes actives', 'Active alarms'), value: `${alarms.filter((alarm) => !alarm.acknowledged).length}` },
        { label: tr('Statut tutoriel', 'Tutorial flag'), value: window.localStorage.getItem('scada-tutorial-completed') ? tr('Termine', 'Completed') : tr('En attente', 'Pending') },
        { label: tr('Langue sauvegardee', 'Saved language'), value: window.localStorage.getItem('app-language') || 'fr' },
    ];

    return (
        <div className="dashboard-shell">
            <section className="hero-card">
                <div>
                    <p className="eyebrow">Diagnostic</p>
                    <h1>{tr('Panneau de diagnostic systeme', 'System Diagnostic Panel')}</h1>
                    <p className="hero-copy">
                        {tr('Informations d execution rapides pour le support, les controles de deploiement et le depannage operateur.', 'Quick runtime information for support, deployment checks and operator troubleshooting.')}
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
                        <p className="eyebrow">{tr('Liste de controle', 'Checklist')}</p>
                        <h2>{tr('Checklist support', 'Support checklist')}</h2>
                    </div>
                </div>
                <ul className="settings-list">
                    <li>{tr('Verifier que les ports 3000 et 3001 sont libres avant le demarrage desktop.', 'Verify ports 3000 and 3001 are free before desktop startup.')}</li>
                    <li>{tr('Consulter les logs Electron dans userData/logs si le demarrage echoue.', 'Check Electron logs in the userData/logs folder if startup fails.')}</li>
                    <li>{tr('Confirmer que frontend/dist et backend/dist existent avant le packaging.', 'Confirm frontend/dist and backend/dist exist before packaging.')}</li>
                    <li>{tr('Installer Mosquitto ou definir MOSQUITTO_PATH si le demarrage MQTT automatique est requis.', 'Install Mosquitto or define MOSQUITTO_PATH when MQTT auto-start is required.')}</li>
                </ul>
            </section>
        </div>
    );
};

export default DiagnosticsPage;
