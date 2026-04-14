import React from 'react';

const PumpStationLogo: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 128 128" aria-hidden="true">
        <defs>
            <linearGradient id="stationGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#00ff88" />
            </linearGradient>
            <linearGradient id="waterFlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#84ecff" />
                <stop offset="100%" stopColor="#00a8ff" />
            </linearGradient>
        </defs>

        <rect x="10" y="14" width="108" height="100" rx="26" fill="rgba(0,0,0,0.12)" />
        <path
            d="M24 102V52l18 10V38l18 12V28l24 14v60H24Z"
            fill="none"
            stroke="url(#stationGlow)"
            strokeWidth="6"
            strokeLinejoin="round"
        />
        <path d="M70 28V14h12v20" fill="none" stroke="#00ff88" strokeWidth="6" strokeLinecap="round" />
        <rect x="50" y="74" width="18" height="28" rx="4" fill="none" stroke="#edf6ff" strokeWidth="5" />
        <circle cx="94" cy="80" r="14" fill="none" stroke="#00d4ff" strokeWidth="6" />
        <path d="M94 66v28M80 80h28" stroke="#00d4ff" strokeWidth="4" strokeLinecap="round" />
        <path d="M20 108h88" stroke="url(#stationGlow)" strokeWidth="6" strokeLinecap="round" />
        <path d="M20 108c10-8 18-8 28 0s18 8 28 0 18-8 28 0" fill="none" stroke="url(#waterFlow)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="102" cy="108" r="6" fill="#00ff88" />
    </svg>
);

export default PumpStationLogo;
