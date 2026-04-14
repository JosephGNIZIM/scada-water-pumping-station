import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAlarmsAsync, acknowledgeAlarmAsync } from '../store/slices/alarmSlice';
import { useI18n } from '../i18n';
import { getAlarmPriority } from '../utils/scada';

const AlarmPanel: React.FC = () => {
    const dispatch = useAppDispatch();
    const { alarms, status, error } = useAppSelector((state) => state.alarm);
    const { t, formatDateTime } = useI18n();

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchAlarmsAsync());
        }
    }, [status, dispatch]);

    const handleAcknowledge = (alarmId: number) => {
        dispatch(acknowledgeAlarmAsync(alarmId));
    };

    if (status === 'loading') {
        return <div>{t('alarm.loading')}</div>;
    }

    if (status === 'failed') {
        return <div>{t('common.error')}: {error}</div>;
    }

    return (
        <section className="panel alarm-panel">
            <div className="panel-heading">
                <div>
                    <p className="eyebrow">{t('alarm.eyebrow')}</p>
                    <h2>{t('alarm.title')}</h2>
                </div>
                <button className="btn btn-ghost" onClick={() => dispatch(fetchAlarmsAsync())}>
                    {t('alarm.refresh')}
                </button>
            </div>
            {alarms.length === 0 ? (
                <p>{t('alarm.empty')}</p>
            ) : (
                <ul className="alarm-list">
                    {alarms.map(alarm => (
                        <li key={alarm.id} className={`alarm-item ${alarm.acknowledged ? 'is-acknowledged' : 'is-active'} priority-${getAlarmPriority(alarm)}`}>
                            <div>
                                <strong>{alarm.description}</strong>
                                <p className="muted">
                                    {alarm.type ?? t('alarm.general')} · {formatDateTime(alarm.timestamp)}
                                </p>
                            </div>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleAcknowledge(alarm.id)}
                                disabled={alarm.acknowledged}
                            >
                                {alarm.acknowledged ? t('alarm.acknowledged') : t('alarm.acknowledge')}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

export default AlarmPanel;
