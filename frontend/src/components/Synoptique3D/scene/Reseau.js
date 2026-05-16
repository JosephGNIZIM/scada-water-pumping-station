import * as THREE from 'three';
import { addBox, addCylinder, mkPipe, mkMat } from './Primitives';

export default class Reseau {
    constructor() {
        this.group = new THREE.Group();
        this.build();
    }

    build() {
        // Tuyau principal ∅18mm depuis la base du château
        this.group.add(mkPipe(0.95, 7.5, 0, 8.5, 0.4, -2.5, 0x4488aa, 0.09));
        
        // Bifurcation vers fontaine publique
        this.group.add(mkPipe(8.5, 0.4, -2.5, 8.8, 0.4, -2.2, 0x4488aa, 0.08));
        
        // Bifurcation vers second quartier (village)
        this.group.add(mkPipe(8.5, 0.4, -2.5, 14.0, 0.4, 5.0, 0x4488aa, 0.08));
        
        // Vannes de sectionnement
        addBox(this.group, [0.32, 0.28, 0.32], [8.5, 0.5, -2.5], 0xff8c1a);
        addBox(this.group, [0.32, 0.28, 0.32], [14.0, 0.5, 5.0], 0xff8c1a);
        
        // Compteur volumétrique (BoxGeometry bleu avec écran)
        addBox(this.group, [0.4, 0.3, 0.25], [5.5, 0.35, -0.8], 0x2169a6);
        addBox(this.group, [0.15, 0.08, 0.12], [5.55, 0.42, -0.75], 0xcccccc);
        
        // Tuyaux enterrés simulés (positionnés à y=0.15)
        this.group.add(mkPipe(-2.0, 0.15, 2.0, 4.0, 0.15, 3.5, 0x666666, 0.07));
        this.group.add(mkPipe(4.0, 0.15, 3.5, 12.0, 0.15, 5.0, 0x666666, 0.07));
    }
}
