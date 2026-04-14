import React, { useMemo, useState } from 'react';
import LineChartPanel from '../components/LineChartPanel';
import { useAppSelector } from '../store/hooks';
import { buildMultiSeries, computeStatistics } from '../utils/scada';

const HistoryPage: React.FC = () => {
    const readings = useAppSelector((state) => state.sensor.readings);
    const [dateFrom, setDateFrom] = useState('2026-03-18');
    const [dateTo, setDateTo] = useState('2026-03-25');

    const series = useMemo(() => buildMultiSeries(readings), [readings]);
    const stats = useMemo(
        () => series.map((item) => ({ label: item.label, ...computeStatistics(item.values) })),
        [series],
    );

    const exportCsv = () => {
        const rows = [
            ['Sensor', 'Min', 'Max', 'Average', 'StdDev'].join(','),
            ...stats.map((item) => [item.label, item.min, item.max, item.avg, item.stddev].join(',')),
        ];
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `history-${dateFrom}-${dateTo}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="dashboard-shell">
            <section className="hero-card">
                <div>
                    <p className="eyebrow">History</p>
                    <h1>Historical Trends & Reports</h1>
                    <p className="hero-copy">Review sensor history over a selected range, export reports and inspect statistics.</p>
                </div>
                <div className="history-filters">
                    <label>
                        From
                        <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                    </label>
                    <label>
                        To
                        <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                    </label>
                </div>
            </section>
            <LineChartPanel series={series} title="Multi-sensor history" />
            <section className="summary-grid">
                {stats.map((item) => (
                    <article key={item.label} className="summary-card glow-ok">
                        <p className="eyebrow">{item.label}</p>
                        <h3>{item.label}</h3>
                        <p>Min: {item.min}</p>
                        <p>Max: {item.max}</p>
                        <p>Average: {item.avg}</p>
                        <p>Std. dev: {item.stddev}</p>
                    </article>
                ))}
            </section>
            <section className="panel" data-tutorial="history-exports">
                <div className="action-row">
                    <button className="btn btn-primary" onClick={exportCsv}>Export CSV</button>
                    <button className="btn btn-secondary" onClick={() => window.print()}>Export PDF</button>
                </div>
            </section>
        </div>
    );
};

export default HistoryPage;
