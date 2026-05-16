import * as THREE from 'three';
import { addBox, addCylinder, addSphere, mkPipe, mkMat } from './Primitives';

export default class Terrain {
    constructor() {
        this.group = new THREE.Group();
        this.buildGround();
        this.buildFence();
        this.buildVegetation();
        this.buildRoads();
        this.buildVillage();
    }

    buildGround() {
        // Sol herbe africaine
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(160, 160, 32, 32),
            new THREE.MeshLambertMaterial({ color: 0x7a9e4e }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.group.add(ground);

        // Patches de terre sèche dispersés
        for (let i = 0; i < 12; i++) {
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            const sz = 2 + Math.random() * 3;
            const sx = 3 + Math.random() * 4;
            if (Math.abs(x) < 10 || Math.abs(z) < 10) continue; // Éviter la station
            addBox(this.group, [sx, 0.02, sz], [x, 0.01, z], 0xb8956a);
        }

        // Dalle béton forage
        addBox(this.group, [2.6, 0.12, 2.6], [-5, 0.06, 0], 0xccccbb);
        // Dalle béton château d'eau
        addBox(this.group, [5.5, 0.08, 4.2], [0, 0.04, 0], 0xccccbb);
    }

    buildRoads() {
        // Chemin de terre forage vers bâtiment
        for (let i = 0; i < 8; i++) {
            const lerpFactor = i / 7;
            const x = -5 + lerpFactor * 3;
            const z = 0 + lerpFactor * 4;
            addBox(this.group, [0.8, 0.02, 1.2], [x, 0.01, z], 0xc4a265);
        }
    }

    buildFence() {
        // Périmètre 16m x 17m avec poteaux tous les 2.5m
        const xs = [-4, 4];
        const zs = [-6.5, 6.5];
        
        // Poteaux CylinderGeometry
        const posts = [];
        for (let x = xs[0]; x <= xs[1]; x += 2.5) {
            for (let z = zs[0]; z <= zs[1]; z += 2.5) {
                posts.push([x, z]);
            }
        }
        
        posts.forEach(([x, z]) => {
            addCylinder(this.group, 0.045, 0.06, 1.5, [x, 0.75, z], 0xaaaaaa, { segments: 12 });
        });

        // 2 rails horizontaux reliant chaque poteau
        [0.5, 1.0].forEach((y) => {
            this.group.add(mkPipe(xs[0], y, zs[0], xs[1], y, zs[0], 0xaaaaaa, 0.03));
            this.group.add(mkPipe(xs[0], y, zs[1], xs[1], y, zs[1], 0xaaaaaa, 0.03));
            this.group.add(mkPipe(xs[0], y, zs[0], xs[0], y, zs[1], 0xaaaaaa, 0.03));
            this.group.add(mkPipe(xs[1], y, zs[0], xs[1], y, zs[1], 0xaaaaaa, 0.03));
        });

        // Portail côté ouest (x = -4)
        addBox(this.group, [1.5, 0.08, 0.15], [-4, 0.5, -6.55], 0xaaaaaa);
        addBox(this.group, [1.5, 0.08, 0.15], [-4, 0.9, -6.55], 0xaaaaaa);
        // Barreaux horizontaux du portail
        for (let i = 0; i < 4; i++) {
            this.group.add(mkPipe(-3.2, 0.55 + i * 0.25, -6.5, -4.8, 0.55 + i * 0.25, -6.5, 0xaaaaaa, 0.02));
        }
    }

    buildVegetation() {
        // 10 arbres autour (tronc + 3 sphères feuillage)
        const trees = [
            [-12, -9], [-16, 6], [9, 10], [13, -9], [20, 5],
            [-20, -3], [18, -12], [-14, 12], [15, 8], [-18, 8],
        ];
        trees.forEach(([x, z], index) => {
            // Tronc
            addCylinder(this.group, 0.15, 0.22, 1.5, [x, 0.75, z], 0x6b4226, { segments: 12 });
            // 3 sphères feuillage de tailles différentes
            const sizes = [0.8 + (index % 2) * 0.2, 1.0, 0.9 + (index % 3) * 0.15];
            sizes.forEach((size, idx) => {
                const offsetY = 1.8 + idx * 0.3;
                addSphere(this.group, size, [x, offsetY, z], 0x3d8f3d, { sy: 1.1 });
            });
        });

        // 6 buissons bas (2-3 sphères par buisson)
        const bushes = [
            [[-4, -8], [-5, -8], [-4, -9]],
            [[4, -8], [5, -8], [4, -9]],
            [[-4, 8], [-5, 8], [-4, 9]],
            [[4, 8], [5, 8], [4, 9]],
            [[-8, -5], [-9, -5], [-8, -6]],
            [[8, 5], [9, 5], [8, 6]],
        ];
        bushes.forEach((positions) => {
            positions.forEach(([x, z]) => {
                addSphere(this.group, 0.35, [x, 0.3, z], 0x4a6f3d, { sy: 0.7 });
            });
        });
    }

    buildVillage() {
        // 5 maisons au fond (x > 12)
        const houses = [
            [14, 13, 1.1],
            [18, 11, 0.95],
            [22, 14, 1.2],
            [20, 8, 1.0],
            [16, 10, 1.15],
        ];
        
        houses.forEach(([x, z, scale]) => {
            this.buildHouse(x, z, scale);
        });
    }

    buildHouse(x, z, scale = 1) {
        // Murs banco
        addBox(this.group, [1.35 * scale, 0.9 * scale, 1.05 * scale], [x, 0.45 * scale, z], 0xd4b896);
        
        // Toit ConeGeometry terre cuite
        const roofGeom = new THREE.ConeGeometry(0.95 * scale, 0.65 * scale, 4);
        const roofMat = mkMat(0xcc7744);
        const roof = new THREE.Mesh(roofGeom, roofMat);
        roof.position.set(x, 1.2 * scale, z);
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        this.group.add(roof);
        
        // Porte
        addBox(this.group, [0.3 * scale, 0.6 * scale, 0.04 * scale], [x - 0.35 * scale, 0.3 * scale, z - 0.52 * scale], 0x5f4733);
        // Fenêtre
        addBox(this.group, [0.25 * scale, 0.25 * scale, 0.04 * scale], [x + 0.35 * scale, 0.6 * scale, z - 0.52 * scale], 0x6fa8ca);
    }
}
