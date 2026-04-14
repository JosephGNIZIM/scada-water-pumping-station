import React from 'react';

interface GaugeProps {
    label: string;
    value: number;
    min?: number;
    max: number;
    unit: string;
    status?: 'ok' | 'warning' | 'alarm';
}

const Gauge: React.FC<GaugeProps> = ({ label, value, min = 0, max, unit, status = 'ok' }) => {
    const safeValue = Math.min(Math.max(value, min), max);
    const ratio = (safeValue - min) / (max - min);
    const circumference = 2 * Math.PI * 44;
    const offset = circumference * (1 - ratio);

    return (
        <div className={`gauge-card ${status}`}>
            <div className="gauge-wrap">
                <svg viewBox="0 0 120 120" className="gauge-svg">
                    <circle cx="60" cy="60" r="44" className="gauge-track" />
                    <circle
                        cx="60"
                        cy="60"
                        r="44"
                        className="gauge-progress"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
                <div className="gauge-value">
                    <strong>{safeValue.toFixed(1)}</strong>
                    <span>{unit}</span>
                </div>
            </div>
            <p className="gauge-label">{label}</p>
        </div>
    );
};

export default Gauge;
