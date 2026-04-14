import React, { useEffect, useMemo, useState } from 'react';
import LineChartPanel from '../components/LineChartPanel';
import SynopticView from '../components/SynopticView';
import {
    connectRealEquipment,
    injectSimulationFault,
    loadSimulationScenario,
    pauseSimulation,
    resetSimulation,
    startSimulation,
    updateSimulationSettings,
} from '../services/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAlarmsAsync } from '../store/slices/alarmSlice';
import { fetchPumpStatusAsync } from '../store/slices/pumpSlice';
import {
    fetchSimulationReportAsync,
    fetchSimulationScenariosAsync,
    fetchSimulationStateAsync,
} from '../store/slices/simulationSlice';
import { fetchSensorReadingsAsync } from '../store/slices/sensorSlice';

const speedOptions = [1, 5, 10, 60];

const SimulationPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const simulationState = useAppSelector((state) => state.simulation.state);
    const scenarios = useAppSelector((state) => state.simulation.scenarios);
    const report = useAppSelector((state) => state.simulation.report);
    const [settingsDraft, setSettingsDraft] = useState({
        inletFlow: 30,
        initialTank1Level: 50,
        initialTank2Level: 50,
        networkPressure: 3.8,
    });

    const syncEverything = React.useCallback(() => {
        dispatch(fetchSimulationStateAsync());
        dispatch(fetchSimulationScenariosAsync());
        dispatch(fetchSimulationReportAsync());
        dispatch(fetchPumpStatusAsync());
        dispatch(fetchSensorReadingsAsync());
        dispatch(fetchAlarmsAsync());
    }, [dispatch]);

    useEffect(() => {
        syncEverything();
        const timer = window.setInterval(syncEverything, 1000);
        return () => window.clearInterval(timer);
    }, [syncEverything]);

    useEffect(() => {
        if (simulationState) {
            setSettingsDraft(simulationState.settings);
        }
    }, [simulationState?.settings.inletFlow, simulationState?.settings.initialTank1Level, simulationState?.settings.initialTank2Level, simulationState?.settings.networkPressure]);

    const handleAction = async (action: () => Promise<unknown>) => {
        await action();
        syncEverything();
    };

    const chartSeries = useMemo(() => {
        const history = simulationState?.history ?? [];
        return [
            { label: 'Bac 1', color: '#00d4ff', values: history.map((point) => point.tank1Level).slice(-60) },
            { label: 'Bac 2', color: '#ff9f1c', values: history.map((point) => point.tank2Level).slice(-60) },
        ];
    }, [simulationState?.history]);

    const pressureFlowSeries = useMemo(() => {
        const history = simulationState?.history ?? [];
        return [
            { label: 'Pression', color: '#00ff88', values: history.map((point) => point.pressure).slice(-60) },
            { label: 'Debit', color: '#ff4d6d', values: history.map((point) => point.flow).slice(-60) },
        ];
    }, [simulationState?.history]);

    const energySeries = useMemo(() => {
        const history = simulationState?.history ?? [];
        return [
            { label: 'Energie', color: '#ffd166', values: history.map((point) => point.energy).slice(-60) },
        ];
    }, [simulationState?.history]);

    const waterStatus = simulationState?.alarmCount
        ? 'alarm'
        : (simulationState?.pumps.some((pump) => pump.status === 'faulted') ? 'warning' : 'ok');

    return (
        <div className="dashboard-shell simulation-page">
            <section className="hero-card simulation-hero">
                <div>
                    <p className="eyebrow">Simulation</p>
                    <h1>Station de pompage virtuelle complete</h1>
                    <p className="hero-copy">
                        Mode bac a bac, actionneurs progressifs, bruit capteurs, pannes injectables et rapport de fin de simulation.
                    </p>
                </div>
                <div className="simulation-hero-actions">
                    <span className={`live-badge ${simulationState?.mode === 'simulation' ? 'live-badge--sim' : ''}`}>
                        {simulationState?.mode === 'simulation' ? 'MODE SIMULATION' : 'ESP32 REEL'}
                    </span>
                    <span className={`comm-badge ${simulationState?.communicationOk ? 'comm-badge--ok' : 'comm-badge--down'}`}>
                        {simulationState?.communicationOk ? 'MQTT CONNECTE' : 'MQTT COUPE'}
                    </span>
                    <button className="btn btn-secondary" onClick={() => handleAction(() => connectRealEquipment())}>
                        Connecter ESP32 reel
                    </button>
                    <a className="btn btn-primary" href="/api/simulation/report/pdf" target="_blank" rel="noreferrer">
                        Export PDF
                    </a>
                </div>
            </section>

            <section className="simulation-grid">
                <section className="panel glow-ok">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">Moteur</p>
                            <h2>Pilotage simulation</h2>
                        </div>
                    </div>
                    <div className="action-row">
                        <button className="btn btn-primary" onClick={() => handleAction(() => startSimulation(simulationState?.speed ?? 1))}>
                            START
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleAction(() => pauseSimulation())}>
                            PAUSE
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleAction(() => resetSimulation())}>
                            RESET
                        </button>
                    </div>
                    <div className="speed-row">
                        {speedOptions.map((speed) => (
                            <button
                                key={speed}
                                className={`btn ${simulationState?.speed === speed ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => handleAction(() => updateSimulationSettings({ speed }))}
                            >
                                x{speed}
                            </button>
                        ))}
                    </div>
                    <div className="simulation-kpis">
                        <article className="summary-card glow-ok">
                            <p className="eyebrow">Duree</p>
                            <h3>{new Date((simulationState?.durationSeconds ?? 0) * 1000).toISOString().slice(11, 19)}</h3>
                        </article>
                        <article className="summary-card glow-warning">
                            <p className="eyebrow">Alarmes</p>
                            <h3>{simulationState?.alarmCount ?? 0}</h3>
                        </article>
                        <article className="summary-card glow-ok">
                            <p className="eyebrow">Energie</p>
                            <h3>{(simulationState?.totalEnergyKwh ?? 0).toFixed(2)} kWh</h3>
                        </article>
                    </div>
                </section>

                <section className="panel glow-ok">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">Reglages</p>
                            <h2>Entrees du procede</h2>
                        </div>
                    </div>
                    <div className="slider-grid">
                        <label className="field-row">
                            Debit entree d eau: {settingsDraft.inletFlow} L/min
                            <input type="range" min="0" max="100" value={settingsDraft.inletFlow} onChange={(event) => setSettingsDraft((prev) => ({ ...prev, inletFlow: Number(event.target.value) }))} />
                        </label>
                        <label className="field-row">
                            Niveau initial bac 1: {settingsDraft.initialTank1Level}%
                            <input type="range" min="0" max="100" value={settingsDraft.initialTank1Level} onChange={(event) => setSettingsDraft((prev) => ({ ...prev, initialTank1Level: Number(event.target.value) }))} />
                        </label>
                        <label className="field-row">
                            Niveau initial bac 2: {settingsDraft.initialTank2Level}%
                            <input type="range" min="0" max="100" value={settingsDraft.initialTank2Level} onChange={(event) => setSettingsDraft((prev) => ({ ...prev, initialTank2Level: Number(event.target.value) }))} />
                        </label>
                        <label className="field-row">
                            Pression reseau: {settingsDraft.networkPressure.toFixed(1)} bar
                            <input type="range" min="1" max="6" step="0.1" value={settingsDraft.networkPressure} onChange={(event) => setSettingsDraft((prev) => ({ ...prev, networkPressure: Number(event.target.value) }))} />
                        </label>
                    </div>
                    <button className="btn btn-primary" onClick={() => handleAction(() => updateSimulationSettings(settingsDraft))}>
                        Appliquer les reglages
                    </button>
                </section>
            </section>

            <section className="panel glow-warning">
                <div className="panel-heading">
                    <div>
                        <p className="eyebrow">Pannes</p>
                        <h2>Injection de defauts</h2>
                    </div>
                </div>
                <div className="fault-grid">
                    <button className="btn btn-secondary" onClick={() => handleAction(() => injectSimulationFault('leak-tank1'))}>Simuler fuite bac 1</button>
                    <button className="btn btn-secondary" onClick={() => handleAction(() => injectSimulationFault('pump1-failure'))}>Simuler panne pompe 1</button>
                    <button className="btn btn-secondary" onClick={() => handleAction(() => injectSimulationFault('sensor-failure'))}>Simuler capteur defaillant</button>
                    <button className="btn btn-secondary" onClick={() => handleAction(() => injectSimulationFault('network-cut'))}>Simuler coupure reseau</button>
                    <button className="btn btn-secondary" onClick={() => handleAction(() => injectSimulationFault('overload'))}>Simuler surcharge</button>
                </div>
            </section>

            <section className="panel glow-ok">
                <div className="panel-heading">
                    <div>
                        <p className="eyebrow">Scenarios</p>
                        <h2>Predefinis chargeables en un clic</h2>
                    </div>
                </div>
                <div className="scenario-grid">
                    {scenarios.map((scenario, index) => (
                        <article key={scenario.id} className="summary-card glow-ok">
                            <p className="eyebrow">Scenario {index + 1}</p>
                            <h3>{scenario.name}</h3>
                            <p className="hero-copy">{scenario.description}</p>
                            <button className="btn btn-primary" onClick={() => handleAction(() => loadSimulationScenario(scenario.id))}>
                                Charger
                            </button>
                        </article>
                    ))}
                </div>
            </section>

            <section className="panel glow-ok">
                <div className="panel-heading">
                    <div>
                        <p className="eyebrow">Synoptique</p>
                        <h2>Visualisation temps reel</h2>
                    </div>
                </div>
                <SynopticView
                    primaryPumpRunning={simulationState?.pumps[0]?.running ?? false}
                    secondaryPumpRunning={simulationState?.pumps[1]?.running ?? false}
                    valves={(simulationState?.valveOpenings ?? [0, 0, 0]).map((opening) => opening > 50)}
                    valveOpenings={simulationState?.valveOpenings}
                    tankLevelA={simulationState?.tank1Level ?? 0}
                    tankLevelB={simulationState?.tank2Level ?? 0}
                    flowRate={simulationState?.measuredFlow ?? 0}
                    waterState={waterStatus}
                />
                <div className="simulation-status-strip">
                    <span>Mode: {simulationState?.mode === 'simulation' ? 'Simulation' : 'Reel'}</span>
                    <span>Reseau: {simulationState?.communicationOk ? 'OK' : 'Coupe'}</span>
                    <span>Bac 1: {(simulationState?.tank1Level ?? 0).toFixed(1)}%</span>
                    <span>Bac 2: {(simulationState?.tank2Level ?? 0).toFixed(1)}%</span>
                    <span>Pression: {(simulationState?.measuredPressure ?? 0).toFixed(2)} bar</span>
                    <span>Debit: {(simulationState?.measuredFlow ?? 0).toFixed(1)} L/min</span>
                </div>
            </section>

            <section className="simulation-chart-grid">
                <LineChartPanel series={chartSeries} title="Niveaux des bacs - 60 dernieres secondes" />
                <LineChartPanel series={pressureFlowSeries} title="Pression et debit" />
                <LineChartPanel series={energySeries} title="Consommation energetique estimee" />
            </section>

            <section className="simulation-grid">
                <section className="panel glow-ok">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">Actionneurs</p>
                            <h2>Etat des pompes et vannes</h2>
                        </div>
                    </div>
                    <div className="pump-runtime-grid">
                        {(simulationState?.pumps ?? []).map((pump) => (
                            <article key={pump.id} className={`summary-card ${pump.status === 'faulted' ? 'glow-alarm' : pump.running ? 'glow-ok' : 'glow-warning'}`}>
                                <p className="eyebrow">{pump.label}</p>
                                <h3>{pump.status}</h3>
                                <p>Demarrage: {(pump.startProgress * 100).toFixed(0)}%</p>
                                <p>Temperature: {pump.temperature.toFixed(1)} C</p>
                                <p>Temps de marche: {pump.runtimeSeconds.toFixed(0)} s</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="panel glow-ok">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">Journal</p>
                            <h2>Evenements temps reel</h2>
                        </div>
                        <a className="btn btn-secondary" href="/api/simulation/log/export" target="_blank" rel="noreferrer">
                            Export CSV
                        </a>
                    </div>
                    <div className="simulation-log">
                        {(simulationState?.logs ?? []).slice(-14).map((log) => (
                            <div key={log.id} className={`simulation-log-entry ${log.level}`}>
                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                <strong>{log.message}</strong>
                            </div>
                        ))}
                    </div>
                </section>
            </section>

            {report && (
                <section className="panel glow-ok">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">Rapport</p>
                            <h2>Dernier rapport automatique</h2>
                        </div>
                    </div>
                    <div className="summary-grid">
                        <article className="summary-card glow-ok">
                            <p className="eyebrow">Duree</p>
                            <h3>{new Date(report.durationSeconds * 1000).toISOString().slice(11, 19)}</h3>
                        </article>
                        <article className="summary-card glow-warning">
                            <p className="eyebrow">Alarmes</p>
                            <h3>{report.alarmCount} / {report.acknowledgedCount}</h3>
                        </article>
                        <article className="summary-card glow-ok">
                            <p className="eyebrow">Energie</p>
                            <h3>{report.energyKwh.toFixed(2)} kWh</h3>
                        </article>
                        <article className="summary-card glow-ok">
                            <p className="eyebrow">Disponibilite</p>
                            <h3>{report.availabilityRate.toFixed(1)}%</h3>
                        </article>
                    </div>
                    <LineChartPanel series={report.summarySeries} title="Graphique recapitulatif du rapport" />
                </section>
            )}
        </div>
    );
};

export default SimulationPage;
