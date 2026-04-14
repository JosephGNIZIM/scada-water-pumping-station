import React from 'react';

interface SynopticViewProps {
    primaryPumpRunning: boolean;
    secondaryPumpRunning: boolean;
    valves: boolean[];
    valveOpenings?: number[];
    tankLevelA: number;
    tankLevelB: number;
    flowRate?: number;
    waterState?: 'ok' | 'warning' | 'alarm';
    onPrimaryPumpToggle?: () => void;
    onSecondaryPumpToggle?: () => void;
    onValveToggle?: (index: number) => void;
    compact?: boolean;
}

const SynopticView: React.FC<SynopticViewProps> = ({
    primaryPumpRunning,
    secondaryPumpRunning,
    valves,
    valveOpenings,
    tankLevelA,
    tankLevelB,
    flowRate = 0,
    waterState = 'ok',
    onPrimaryPumpToggle,
    onSecondaryPumpToggle,
    onValveToggle,
    compact = false,
}) => {
    const sizeClass = compact ? 'synoptic compact' : 'synoptic';
    const waterA = 260 - Math.max(0, Math.min(100, tankLevelA)) * 1.5;
    const waterB = 260 - Math.max(0, Math.min(100, tankLevelB)) * 1.5;
    const flowDash = Math.max(10, 26 - Math.min(flowRate / 4, 16));
    const waterGradient = waterState === 'alarm' ? 'tankWaterAlarm' : waterState === 'warning' ? 'tankWaterWarning' : 'tankWater';

    return (
        <div className={sizeClass}>
            <svg viewBox="0 0 960 420" className="synoptic-svg">
                <defs>
                    <linearGradient id="tankWater" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#003d66" stopOpacity="0.65" />
                    </linearGradient>
                    <linearGradient id="tankWaterWarning" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffb347" stopOpacity="0.96" />
                        <stop offset="100%" stopColor="#7a3f0f" stopOpacity="0.65" />
                    </linearGradient>
                    <linearGradient id="tankWaterAlarm" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.96" />
                        <stop offset="100%" stopColor="#5d1325" stopOpacity="0.65" />
                    </linearGradient>
                    <linearGradient id="pipeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00d4ff" />
                        <stop offset="100%" stopColor="#00ff88" />
                    </linearGradient>
                    <filter id="cyanGlow">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <rect x="80" y="80" width="170" height="210" rx="20" className="tank-outline" />
                <rect x="130" y={waterA} width="70" height={290 - waterA} rx="12" fill={`url(#${waterGradient})`} />
                <text x="165" y="66" textAnchor="middle" className="synoptic-label">Tank A</text>

                <rect x="710" y="80" width="170" height="210" rx="20" className="tank-outline" />
                <rect x="760" y={waterB} width="70" height={290 - waterB} rx="12" fill={`url(#${waterGradient})`} />
                <text x="795" y="66" textAnchor="middle" className="synoptic-label">Tank B</text>

                <path d="M250 200H360M600 200H710M480 160V120M480 240V280" className="pipe-static" />
                <path d="M250 200H360M600 200H710M480 160V120M480 240V280" className="pipe-flow" style={{ strokeDasharray: `${flowDash} ${flowDash}`, opacity: flowRate > 0 ? 1 : 0.2 }} />

                {[0, 1, 2].map((index) => {
                    const x = [410, 520, 480][index];
                    const y = [200, 200, 120][index];
                    const valveOpen = valves[index];
                    const opening = valveOpenings?.[index] ?? (valveOpen ? 100 : 0);
                    return (
                        <g
                            key={index}
                            className={`valve ${valveOpen ? 'open' : 'closed'}`}
                            onClick={() => onValveToggle?.(index)}
                            role="button"
                            tabIndex={0}
                        >
                            <title>{`Valve ${index + 1}: ${opening.toFixed(0)}%`}</title>
                            <circle cx={x} cy={y} r="18" />
                            <path d={`M${x - 10} ${y}H${x + 10}M${x} ${y - 10}V${y + 10}`} />
                            <text x={x} y={y + 36} textAnchor="middle" className="synoptic-mini-label">{opening.toFixed(0)}%</text>
                        </g>
                    );
                })}

                <g className={`pump-symbol ${primaryPumpRunning ? 'running' : ''}`} onClick={onPrimaryPumpToggle} role="button" tabIndex={0}>
                    <title>{`Pump P1: ${primaryPumpRunning ? 'running' : 'stopped'}`}</title>
                    <circle cx="360" cy="200" r="38" className="pump-shell" />
                    <g className="pump-rotor">
                        <path d="M360 166L372 194L401 200L372 206L360 234L348 206L319 200L348 194Z" className="pump-blade" />
                    </g>
                    <text x="360" y="256" textAnchor="middle" className="synoptic-label">P1</text>
                </g>

                <g className={`pump-symbol ${secondaryPumpRunning ? 'running' : ''}`} onClick={onSecondaryPumpToggle} role="button" tabIndex={0}>
                    <title>{`Pump P2: ${secondaryPumpRunning ? 'running' : 'stopped'}`}</title>
                    <circle cx="600" cy="200" r="38" className="pump-shell" />
                    <g className="pump-rotor">
                        <path d="M600 166L612 194L641 200L612 206L600 234L588 206L559 200L588 194Z" className="pump-blade" />
                    </g>
                    <text x="600" y="256" textAnchor="middle" className="synoptic-label">P2</text>
                </g>

                <g filter="url(#cyanGlow)">
                    <path d="M480 280V340H880" className="pipe-static" />
                    <path d="M480 280V340H880" className="pipe-flow" style={{ strokeDasharray: `${flowDash} ${flowDash}`, opacity: flowRate > 0 ? 1 : 0.2 }} />
                </g>

                <text x="882" y="360" className="synoptic-label">Distribution</text>
            </svg>
        </div>
    );
};

export default SynopticView;
