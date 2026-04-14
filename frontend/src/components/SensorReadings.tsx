import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSensorReadingsAsync } from '../store/slices/sensorSlice';
import { useI18n } from '../i18n';
import Sparkline from './Sparkline';
import { getSensorLabel, getSensorUnit, makeSparklineData } from '../utils/scada';

const SensorReadings: React.FC = () => {
    const dispatch = useAppDispatch();
    const { readings, status, error } = useAppSelector((state) => state.sensor);
    const { t, formatDateTime } = useI18n();

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchSensorReadingsAsync());
        }
    }, [status, dispatch]);

    if (status === 'loading') {
        return <div>{t('sensor.loading')}</div>;
    }

    if (status === 'failed') {
        return <div>{t('common.error')}: {error}</div>;
    }

    return (
        <section className="panel sensor-readings" data-tutorial="sensor-panel">
            <div className="panel-heading">
                <div>
                    <p className="eyebrow">{t('sensor.eyebrow')}</p>
                    <h2>{t('sensor.title')}</h2>
                </div>
                <button className="btn btn-ghost" onClick={() => dispatch(fetchSensorReadingsAsync())}>
                    {t('sensor.refresh')}
                </button>
            </div>
            {readings.length === 0 ? (
                <p>{t('sensor.empty')}</p>
            ) : (
                <ul className="reading-list reading-list--dense">
                    {readings.map((reading) => (
                        <li key={reading.id} className="reading-item">
                            <div>
                                <strong>{getSensorLabel(reading.type)}</strong>
                                <p className="muted">{t('sensor.timestamp')}: {formatDateTime(reading.timestamp)}</p>
                                <Sparkline values={makeSparklineData(reading)} height={42} />
                            </div>
                            <span className="reading-value">{reading.value} {getSensorUnit(reading.type)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

export default SensorReadings;
