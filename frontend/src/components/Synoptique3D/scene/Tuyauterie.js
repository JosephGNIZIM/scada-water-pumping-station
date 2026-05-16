import * as THREE from 'three';
import { addCylinder, mkPipe } from './Primitives';

export default class Tuyauterie {
    constructor() {
        this.group = new THREE.Group();
        this.build();
    }

    build() {
        // Tuyau vertical du forage jusqu'à 11m (∅18mm bleu-gris)
        this.group.add(mkPipe(-5, 1.4, 0, -5, 11.2, 0, 0x4488aa, 0.09));
        
        // Coude horizontal vers la cuve
        this.group.add(mkPipe(-5, 11.2, 0, -2.2, 11.2, 0, 0x4488aa, 0.09));
        
        // Manchon de raccord au coude (CylinderGeometry)
        addCylinder(this.group, 0.105, 0.105, 0.3, [-2.2, 11.2, 0], 0x5088aa, { ry: Math.PI / 2, segments: 16 });
        
        // Descente dans la cuve
        this.group.add(mkPipe(-2.2, 10.9, 0, -2.2, 8.8, 0, 0x4488aa, 0.07));
        
        // Tuyau de sortie vers réseau (depuis base château)
        this.group.add(mkPipe(0.95, 7.95, 0, 5.8, 0.55, -1.5, 0x4488aa, 0.08));
    }
}
