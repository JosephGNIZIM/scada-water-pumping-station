import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { getMeasurementRange } from '../../services/api';

interface MeasurementPoint {
    timestamp: string;
    pressure: number;
    flow_rate: number;
    tank_level: number;
}

const periodOptions = [
    { value: '1h', label: '1h' },
    { value: '24h', label: '24h' },
    { value: '7d', label: '7j' },
    { value: '30d', label: '30j' },
];

const periodToMs = (period: string) => {
    switch (period) {
        case '1h': return 60 * 60 * 1000;
        case '24h': return 24 * 60 * 60 * 1000;
        case '7d': return 7 * 24 * 60 * 60 * 1000;
        case '30d': return 30 * 24 * 60 * 60 * 1000;
        default: return 24 * 60 * 60 * 1000;
    }
};

const TrendChart: React.FC = () => {
    const [period, setPeriod] = useState('1h');
    const [data, setData] = useState<MeasurementPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setError(null);

        try {
            const to = new Date();
            const from = new Date(to.getTime() - periodToMs(period));
            const response = await getMeasurementRange(from.toISOString(), to.toISOString(), 200);
            setData(response.data.map((item) => ({
                timestamp: String(item.timestamp),
                pressure: Number(item.pressure),
                flow_rate: Number(item.flow_rate),
                tank_level: Number(item.tank_level),
            })));
        } catch (fetchError) {
            setError('Impossible de charger les mesures.');
            console.error('TrendChart loadData error:', fetchError);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        setLoading(true);
        loadData();
    }, [loadData]);

    useEffect(() => {
        const timer = window.setInterval(loadData, 30_000);
        return () => window.clearInterval(timer);
    }, [loadData]);

    const formattedData = useMemo(
        () => data.map((item) => ({
            ...item,
            timeLabel: period === '1h' || period === '24h'
                ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: '2-digit' }),
        })),
        [data, period],
    );

    return (
        <section className="panel trend-chart">
            <div className="panel-heading">
                <div>
                    <p className="eyebrow">Tendance REST</p>
                    <h2>Mesures historiques</h2>
                </div>
                <div className="filter-row" role="group" aria-label="Periode du graphique">
                    {periodOptions.map((option) => (
                        <button
                            key={option.value}
                            className={`btn ${option.value === period ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setPeriod(option.value)}
                            type="button"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="chart-empty">Chargement des donnees...</div>
            ) : error ? (
                <div className="chart-empty">{error}</div>
            ) : formattedData.length === 0 ? (
                <div className="chart-empty">Aucune donnee disponible pour cette periode.</div>
            ) : (
                <ResponsiveContainer width="100%" height={360}>
                    <LineChart data={formattedData} margin={{ top: 12, right: 48, left: 0, bottom: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="timeLabel" tick={{ fill: 'var(--muted)' }} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis
                            yAxisId="pressure"
                            orientation="left"
                            stroke="#4cd9a3"
                            tick={{ fill: 'var(--muted)' }}
                            domain={['dataMin - 0.5', 'dataMax + 0.5']}
                            label={{ value: 'bar', angle: -90, position: 'insideLeft', fill: '#4cd9a3' }}
                        />
                        <YAxis
                            yAxisId="flow"
                            orientation="right"
                            stroke="#48b5ff"
                            tick={{ fill: 'var(--muted)' }}
                            domain={[0, 'dataMax + 10']}
                            label={{ value: 'm3/h', angle: 90, position: 'insideRight', fill: '#48b5ff' }}
                        />
                        <YAxis
                            yAxisId="level"
                            orientation="right"
                            stroke="#ffb347"
                            tick={{ fill: 'var(--muted)' }}
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            width={42}
                            label={{ value: '%', angle: 90, position: 'insideRight', fill: '#ffb347' }}
                        />
                        <Tooltip
                            contentStyle={{ background: '#111827', borderColor: 'rgba(255,255,255,0.08)' }}
                            labelStyle={{ color: 'white' }}
                        />
                        <Legend verticalAlign="top" align="right" iconType="circle" />
                        <Line yAxisId="pressure" type="monotone" dataKey="pressure" name="Pression" stroke="#4cd9a3" dot={false} strokeWidth={2} isAnimationActive={false} />
                        <Line yAxisId="flow" type="monotone" dataKey="flow_rate" name="Debit" stroke="#48b5ff" dot={false} strokeWidth={2} isAnimationActive={false} />
                        <Line yAxisId="level" type="monotone" dataKey="tank_level" name="Niveau" stroke="#ffb347" dot={false} strokeWidth={2} isAnimationActive={false} />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </section>
    );
};

export default TrendChart;
