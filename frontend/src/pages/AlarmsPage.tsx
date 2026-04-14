import React, { useEffect, useMemo, useRef, useState } from 'react';
import AlarmTimeline from '../components/AlarmTimeline';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { acknowledgeAlarmAsync, fetchAlarmsAsync } from '../store/slices/alarmSlice';
import { buildAlarmTimeline, getAlarmPriority, type AlarmPriority } from '../utils/scada';

const priorityLabels: Record<AlarmPriority | 'all', string> = {
    all: 'All',
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

const AlarmsPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { alarms } = useAppSelector((state) => state.alarm);
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

    return (
        <div className="dashboard-shell">
            <section className="hero-card">
                <div>
                    <p className="eyebrow">Alarm Center</p>
                    <h1>Active Alarm Management</h1>
                    <p className="hero-copy">Filter by priority, acknowledge events and inspect the 24-hour alarm intensity timeline.</p>
                </div>
                <div className="filter-row">
                    {(Object.keys(priorityLabels) as Array<AlarmPriority | 'all'>).map((key) => (
                        <button
                            key={key}
                            className={`btn ${filter === key ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter(key)}
                        >
                            {priorityLabels[key]}
                        </button>
                    ))}
                </div>
            </section>
            <section className="dashboard-grid dashboard-grid--wide">
                <section className="panel glow-alarm" data-tutorial="alarm-center">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">Live Alarms</p>
                            <h2>{filtered.length} event(s)</h2>
                        </div>
                    </div>
                    <ul className="alarm-list">
                        {filtered.map((alarm) => {
                            const priority = getAlarmPriority(alarm);
                            return (
                                <li key={alarm.id} className={`alarm-item priority-${priority}`}>
                                    <div>
                                        <strong>{alarm.description}</strong>
                                        <p className="muted">{priority.toUpperCase()} · {new Date(alarm.timestamp).toLocaleString()}</p>
                                    </div>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => dispatch(acknowledgeAlarmAsync(alarm.id))}
                                        disabled={alarm.acknowledged}
                                    >
                                        {alarm.acknowledged ? 'Acknowledged' : 'Acknowledge'}
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
