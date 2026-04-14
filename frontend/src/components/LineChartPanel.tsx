import React from 'react';

interface Series {
    label: string;
    color: string;
    values: number[];
}

const LineChartPanel: React.FC<{ series: Series[]; title: string }> = ({ series, title }) => {
    const width = 720;
    const height = 240;
    const allValues = series.flatMap((item) => item.values);
    if (allValues.length === 0) {
        return (
            <section className="panel chart-panel">
                <div className="panel-heading">
                    <div>
                        <p className="eyebrow">Trend</p>
                        <h2>{title}</h2>
                    </div>
                </div>
                <p className="muted">No data available yet.</p>
            </section>
        );
    }
    const min = Math.min(...allValues, 0);
    const max = Math.max(...allValues, 1);
    const range = max - min || 1;

    const makePath = (values: number[]) =>
        values
            .map((value, index) => {
                const x = 40 + (index / Math.max(values.length - 1, 1)) * (width - 60);
                const y = height - 30 - ((value - min) / range) * (height - 60);
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');

    return (
        <section className="panel chart-panel">
            <div className="panel-heading">
                <div>
                    <p className="eyebrow">Trend</p>
                    <h2>{title}</h2>
                </div>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="line-chart">
                {[0, 1, 2, 3].map((line) => {
                    const y = 30 + line * 50;
                    return <line key={line} x1="40" y1={y} x2={width - 20} y2={y} className="chart-grid" />;
                })}
                {series.map((item) => (
                    <path key={item.label} d={makePath(item.values)} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" />
                ))}
            </svg>
            <div className="chart-legend">
                {series.map((item) => (
                    <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>
                ))}
            </div>
        </section>
    );
};

export default LineChartPanel;
