import * as THREE from 'three';
import { addBox, addCylinder, mkPipe } from './Primitives';

export default class Groupe {
    constructor() {
        this.group = new THREE.Group();
        this.group.position.set(-6.5, 0, 3); // Position précise selon spécifications
        
        this.body = null;
        this.exhaust = null; // Pot d'échappement pour calcul fumée
        
        this.build();
    }

    build() {
        // Carrosserie vert armée
        this.body = addBox(this.group, [1.5, 0.75, 0.75], [0, 0.42, 0], 0x4a5a44);
        
        // Toit plat avec légère saillie
        addBox(this.group, [1.6, 0.08, 0.85], [0, 0.82, 0], 0x3f4a38);
        
        // Capot moteur saillant
        addBox(this.group, [1.3, 0.18, 0.6], [0.05, 0.62, 0.2], 0x5a6a54);
        
        // Pot d'échappement CylinderGeometry vertical
        this.exhaust = addCylinder(
            this.group, 
            0.05, 0.05, 0.5,
            [0.55, 1.08, 0.2],
            0x2a2a2a, 
            { rx: Math.PI / 2, segments: 12 }
        );
        
        // Câble vers armoire électrique
        this.group.add(mkPipe(-0.7, 0.2, 0, -2.2, 0.4, -2.8, 0x161616, 0.018));
    }

    update(data, elapsed) {
        const pumpState = data?.pompe?.etat ?? 'arret';
        const clouds = data?.meteo?.couverture_nuages ?? 15;
        
        // Actif si : défaut pompe OU orage (couverture nuages > 85%)
        const active = pumpState === 'defaut' || clouds > 85;
        
        if (active && this.body) {
            // Légère vibration en mode actif
            // rotation.z = sin(tf*18)*0.004
            this.body.rotation.z = Math.sin(elapsed * 18) * 0.004;
        } else if (this.body) {
            this.body.rotation.z = 0;
        }
    }
}
