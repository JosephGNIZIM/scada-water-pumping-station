import * as THREE from 'three';
import { addBox, mkMat } from './Primitives';

export default class Village {
    constructor() {
        this.group = new THREE.Group();
        this.build();
    }

    buildHouse(x, z, s = 1) {
        const house = new THREE.Group();
        addBox(house, [1.35 * s, 0.9 * s, 1.05 * s], [0, 0.45 * s, 0], 0xcfb98d);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95 * s, 0.55 * s, 4), mkMat(0xb24a24));
        roof.position.y = 1.18 * s;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        house.add(roof);
        house.position.set(x, 0, z);
        this.group.add(house);
    }

    build() {
        this.buildHouse(14, 13, 1.1);
        this.buildHouse(18, 11, 0.95);
        this.buildHouse(22, 14, 1.2);
    }
}
