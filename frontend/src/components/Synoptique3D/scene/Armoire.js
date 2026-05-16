import * as THREE from 'three';
import { addBox, addSphere, mkMat, mkPipe } from './Primitives';

export default class Armoire {
    constructor() {
        this.group = new THREE.Group();
        this.group.position.set(3.2, 0, -0.8);
        
        // LED SphereGeometry avec emissive fort
        this.ledMaterial = mkMat(0x27ff63, { emissive: 0x27ff63, emissiveIntensity: 1.2 });
        this.ledMesh = null;
        
        this.lastState = null;
        this.build();
    }

    build() {
        // Boîtier principal
        addBox(this.group, [0.6, 1.0, 0.3], [0, 0.65, 0], 0x778888);
        
        // Couvercle supérieur en relief
        addBox(this.group, [0.54, 0.08, 0.22], [0, 1.0, 0], 0x999999);
        
        // Porte intérieure visible
        addBox(this.group, [0.5, 0.82, 0.02], [0, 0.65, 0.14], 0xb9c1c4);
        
        // Poignée porte
        addBox(this.group, [0.08, 0.15, 0.05], [0.25, 0.65, 0.16], 0x666666);
        
        // LED de statut (SphereGeometry)
        this.ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), this.ledMaterial);
        this.ledMesh.position.set(0.18, 0.95, -0.18);
        this.group.add(this.ledMesh);
        
        // Câbles électriques
        // vers panneaux solaires
        this.group.add(mkPipe(1.9, 0.2, -1.2, 0.25, 0.55, -0.1, 0x222222, 0.032));
        // vers pompe/forage
        this.group.add(mkPipe(-8.2, 0.2, 0.9, -0.25, 0.55, -0.1, 0x222222, 0.032));
        // vers groupe électrogène
        this.group.add(mkPipe(2.2, 0.2, 2.1, 0.25, 0.55, 0.1, 0x222222, 0.032));
    }

    update(data, elapsed) {
        const etat = data?.pompe?.etat ?? 'arret';
        const temp = data?.pompe?.temperature_c ?? 35;
        
        // Déterminer couleur LED selon état
        let color = 0x27ff63; // Vert défaut
        let intensity = 1.2;
        
        if (etat === 'defaut' || temp > 75) {
            color = 0xff2200;
            intensity = 1.2;
            // Clignotement en mode défaut
            const blink = Math.sin(elapsed * 4) > 0;
            intensity = blink ? 1.2 : 0.3;
        } else if (etat === 'arret' || temp > 60) {
            // Orange si arrêt normal ou avertissement température
            color = 0xffaa00;
            intensity = 1.0;
        } else if (etat === 'marche') {
            // Vert si en marche
            color = 0x00ff44;
            intensity = 1.2;
        } else {
            // Bleu mode maintenance/inconnu
            color = 0x0088ff;
            intensity = 1.0;
        }
        
        this.ledMaterial.color.setHex(color);
        this.ledMaterial.emissive.setHex(color);
        this.ledMaterial.emissiveIntensity = intensity;
        this.lastState = etat;
    }
}
