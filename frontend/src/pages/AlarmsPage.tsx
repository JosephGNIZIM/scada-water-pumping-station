import React, { useEffect, useMemo, useRef, useState } from 'react';
import AlarmTimeline from '../components/AlarmTimeline';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { acknowledgeAlarmAsync, fetchAlarmsAsync } from '../store/slices/alarmSlice';
import { buildAlarmTimeline, getAlarmPriority, getPriorityLabel, type AlarmPriority } from '../utils/scada';
import { useAuth } from '../auth/AuthContext';
import { deleteAlarm } from '../services/api';
import { useI18n } from '../i18n';

const priorities: Array<AlarmPriority | 'all'> = ['all', 'critical', 'high', 'medium', 'low'];

const AlarmsPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { alarms } = useAppSelector((state) => state.alarm);
    const { hasRole } = useAuth();
    const { tr, language, formatDateTime } = useI18n();
    const [filter, setFilter] = useState<AlarmPriority | 'all'>('all');
    const previousCriticalCount = useRef(0);

    useEffect(() => {
        dispatch(fetchAlarmsAsync());
    }, [dispatch]);

    const filtered = useMemo(
        () => alarms.filter((alarm) => filter === 'all' || getAlarmPriority(alarm) === filter),
        [alarms, filter],
    );

    useEffect(() => {
        const criticalCount = alarms.filter((alarm) => !alarm.acknowledged && getAlarmPriority(alarm) === 'critical').length;
        if (criticalCount > previousCriticalCount.current) {
            const context = new AudioContext();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = 'square';
            oscillator.frequency.value = 880;
            gain.gain.value = 0.03;
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.15);
        }
        previousCriticalCount.current = criticalCount;
    }, [alarms]);

    const canAcknowledge = hasRole(['ingenieur', 'technicien']);
    const canDelete = hasRole(['ingenieur']);

    return (
        <div className="dashboard-shell">
            <section className="hero-card">
                <div>
                    <p className="eyebrow">{tr('Centre alarmes', 'Alarm Center')}</p>
                    <h1>{tr('Gestion des alarmes actives', 'Active Alarm Management')}</h1>
                    <p className="hero-copy">{tr('Filtrez par priorite, acquittez les evenements et inspectez la chronologie d intensite sur 24 heures.', 'Filter by priority, acknowledge events and inspect the 24-hour alarm intensity timeline.')}</p>
                </div>
                <div className="filter-row">
                    {priorities.map((key) => (
                        <button
                            key={key}
                            className={`btn ${filter === key ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter(key)}
                        >
                            {getPriorityLabel(key, language)}
                        </button>
                    ))}
                </div>
            </section>
            <section className="dashboard-grid dashboard-grid--wide">
                <section className="panel glow-alarm" data-tutorial="alarm-center">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">{tr('Alarmes en direct', 'Live Alarms')}</p>
                            <h2>{filtered.length} {tr('evenement(s)', 'event(s)')}</h2>
                        </div>
                    </div>
                    <ul className="alarm-list">
                        {filtered.map((alarm) => {
                            const priority = getAlarmPriority(alarm);
                            return (
                                <li key={alarm.id} className={`alarm-item priority-${priority}`}>
                                    <div>
                                        <strong>{alarm.description}</strong>
                                        <p className="muted">{getPriorityLabel(priority, language).toUpperCase()} - {formatDateTime(alarm.timestamp)}</p>
                                    </div>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => dispatch(acknowledgeAlarmAsync(alarm.id))}
                                        disabled={!canAcknowledge || alarm.acknowledged}
                                        title={canAcknowledge ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}
                                    >
                                        {alarm.acknowledged ? tr('Acquittee', 'Acknowledged') : tr('Acquitter', 'Acknowledge')}
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={async () => {
                                            await deleteAlarm(alarm.id);
                                            dispatch(fetchAlarmsAsync());
                                        }}
                                        disabled={!canDelete}
                                        title={canDelete ? '' : 'Acces reserve aux Ingenieurs'}
                                    >
                                        Supprimer
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>
                <AlarmTimeline values={buildAlarmTimeline(alarms)} />
            </section>
        </div>
    );
};

export default AlarmsPage;
