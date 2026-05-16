import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import FactoryIcon from '../components/FactoryIcon';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';

const roleMeta = {
    ingenieur: { label: 'Ingenieur', badge: 'badge-role badge-role--ingenieur', icon: 'Key' },
    technicien: { label: 'Technicien', badge: 'badge-role badge-role--technicien', icon: 'Tools' },
    operateur: { label: 'Operateur', badge: 'badge-role badge-role--operateur', icon: 'Eye' },
};

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, login, loginError, clearLoginError } = useAuth();
    const { tr } = useI18n();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        const ok = await login(username, password);
        setSubmitting(false);
        if (ok) {
            navigate((location.state as any)?.from || '/', { replace: true });
        }
    };

    return (
        <div className="login-shell">
            <div className="login-card">
                <div className="login-brand">
                    <div className="login-logo-wrap">
                        <FactoryIcon className="brand-icon" />
                    </div>
                    <p className="eyebrow">{tr('Station d eau SCADA', 'SCADA Water Station')}</p>
                    <h1>{tr('Connexion securisee a la station', 'Secure station login')}</h1>
                    <p className="hero-copy">{tr('Controle d acces multi-niveaux pour l exploitation, la maintenance et l ingenierie.', 'Multi-level access control for operations, maintenance and engineering.')}</p>
                </div>
                <form className="login-form" onSubmit={handleSubmit}>
                    <label className="field-row">
                        {tr('Nom d utilisateur', 'Username')}
                        <input value={username} onChange={(event) => { clearLoginError(); setUsername(event.target.value); }} autoComplete="username" />
                    </label>
                    <label className="field-row">
                        {tr('Mot de passe', 'Password')}
                        <input type="password" value={password} onChange={(event) => { clearLoginError(); setPassword(event.target.value); }} autoComplete="current-password" />
                    </label>
                    {loginError && <div className="auth-error">{loginError}</div>}
                    <button className="btn btn-primary login-submit" type="submit" disabled={submitting}>
                        {submitting ? tr('Connexion...', 'Signing in...') : tr('Se connecter', 'Sign in')}
                    </button>
                </form>
                <div className="login-hint-grid">
                    {Object.entries(roleMeta).map(([role, meta]) => (
                        <article key={role} className="summary-card">
                            <span className={meta.badge}>{meta.icon} {meta.label}</span>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
