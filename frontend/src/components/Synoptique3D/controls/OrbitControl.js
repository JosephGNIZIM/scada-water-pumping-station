import * as THREE from 'three';

const presets = {
    global: { position: [22, 14, 22], target: [0, 3, 0] },
    chateau: { position: [5, 12, 5], target: [0, 7, 0] },
    solaire: { position: [10, 5, -1], target: [5, 1.5, -2] },
    forage: { position: [-2, 4, 5], target: [-5, 1, 0] },
    village: { position: [14, 4, 8], target: [9, 1, -2] },
};

export default class OrbitControl {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = new THREE.Vector3(0, 3, 0);
        this.desiredTarget = this.target.clone();
        this.radius = 32;
        this.desiredRadius = 32;
        this.theta = Math.PI / 4;
        this.phi = 1.05;
        this.desiredTheta = this.theta;
        this.desiredPhi = this.phi;
        this.dragging = false;
        this.prev = { x: 0, y: 0 };
        this.attach();
        this.setPreset('global', true);
    }

    attach() {
        this.down = (event) => {
            this.dragging = true;
            this.prev = { x: event.clientX, y: event.clientY };
        };
        this.move = (event) => {
            if (!this.dragging) return;
            const dx = event.clientX - this.prev.x;
            const dy = event.clientY - this.prev.y;
            this.desiredTheta -= dx * 0.006;
            this.desiredPhi = Math.max(0.22, Math.min(1.42, this.desiredPhi + dy * 0.004));
            this.prev = { x: event.clientX, y: event.clientY };
        };
        this.up = () => { this.dragging = false; };
        this.wheel = (event) => {
            event.preventDefault();
            this.desiredRadius = Math.max(8, Math.min(55, this.desiredRadius + event.deltaY * 0.02));
        };
        this.domElement.addEventListener('pointerdown', this.down);
        window.addEventListener('pointermove', this.move);
        window.addEventListener('pointerup', this.up);
        this.domElement.addEventListener('wheel', this.wheel, { passive: false });
    }

    setPreset(name, instant = false) {
        const preset = presets[name] || presets.global;
        const position = new THREE.Vector3(...preset.position);
        this.desiredTarget.set(...preset.target);
        const offset = position.clone().sub(this.desiredTarget);
        this.desiredRadius = offset.length();
        this.desiredTheta = Math.atan2(offset.x, offset.z);
        this.desiredPhi = Math.acos(offset.y / this.desiredRadius);
        if (instant) {
            this.theta = this.desiredTheta;
            this.phi = this.desiredPhi;
            this.radius = this.desiredRadius;
            this.target.copy(this.desiredTarget);
            this.update(1);
        }
    }

    update(speed = 0.04) {
        this.theta += (this.desiredTheta - this.theta) * speed;
        this.phi += (this.desiredPhi - this.phi) * speed;
        this.radius += (this.desiredRadius - this.radius) * speed;
        this.target.lerp(this.desiredTarget, speed);
        const sinPhi = Math.sin(this.phi);
        this.camera.position.set(
            this.target.x + this.radius * sinPhi * Math.sin(this.theta),
            this.target.y + this.radius * Math.cos(this.phi),
            this.target.z + this.radius * sinPhi * Math.cos(this.theta),
        );
        this.camera.lookAt(this.target);
    }

    dispose() {
        this.domElement.removeEventListener('pointerdown', this.down);
        window.removeEventListener('pointermove', this.move);
        window.removeEventListener('pointerup', this.up);
        this.domElement.removeEventListener('wheel', this.wheel);
    }
}

export { presets };
