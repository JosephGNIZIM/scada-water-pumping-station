import React from 'react';
import { BrowserRouter as Router, NavLink, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Settings from './pages/Settings';
import Dashboard from './components/Dashboard';
import PumpStatus from './components/PumpStatus';
import SensorReadings from './components/SensorReadings';
import { useI18n } from './i18n';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { fetchPumpStatusAsync } from './store/slices/pumpSlice';
import { fetchSensorReadingsAsync } from './store/slices/sensorSlice';
import { fetchAlarmsAsync } from './store/slices/alarmSlice';
import FactoryIcon from './components/FactoryIcon';
import SynopticPage from './pages/SynopticPage';
import HistoryPage from './pages/HistoryPage';
import AlarmsPage from './pages/AlarmsPage';
import ControlRoomPage from './pages/ControlRoomPage';
import TutorialPage from './pages/TutorialPage';
import GuidedTour from './tutorial/GuidedTour';
import AboutPage from './pages/AboutPage';
import DiagnosticsPage from './pages/DiagnosticsPage';
import SimulationPage from './pages/SimulationPage';
import { fetchSimulationStateAsync } from './store/slices/simulationSlice';

const App: React.FC = () => {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const activeAlarmCount = useAppSelector((state) => state.alarm.alarms.filter((alarm) => !alarm.acknowledged).length);
  const simulation = useAppSelector((state) => state.simulation.state);
  const lastSyncCandidates = [
    useAppSelector((state) => state.pump.lastUpdated),
    ...useAppSelector((state) => state.sensor.readings.map((reading) => reading.timestamp)),
  ].filter(Boolean);
  const systemStatus = activeAlarmCount > 0 ? 'Alarm state' : 'Nominal';
  const mqttStatus = simulation?.communicationOk === false ? 'MQTT disconnected' : 'MQTT connected';
  const [uptimeSeconds, setUptimeSeconds] = React.useState(0);

  React.useEffect(() => {
    dispatch(fetchPumpStatusAsync());
    dispatch(fetchSensorReadingsAsync());
    dispatch(fetchAlarmsAsync());
    dispatch(fetchSimulationStateAsync());

    const refresh = window.setInterval(() => {
      dispatch(fetchPumpStatusAsync());
      dispatch(fetchSensorReadingsAsync());
      dispatch(fetchAlarmsAsync());
      dispatch(fetchSimulationStateAsync());
    }, 15000);

    const uptime = window.setInterval(() => {
      setUptimeSeconds((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(refresh);
      window.clearInterval(uptime);
    };
  }, [dispatch]);

  const lastSync = lastSyncCandidates.sort().slice(-1)[0];

  return (
    <Router>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand-wrap">
            <div className="brand-icon-wrap">
              <FactoryIcon className="brand-icon" />
            </div>
            <div>
              <p className="eyebrow">{t('app.tagline')}</p>
              <h1 className="topbar-title">{t('app.title')}</h1>
            </div>
          </div>
          <nav className="topnav">
            <span className={`live-badge ${simulation?.mode === 'simulation' ? 'live-badge--sim' : ''}`} data-tutorial="live-badge">
              {simulation?.mode === 'simulation' ? 'MODE SIMULATION' : 'LIVE'}
            </span>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-tutorial="nav-home">{t('nav.home')}</NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{t('nav.dashboard')}</NavLink>
            <NavLink to="/synoptic" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Synoptic</NavLink>
            <NavLink to="/simulation" className={({ isActive }) => isActive ? 'nav-link active nav-link--simulation' : 'nav-link nav-link--simulation'}>
              <span className="nav-gear-play">SIM</span>
              Simulation
              <span className="nav-demo-badge">DEMO</span>
            </NavLink>
            <NavLink to="/pump-status" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{t('nav.pump')}</NavLink>
            <NavLink to="/sensor-readings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{t('nav.sensors')}</NavLink>
            <NavLink to="/alarms" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {t('nav.alarms')}
              {activeAlarmCount > 0 && <span className="nav-counter">{activeAlarmCount}</span>}
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>History</NavLink>
            <NavLink to="/control-room" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Control Room</NavLink>
            <NavLink to="/tutorial" className={({ isActive }) => isActive ? 'nav-link active nav-link--tutorial' : 'nav-link nav-link--tutorial'}>
              <span className="nav-question">?</span>
              Tutoriel
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>A propos</NavLink>
            <NavLink to="/diagnostics" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Diagnostic</NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{t('nav.settings')}</NavLink>
          </nav>
        </header>
        <main className="page-shell">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/synoptic" element={<SynopticPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/pump-status" element={<PumpStatus />} />
            <Route path="/sensor-readings" element={<SensorReadings />} />
            <Route path="/alarms" element={<AlarmsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/control-room" element={<ControlRoomPage />} />
            <Route path="/tutorial" element={<TutorialPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <span><i className={`footer-dot ${activeAlarmCount > 0 ? 'alarm' : 'ok'}`} /> {systemStatus}</span>
          <span>{simulation?.mode === 'simulation' ? 'Simulation active' : 'Mode reel'} · {mqttStatus}</span>
          <span>Uptime {new Date(uptimeSeconds * 1000).toISOString().slice(11, 19)}</span>
          <span>Last sync {lastSync ? new Date(lastSync).toLocaleTimeString() : '--:--:--'}</span>
        </footer>
        <GuidedTour />
      </div>
    </Router>
  );
};

export default App;
