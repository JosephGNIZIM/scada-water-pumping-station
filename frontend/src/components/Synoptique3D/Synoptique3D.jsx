import React from 'react';
import SceneAEP from './scene/SceneAEP';
import HUD from './controls/HUD';
import useSceneData from './hooks/useSceneData';

export default function Synoptique3D({ simulationState, alarmActive }) {
    const canvasRef = React.useRef(null);
    const sceneRef = React.useRef(null);
    const [scenario, setScenario] = React.useState('normal');
    const sceneData = useSceneData(simulationState, scenario);

    React.useEffect(() => {
        if (!canvasRef.current) return undefined;
        
        try {
            sceneRef.current = new SceneAEP(canvasRef.current, sceneData);
        } catch (error) {
            console.error('Erreur initialisation SceneAEP:', error);
            return undefined;
        }
        
        const handleResize = () => sceneRef.current?.resize();
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            if (sceneRef.current) {
                sceneRef.current.dispose();
                sceneRef.current = null;
            }
        };
    }, []);

    React.useEffect(() => {
        if (sceneRef.current && sceneData) {
            sceneRef.current.setData(sceneData);
        }
    }, [sceneData]);

    const isAlarmActive = alarmActive 
        || sceneData?.pompe?.etat === 'defaut' 
        || sceneData?.reservoir?.niveau_pct < 10;

    return (
        <section className="synoptique3d-wrap">
            <canvas ref={canvasRef} className="synoptique3d-canvas" />
            <HUD
                data={sceneData}
                alarmActive={isAlarmActive}
                onPreset={(preset) => sceneRef.current?.setCameraPreset(preset)}
                onScenario={setScenario}
            />
        </section>
    );
}
