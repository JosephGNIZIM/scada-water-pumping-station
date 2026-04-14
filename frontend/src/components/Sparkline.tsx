import React from 'react';

interface SparklineProps {
    values: number[];
    color?: string;
    height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ values, color = '#00d4ff', height = 56 }) => {
    if (values.length === 0) {
        return null;
    }

    const width = 180;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = values
        .map((value, index) => {
            const x = (index / Math.max(values.length - 1, 1)) * width;
            const y = height - ((value - min) / range) * (height - 8) - 4;
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="sparkline">
            <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

export default Sparkline;
