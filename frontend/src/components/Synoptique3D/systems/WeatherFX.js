import * as THREE from 'three';

export default class WeatherFX {
    constructor(scene) {
        this.scene = scene;
        this.stars = null;
        this.createStars();
    }

    createStars() {
        // 200 Points blancs statiques dans le ciel (mode nuit)
        const starsGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(200 * 3);
        
        for (let i = 0; i < 200; i++) {
            starPositions[i * 3] = (Math.random() - 0.5) * 200;
            starPositions[i * 3 + 1] = 80 + Math.random() * 50;
            starPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            sizeAttenuation: true,
        });
        
        this.stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.stars);
    }

    update(data, elapsed) {
        const clouds = data?.meteo?.couverture_nuages ?? 15;
        const hour = data?.meteo?.heure_journee ?? new Date().getHours();
        
        // Afficher les étoiles en mode nuit (19h -> 6h)
        const nightMode = hour < 6 || hour > 18;
        if (this.stars) {
            this.stars.visible = nightMode;
        }
        
        // Scintillement en mode orage (couverture_nuages > 80%)
        if (clouds > 80) {
            // Sin scintillement pour effet éclair
            const flicker = 0.35 + Math.sin(elapsed * 5) * 0.25;
            // Appliquer l'effet en modifiant l'intensité lumineuse serait géré dans DayNight
        }
        
        // Assombrissement progressif selon nuages
        const cloudDarkness = (clouds / 100) * 0.4; // Max 0.4 d'assombrissement
        // Cet effet serait appliqué via scene.background interpolation dans DayNight
    }
}
