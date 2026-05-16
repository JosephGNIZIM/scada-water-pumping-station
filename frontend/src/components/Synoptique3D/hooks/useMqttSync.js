/**
 * Hook MQTT pour synchronisation temps réel avec la scène 3D
 * À utiliser dans le composant parent de Synoptique3D
 * 
 * Usage:
 * const [simState, alarmActive] = useMqttSync(mqttClient, 'aep/#');
 * <Synoptique3D simulationState={simState} alarmActive={alarmActive} />
 */

import { useEffect, useCallback, useRef, useState } from 'react';

// Structure de base pour les données de simulation
const defaultSimulationState = {
    pumps: [
        {
            running: false,
            status: 'stopped',
            temperature: 28,
        },
    ],
    tank1Level: 50,
    tank2Level: 50,
    measuredPressure: 0,
    measuredFlow: 0,
    estimatedEnergyKw: 0.5,
    mode: 'simulation',
    runState: 'stopped',
};

export function useMqttSync(mqttClient, subscriptionTopics = 'aep/#') {
    const [simulationState, setSimulationState] = useState(defaultSimulationState);
    const [alarmActive, setAlarmActive] = useState(false);
    const dataBufferRef = useRef({});
    const lastUpdateRef = useRef(Date.now());

    // Parser les messages MQTT selon le topic
    const handleMqttMessage = useCallback((topic, payload) => {
        try {
            const message = JSON.parse(payload.toString());
            
            // Mapper les topics MQTT aux propriétés de simulation
            const topicParts = topic.split('/');
            
            if (topic.includes('pompe/etat')) {
                dataBufferRef.current.pumpStatus = message.etat || message;
            } else if (topic.includes('pompe/debit')) {
                dataBufferRef.current.measuredFlow = parseFloat(message.debit_m3h) || parseFloat(message);
            } else if (topic.includes('pompe/temperature')) {
                dataBufferRef.current.pumpTemp = parseFloat(message.temperature_c) || parseFloat(message);
            } else if (topic.includes('pompe/courant')) {
                dataBufferRef.current.pumpCurrent = parseFloat(message.courant_a) || parseFloat(message);
            } else if (topic.includes('reservoir/niveau')) {
                dataBufferRef.current.tankLevel = parseFloat(message.niveau_pct) || parseFloat(message);
            } else if (topic.includes('solaire/puissance')) {
                dataBufferRef.current.solarPower = parseFloat(message.puissance_w) || parseFloat(message);
            } else if (topic.includes('solaire/tension')) {
                dataBufferRef.current.solarVoltage = parseFloat(message.tension_v) || parseFloat(message);
            } else if (topic.includes('distribution/pression')) {
                dataBufferRef.current.measuredPressure = parseFloat(message.pression_bar) || parseFloat(message);
            } else if (topic.includes('distribution/debit')) {
                dataBufferRef.current.distribDebit = parseFloat(message.debit_m3h) || parseFloat(message);
            } else if (topic.includes('meteo/heure')) {
                dataBufferRef.current.hour = parseFloat(message.heure_journee) || parseFloat(message);
            } else if (topic.includes('meteo/nuages')) {
                dataBufferRef.current.clouds = parseFloat(message.couverture_nuages) || parseFloat(message);
            }
        } catch (error) {
            console.error(`Erreur parsing MQTT ${topic}:`, error);
        }
    }, []);

    // Mise à jour agrégée de l'état (throttling pour performance)
    const updateSimulationState = useCallback(() => {
        const now = Date.now();
        
        // Throttle: mise à jour max toutes les 50ms (compatible 20FPS min pour 3D)
        if (now - lastUpdateRef.current < 50) {
            return;
        }
        
        lastUpdateRef.current = now;
        
        const buffer = dataBufferRef.current;
        
        // Mapper les données buffer vers la structure de simulation
        setSimulationState(prevState => {
            const newState = { ...prevState };
            
            // Pompe
            if (buffer.pumpStatus !== undefined) {
                newState.pumps = [{
                    running: buffer.pumpStatus === 'marche',
                    status: buffer.pumpStatus === 'defaut' ? 'faulted' : (buffer.pumpStatus === 'marche' ? 'running' : 'stopped'),
                    temperature: buffer.pumpTemp ?? prevState.pumps[0].temperature,
                    current: buffer.pumpCurrent ?? 0,
                    debit: buffer.measuredFlow ?? 0,
                }];
            }
            
            // Réservoirs
            if (buffer.tankLevel !== undefined) {
                newState.tank1Level = buffer.tankLevel;
                newState.tank2Level = buffer.tankLevel;
            }
            
            // Pression et débit
            if (buffer.measuredPressure !== undefined) {
                newState.measuredPressure = buffer.measuredPressure;
            }
            if (buffer.measuredFlow !== undefined) {
                newState.measuredFlow = buffer.measuredFlow;
            }
            
            // Énergie solaire
            if (buffer.solarPower !== undefined) {
                newState.estimatedEnergyKw = buffer.solarPower / 1000;
            }
            
            newState.mode = 'real';
            
            return newState;
        });
        
        // Déterminer si une alarme doit être active
        const criticalLevel = buffer.tankLevel !== undefined && buffer.tankLevel < 10;
        const pumpFault = buffer.pumpStatus === 'defaut';
        setAlarmActive(criticalLevel || pumpFault);
        
        // Réinitialiser le buffer
        dataBufferRef.current = {};
    }, []);

    // Attacher les listeners MQTT
    useEffect(() => {
        if (!mqttClient) {
            console.warn('MQTT client non disponible');
            return undefined;
        }

        // Vérifier que le client est connecté
        if (!mqttClient.connected) {
            console.log('MQTT client pas encore connecté, attente...');
            const checkConnection = setInterval(() => {
                if (mqttClient.connected) {
                    mqttClient.subscribe(subscriptionTopics, (err) => {
                        if (err) {
                            console.error('Erreur subscription MQTT:', err);
                        } else {
                            console.log('Subscription MQTT réussie:', subscriptionTopics);
                        }
                    });
                    clearInterval(checkConnection);
                }
            }, 1000);
            
            return () => clearInterval(checkConnection);
        }

        // Subscribe aux topics
        mqttClient.subscribe(subscriptionTopics, (err) => {
            if (err) {
                console.error('Erreur subscription MQTT:', err);
            }
        });

        // Listener pour messages
        const messageHandler = (topic, payload) => {
            handleMqttMessage(topic, payload);
        };

        mqttClient.on('message', messageHandler);

        // Boucle d'actualisation (60fps pour 3D)
        const updateInterval = setInterval(updateSimulationState, 16.67);

        // Cleanup
        return () => {
            clearInterval(updateInterval);
            mqttClient.removeListener('message', messageHandler);
            mqttClient.unsubscribe(subscriptionTopics);
        };
    }, [mqttClient, subscriptionTopics, handleMqttMessage, updateSimulationState]);

    return [simulationState, alarmActive];
}

