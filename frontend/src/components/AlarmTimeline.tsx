import React from 'react';

const AlarmTimeline: React.FC<{ values: number[] }> = ({ values }) => (
    <section className="panel chart-panel">
        <div className="panel-heading">
            <div>
                <p className="eyebrow">24h</p>
                <h2>Alarm Timeline</h2>
            </div>
        </div>
        <div className="timeline-bars">
            {values.map((value, index) => (
                <div key={index} className="timeline-bar-wrap">
                    <div className="timeline-bar" style={{ height: `${Math.max(12, value * 22)}px` }} />
                    <span>{index * 3}h</span>
                </div>
            ))}
        </div>
    </section>
);

export default AlarmTimeline;
