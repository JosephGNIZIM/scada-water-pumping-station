import React from 'react';
import PumpStationLogo from '../components/PumpStationLogo';

const AboutPage: React.FC = () => {
    return (
        <div className="dashboard-shell">
            <section className="hero-card">
                <div className="about-hero">
                    <div className="about-logo-wrap">
                        <PumpStationLogo className="about-logo" />
                    </div>
                    <div>
                        <p className="eyebrow">A propos</p>
                        <h1>SCADA Water Station</h1>
                        <p className="hero-copy">
                            Poste de supervision industriel pour le pilotage des pompes, la lecture des capteurs, la gestion des alarmes et l export des rapports d exploitation.
                        </p>
                    </div>
                </div>
            </section>

            <section className="summary-grid">
                <article className="summary-card glow-ok">
                    <p className="eyebrow">Version</p>
                    <h3>1.0.0</h3>
                    <p>Application desktop Windows embarquant frontend React, backend Node/Express et stockage SQLite.</p>
                </article>
                <article className="summary-card glow-ok">
                    <p className="eyebrow">Architecture</p>
                    <h3>Electron + React + Node</h3>
                    <p>Interface locale en Electron, serveur API embarque, broker MQTT local optionnel et base SQLite persistante.</p>
                </article>
                <article className="summary-card glow-warning">
                    <p className="eyebrow">Support</p>
                    <h3>Diagnostic local</h3>
                    <p>Consulte les logs Electron dans le dossier utilisateur pour analyser les problemes de ports, backend ou broker.</p>
                </article>
                <article className="summary-card glow-ok">
                    <p className="eyebrow">Distribution</p>
                    <h3>Installateur NSIS</h3>
                    <p>Installeur Windows avec raccourcis bureau/menu demarrer et desinstallateur inclus.</p>
                </article>
            </section>

            <section className="dashboard-grid dashboard-grid--wide">
                <section className="panel glow-ok">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">Modules</p>
                            <h2>Contenu livre</h2>
                        </div>
                    </div>
                    <ul className="settings-list">
                        <li>Tableau de bord dark industriel avec synoptique anime</li>
                        <li>Centre d alarmes, historique et exports</li>
                        <li>Tutoriel integre et mode salle de controle</li>
                        <li>Parametrage langue, MQTT, seuils et roles</li>
                    </ul>
                </section>
                <section className="panel glow-warning">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">Chemins utiles</p>
                            <h2>Exploitation locale</h2>
                        </div>
                    </div>
                    <ul className="settings-list">
                        <li>API locale : <code>http://127.0.0.1:3000/api</code></li>
                        <li>Interface locale : <code>http://127.0.0.1:3001</code></li>
                        <li>SQLite : <code>backend/data/scada.sqlite</code></li>
                        <li>Logs Electron : dossier <code>userData/logs</code></li>
                    </ul>
                </section>
            </section>
        </div>
    );
};

export default AboutPage;