/**
 * Alternative : Hook pour broker terrain réel
 * Usage :
 * const [simState, alarmActive] = useMqttBrokerTerrain('192.168.1.100', 1883);
 */
export function useMqttBrokerTerrain(brokerHost = '192.168.1.100', brokerPort = 1883) {
    const clientRef = useRef(null);
    const [simulationState, setSimulationState] = useState(defaultSimulationState);
    const [alarmActive, setAlarmActive] = useState(false);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const mqtt = require('mqtt');
        
        const options = {
            host: brokerHost,
            port: brokerPort,
            protocol: 'mqtt',
            reconnectPeriod: 1000,
            connectTimeout: 30000,
        };

        console.log(`Connexion au broker MQTT: ${brokerHost}:${brokerPort}`);
        
        clientRef.current = mqtt.connect(options);
        const client = clientRef.current;

        client.on('connect', () => {
            console.log('✅ Connecté au broker MQTT terrain');
            setConnected(true);
            client.subscribe('aep/#');
        });

        client.on('error', (error) => {
            console.error('❌ Erreur MQTT:', error);
            setConnected(false);
        });

        client.on('disconnect', () => {
            console.log('❌ Déconnecté du broker MQTT');
            setConnected(false);
        });

        return () => {
            if (client.connected) {
                client.end();
            }
        };
    }, [brokerHost, brokerPort]);

    // Utiliser le hook useMqttSync avec le client créé
    const [state, alarm] = useMqttSync(clientRef.current);
    
    return [{ ...state, mqttConnected: connected }, alarm];
}

export default useMqttSync;
