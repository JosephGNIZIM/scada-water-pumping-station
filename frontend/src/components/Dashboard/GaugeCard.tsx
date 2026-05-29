import React from 'react';

interface GaugeCardProps {
    value: number;
    min: number;
    max: number;
    unit: string;
    label: string;
    warningThreshold: number;
    dangerThreshold: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const formatValue = (value: number) => Number.isFinite(value) ? value.toFixed(1) : '--';

const GaugeCard: React.FC<GaugeCardProps> = ({
    value,
    min,
    max,
    unit,
    label,
    warningThreshold,
    dangerThreshold,
}) => {
    const safeValue = clamp(value, min, max);
    const ratio = max === min ? 0 : (safeValue - min) / (max - min);
    const normalized = Math.max(0, Math.min(1, ratio));
    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - normalized);

    const stateClass = value > dangerThreshold
        ? 'alarm'
        : value > warningThreshold
            ? 'warning'
            : 'normal';
    const color = stateClass === 'alarm'
        ? 'var(--red)'
        : stateClass === 'warning'
            ? 'var(--orange)'
            : 'var(--green)';

    return (
        <article className={`panel gauge-card ${stateClass}`} aria-label={`${label}: ${formatValue(value)} ${unit}`}>
            <div className="gauge-wrap">
                <svg className="gauge-svg" viewBox="0 0 160 160" aria-hidden="true">
                    <circle
                        className="gauge-track"
                        cx="80"
                        cy="80"
                        r={radius}
                    />
                    <circle
                        className="gauge-progress"
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke={color}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
                <div className="gauge-value">
                    <strong>{formatValue(value)}</strong>
                    <span>{unit}</span>
                </div>
            </div>
            <p className="gauge-label">{label}</p>
        </article>
    );
};

export default GaugeCard;
