import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'fr' | 'en';

type Messages = Record<string, string>;

const messages: Record<Language, Messages> = {
    fr: {
        'app.tagline': 'Exploitation des utilites',
        'app.title': 'Station de pompage d eau SCADA',
        'nav.home': 'Accueil',
        'nav.dashboard': 'Tableau de bord',
        'nav.pump': 'Pompe',
        'nav.sensors': 'Capteurs',
        'nav.alarms': 'Alarmes',
        'nav.settings': 'Parametres',
        'home.title': 'Station de pompage d eau SCADA',
        'dashboard.eyebrow': 'Console SCADA',
        'dashboard.title': 'Tableau de bord de la station de pompage',
        'dashboard.copy': 'Surveillez l etat de la pompe, consultez l instrumentation en direct et acquittez les alarmes operationnelles depuis une seule interface.',
        'dashboard.overview': 'Vue d ensemble',
        'dashboard.notes': 'Notes systeme',
        'dashboard.operations': 'Operations',
        'dashboard.operationsTitle': '1 pompe active',
        'dashboard.operationsText': 'Commande demarrage/arret avec etat persiste.',
        'dashboard.telemetry': 'Mesures',
        'dashboard.telemetryTitle': '3 capteurs actifs',
        'dashboard.telemetryText': 'Mesures sauvegardees dans SQLite et mises a jour a chaque rafraichissement.',
        'dashboard.alerts': 'Alertes',
        'dashboard.alertsTitle': 'Suivi des acquittements',
        'dashboard.alertsText': 'L historique des alarmes reste visible au lieu de disparaitre de l interface.',
        'pump.loading': 'Chargement de l etat de la pompe...',
        'common.error': 'Erreur',
        'pump.eyebrow': 'Commande pompe',
        'pump.title': 'Pompe',
        'pump.lastUpdated': 'Derniere mise a jour',
        'pump.start': 'Demarrer la pompe',
        'pump.stop': 'Arreter la pompe',
        'pump.running': 'en marche',
        'pump.stopped': 'arretee',
        'pump.faulted': 'defaut',
        'sensor.loading': 'Chargement des mesures capteurs...',
        'sensor.eyebrow': 'Instrumentation',
        'sensor.title': 'Mesures capteurs',
        'sensor.refresh': 'Rafraichir',
        'sensor.empty': 'Aucune mesure capteur disponible',
        'sensor.timestamp': 'Horodatage',
        'alarm.loading': 'Chargement des alarmes...',
        'alarm.eyebrow': 'Securite',
        'alarm.title': 'Panneau d alarmes',
        'alarm.refresh': 'Rafraichir',
        'alarm.empty': 'Aucune alarme active',
        'alarm.acknowledge': 'Acquitter',
        'alarm.acknowledged': 'Acquittee',
        'alarm.general': 'generale',
        'settings.eyebrow': 'Configuration',
        'settings.title': 'Notes systeme',
        'settings.copy': 'Le frontend communique avec le backend via le proxy Vite sur /api, et le backend persiste les donnees pompes, capteurs et alarmes dans SQLite.',
        'settings.frontend': 'Frontend',
        'settings.frontendTitle': 'Vite sur le port 3001',
        'settings.frontendText': 'Le trafic de developpement est proxy vers le backend sur le port 3000.',
        'settings.backend': 'Backend',
        'settings.backendTitle': 'Express sur le port 3000',
        'settings.backendText': 'L API initialise des donnees de depart si la base SQLite est vide.',
        'settings.storage': 'Stockage',
        'settings.storageTitle': 'Fichier SQLite',
        'settings.storageText': 'Le backend stocke les donnees dans backend/data/scada.sqlite sauf si DB_STORAGE est defini.',
        'settings.language': 'Langue',
        'settings.languageTitle': 'Langue de l application',
        'settings.languageText': 'Choisissez la langue de l interface utilisateur.',
        'settings.lang.fr': 'Francais',
        'settings.lang.en': 'Anglais',
    },
    en: {
        'app.tagline': 'Utility Operations',
        'app.title': 'SCADA Water Pumping Station',
        'nav.home': 'Home',
        'nav.dashboard': 'Dashboard',
        'nav.pump': 'Pump',
        'nav.sensors': 'Sensors',
        'nav.alarms': 'Alarms',
        'nav.settings': 'Settings',
        'home.title': 'SCADA Water Pumping Station',
        'dashboard.eyebrow': 'SCADA Console',
        'dashboard.title': 'Water Pumping Station Dashboard',
        'dashboard.copy': 'Monitor pump state, review live instrumentation, and acknowledge operational alarms from one control surface.',
        'dashboard.overview': 'Overview',
        'dashboard.notes': 'System Notes',
        'dashboard.operations': 'Operations',
        'dashboard.operationsTitle': '1 active pump',
        'dashboard.operationsText': 'Direct start/stop control with persisted state.',
        'dashboard.telemetry': 'Telemetry',
        'dashboard.telemetryTitle': '3 live sensors',
        'dashboard.telemetryText': 'SQLite-backed readings updated on each refresh cycle.',
        'dashboard.alerts': 'Alerts',
        'dashboard.alertsTitle': 'Acknowledgement tracking',
        'dashboard.alertsText': 'Alarm history remains durable instead of disappearing from the UI.',
        'pump.loading': 'Loading pump status...',
        'common.error': 'Error',
        'pump.eyebrow': 'Pump Control',
        'pump.title': 'Pump',
        'pump.lastUpdated': 'Last updated',
        'pump.start': 'Start Pump',
        'pump.stop': 'Stop Pump',
        'pump.running': 'running',
        'pump.stopped': 'stopped',
        'pump.faulted': 'faulted',
        'sensor.loading': 'Loading sensor readings...',
        'sensor.eyebrow': 'Instrumentation',
        'sensor.title': 'Sensor Readings',
        'sensor.refresh': 'Refresh',
        'sensor.empty': 'No sensor readings available',
        'sensor.timestamp': 'Timestamp',
        'alarm.loading': 'Loading alarms...',
        'alarm.eyebrow': 'Safety',
        'alarm.title': 'Alarm Panel',
        'alarm.refresh': 'Refresh',
        'alarm.empty': 'No active alarms',
        'alarm.acknowledge': 'Acknowledge',
        'alarm.acknowledged': 'Acknowledged',
        'alarm.general': 'general',
        'settings.eyebrow': 'Configuration',
        'settings.title': 'System Notes',
        'settings.copy': 'The frontend talks to the backend through the Vite proxy on /api, and the backend persists pump, sensor, and alarm data in SQLite.',
        'settings.frontend': 'Frontend',
        'settings.frontendTitle': 'Vite on port 3001',
        'settings.frontendText': 'Development traffic is proxied to the backend on port 3000.',
        'settings.backend': 'Backend',
        'settings.backendTitle': 'Express on port 3000',
        'settings.backendText': 'The API seeds initial operational data if the SQLite database is empty.',
        'settings.storage': 'Storage',
        'settings.storageTitle': 'SQLite file',
        'settings.storageText': 'The backend stores data in backend/data/scada.sqlite unless DB_STORAGE is set.',
        'settings.language': 'Language',
        'settings.languageTitle': 'Application language',
        'settings.languageText': 'Choose the language used by the interface.',
        'settings.lang.fr': 'French',
        'settings.lang.en': 'English',
    },
};

interface I18nContextValue {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: string) => string;
    formatDateTime: (value: string | number | Date) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const STORAGE_KEY = 'app-language';

const getInitialLanguage = (): Language => {
    if (typeof window === 'undefined') {
        return 'fr';
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'fr' ? stored : 'fr';
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>(getInitialLanguage);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, language);
        document.documentElement.lang = language;
    }, [language]);

    const value = useMemo<I18nContextValue>(() => ({
        language,
        setLanguage,
        t: (key: string) => messages[language][key] ?? key,
        formatDateTime: (value: string | number | Date) =>
            new Date(value).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US'),
    }), [language]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
    const context = useContext(I18nContext);

    if (!context) {
        throw new Error('useI18n must be used within I18nProvider');
    }

    return context;
};
