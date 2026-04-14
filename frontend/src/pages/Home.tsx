import React from 'react';
import Dashboard from '../components/Dashboard';
import { useI18n } from '../i18n';

const Home: React.FC = () => {
    const { t } = useI18n();

    return (
        <div>
            <h1>{t('home.title')}</h1>
            <Dashboard />
        </div>
    );
};

export default Home;
