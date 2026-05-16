import React from 'react';
import { BrowserRouter as Router, NavLink, Route, Routes } from 'react-router-dom';
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
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import { UserRole } from './services/api';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

const roleBadgeMeta: Record<UserRole, { label: string; className: string; icon: string }> = {
  ingenieur: { label: 'Ingenieur', className: 'badge-role badge-role--ingenieur', icon: 'Key' },
  technicien: { label: 'Technicien', className: 'badge-role badge-role--technicien', icon: 'Tools' },
  operateur: { label: 'Operateur', className: 'badge-role badge-role--operateur', icon: 'Eye' },
};

const navigation: Array<{ to: string; label: string; roles: UserRole[]; tutorial?: string; className?: string }> = [
  { to: '/', label: 'Accueil', roles: ['ingenieur', 'technicien', 'operateur'], tutorial: 'nav-home' },
  { to: '/dashboard', label: 'Tableau de bord', roles: ['ingenieur', 'technicien', 'operateur'] },
  { to: '/synoptic', label: 'Synoptique', roles: ['ingenieur', 'technicien', 'operateur'] },
  { to: '/simulation', label: 'Simulation', roles: ['ingenieur', 'technicien'] },
  { to: '/pump-status', label: 'Pompes', roles: ['ingenieur', 'technicien'] },
  { to: '/sensor-readings', label: 'Capteurs', roles: ['ingenieur', 'technicien', 'operateur'] },
  { to: '/alarms', label: 'Alarmes', roles: ['ingenieur', 'technicien', 'operateur'] },
  { to: '/history', label: 'Historique', roles: ['ingenieur', 'technicien', 'operateur'] },
  { to: '/control-room', label: 'Salle de controle', roles: ['ingenieur', 'technicien', 'operateur'] },
  { to: '/tutorial', label: 'Tutoriel', roles: ['ingenieur', 'technicien', 'operateur'], className: 'nav-link--tutorial' },
  { to: '/about', label: 'A propos', roles: ['ingenieur', 'technicien', 'operateur'] },
  { to: '/diagnostics', label: 'Diagnostic', roles: ['ingenieur'] },
  { to: '/settings', label: 'Parametres', roles: ['ingenieur', 'technicien'] },
];

const AppShell: React.FC = () => {
  const { t, tr, language, formatDateTime } = useI18n();
  const dispatch = useAppDispatch();
  const { user, role, warningVisible, logout, hasRole } = useAuth();
  const activeAlarmCount = useAppSelector((state) => state.alarm.alarms.filter((alarm) => !alarm.acknowledged).length);
  const simulation = useAppSelector((state) => state.simulation.state);
  const lastSyncCandidates = [
    useAppSelector((state) => state.pump.lastUpdated),
    ...useAppSelector((state) => state.sensor.readings.map((reading) => reading.timestamp)),
  ].filter(Boolean);
  const systemStatus = activeAlarmCount > 0 ? tr('Etat alarme', 'Alarm state') : tr('Nominal', 'Nominal');
  const mqttStatus = simulation?.communicationOk === false ? tr('MQTT deconnecte', 'MQTT disconnected') : tr('MQTT connecte', 'MQTT connected');
  const [uptimeSeconds, setUptimeSeconds] = React.useState(0);

  React.useEffect(() => {
    if (!user) {
      return;
    }

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
  }, [dispatch, user]);

  const lastSync = lastSyncCandidates.sort().slice(-1)[0];
  const badge = role ? roleBadgeMeta[role] : null;

  return (
    <div className="app-shell">
      {warningVisible && (
        <div className="session-warning">
          Votre session expirera dans moins de 2 minutes sans activite.
        </div>
      )}
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
            {simulation?.mode === 'simulation' ? tr('MODE SIMULATION', 'SIMULATION MODE') : tr('DIRECT', 'LIVE')}
          </span>
          {navigation.filter((item) => hasRole(item.roles)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => isActive ? `nav-link active ${item.className || ''}`.trim() : `nav-link ${item.className || ''}`.trim()}
              data-tutorial={item.tutorial}
            >
              {language === 'fr' ? item.label : {
                Accueil: 'Home',
                'Tableau de bord': 'Dashboard',
                Synoptique: 'Synoptic',
                Simulation: 'Simulation',
                Pompes: 'Pumps',
                Capteurs: 'Sensors',
                Alarmes: 'Alarms',
                Historique: 'History',
                'Salle de controle': 'Control Room',
                Tutoriel: 'Tutorial',
                'A propos': 'About',
                Diagnostic: 'Diagnostics',
                Parametres: 'Settings',
              }[item.label] ?? item.label}
              {item.to === '/alarms' && activeAlarmCount > 0 && <span className="nav-counter">{activeAlarmCount}</span>}
            </NavLink>
          ))}
          {badge && (
            <span className={badge.className}>
              {badge.icon} {user?.displayName}
            </span>
          )}
          <button className="btn btn-secondary" onClick={() => logout()}>
            {tr('Deconnexion', 'Log out')}
          </button>
        </nav>
      </header>
      <main className="page-shell">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/" element={<ProtectedRoute roles={['ingenieur', 'technicien', 'operateur']}><Home /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute roles={['ingenieur', 'technicien', 'operateur']}><Dashboard /></ProtectedRoute>} />
          <Route path="/synoptic" element={<ProtectedRoute roles={['ingenieur', 'technicien', 'operateur']}><SynopticPage /></ProtectedRoute>} />
          <Route path="/simulation" element={<ProtectedRoute roles={['ingenieur', 'technicien']}><SimulationPage /></ProtectedRoute>} />
          <Route path="/pump-status" element={<ProtectedRoute roles={['ingenieur', 'technicien']}><PumpStatus /></ProtectedRoute>} />
          <Route path="/sensor-readings" element={<ProtectedRoute roles={['ingenieur', 'technicien', 'operateur']}><SensorReadings /></ProtectedRoute>} />
          <Route path="/alarms" element={<ProtectedRoute roles={['ingenieur', 'technicien', 'operateur']}><AlarmsPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute roles={['ingenieur', 'technicien', 'operateur']}><HistoryPage /></ProtectedRoute>} />
          <Route path="/control-room" element={<ProtectedRoute roles={['ingenieur', 'technicien', 'operateur']}><ControlRoomPage /></ProtectedRoute>} />
          <Route path="/tutorial" element={<ProtectedRoute roles={['ingenieur', 'technicien', 'operateur']}><TutorialPage /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute roles={['ingenieur', 'technicien', 'operateur']}><AboutPage /></ProtectedRoute>} />
          <Route path="/diagnostics" element={<ProtectedRoute roles={['ingenieur']}><DiagnosticsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute roles={['ingenieur', 'technicien']}><Settings /></ProtectedRoute>} />
        </Routes>
      </main>
      <footer className="app-footer">
        <span><i className={`footer-dot ${activeAlarmCount > 0 ? 'alarm' : 'ok'}`} /> {systemStatus}</span>
        <span>{simulation?.mode === 'simulation' ? tr('Simulation active', 'Simulation active') : tr('Mode reel', 'Real mode')} - {mqttStatus}</span>
        <span>{tr('Disponibilite', 'Uptime')} {new Date(uptimeSeconds * 1000).toISOString().slice(11, 19)}</span>
        <span>{tr('Derniere synchro', 'Last sync')} {lastSync ? formatDateTime(lastSync) : '--:--:--'}</span>
      </footer>
      <GuidedTour />
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <Router>
      <AppShell />
    </Router>
  </AuthProvider>
);

export default App;
