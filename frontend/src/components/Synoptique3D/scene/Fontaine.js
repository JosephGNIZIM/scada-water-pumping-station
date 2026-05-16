import * as THREE from 'three';
import { addBox, addCylinder, mkPipe, mkMat } from './Primitives';

export default class Fontaine {
    constructor() {
        this.group = new THREE.Group();
        this.group.position.set(8.8, 0, -2.2);
        this.build();
    }

    build() {
        // Tuyau arrivée
        this.group.add(mkPipe(-8.2, 0.42, 0.7, -1.1, 0.42, 0.2, 0x4488aa, 0.07));
        this.group.add(mkPipe(-1.1, 0.42, 0.2, 2.2, 0.42, -1.2, 0x4488aa, 0.07));
        
        // Vanne de sectionnement
        addBox(this.group, [0.32, 0.28, 0.32], [-1.0, 0.45, 0.2], 0xff8c1a);
        
        // Compteur d'eau
        addBox(this.group, [0.58, 0.38, 0.42], [0.5, 0.52, -0.15], 0x2169a6);
        
        // Socle béton CylinderGeometry
        addCylinder(this.group, 0.75, 0.85, 0.28, [0, 0.12, 0], 0xbbbbaa, { segments: 12 });
        
        // Colonne centrale CylinderGeometry
        addCylinder(this.group, 0.28, 0.32, 0.95, [0, 0.65, 0], 0xd0c7b5, { segments: 16 });
        
        // Tablette BoxGeometry avec 2 robinets latéraux
        addBox(this.group, [0.65, 0.18, 0.28], [0, 1.2, 0], 0xb8b5a8);
        
        // Robinets (BoxGeometry plus fins)
        addBox(this.group, [0.08, 0.12, 0.18], [-0.35, 1.05, 0], 0x888888);
        addBox(this.group, [0.08, 0.12, 0.18], [0.35, 1.05, 0], 0x888888);
        
        // Bac de récupération CylinderGeometry en bas
        addCylinder(this.group, 1.2, 1.2, 0.025, [0.1, 0.03, 0.78], 0x1b6eaa, { transparent: true, opacity: 0.5, segments: 16 });
        
        // Mare au sol CylinderGeometry très plat transparent bleu
        const waterGeom = new THREE.CylinderGeometry(0.85, 0.85, 0.02, 24);
        const waterMat = mkMat(0x1b6eaa, { transparent: true, opacity: 0.6 });
        const waterMesh = new THREE.Mesh(waterGeom, waterMat);
        waterMesh.position.set(0.1, 0.02, 0.78);
        this.group.add(waterMesh);
    }
}
