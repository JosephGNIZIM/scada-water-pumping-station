import * as THREE from 'three';
import { addBox, mkPipe, mkMat } from './Primitives';

export default class BatimentTech {
    constructor() {
        this.group = new THREE.Group();
        this.group.position.set(-6.5, 0, -4);
        this.build();
    }

    build() {
        // Murs banco
        addBox(this.group, [3.2, 2.4, 2.8], [0, 1.2, 0], 0xd4c4a0);
        
        // Toit débord
        addBox(this.group, [3.4, 0.22, 3.0], [0, 2.52, 0], 0x8f7a5a);
        
        // Porte
        addBox(this.group, [0.8, 1.5, 0.04], [-1.2, 1.0, -1.4], 0x5f4733);
        
        // Fenêtre
        addBox(this.group, [0.6, 0.6, 0.04], [0.8, 1.4, -1.4], 0x6fa8ca);
        
        // Climatiseur mural blanc
        addBox(this.group, [0.5, 0.4, 0.28], [1.4, 1.6, 0.9], 0xdddddd);
        
        // Antenne communication - poteau fin
        this.group.add(mkPipe(1.2, 2.7, -0.8, 1.2, 4.2, -0.8, 0x888888, 0.025));
        
        // Élément horizontal antenne
        this.group.add(mkPipe(0.8, 4.1, -0.8, 1.6, 4.1, -0.8, 0x888888, 0.015));
        this.group.add(mkPipe(1.2, 3.95, -1.1, 1.2, 4.25, -0.5, 0x888888, 0.015));
    }

    update(data, elapsed) {
        // Antenne peut avoir une animation légère si nécessaire
        // Laissé extensible pour ajout ultérieur
    }
}
