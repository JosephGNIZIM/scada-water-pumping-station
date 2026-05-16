import * as THREE from 'three';

export default class ParticleFontain {
    constructor() {
        this.count = 18;
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.count * 3);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.points = new THREE.Points(
            this.geometry,
            new THREE.PointsMaterial({ color: 0x88ddff, size: 0.12, transparent: true, opacity: 0.9 }),
        );
        this.points.position.set(8.8, 0, -2.2);
    }

    update(data, elapsed) {
        const pressure = data?.distribution?.pression_bar ?? 2.1;
        const consoVillage = data?.distribution?.conso_village ?? 0.5;
        const hour = data?.meteo?.heure_journee ?? new Date().getHours();
        const level = data?.reservoir?.niveau_pct ?? 55;
        
        // Jet actif si : pression > 0.4 ET niveau > 10% ET pas nuit
        const nightMode = hour < 6 || hour > 18;
        const shouldFlow = pressure > 0.4 && level > 10 && !nightMode;
        
        this.points.material.opacity = shouldFlow ? 0.9 : 0;

        if (!shouldFlow) {
            this.geometry.attributes.position.needsUpdate = false;
            return;
        }

        // Vitesse proportionnelle à conso_village
        const speed = 0.5 + consoVillage * 0.18;
        
        for (let i = 0; i < this.count; i++) {
            const t = (elapsed * speed + i / this.count) % 1;
            const angle = (i % 6) * (Math.PI * 2 / 6); // 6 jets radiaux
            const spread = 0.12 + pressure * 0.05;
            
            // Trajectoire parabolique du jet
            const spread_t = spread * t;
            const x = Math.sin(angle) * spread_t;
            const y = 1.08 + t * 0.55 - t * t * 0.85; // Parabole: montée puis descente
            const z = -2.5 + Math.cos(angle) * spread_t + t * 0.45;
            
            this.positions[i * 3] = x;
            this.positions[i * 3 + 1] = y;
            this.positions[i * 3 + 2] = z;
        }
        
        this.geometry.attributes.position.needsUpdate = true;
    }
}
