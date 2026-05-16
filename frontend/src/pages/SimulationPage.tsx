import React, { useEffect, useMemo, useState } from 'react';
import LineChartPanel from '../components/LineChartPanel';
import SynopticView from '../components/SynopticView';
import Synoptique3D from '../components/Synoptique3D/Synoptique3D';
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
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';
import { getPumpStatusLabel, translateRuntimeText } from '../utils/scada';

const speedOptions = [1, 5, 10, 60];

const SimulationPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const simulationState = useAppSelector((state) => state.simulation.state);
    const scenarios = useAppSelector((state) => state.simulation.scenarios);
    const report = useAppSelector((state) => state.simulation.report);
    const { hasRole } = useAuth();
    const { tr, language } = useI18n();
    const [settingsDraft, setSettingsDraft] = useState({
        inletFlow: 30,
        initialTank1Level: 50,
        initialTank2Level: 50,
        networkPressure: 3.8,
    });

    const canOperateSimulation = hasRole(['ingenieur', 'technicien']);
    const canEditSimulation = canOperateSimulation;
    const canExportPdf = canOperateSimulation;

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
            { label: tr('Bac 1', 'Tank 1'), color: '#00d4ff', values: history.map((point) => point.tank1Level).slice(-60) },
            { label: tr('Bac 2', 'Tank 2'), color: '#ff9f1c', values: history.map((point) => point.tank2Level).slice(-60) },
        ];
    }, [simulationState?.history, tr]);

    const pressureFlowSeries = useMemo(() => {
        const history = simulationState?.history ?? [];
        return [
            { label: tr('Pression', 'Pressure'), color: '#00ff88', values: history.map((point) => point.pressure).slice(-60) },
            { label: tr('Debit', 'Flow'), color: '#ff4d6d', values: history.map((point) => point.flow).slice(-60) },
        ];
    }, [simulationState?.history, tr]);

    const energySeries = useMemo(() => {
        const history = simulationState?.history ?? [];
        return [
            { label: tr('Energie', 'Energy'), color: '#ffd166', values: history.map((point) => point.energy).slice(-60) },
        ];
    }, [simulationState?.history, tr]);

    const waterStatus = simulationState?.alarmCount
        ? 'alarm'
        : (simulationState?.pumps.some((pump) => pump.status === 'faulted') ? 'warning' : 'ok');

    return (
        <div className="dashboard-shell simulation-page">
            <section className="hero-card simulation-hero">
                <div>
                    <p className="eyebrow">Simulation</p>
                    <h1>{tr('Station de pompage virtuelle complete', 'Complete virtual pumping station')}</h1>
                    <p className="hero-copy">
                        {tr('Mode bac a bac, actionneurs progressifs, bruit capteurs, pannes injectables et rapport de fin de simulation.', 'Tank-to-tank mode, progressive actuators, sensor noise, injectable faults and end-of-simulation report.')}
                    </p>
                </div>
                <div className="simulation-hero-actions">
                    <span className={`live-badge ${simulationState?.mode === 'simulation' ? 'live-badge--sim' : ''}`}>
                        {simulationState?.mode === 'simulation' ? tr('MODE SIMULATION', 'SIMULATION MODE') : tr('ESP32 REEL', 'REAL ESP32')}
                    </span>
                    <span className={`comm-badge ${simulationState?.communicationOk ? 'comm-badge--ok' : 'comm-badge--down'}`}>
                        {simulationState?.communicationOk ? tr('MQTT CONNECTE', 'MQTT CONNECTED') : tr('MQTT COUPE', 'MQTT DISCONNECTED')}
                    </span>
                    <button className="btn btn-secondary" onClick={() => handleAction(() => connectRealEquipment())} disabled={!canEditSimulation} title={canEditSimulation ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>
                        {tr('Connecter ESP32 reel', 'Connect real ESP32')}
                    </button>
                    <a className={`btn ${canExportPdf ? 'btn-primary' : 'btn-secondary btn-disabled'}`} href={canExportPdf ? '/api/simulation/report/pdf' : '#'} target="_blank" rel="noreferrer" onClick={(event) => !canExportPdf && event.preventDefault()} title={canExportPdf ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>
                        Export PDF
                    </a>
                </div>
            </section>

            <section className="simulation-grid">
                <section className="panel glow-ok">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">{tr('Moteur', 'Engine')}</p>
                            <h2>{tr('Pilotage simulation', 'Simulation control')}</h2>
                        </div>
                    </div>
                    <div className="action-row">
                        <button className="btn btn-primary" onClick={() => handleAction(() => startSimulation(simulationState?.speed ?? 1))} disabled={!canOperateSimulation} title={canOperateSimulation ? '' : tr('Acces reserve aux Ingenieurs et Techniciens', 'Engineers and Technicians only')}>{tr('DEMARRER', 'START')}</button>
                        <button className="btn btn-secondary" onClick={() => handleAction(() => pauseSimulation())} disabled={!canOperateSimulation} title={canOperateSimulation ? '' : tr('Acces reserve aux Ingenieurs et Techniciens', 'Engineers and Technicians only')}>{tr('PAUSE', 'PAUSE')}</button>
                        <button className="btn btn-secondary" onClick={() => handleAction(() => resetSimulation())} disabled={!canOperateSimulation} title={canOperateSimulation ? '' : tr('Acces reserve aux Ingenieurs et Techniciens', 'Engineers and Technicians only')}>{tr('REINITIALISER', 'RESET')}</button>
                    </div>
                    <div className="speed-row">
                        {speedOptions.map((speed) => (
                            <button key={speed} className={`btn ${simulationState?.speed === speed ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleAction(() => updateSimulationSettings({ speed }))} disabled={!canOperateSimulation} title={canOperateSimulation ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>
                                x{speed}
                            </button>
                        ))}
                    </div>
                    <div className="simulation-kpis">
                        <article className="summary-card glow-ok"><p className="eyebrow">{tr('Duree', 'Duration')}</p><h3>{new Date((simulationState?.durationSeconds ?? 0) * 1000).toISOString().slice(11, 19)}</h3></article>
                        <article className="summary-card glow-warning"><p className="eyebrow">{tr('Alarmes', 'Alarms')}</p><h3>{simulationState?.alarmCount ?? 0}</h3></article>
                        <article className="summary-card glow-ok"><p className="eyebrow">{tr('Energie', 'Energy')}</p><h3>{(simulationState?.totalEnergyKwh ?? 0).toFixed(2)} kWh</h3></article>
                    </div>
                </section>

                <section className="panel glow-ok">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">{tr('Reglages', 'Settings')}</p>
                            <h2>{tr('Entrees du procede', 'Process inputs')}</h2>
                        </div>
                    </div>
                    <div className="slider-grid">
                        <label className="field-row">{tr('Debit entree d eau', 'Water inlet flow')}: {settingsDraft.inletFlow} L/min<input type="range" min="0" max="100" value={settingsDraft.inletFlow} onChange={(event) => setSettingsDraft((prev) => ({ ...prev, inletFlow: Number(event.target.value) }))} disabled={!canEditSimulation} /></label>
                        <label className="field-row">{tr('Niveau initial bac 1', 'Initial tank 1 level')}: {settingsDraft.initialTank1Level}%<input type="range" min="0" max="100" value={settingsDraft.initialTank1Level} onChange={(event) => setSettingsDraft((prev) => ({ ...prev, initialTank1Level: Number(event.target.value) }))} disabled={!canEditSimulation} /></label>
                        <label className="field-row">{tr('Niveau initial bac 2', 'Initial tank 2 level')}: {settingsDraft.initialTank2Level}%<input type="range" min="0" max="100" value={settingsDraft.initialTank2Level} onChange={(event) => setSettingsDraft((prev) => ({ ...prev, initialTank2Level: Number(event.target.value) }))} disabled={!canEditSimulation} /></label>
                        <label className="field-row">{tr('Pression reseau', 'Network pressure')}: {settingsDraft.networkPressure.toFixed(1)} bar<input type="range" min="1" max="6" step="0.1" value={settingsDraft.networkPressure} onChange={(event) => setSettingsDraft((prev) => ({ ...prev, networkPressure: Number(event.target.value) }))} disabled={!canEditSimulation} /></label>
                    </div>
                    <button className="btn btn-primary" onClick={() => handleAction(() => updateSimulationSettings(settingsDraft))} disabled={!canEditSimulation} title={canEditSimulation ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>
                        {tr('Appliquer les reglages', 'Apply settings')}
                    </button>
                </section>
            </section>

            <section className="panel glow-warning">
                <div className="panel-heading"><div><p className="eyebrow">{tr('Pannes', 'Faults')}</p><h2>{tr('Injection de defauts', 'Fault injection')}</h2></div></div>
                <div className="fault-grid">
                    <button className="btn btn-secondary" onClick={() => handleAction(() => injectSimulationFault('leak-tank1'))} disabled={!canEditSimulation} title={canEditSimulation ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>Simuler fuite bac 1</button>
                    <button className="btn btn-secondary" onClick={() => handleAction(() => injectSimulationFault('pump1-failure'))} disabled={!canEditSimulation} title={canEditSimulation ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>Simuler panne pompe 1</button>
                    <button className="btn btn-secondary" onClick={() => handleAction(() => injectSimulationFault('sensor-failure'))} disabled={!canEditSimulation} title={canEditSimulation ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>Simuler capteur defaillant</button>
                    <button className="btn btn-secondary" onClick={() => handleAction(() => injectSimulationFault('network-cut'))} disabled={!canEditSimulation} title={canEditSimulation ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>Simuler coupure reseau</button>
                    <button className="btn btn-secondary" onClick={() => handleAction(() => injectSimulationFault('overload'))} disabled={!canEditSimulation} title={canEditSimulation ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>Simuler surcharge</button>
                </div>
            </section>

            <section className="panel glow-ok">
                <div className="panel-heading"><div><p className="eyebrow">{tr('Scenarios', 'Scenarios')}</p><h2>{tr('Predefinis chargeables en un clic', 'One-click presets')}</h2></div></div>
                <div className="scenario-grid">
                    {scenarios.map((scenario, index) => (
                        <article key={scenario.id} className="summary-card glow-ok">
                            <p className="eyebrow">{tr('Scenario', 'Scenario')} {index + 1}</p>
                            <h3>{translateRuntimeText(scenario.name, language)}</h3>
                            <p className="hero-copy">{translateRuntimeText(scenario.description, language)}</p>
                            <button className="btn btn-primary" onClick={() => handleAction(() => loadSimulationScenario(scenario.id))} disabled={!canOperateSimulation} title={canOperateSimulation ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>
                                {tr('Charger', 'Load')}
                            </button>
                        </article>
                    ))}
                </div>
            </section>

            <section className="panel glow-ok">
                <div className="panel-heading"><div><p className="eyebrow">{tr('Scene terrain 3D', '3D field scene')}</p><h2>{tr('Station AEP complete animee', 'Complete animated AEP station')}</h2></div></div>
                <Synoptique3D simulationState={simulationState} alarmActive={(simulationState?.alarmCount ?? 0) > 0} />
            </section>

            <section className="panel glow-ok">
                <div className="panel-heading"><div><p className="eyebrow">{tr('Synoptique', 'Synoptic')}</p><h2>{tr('Visualisation temps reel', 'Real-time visualization')}</h2></div></div>
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
                    <span>{tr('Mode', 'Mode')}: {simulationState?.mode === 'simulation' ? 'Simulation' : tr('Reel', 'Real')}</span>
                    <span>{tr('Reseau', 'Network')}: {simulationState?.communicationOk ? 'OK' : tr('Coupe', 'Down')}</span>
                    <span>Bac 1: {(simulationState?.tank1Level ?? 0).toFixed(1)}%</span>
                    <span>Bac 2: {(simulationState?.tank2Level ?? 0).toFixed(1)}%</span>
                    <span>Pression: {(simulationState?.measuredPressure ?? 0).toFixed(2)} bar</span>
                    <span>{tr('Debit', 'Flow')}: {(simulationState?.measuredFlow ?? 0).toFixed(1)} L/min</span>
                </div>
            </section>

            <section className="simulation-chart-grid">
                <LineChartPanel series={chartSeries} title={tr('Niveaux des bacs - 60 dernieres secondes', 'Tank levels - last 60 seconds')} />
                <LineChartPanel series={pressureFlowSeries} title={tr('Pression et debit', 'Pressure and flow')} />
                <LineChartPanel series={energySeries} title={tr('Consommation energetique estimee', 'Estimated energy consumption')} />
            </section>

            <section className="simulation-grid">
                <section className="panel glow-ok">
                    <div className="panel-heading"><div><p className="eyebrow">{tr('Actionneurs', 'Actuators')}</p><h2>{tr('Etat des pompes et vannes', 'Pump and valve status')}</h2></div></div>
                    <div className="pump-runtime-grid">
                        {(simulationState?.pumps ?? []).map((pump) => (
                            <article key={pump.id} className={`summary-card ${pump.status === 'faulted' ? 'glow-alarm' : pump.running ? 'glow-ok' : 'glow-warning'}`}>
                                <p className="eyebrow">{pump.label}</p>
                                <h3>{getPumpStatusLabel(pump.status, language)}</h3>
                                <p>{tr('Demarrage', 'Startup')}: {(pump.startProgress * 100).toFixed(0)}%</p>
                                <p>{tr('Temperature', 'Temperature')}: {pump.temperature.toFixed(1)} C</p>
                                <p>{tr('Temps de marche', 'Runtime')}: {pump.runtimeSeconds.toFixed(0)} s</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="panel glow-ok">
                    <div className="panel-heading">
                        <div><p className="eyebrow">{tr('Journal', 'Log')}</p><h2>{tr('Evenements temps reel', 'Real-time events')}</h2></div>
                        <a className={`btn ${canOperateSimulation ? 'btn-secondary' : 'btn-secondary btn-disabled'}`} href={canOperateSimulation ? '/api/simulation/log/export' : '#'} target="_blank" rel="noreferrer" onClick={(event) => !canOperateSimulation && event.preventDefault()} title={canOperateSimulation ? '' : 'Acces reserve aux Ingenieurs et Techniciens'}>
                            Export CSV
                        </a>
                    </div>
                    <div className="simulation-log">
                        {(simulationState?.logs ?? []).slice(-14).map((log) => (
                            <div key={log.id} className={`simulation-log-entry ${log.level}`}>
                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                <strong>{translateRuntimeText(log.message, language)}</strong>
                            </div>
                        ))}
                    </div>
                </section>
            </section>

            {report && (
                <section className="panel glow-ok">
                    <div className="panel-heading"><div><p className="eyebrow">{tr('Rapport', 'Report')}</p><h2>{tr('Dernier rapport automatique', 'Latest automatic report')}</h2></div></div>
                    <div className="summary-grid">
                        <article className="summary-card glow-ok"><p className="eyebrow">{tr('Duree', 'Duration')}</p><h3>{new Date(report.durationSeconds * 1000).toISOString().slice(11, 19)}</h3></article>
                        <article className="summary-card glow-warning"><p className="eyebrow">{tr('Alarmes', 'Alarms')}</p><h3>{report.alarmCount} / {report.acknowledgedCount}</h3></article>
                        <article className="summary-card glow-ok"><p className="eyebrow">{tr('Energie', 'Energy')}</p><h3>{report.energyKwh.toFixed(2)} kWh</h3></article>
                        <article className="summary-card glow-ok"><p className="eyebrow">{tr('Disponibilite', 'Availability')}</p><h3>{report.availabilityRate.toFixed(1)}%</h3></article>
                    </div>
                    <LineChartPanel series={report.summarySeries.map((item) => ({ ...item, label: translateRuntimeText(item.label, language) }))} title={tr('Graphique recapitulatif du rapport', 'Report summary chart')} />
                </section>
            )}
        </div>
    );
};

export default SimulationPage;
