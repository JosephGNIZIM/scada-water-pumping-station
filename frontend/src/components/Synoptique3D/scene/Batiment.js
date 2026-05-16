import * as THREE from 'three';
import { addBox } from './Primitives';

export default class Batiment {
    constructor() {
        this.group = new THREE.Group();
        this.group.position.set(-1.8, 0, 4.1);
        this.build();
    }

    build() {
        addBox(this.group, [2.5, 1.45, 1.75], [0, 0.78, 0], 0xd4c4a0);
        addBox(this.group, [2.75, 0.18, 2.0], [0, 1.6, 0], 0x9b8f78);
        addBox(this.group, [0.55, 0.9, 0.04], [-0.55, 0.52, -0.9], 0x5f4733);
        addBox(this.group, [0.5, 0.42, 0.04], [0.55, 0.9, -0.91], 0x244c62);
        addBox(this.group, [0.5, 0.32, 0.12], [1.32, 0.95, 0.2], 0xd7e1e4);
    }
}
