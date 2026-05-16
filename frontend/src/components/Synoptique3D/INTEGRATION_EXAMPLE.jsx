/**
 * EXEMPLE D'INTÉGRATION COMPLÈTE - Synoptique 3D SCADA
 * 
 * Ce fichier montre comment intégrer la simulation 3D dans votre application
 * avec synchronisation MQTT temps réel.
 * 
 * Deux modes:
 * 1. Mode SIMULATEUR: utilise les données du simulateur backend
 * 2. Mode TERRAIN: se connecte directement au broker MQTT terrain
 */

import React, { useState, useEffect } from 'react';
import Synoptique3D from './Synoptique3D';
import { useMqttSync, useMqttBrokerTerrain } from './hooks/useMqttSync';

/**
 * Option 1: Utiliser le simulateur backend (port 1883 localhost)
 */
export function Synoptique3DSimulateur() {
    const [simulationState, setSimulationState] = useState({});
    const [alarmActive, setAlarmActive] = useState(false);

    useEffect(() => {
        // Récupérer l'état du simulateur via l'API backend
        const fetchSimulatorState = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/simulation/state');
                const data = await response.json();
                setSimulationState(data);
                setAlarmActive(data.alarm === true);
            } catch (error) {
                console.error('Erreur récupération état simulateur:', error);
            }
        };

        // Mise à jour initiale
        fetchSimulatorState();

        // Polling toutes les 100ms
        const interval = setInterval(fetchSimulatorState, 100);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="synoptique3d-container">
            <h1>🌊 Station AEP SCADA 3D - Mode Simulateur</h1>
            <Synoptique3D 
                simulationState={simulationState} 
                alarmActive={alarmActive} 
            />
        </div>
    );
}

/**
 * Option 2: Utiliser un broker MQTT local (pour développement)
 */
export function Synoptique3DMqttLocal() {
    // Créer un client MQTT et l'utiliser
    const mqtt = require('mqtt');
    const [client, setClient] = React.useState(null);

    useEffect(() => {
        // Connexion au broker local
        const mqttClient = mqtt.connect('mqtt://localhost:1883', {
            clean: true,
            reconnectPeriod: 1000,
        });

        mqttClient.on('connect', () => {
            console.log('✅ Connecté au broker MQTT local');
            setClient(mqttClient);
        });

        mqttClient.on('error', (err) => {
            console.error('❌ Erreur MQTT local:', err);
        });

        return () => {
            if (mqttClient.connected) {
                mqttClient.end();
            }
        };
    }, []);

    const [simulationState, alarmActive] = useMqttSync(client);

    if (!client) {
        return <div>En attente de connexion au broker MQTT...</div>;
    }

    return (
        <div className="synoptique3d-container">
            <h1>🌊 Station AEP SCADA 3D - MQTT Local</h1>
            <Synoptique3D 
                simulationState={simulationState} 
                alarmActive={alarmActive} 
            />
        </div>
    );
}

/**
 * Option 3: Utiliser un broker MQTT terrain réel (4G/Ethernet)
 */
export function Synoptique3DMqttTerrain() {
    // Configuration du broker terrain
    const BROKER_TERRAIN_HOST = process.env.REACT_APP_MQTT_HOST || '192.168.1.100';
    const BROKER_TERRAIN_PORT = parseInt(process.env.REACT_APP_MQTT_PORT || '1883');

    // Utiliser le hook qui crée le client automatiquement
    const [simulationState, alarmActive] = useMqttBrokerTerrain(
        BROKER_TERRAIN_HOST, 
        BROKER_TERRAIN_PORT
    );

    const connectionStatus = simulationState.mqttConnected ? '✅' : '❌';
    const statusColor = simulationState.mqttConnected ? '#00ff44' : '#ff4466';

    return (
        <div className="synoptique3d-container">
            <div className="synoptique3d-header">
                <h1>🌊 Station AEP SCADA 3D - Terrain Réel</h1>
                <div style={{ color: statusColor, fontSize: '14px' }}>
                    {connectionStatus} Broker: {BROKER_TERRAIN_HOST}:{BROKER_TERRAIN_PORT}
                </div>
            </div>
            <Synoptique3D 
                simulationState={simulationState} 
                alarmActive={alarmActive} 
            />
        </div>
    );
}

/**
 * Option 4: Composant intelligent avec sélecteur de mode
 */
export function Synoptique3DConfigurable() {
    const [mode, setMode] = useState('simulateur'); // 'simulateur' | 'mqtt-local' | 'mqtt-terrain'

    const renderMode = () => {
        switch (mode) {
            case 'mqtt-local':
                return <Synoptique3DMqttLocal />;
            case 'mqtt-terrain':
                return <Synoptique3DMqttTerrain />;
            case 'simulateur':
            default:
                return <Synoptique3DSimulateur />;
        }
    };

    return (
        <div className="synoptique3d-app">
            <div className="synoptique3d-mode-selector">
                <label>Mode de connexion:</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="simulateur">📊 Simulateur Backend</option>
                    <option value="mqtt-local">🔌 MQTT Local (localhost:1883)</option>
                    <option value="mqtt-terrain">🛰️ Terrain Réel (4G/Ethernet)</option>
                </select>
            </div>
            
            {renderMode()}
        </div>
    );
}

// Export par défaut
export default Synoptique3DConfigurable;

/**
 * STYLES CSS À AJOUTER
 * 
 * .synoptique3d-container {
 *   width: 100%;
 *   padding: 20px;
 * }
 * 
 * .synoptique3d-header {
 *   display: flex;
 *   justify-content: space-between;
 *   align-items: center;
 *   margin-bottom: 20px;
 * }
 * 
 * .synoptique3d-mode-selector {
 *   margin-bottom: 20px;
 *   padding: 10px;
 *   background: rgba(0, 0, 0, 0.5);
 *   border-radius: 6px;
 * }
 * 
 * .synoptique3d-mode-selector label {
 *   margin-right: 10px;
 *   font-weight: bold;
 * }
 * 
 * .synoptique3d-mode-selector select {
 *   padding: 8px;
 *   border-radius: 4px;
 *   border: 1px solid #00ddff;
 *   background: rgba(6, 22, 32, 0.78);
 *   color: #e9fbff;
 * }
 */
