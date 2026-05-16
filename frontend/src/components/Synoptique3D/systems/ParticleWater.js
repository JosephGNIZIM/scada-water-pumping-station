import * as THREE from 'three';

export default class ParticleWater {
    constructor() {
        this.count = 22;
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.count * 3);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.points = new THREE.Points(
            this.geometry,
            new THREE.PointsMaterial({ color: 0x44ccff, size: 0.16, transparent: true, opacity: 0.95 }),
        );
    }

    // Trajectoire 3 segments selon spécifications
    pointAt(t) {
        let p = new THREE.Vector3();

        if (t < 0.55) {
            // Segment 1 : montée verticale forage (0 < t < 0.55)
            const local = t / 0.55;
            p.x = -5;
            p.y = 1.4 + local * 9.8;
            p.z = 0;
        } else if (t < 0.72) {
            // Segment 2 : coude horizontal vers cuve (0.55 < t < 0.72)
            const local = (t - 0.55) / 0.17;
            p.x = -5 + local * 2.8;
            p.y = 11.2;
            p.z = 0;
        } else {
            // Segment 3 : descente dans cuve (0.72 < t < 1.0)
            const local = (t - 0.72) / 0.28;
            p.x = -2.2;
            p.y = 11.2 - local * 2.4;
            p.z = 0;
        }

        return p;
    }

    update(data, elapsed) {
        const running = data?.pompe?.etat === 'marche';
        const debit = Math.max(0, data?.pompe?.debit_m3h ?? 0);
        
        // Opacité : 0.95 si pompe active, 0 si arrêtée
        this.points.material.opacity = running ? 0.95 : 0;
        
        if (!running) {
            // Les particules s'arrêtent immédiatement
            for (let i = 0; i < this.count; i++) {
                this.positions[i * 3] = -5;
                this.positions[i * 3 + 1] = 1.4;
                this.positions[i * 3 + 2] = 0;
            }
            this.geometry.attributes.position.needsUpdate = true;
            return;
        }

        // Vitesse : speed = 0.006 + debit_m3h*0.001
        const speed = 0.006 + debit * 0.001;
        
        for (let i = 0; i < this.count; i++) {
            const t = (elapsed * speed + i / this.count) % 1;
            const p = this.pointAt(t);
            this.positions[i * 3] = p.x;
            this.positions[i * 3 + 1] = p.y;
            this.positions[i * 3 + 2] = p.z;
        }

        this.geometry.attributes.position.needsUpdate = true;
    }
}
