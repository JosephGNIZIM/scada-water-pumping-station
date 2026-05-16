import { useMemo } from 'react';

const scenarioOverrides = {
    normal: {
        pompe: { etat: 'marche', courant_a: 7.2, debit_m3h: 4.5 },
        reservoir: { niveau_pct: 68 },
    },
    'pump-fault': {
        pompe: { etat: 'defaut', courant_a: 0, debit_m3h: 0, temperature_c: 82 },
        reservoir: { niveau_pct: 35 },
    },
    'forage-dry': {
        pompe: { etat: 'defaut', courant_a: 0, debit_m3h: 0, temperature_c: 45 },
        reservoir: { niveau_pct: 5, etat: 'critique' },
    },
    night: {
        meteo: { heure_journee: 22, couverture_nuages: 20 },
        solaire: { puissance_w: 0, ensoleillement_pct: 0 },
        pompe: { etat: 'arret', courant_a: 0, debit_m3h: 0 },
    },
    storm: {
        meteo: { couverture_nuages: 95, heure_journee: 14 },
        solaire: { puissance_w: 180, ensoleillement_pct: 8 },
        pompe: { etat: 'defaut' },
    },
    peak: {
        distribution: { pression_bar: 1.2, debit_m3h: 9.8, conso_village: 3.2 },
        reservoir: { niveau_pct: 24, etat: 'bas' },
    },
    maintenance: {
        pompe: { etat: 'arret', courant_a: 0, debit_m3h: 0, temperature_c: 28 },
        mode: 'maintenance',
    },
};

const deepMerge = (base, patch) => ({
    ...base,
    ...patch,
    pompe: { ...base.pompe, ...patch.pompe },
    reservoir: { ...base.reservoir, ...patch.reservoir },
    solaire: { ...base.solaire, ...patch.solaire },
    distribution: { ...base.distribution, ...patch.distribution },
    meteo: { ...base.meteo, ...patch.meteo },
});

export default function useSceneData(simulationState, scenarioKey) {
    return useMemo(() => {
        const pump = simulationState?.pumps?.[0];
        const running = pump?.running || simulationState?.runState === 'running';
        const faulted = pump?.status === 'faulted';
        const tankLevel = simulationState?.tank2Level ?? simulationState?.tank1Level ?? 55;
        const pressure = simulationState?.measuredPressure ?? 2.4;
        const flow = simulationState?.measuredFlow ?? (running ? 4.6 : 0);
        const hour = new Date().getHours() + new Date().getMinutes() / 60;
        const temp = pump?.temperature ?? (running ? 44 : 32);
        
        const base = {
            mode: simulationState?.mode ?? 'simulation',
            pompe: {
                etat: faulted ? 'defaut' : running ? 'marche' : 'arret',
                courant_a: running ? 7.2 : 0,
                debit_m3h: Math.max(0, flow),
                temperature_c: temp,
            },
            reservoir: {
                niveau_pct: Math.max(0, Math.min(100, tankLevel)),
                volume_m3: tankLevel * 0.42,
                etat: tankLevel < 10 ? 'critique' : tankLevel < 30 ? 'bas' : 'normal',
            },
            solaire: {
                puissance_w: Math.max(0, Math.min(2000, (simulationState?.estimatedEnergyKw ?? 0.8) * 1000)),
                tension_v: 48,
                courant_a: (simulationState?.estimatedEnergyKw ?? 0.8) / 0.048, // Approximation
                ensoleillement_pct: hour > 6 && hour < 18 ? 82 : 0,
            },
            distribution: {
                pression_bar: Math.max(0, pressure),
                debit_m3h: Math.max(0, flow),
                conso_village: Math.max(0, flow * 0.6), // 60% vers village
            },
            meteo: {
                heure_journee: hour,
                couverture_nuages: 20,
            },
        };

        return deepMerge(base, scenarioOverrides[scenarioKey] || {});
    }, [simulationState, scenarioKey]);
}
