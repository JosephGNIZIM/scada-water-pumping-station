import React, { useMemo, useState } from 'react';
import LineChartPanel from '../components/LineChartPanel';
import { useAppSelector } from '../store/hooks';
import { buildMultiSeries, computeStatistics } from '../utils/scada';
import { useI18n } from '../i18n';

const HistoryPage: React.FC = () => {
    const readings = useAppSelector((state) => state.sensor.readings);
    const { tr, language } = useI18n();
    const [dateFrom, setDateFrom] = useState('2026-03-18');
    const [dateTo, setDateTo] = useState('2026-03-25');

    const series = useMemo(() => buildMultiSeries(readings, language), [readings, language]);
    const stats = useMemo(
        () => series.map((item) => ({ label: item.label, ...computeStatistics(item.values) })),
        [series],
    );

    const exportCsv = () => {
        const rows = [
            [tr('Capteur', 'Sensor'), 'Min', 'Max', tr('Moyenne', 'Average'), tr('Ecart type', 'StdDev')].join(','),
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
                    <p className="eyebrow">{tr('Historique', 'History')}</p>
                    <h1>{tr('Tendances historiques et rapports', 'Historical Trends & Reports')}</h1>
                    <p className="hero-copy">{tr('Consultez l historique capteurs sur une plage choisie, exportez les rapports et inspectez les statistiques.', 'Review sensor history over a selected range, export reports and inspect statistics.')}</p>
                </div>
                <div className="history-filters">
                    <label>
                        {tr('Du', 'From')}
                        <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                    </label>
                    <label>
                        {tr('Au', 'To')}
                        <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                    </label>
                </div>
            </section>
            <LineChartPanel series={series} title={tr('Historique multi-capteurs', 'Multi-sensor history')} />
            <section className="summary-grid">
                {stats.map((item) => (
                    <article key={item.label} className="summary-card glow-ok">
                        <p className="eyebrow">{item.label}</p>
                        <h3>{item.label}</h3>
                        <p>Min: {item.min}</p>
                        <p>Max: {item.max}</p>
                        <p>{tr('Moyenne', 'Average')}: {item.avg}</p>
                        <p>{tr('Ecart type', 'Std. dev')}: {item.stddev}</p>
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
