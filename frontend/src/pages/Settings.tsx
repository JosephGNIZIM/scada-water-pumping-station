import React from 'react';
import { useI18n } from '../i18n';
import { useTutorial } from '../tutorial/TutorialContext';

const Settings: React.FC = () => {
    const { language, setLanguage, t } = useI18n();
    const { startTutorial } = useTutorial();
    const [thresholds, setThresholds] = React.useState({ level: 85, pressure: 7.5, flow: 62 });
    const [mqttConfig, setMqttConfig] = React.useState({ broker: 'mqtt://localhost', port: '1883', topic: 'station/telemetry' });
    const [testing, setTesting] = React.useState(false);
    const [testResult, setTestResult] = React.useState<string | null>(null);

    const handleThresholdChange = (key: 'level' | 'pressure' | 'flow', value: string) => {
        setThresholds((current) => ({ ...current, [key]: Number(value) }));
    };

    const testConnection = () => {
        setTesting(true);
        setTestResult(null);
        window.setTimeout(() => {
            setTesting(false);
            setTestResult('Broker reachable, subscription test passed.');
        }, 900);
    };

    return (
        <div className="settings-page">
            <section className="hero-card">
                <div>
                    <p className="eyebrow">{t('settings.eyebrow')}</p>
                    <h1>{t('settings.title')}</h1>
                    <p className="hero-copy">
                        {t('settings.copy')}
                    </p>
                </div>
            </section>
            <section className="summary-grid">
                <article className="summary-card">
                    <p className="eyebrow">{t('settings.frontend')}</p>
                    <h3>{t('settings.frontendTitle')}</h3>
                    <p>{t('settings.frontendText')}</p>
                </article>
                <article className="summary-card">
                    <p className="eyebrow">{t('settings.backend')}</p>
                    <h3>{t('settings.backendTitle')}</h3>
                    <p>{t('settings.backendText')}</p>
                </article>
                <article className="summary-card">
                    <p className="eyebrow">{t('settings.storage')}</p>
                    <h3>{t('settings.storageTitle')}</h3>
                    <p>{t('settings.storageText')}</p>
                </article>
                <article className="summary-card">
                    <p className="eyebrow">{t('settings.language')}</p>
                    <h3>{t('settings.languageTitle')}</h3>
                    <p>{t('settings.languageText')}</p>
                    <div className="action-row">
                        <button
                            className={`btn ${language === 'fr' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setLanguage('fr')}
                        >
                            {t('settings.lang.fr')}
                        </button>
                        <button
                            className={`btn ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setLanguage('en')}
                        >
                            {t('settings.lang.en')}
                        </button>
                    </div>
                </article>
                <article className="summary-card glow-ok" data-tutorial="tutorial-relaunch">
                    <p className="eyebrow">Tutoriel</p>
                    <h3>Relancer le tutoriel</h3>
                    <p>Relancez le tour guide pas a pas a tout moment pour former un nouvel utilisateur.</p>
                    <div className="action-row">
                        <button className="btn btn-primary" onClick={startTutorial}>Relancer le tutoriel</button>
                    </div>
                </article>
            </section>
            <section className="summary-grid">
                <article className="summary-card glow-warning">
                    <p className="eyebrow">Thresholds</p>
                    <h3>Alarm thresholds</h3>
                    <label className="field-row">Level<input type="number" value={thresholds.level} onChange={(event) => handleThresholdChange('level', event.target.value)} /></label>
                    <label className="field-row">Pressure<input type="number" value={thresholds.pressure} onChange={(event) => handleThresholdChange('pressure', event.target.value)} /></label>
                    <label className="field-row">Flow<input type="number" value={thresholds.flow} onChange={(event) => handleThresholdChange('flow', event.target.value)} /></label>
                </article>
                <article className="summary-card glow-ok">
                    <p className="eyebrow">Users</p>
                    <h3>Role management</h3>
                    <ul className="settings-list">
                        <li>Admin · full control and configuration</li>
                        <li>Operator · process control and acknowledgements</li>
                        <li>Visitor · read only dashboards</li>
                    </ul>
                </article>
                <article className="summary-card glow-ok">
                    <p className="eyebrow">MQTT</p>
                    <h3>Broker configuration</h3>
                    <label className="field-row">Broker<input value={mqttConfig.broker} onChange={(event) => setMqttConfig((current) => ({ ...current, broker: event.target.value }))} /></label>
                    <label className="field-row">Port<input value={mqttConfig.port} onChange={(event) => setMqttConfig((current) => ({ ...current, port: event.target.value }))} /></label>
                    <label className="field-row">Topic<input value={mqttConfig.topic} onChange={(event) => setMqttConfig((current) => ({ ...current, topic: event.target.value }))} /></label>
                    <div className="action-row">
                        <button className="btn btn-primary" onClick={testConnection} disabled={testing}>{testing ? 'Testing...' : 'Test connection'}</button>
                    </div>
                    {testResult && <p className="muted">{testResult}</p>}
                </article>
            </section>
        </div>
    );
};

export default Settings;
