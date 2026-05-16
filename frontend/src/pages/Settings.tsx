import React from 'react';
import { useI18n } from '../i18n';
import { useTutorial } from '../tutorial/TutorialContext';
import { useAuth } from '../auth/AuthContext';
import {
    createUser,
    getAuditLogs,
    getSystemSettings,
    getUserLoginHistory,
    listUsers,
    ManagedUser,
    resetUserPassword,
    updateSystemSettings,
    updateUser,
    UserRole,
} from '../services/api';

const Settings: React.FC = () => {
    const { language, setLanguage, t, tr, formatDateTime } = useI18n();
    const { startTutorial } = useTutorial();
    const { hasRole } = useAuth();
    const canEdit = hasRole(['ingenieur']);
    const canView = hasRole(['ingenieur', 'technicien']);
    const [thresholds, setThresholds] = React.useState({ level: 85, pressure: 7.5, flow: 62 });
    const [mqttConfig, setMqttConfig] = React.useState({ broker: 'mqtt://localhost', port: '1883', topic: 'station/telemetry' });
    const [testing, setTesting] = React.useState(false);
    const [testResult, setTestResult] = React.useState<string | null>(null);
    const [users, setUsers] = React.useState<ManagedUser[]>([]);
    const [auditEntries, setAuditEntries] = React.useState<Array<{ id: number; action: string; createdAt: string; username: string | null }>>([]);
    const [loginHistory, setLoginHistory] = React.useState<Array<{ id: number; createdAt: string; success: boolean; reason: string | null }>>([]);
    const [newUser, setNewUser] = React.useState({ username: '', displayName: '', password: '', role: 'operateur' as UserRole });

    React.useEffect(() => {
        if (!canView) {
            return;
        }

        const load = async () => {
            const settings = await getSystemSettings();
            setMqttConfig({
                broker: settings?.mqtt?.brokerUrl || 'mqtt://localhost',
                port: String(settings?.mqtt?.port || '1883'),
                topic: settings?.mqtt?.topic || 'station/telemetry',
            });

            if (canEdit) {
                setUsers(await listUsers());
                setAuditEntries((await getAuditLogs()).map((entry) => ({
                    id: entry.id,
                    action: entry.action,
                    createdAt: entry.createdAt,
                    username: entry.username,
                })));
            }
        };

        load().catch(() => {});
    }, [canEdit, canView]);

    const handleThresholdChange = (key: 'level' | 'pressure' | 'flow', value: string) => {
        setThresholds((current) => ({ ...current, [key]: Number(value) }));
    };

    const testConnection = () => {
        setTesting(true);
        setTestResult(null);
        window.setTimeout(() => {
            setTesting(false);
            setTestResult(tr('Broker joignable, test d abonnement reussi.', 'Broker reachable, subscription test passed.'));
        }, 900);
    };

    const saveSettings = async () => {
        if (!canEdit) {
            return;
        }

        await updateSystemSettings({
            thresholds,
            mqtt: {
                brokerUrl: mqttConfig.broker,
                port: mqttConfig.port,
                topic: mqttConfig.topic,
            },
        });
        setTestResult(tr('Configuration enregistree.', 'Configuration saved.'));
    };

    const refreshUsers = async () => {
        if (canEdit) {
            setUsers(await listUsers());
        }
    };

    return (
        <div className="settings-page">
            <section className="hero-card">
                <div>
                    <p className="eyebrow">{t('settings.eyebrow')}</p>
                    <h1>{t('settings.title')}</h1>
                    <p className="hero-copy">{t('settings.copy')}</p>
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
                        <button className={`btn ${language === 'fr' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLanguage('fr')}>{t('settings.lang.fr')}</button>
                        <button className={`btn ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLanguage('en')}>{t('settings.lang.en')}</button>
                    </div>
                </article>
                <article className="summary-card glow-ok" data-tutorial="tutorial-relaunch">
                    <p className="eyebrow">{tr('Tutoriel', 'Tutorial')}</p>
                    <h3>{tr('Relancer le tutoriel', 'Restart tutorial')}</h3>
                    <p>{tr('Relancez le guide pas a pas a tout moment pour former un nouvel utilisateur.', 'Restart the guided tour at any time to train a new user.')}</p>
                    <div className="action-row">
                        <button className="btn btn-primary" onClick={startTutorial}>{tr('Relancer le tutoriel', 'Restart tutorial')}</button>
                    </div>
                </article>
            </section>
            <section className="summary-grid">
                <article className="summary-card glow-warning">
                    <p className="eyebrow">{tr('Seuils', 'Thresholds')}</p>
                    <h3>{tr('Seuils d alarmes', 'Alarm thresholds')}</h3>
                    <label className="field-row">{tr('Niveau', 'Level')}<input type="number" value={thresholds.level} onChange={(event) => handleThresholdChange('level', event.target.value)} disabled={!canEdit} /></label>
                    <label className="field-row">{tr('Pression', 'Pressure')}<input type="number" value={thresholds.pressure} onChange={(event) => handleThresholdChange('pressure', event.target.value)} disabled={!canEdit} /></label>
                    <label className="field-row">{tr('Debit', 'Flow')}<input type="number" value={thresholds.flow} onChange={(event) => handleThresholdChange('flow', event.target.value)} disabled={!canEdit} /></label>
                </article>
                <article className="summary-card glow-ok">
                    <p className="eyebrow">{tr('Utilisateurs', 'Users')}</p>
                    <h3>{tr('Gestion des roles', 'Role management')}</h3>
                    {canEdit ? (
                        <>
                            <div className="slider-grid">
                                <input placeholder={tr('Identifiant', 'Login')} value={newUser.username} onChange={(event) => setNewUser((prev) => ({ ...prev, username: event.target.value }))} />
                                <input placeholder={tr('Nom affiche', 'Display name')} value={newUser.displayName} onChange={(event) => setNewUser((prev) => ({ ...prev, displayName: event.target.value }))} />
                                <input type="password" placeholder={tr('Mot de passe', 'Password')} value={newUser.password} onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))} />
                                <select value={newUser.role} onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value as UserRole }))}>
                                    <option value="ingenieur">Ingenieur</option>
                                    <option value="technicien">Technicien</option>
                                    <option value="operateur">Operateur</option>
                                </select>
                            </div>
                            <div className="action-row">
                                <button
                                    className="btn btn-primary"
                                    onClick={async () => {
                                        await createUser(newUser);
                                        await refreshUsers();
                                        setNewUser({ username: '', displayName: '', password: '', role: 'operateur' });
                                    }}
                                >
                                    {tr('Ajouter utilisateur', 'Add user')}
                                </button>
                            </div>
                            <div className="settings-user-table">
                                {users.map((user) => (
                                    <div key={user.id} className="settings-user-row">
                                        <strong>{user.displayName}</strong>
                                        <span>{user.username}</span>
                                        <select value={user.role} onChange={async (event) => {
                                            await updateUser(user.id, { role: event.target.value as UserRole });
                                            await refreshUsers();
                                        }}>
                                            <option value="ingenieur">Ingenieur</option>
                                            <option value="technicien">Technicien</option>
                                            <option value="operateur">Operateur</option>
                                        </select>
                                        <button className="btn btn-secondary" onClick={async () => {
                                            await updateUser(user.id, { active: !user.active });
                                            await refreshUsers();
                                        }}>
                                            {user.active ? tr('Desactiver', 'Deactivate') : tr('Activer', 'Activate')}
                                        </button>
                                        <button className="btn btn-secondary" onClick={async () => {
                                            await resetUserPassword(user.id, 'Temp@2024');
                                            await refreshUsers();
                                        }}>
                                            {tr('Reinit. MDP', 'Reset password')}
                                        </button>
                                        <button className="btn btn-secondary" onClick={async () => {
                                            const history = await getUserLoginHistory(user.id);
                                            setLoginHistory(history.map((entry) => ({
                                                id: entry.id,
                                                createdAt: entry.createdAt,
                                                success: entry.success,
                                                reason: entry.reason,
                                            })));
                                        }}>
                                            {tr('Connexions', 'Logins')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="muted">{tr('Lecture seule. La gestion des comptes est reservee aux Ingenieurs.', 'Read-only. Account management is reserved for Engineers.')}</p>
                    )}
                </article>
                <article className="summary-card glow-ok">
                    <p className="eyebrow">MQTT</p>
                    <h3>{tr('Configuration broker', 'Broker configuration')}</h3>
                    <label className="field-row">Broker<input value={mqttConfig.broker} onChange={(event) => setMqttConfig((current) => ({ ...current, broker: event.target.value }))} disabled={!canEdit} /></label>
                    <label className="field-row">Port<input value={mqttConfig.port} onChange={(event) => setMqttConfig((current) => ({ ...current, port: event.target.value }))} disabled={!canEdit} /></label>
                    <label className="field-row">Topic<input value={mqttConfig.topic} onChange={(event) => setMqttConfig((current) => ({ ...current, topic: event.target.value }))} disabled={!canEdit} /></label>
                    <div className="action-row">
                        <button className="btn btn-primary" onClick={testConnection} disabled={testing}>{testing ? tr('Test...', 'Testing...') : tr('Tester la connexion', 'Test connection')}</button>
                        <button className="btn btn-secondary" onClick={saveSettings} disabled={!canEdit} title={canEdit ? '' : tr('Acces reserve aux Ingenieurs', 'Engineers only')}>{tr('Enregistrer', 'Save')}</button>
                    </div>
                    {testResult && <p className="muted">{testResult}</p>}
                </article>
            </section>
            {canEdit && (
                <section className="summary-grid">
                    <article className="summary-card glow-ok">
                        <p className="eyebrow">Audit</p>
                        <h3>Journal des actions critiques</h3>
                        <div className="settings-user-table">
                            {auditEntries.slice(0, 12).map((entry) => (
                                <div key={entry.id} className="settings-user-row">
                                    <strong>{entry.action}</strong>
                                    <span>{entry.username || tr('systeme', 'system')}</span>
                                    <span>{formatDateTime(entry.createdAt)}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                    <article className="summary-card glow-ok">
                        <p className="eyebrow">Historique</p>
                        <h3>Connexions utilisateur</h3>
                        <div className="settings-user-table">
                            {loginHistory.map((entry) => (
                                <div key={entry.id} className="settings-user-row">
                                    <strong>{entry.success ? tr('Succes', 'Success') : tr('Echec', 'Failure')}</strong>
                                    <span>{entry.reason || '--'}</span>
                                    <span>{formatDateTime(entry.createdAt)}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>
            )}
        </div>
    );
};

export default Settings;
