import React from 'react';
import PumpStationLogo from '../components/PumpStationLogo';
import { useI18n } from '../i18n';

const AboutPage: React.FC = () => {
    const { tr } = useI18n();

    return (
        <div className="dashboard-shell">
            <section className="hero-card">
                <div className="about-hero">
                    <div className="about-logo-wrap">
                        <PumpStationLogo className="about-logo" />
                    </div>
                    <div>
                        <p className="eyebrow">{tr('A propos', 'About')}</p>
                        <h1>{tr('Station d eau SCADA', 'SCADA Water Station')}</h1>
                        <p className="hero-copy">
                            {tr('Poste de supervision industriel pour le pilotage des pompes, la lecture des capteurs, la gestion des alarmes et l export des rapports d exploitation.', 'Industrial supervision workstation for pump control, sensor readings, alarm management and operating report exports.')}
                        </p>
                    </div>
                </div>
            </section>

            <section className="summary-grid">
                <article className="summary-card glow-ok">
                    <p className="eyebrow">Version</p>
                    <h3>1.0.0</h3>
                    <p>{tr('Application desktop Windows embarquant frontend React, backend Node/Express et stockage SQLite.', 'Windows desktop application embedding a React frontend, Node/Express backend and SQLite storage.')}</p>
                </article>
                <article className="summary-card glow-ok">
                    <p className="eyebrow">Architecture</p>
                    <h3>Electron + React + Node</h3>
                    <p>{tr('Interface locale en Electron, serveur API embarque, broker MQTT local optionnel et base SQLite persistante.', 'Local Electron interface, embedded API server, optional local MQTT broker and persistent SQLite database.')}</p>
                </article>
                <article className="summary-card glow-warning">
                    <p className="eyebrow">Support</p>
                    <h3>{tr('Diagnostic local', 'Local diagnostics')}</h3>
                    <p>{tr('Consulte les logs Electron dans le dossier utilisateur pour analyser les problemes de ports, backend ou broker.', 'Check Electron logs in the user folder to analyze port, backend or broker issues.')}</p>
                </article>
                <article className="summary-card glow-ok">
                    <p className="eyebrow">Distribution</p>
                    <h3>{tr('Installateur NSIS', 'NSIS installer')}</h3>
                    <p>{tr('Installeur Windows avec raccourcis bureau/menu demarrer et desinstallateur inclus.', 'Windows installer with desktop/start menu shortcuts and included uninstaller.')}</p>
                </article>
            </section>

            <section className="dashboard-grid dashboard-grid--wide">
                <section className="panel glow-ok">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">Modules</p>
                            <h2>{tr('Contenu livre', 'Delivered content')}</h2>
                        </div>
                    </div>
                    <ul className="settings-list">
                        <li>{tr('Tableau de bord industriel avec synoptique anime', 'Industrial dashboard with animated synoptic')}</li>
                        <li>{tr('Centre d alarmes, historique et exports', 'Alarm center, history and exports')}</li>
                        <li>{tr('Tutoriel integre et mode salle de controle', 'Integrated tutorial and control room mode')}</li>
                        <li>{tr('Parametrage langue, MQTT, seuils et roles', 'Language, MQTT, threshold and role settings')}</li>
                    </ul>
                </section>
                <section className="panel glow-warning">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">{tr('Chemins utiles', 'Useful paths')}</p>
                            <h2>{tr('Exploitation locale', 'Local operation')}</h2>
                        </div>
                    </div>
                    <ul className="settings-list">
                        <li>{tr('API locale', 'Local API')} : <code>http://127.0.0.1:3000/api</code></li>
                        <li>{tr('Interface locale', 'Local interface')} : <code>http://127.0.0.1:3001</code></li>
                        <li>SQLite : <code>backend/data/scada.sqlite</code></li>
                        <li>Logs Electron : dossier <code>userData/logs</code></li>
                    </ul>
                </section>
            </section>
        </div>
    );
};

export default AboutPage;
