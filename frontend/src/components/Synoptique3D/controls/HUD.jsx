import React from 'react';

const cameraButtons = [
    ['global', 'Vue globale'],
    ['chateau', 'Château d\'eau'],
    ['solaire', 'Panneaux solaires'],
    ['forage', 'Forage / Pompe'],
    ['village', 'Village / Fontaine'],
];

const scenarios = [
    ['normal', 'Normal'],
    ['pump-fault', 'Panne pompe'],
    ['night', 'Mode nuit'],
    ['storm', 'Orage'],
    ['peak', 'Pic conso'],
];

const getLevelState = (level) => {
    if (level < 10) return ['critique', 'danger'];
    if (level < 30) return ['bas', 'warning'];
    return ['normal', 'ok'];
};

const getHudBorderColor = (data, alarmActive) => {
    if (alarmActive) return '#ff2222'; // Rouge alarme
    const etat = data?.pompe?.etat ?? 'arret';
    if (etat === 'defaut') return '#ff2222';
    const level = data?.reservoir?.niveau_pct ?? 55;
    if (level < 10) return '#ff6644';
    if (level < 30) return '#ffaa22';
    return '#00cc44'; // Vert normal
};

export default function HUD({ data, onPreset, onScenario, alarmActive }) {
    const level = Math.round(data?.reservoir?.niveau_pct ?? 0);
    const [levelState, levelClass] = getLevelState(level);
    const pumpState = data?.pompe?.etat ?? 'arret';
    const pumpClass = pumpState === 'marche' ? 'ok' : pumpState === 'defaut' ? 'danger' : 'muted';
    const mode = data?.mode === 'real' ? 'TERRAIN' : 'SIMULATEUR';
    const temperature = Math.round(data?.pompe?.temperature_c ?? 35);
    const power = Math.round(data?.solaire?.puissance_w ?? 0);
    const debit = (data?.distribution?.debit_m3h ?? 0).toFixed(1);
    const pressure = (data?.distribution?.pression_bar ?? 0).toFixed(2);
    const hour = data?.meteo?.heure_journee ?? new Date().getHours();
    const clouds = Math.round(data?.meteo?.couverture_nuages ?? 15);
    const current = (data?.pompe?.courant_a ?? 0).toFixed(1);
    
    const borderStyle = {
        borderLeft: `6px solid ${getHudBorderColor(data, alarmActive)}`,
    };

    return (
        <div className="synoptique3d-hud">
            {alarmActive && (
                <div className="synoptique3d-alarm">
                    ⚠️ ALARME ACTIVE - Intervention requise
                </div>
            )}
            
            <div className="synoptique3d-panel synoptique3d-panel--left" style={borderStyle}>
                <div className="synoptique3d-panel-title">STATION AEP RURALE - TOGO</div>
                
                <div className="synoptique3d-data-group">
                    <span className="synoptique3d-label">Mode:</span>
                    <span className={mode === 'TERRAIN' ? 'terrain' : 'simulation'}>{mode}</span>
                </div>
                
                <div className="synoptique3d-data-group">
                    <span className="synoptique3d-label">Heure:</span>
                    <span>{Math.floor(hour)}:{String(Math.floor((hour % 1) * 60)).padStart(2, '0')}</span>
                </div>
                
                <div className="synoptique3d-data-group">
                    <span className="synoptique3d-label">Météo:</span>
                    <span>{clouds}% nuages, {temperature}°C</span>
                </div>
                
                <div className="synoptique3d-separator"></div>
                
                <div className="synoptique3d-data-group">
                    <span className="synoptique3d-label">Pompe:</span>
                    <span className={pumpClass}>{pumpState.toUpperCase()}</span>
                </div>
                
                <div className="synoptique3d-data-group">
                    <span className="synoptique3d-label">Courant:</span>
                    <span>{current} A</span>
                </div>
                
                <div className="synoptique3d-data-group">
                    <span className="synoptique3d-label">Température:</span>
                    <span className={temperature > 75 ? 'danger' : temperature > 60 ? 'warning' : 'ok'}>
                        {temperature}°C
                    </span>
                </div>
                
                <div className="synoptique3d-separator"></div>
                
                <div className="synoptique3d-data-group">
                    <span className="synoptique3d-label">Niveau château:</span>
                    <span className={levelClass}>{level}%</span>
                </div>
                
                <div className="synoptique3d-data-group">
                    <span className="synoptique3d-label">État:</span>
                    <span className={levelClass}>{levelState.toUpperCase()}</span>
                </div>
                
                <div className="synoptique3d-separator"></div>
                
                <div className="synoptique3d-data-group">
                    <span className="synoptique3d-label">Production solaire:</span>
                    <span>{power} W</span>
                </div>
                
                <div className="synoptique3d-data-group">
                    <span className="synoptique3d-label">Débit pompage:</span>
                    <span>{debit} m³/h</span>
                </div>
                
                <div className="synoptique3d-data-group">
                    <span className="synoptique3d-label">Pression réseau:</span>
                    <span>{pressure} bar</span>
                </div>
            </div>
            
            <div className="synoptique3d-panel synoptique3d-panel--right">
                <div className="synoptique3d-panel-title">VUES CAMÉRA</div>
                {cameraButtons.map(([key, label]) => (
                    <button 
                        key={key} 
                        type="button" 
                        className="synoptique3d-camera-btn"
                        onClick={() => onPreset(key)}
                        title={label}
                    >
                        {label}
                    </button>
                ))}
            </div>
            
            <div className="synoptique3d-scenarios">
                <span className="synoptique3d-scenarios-title">Scénarios de test:</span>
                <div className="synoptique3d-scenarios-buttons">
                    {scenarios.map(([key, label]) => (
                        <button 
                            key={key} 
                            type="button"
                            className="synoptique3d-scenario-btn"
                            onClick={() => onScenario(key)}
                            title={label}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
