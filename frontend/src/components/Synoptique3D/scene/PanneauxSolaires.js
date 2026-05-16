import * as THREE from 'three';
import { addBox, mkMat, mkPipe } from './Primitives';

export default class PanneauxSolaires {
    constructor() {
        this.group = new THREE.Group();
        this.group.position.set(5.5, 0, -2.5);
        this.panelMaterials = [];
        this.build();
    }

    build() {
        // STRUCTURE SUPPORT
        // 2 rails horizontaux
        this.group.add(mkPipe(-2.2, 0.9, -0.8, 2.2, 0.9, -0.8, 0x65757a, 0.04));
        this.group.add(mkPipe(-2.2, 0.9, 0.8, 2.2, 0.9, 0.8, 0x65757a, 0.04));
        
        // 4 pieds aux coins
        [-2.2, 2.2].forEach((x) => {
            [-0.8, 0.8].forEach((z) => {
                this.group.add(mkPipe(x, 0.05, z, x, 0.95, z, 0x65757a, 0.035));
            });
        });

        // 4 PANNEAUX INDIVIDUELS
        const panelPositions = [-1.55, -0.5, 0.55, 1.6];
        
        panelPositions.forEach((x, idx) => {
            // Panneau principal
            const material = mkMat(0x1a2a4a, { emissive: 0x0d244f, emissiveIntensity: 0.25 });
            const panel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 1.3), material);
            panel.position.set(x, 1.08, 0);
            panel.rotation.x = -0.38; // Inclinaison
            panel.castShadow = true;
            this.group.add(panel);
            this.panelMaterials.push(material);
            
            // Grille de cellules : BoxGeometry très fin par-dessus (6 colonnes, 4 rangées)
            const cellWidth = 0.15;
            const cellHeight = 0.28;
            const cellDepth = 0.003;
            
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 6; col++) {
                    const cellX = x - 0.45 + col * cellWidth + cellWidth / 2;
                    const cellY = 1.08 + 0.02 - row * cellHeight + cellHeight / 2;
                    addBox(
                        this.group,
                        [cellWidth - 0.01, cellHeight - 0.01, cellDepth],
                        [cellX, cellY, 0.03],
                        0x3a5a7a,
                        { rx: -0.38 },
                    );
                }
            }
            
            // Cadre/montants du panneau
            for (let i = -1; i <= 2; i++) {
                addBox(
                    this.group,
                    [0.03, 0.012, 1.25],
                    [x + i * 0.22, 1.12, 0.02],
                    0x6a87b7,
                    { rx: -0.38 },
                );
            }
        });

        // CÂBLES vers armoire électrique
        this.group.add(mkPipe(1.2, 0.2, 0.3, 3.2, 0.2, -0.8, 0x1a1a1a, 0.028));
        this.group.add(mkPipe(0.5, 0.2, -0.2, 3.2, 0.2, -1.2, 0x1a1a1a, 0.028));
    }

    update(data, elapsed) {
        const power = Math.max(0, Math.min(2000, data?.solaire?.puissance_w ?? 900));
        const cloudy = data?.meteo?.couverture_nuages ?? 0;
        const hour = data?.meteo?.heure_journee ?? new Date().getHours();
        
        // Scintillement en mode orage
        const stormPulse = cloudy > 80 ? 0.35 + Math.sin(elapsed * 18) * 0.25 : 0;
        
        // Lumière du jour
        const daylight = hour > 8 && hour < 18 ? 1 : 0;
        
        // Intensité = base + puissance + orage
        const intensity = 0.12 + (power / 2000) * 0.75 * daylight + stormPulse;
        
        this.panelMaterials.forEach((mat) => {
            mat.emissiveIntensity = Math.min(1.5, intensity);
        });
    }
}
