import React from 'react';
import { Link } from 'react-router-dom';
import PumpStatus from './PumpStatus';
import SensorReadings from './SensorReadings';
import AlarmPanel from './AlarmPanel';
import { useI18n } from '../i18n';
import { useAppSelector } from '../store/hooks';
import Gauge from './Gauge';
import Sparkline from './Sparkline';
import SynopticView from './SynopticView';
import LineChartPanel from './LineChartPanel';
import { buildHealthScore, buildMultiSeries, getAlarmPriority, getSensorLabel, getSensorMax, getSensorUnit, makeSparklineData } from '../utils/scada';

const Dashboard: React.FC = () => {
    const { t } = useI18n();
    const readings = useAppSelector((state) => state.sensor.readings);
    const alarms = useAppSelector((state) => state.alarm.alarms);
    const pumpStatus = useAppSelector((state) => state.pump.status);
    const healthScore = buildHealthScore(readings, alarms);
    const activeAlarms = alarms.filter((alarm) => !alarm.acknowledged).length;
    const warningState = activeAlarms > 0 || healthScore < 75 ? 'glow-warning' : 'glow-ok';
    const pressureReading = readings.find((reading) => reading.type === 'line-pressure')?.value ?? 5.6;
    const flowValue = readings.find((reading) => reading.type === 'flow-rate')?.value ?? Number((pressureReading * 11.8).toFixed(1));
    const tankLevelA = readings.find((reading) => reading.type === 'tank1-level')?.value ?? readings.find((reading) => reading.type === 'water-level')?.value ?? 72;
    const tankLevelB = readings.find((reading) => reading.type === 'tank2-level')?.value ?? (tankLevelA - 8);

    return (
        <div className="dashboard-shell">
            <section className="hero-card fade-in">
                <div>
                    <p className="eyebrow">{t('dashboard.eyebrow')}</p>
                    <h1>{t('dashboard.title')}</h1>
                    <p className="hero-copy">
                        {t('dashboard.copy')}
                    </p>
                </div>
                <div className="hero-actions">
                    <Link className="btn btn-primary" to="/dashboard">{t('dashboard.overview')}</Link>
                    <Link className="btn btn-ghost" to="/settings">{t('dashboard.notes')}</Link>
                </div>
            </section>
            <section className="summary-grid fade-in">
                <article className={`summary-card ${warningState}`} data-tutorial="system-health">
                    <p className="eyebrow">System Health</p>
                    <h3>{healthScore}%</h3>
                    <p>{activeAlarms} active alarm(s), pump {pumpStatus}, sensors streaming live.</p>
                </article>
                <article className="summary-card glow-ok">
                    <p className="eyebrow">{t('dashboard.operations')}</p>
                    <h3>{t('dashboard.operationsTitle')}</h3>
                    <p>{t('dashboard.operationsText')}</p>
                </article>
                <article className="summary-card glow-ok">
                    <p className="eyebrow">{t('dashboard.telemetry')}</p>
                    <h3>{t('dashboard.telemetryTitle')}</h3>
                    <p>{t('dashboard.telemetryText')}</p>
                </article>
                <article className={`summary-card ${activeAlarms > 0 ? 'glow-alarm' : 'glow-ok'}`}>
                    <p className="eyebrow">{t('dashboard.alerts')}</p>
                    <h3>{t('dashboard.alertsTitle')}</h3>
                    <p>{t('dashboard.alertsText')}</p>
                </article>
            </section>
            <section className="panel glow-ok fade-in" data-tutorial="synoptic-preview">
                <div className="panel-heading">
                    <div>
                        <p className="eyebrow">Digital Twin</p>
                        <h2>Animated Plant Synoptic</h2>
                    </div>
                    <Link className="btn btn-ghost" to="/synoptic">Open Synoptic</Link>
                </div>
                <SynopticView
                    compact
                    primaryPumpRunning={pumpStatus === 'running'}
                    secondaryPumpRunning={pumpStatus === 'running'}
                    valves={[true, true, activeAlarms === 0]}
                    tankLevelA={tankLevelA}
                    tankLevelB={tankLevelB}
                    flowRate={flowValue}
                    waterState={activeAlarms > 0 ? 'alarm' : healthScore < 75 ? 'warning' : 'ok'}
                />
            </section>
            <section className="gauges-grid fade-in">
                {readings.map((reading) => (
                    <div key={reading.id} className="metric-stack">
                        <Gauge
                            label={getSensorLabel(reading.type)}
                            value={reading.value}
                            max={getSensorMax(reading.type)}
                            unit={getSensorUnit(reading.type)}
                            status={
                                reading.type === 'pump-temperature' && reading.value > 60
                                    ? 'alarm'
                                    : reading.type === 'line-pressure' && reading.value > 7
                                        ? 'warning'
                                        : 'ok'
                            }
                        />
                        <section className="panel metric-card">
                            <div className="panel-heading">
                                <div>
                                    <p className="eyebrow">Trend</p>
                                    <h2>{getSensorLabel(reading.type)}</h2>
                                </div>
                                <span className="metric-unit">{getSensorUnit(reading.type)}</span>
                            </div>
                            <Sparkline values={makeSparklineData(reading)} />
                        </section>
                    </div>
                ))}
                <div className="metric-stack">
                    <Gauge
                        label="Flow"
                        value={flowValue}
                        max={120}
                        unit="m3/h"
                        status={flowValue > 95 ? 'warning' : 'ok'}
                    />
                    <section className="panel metric-card">
                        <div className="panel-heading">
                            <div>
                                <p className="eyebrow">Trend</p>
                                <h2>Flow</h2>
                            </div>
                            <span className="metric-unit">m3/h</span>
                        </div>
                        <Sparkline values={Array.from({ length: 10 }, (_, index) => Number((flowValue - 4 + index * 0.9 + Math.sin(index) * 1.2).toFixed(1)))} />
                    </section>
                </div>
            </section>
            <LineChartPanel series={buildMultiSeries(readings)} title="Neon process trends" />
            <section className="dashboard-grid fade-in">
                <PumpStatus />
                <SensorReadings />
                <AlarmPanel />
            </section>
        </div>
    );
};

export default Dashboard;
