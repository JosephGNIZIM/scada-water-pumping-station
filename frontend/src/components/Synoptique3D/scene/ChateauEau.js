import * as THREE from 'three';
import { addBox, addCylinder, addSphere, mkMat, mkPipe } from './Primitives';

export default class ChateauEau {
    constructor() {
        this.group = new THREE.Group();
        this.waterMaterial = mkMat(0x1a6fba, { transparent: true, opacity: 0.9 });
        this.waterMesh = null;
        this.build();
    }

    build() {
        // STRUCTURE MÉTALLIQUE
        // 4 pieds CylinderGeometry
        const pieds = [
            [-1.15, -0.9],
            [1.15, -0.9],
            [-1.15, 0.9],
            [1.15, 0.9],
        ];
        
        pieds.forEach(([x, z]) => {
            addCylinder(this.group, 0.1, 0.13, 7.2, [x, 3.6, z], 0x667788, { segments: 12 });
        });

        // 3 séries de renforts horizontaux à 28%, 55%, 78%
        const reinforcementHeights = [2.0, 3.96, 5.62];
        reinforcementHeights.forEach((y) => {
            // Poutres horizontales reliant les 4 pieds
            this.group.add(mkPipe(-1.15, y, -0.9, 1.15, y, -0.9, 0x667788, 0.04));
            this.group.add(mkPipe(-1.15, y, 0.9, 1.15, y, 0.9, 0x667788, 0.04));
            this.group.add(mkPipe(-1.15, y, -0.9, -1.15, y, 0.9, 0x667788, 0.04));
            this.group.add(mkPipe(1.15, y, -0.9, 1.15, y, 0.9, 0x667788, 0.04));
        });

        // Croix de contreventements diagonaux
        const diagonalLevels = [1.5, 3.96, 6.3];
        diagonalLevels.forEach((y) => {
            this.group.add(mkPipe(-1.15, y, -0.9, 1.15, y, 0.9, 0x667788, 0.025));
            this.group.add(mkPipe(1.15, y, -0.9, -1.15, y, 0.9, 0x667788, 0.025));
        });

        // CUVE
        // Fond plat
        addCylinder(this.group, 1.15, 1.2, 0.12, [0, 7.36, 0], 0x667788);

        // Corps transparent (CylinderGeometry)
        const tankGeom = new THREE.CylinderGeometry(1.04, 1.04, 2.4, 24, 1, true);
        const tankMat = mkMat(0x84c8e8, { transparent: true, opacity: 0.28 });
        const tank = new THREE.Mesh(tankGeom, tankMat);
        tank.position.y = 8.55;
        tank.castShadow = true;
        this.group.add(tank);

        // Anneau renfort milieu
        addCylinder(this.group, 1.12, 1.12, 0.1, [0, 8.5, 0], 0x667788);

        // Dôme SphereGeometry
        addSphere(this.group, 1.12, [0, 9.72, 0], 0x7788aa, { sy: 0.36 });

        // Évent sur le dôme (CylinderGeometry fin)
        addCylinder(this.group, 0.055, 0.065, 0.25, [0, 10.0, 0], 0x667788, { segments: 12 });

        // EAU INTÉRIEURE ANIMÉE (CRITIQUE)
        this.waterMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.97, 0.97, 1.0, 24), this.waterMaterial);
        this.waterMesh.position.y = 7.62;
        this.waterMesh.scale.y = 1.5;
        this.waterMesh.castShadow = true;
        this.group.add(this.waterMesh);

        // TUYAUTERIE SORTIE
        // Tuyau sortie horizontal vers réseau
        this.group.add(mkPipe(0.95, 7.95, 0, 5.8, 0.55, -1.5, 0x4488aa, 0.08));

        // Vanne de barrage orange
        addBox(this.group, [0.4, 0.32, 0.12], [3.5, 7.5, -0.8], 0xcc4400);

        // Volant de vanne (CylinderGeometry fin vertical)
        addCylinder(this.group, 0.18, 0.18, 0.05, [3.5, 8.0, -0.8], 0xcc4400, { ry: Math.PI / 2, segments: 12 });
    }

    update(data) {
        const level = Math.max(0, Math.min(100, data?.reservoir?.niveau_pct ?? 55));
        
        // Mise à jour hauteur eau : scale.y suit niveau_pct/100 * 2.2
        const height = (level / 100) * 2.2;
        this.waterMesh.scale.y = height;
        
        // Position ajustée pour rester ancrée au fond
        const legH = 0.12; // Hauteur du fond
        this.waterMesh.position.y = 7.45 + height * 0.5;

        // Couleur eau change selon seuils
        if (level < 10) {
            this.waterMaterial.color.setHex(0xcc4400); // Rouge < 10%
        } else if (level < 30) {
            this.waterMaterial.color.setHex(0xbb8800); // Orange 10-30%
        } else {
            this.waterMaterial.color.setHex(0x1a6fba); // Bleu > 30%
        }

        // Calcul physique pression = niveau/100 * 2.6
        // (Sera utilisé pour synchronisation mais pas d'affichage direct)
    }
}
