import * as THREE from 'three';

export default class ParticleSmoke {
    constructor() {
        this.count = 12;
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.count * 3);
        this.opacities = new Float32Array(this.count);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0x888888,
            size: 0.18,
            transparent: true,
            sizeAttenuation: true,
        });
        material.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                '#include <logdepthbuf_vertex>',
                `#include <logdepthbuf_vertex>
                 gl_PointSize *= opacity;`,
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <logdepthbuf_fragment>',
                `#include <logdepthbuf_fragment>
                 gl_FragColor.a *= opacity;`,
            );
        };

        this.points = new THREE.Points(this.geometry, material);
        this.points.position.set(-6.5, 0, 3); // Position groupe électrogène
        this.localTime = 0;
    }

    update(data, elapsed) {
        const active = data?.pompe?.etat === 'defaut' || data?.meteo?.couverture_nuages > 85;
        this.points.visible = active;
        if (!active) return;

        this.localTime = elapsed;
        for (let i = 0; i < this.count; i++) {
            const seed = i * 12.34;
            const t = (this.localTime * 0.6 + seed) % 2.0;
            
            // Position : montée du pot d'échappement avec dispersion aléatoire
            const randomX = Math.sin(seed * 1.23) * 0.3 * (1 - Math.abs(t - 1.0));
            const randomZ = Math.cos(seed * 4.56) * 0.3 * (1 - Math.abs(t - 1.0));
            
            this.positions[i * 3] = randomX;           // x
            this.positions[i * 3 + 1] = 0.7 + t * 1.5; // y - montée
            this.positions[i * 3 + 2] = randomZ;       // z
            
            // Opacité : disparition progressive
            this.opacities[i] = Math.max(0, 0.35 * (1 - t / 1.8));
        }
        
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.opacity.needsUpdate = true;
    }
}
