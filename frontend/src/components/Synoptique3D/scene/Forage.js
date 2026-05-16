import * as THREE from 'three';
import { addBox, addCylinder, mkPipe } from './Primitives';

export default class Forage {
    constructor() {
        this.group = new THREE.Group();
        this.group.position.set(-5, 0, 0);
        this.build();
    }

    build() {
        // Dalle béton 2.6x0.12x2.6
        addBox(this.group, [2.6, 0.12, 2.6], [0, 0.06, 0], 0xccccbb);
        
        // Tubage PVC CylinderGeometry
        addCylinder(this.group, 0.22, 0.24, 1.3, [0, 0.7, 0], 0xddddcc, { segments: 16 });
        
        // Bague acier CylinderGeometry
        addCylinder(this.group, 0.25, 0.25, 0.16, [0, 1.25, 0], 0xaaaaaa, { segments: 16 });
        
        // Chapeau de forage BoxGeometry
        addBox(this.group, [0.65, 0.28, 0.65], [0, 1.42, 0], 0x778899);
        
        // Té de sortie CylinderGeometry
        addCylinder(this.group, 0.08, 0.08, 0.35, [0.14, 1.35, 0.12], 0x556677, { ry: Math.PI / 2, segments: 12 });
        
        // Panneau signalétique incliné (BoxGeometry bleu)
        addBox(this.group, [0.75, 0.38, 0.04], [-0.75, 0.72, -0.85], 0x1a4488, { rx: -0.25 });
        
        // Câble électrique pompe immergée (mkPipe fin noir descendant)
        // Symbolise la pompe à -30m
        this.group.add(mkPipe(0, 0.1, 0, 0, -1.4, 0, 0x0a0a0a, 0.08));
    }
}
