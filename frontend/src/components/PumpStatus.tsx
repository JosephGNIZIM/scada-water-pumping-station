import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPumpStatusAsync, startPumpAsync, stopPumpAsync } from '../store/slices/pumpSlice';
import { useI18n } from '../i18n';
import { useAuth } from '../auth/AuthContext';

const PumpStatus: React.FC = () => {
    const dispatch = useAppDispatch();
    const { id, status, lastUpdated, loading, commandLoading, error } = useAppSelector((state) => state.pump);
    const { t, formatDateTime } = useI18n();
    const { hasRole } = useAuth();
    const canControl = hasRole(['ingenieur', 'technicien']);

    useEffect(() => {
        dispatch(fetchPumpStatusAsync());
    }, [dispatch]);

    const handleStart = () => {
        dispatch(startPumpAsync(id));
    };

    const handleStop = () => {
        dispatch(stopPumpAsync(id));
    };

    if (loading) {
        return <div>{t('pump.loading')}</div>;
    }

    if (error) {
        return <div>{t('common.error')}: {error}</div>;
    }

    return (
        <section className={`panel pump-status ${status === 'running' ? 'glow-ok' : 'glow-warning'}`} data-tutorial="pump-control">
            <div className="panel-heading">
                <div>
                    <p className="eyebrow">{t('pump.eyebrow')}</p>
                    <h2>{t('pump.title')} #{id}</h2>
                </div>
                <span className={`status-pill ${status}`}>{t(`pump.${status}`)}</span>
            </div>
            <p className="muted">{t('pump.lastUpdated')}: {formatDateTime(lastUpdated)}</p>
            <div className="action-row">
                <button className="btn btn-primary" onClick={handleStart} disabled={!canControl || commandLoading || status === 'running'} title={canControl ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>
                    {t('pump.start')}
                </button>
                <button className="btn btn-secondary" onClick={handleStop} disabled={!canControl || commandLoading || status === 'stopped'} title={canControl ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>
                    {t('pump.stop')}
                </button>
            </div>
        </section>
    );
};

export default PumpStatus;
