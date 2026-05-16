import * as THREE from 'three';

const SKY_DAY = new THREE.Color(0x7ec8e3);
const SKY_NIGHT = new THREE.Color(0x05080f);
const SKY_SUNSET = new THREE.Color(0xff7733);
const SKY_SUNRISE = new THREE.Color(0xffaa66);
const SKY_STORM = new THREE.Color(0x3a3a4a);

export default class DayNight {
    constructor(scene, sunLight, ambientLight, hemiLight) {
        this.scene = scene;
        this.sunLight = sunLight;
        this.ambientLight = ambientLight;
        this.hemiLight = hemiLight;
    }

    getHour(data) {
        const explicit = data?.meteo?.heure_journee;
        if (typeof explicit === 'number') return explicit;
        return new Date().getHours() + new Date().getMinutes() / 60;
    }

    update(data, elapsed) {
        const clouds = data?.meteo?.couverture_nuages ?? 15;
        const storm = clouds > 80;
        const hour = this.getHour(data);
        
        let sky = SKY_DAY.clone();
        let sunColor = new THREE.Color(0xffffff);
        let sun = 1.6;
        let amb = 0.8;
        let hemi = 0.55;
        
        // Cycle jour/nuit complet
        if (hour >= 20 || hour < 6) {
            // NUIT (19h → 6h)
            sky = SKY_NIGHT.clone();
            sunColor.setHex(0x1a3a6a); // Lune bleue faible
            sun = 0.02;
            amb = 0.24;
            hemi = 0.18;
        } else if (hour >= 18) {
            // COUCHER (17h → 19h)
            const coucher = (hour - 18) / 2;
            sky = SKY_DAY.clone().lerp(SKY_SUNSET, coucher);
            sunColor = new THREE.Color(0xffffff).lerp(new THREE.Color(0xff6633), coucher);
            sun = 1.15 + (coucher * -0.95);
            amb = 0.5 + (coucher * -0.2);
            hemi = 0.55 + (coucher * -0.3);
        } else if (hour >= 5 && hour < 8) {
            // LEVER (5h → 8h)
            const lever = (hour - 5) / 3;
            sky = SKY_NIGHT.clone().lerp(SKY_DAY, lever);
            sunColor = new THREE.Color(0xff9966).lerp(new THREE.Color(0xffffff), lever);
            sun = 0.05 + (lever * 1.35);
            amb = 0.25 + (lever * 0.5);
            hemi = 0.25 + (lever * 0.3);
        } else if (hour >= 8 && hour <= 18) {
            // JOUR (8h → 18h)
            sky = SKY_DAY.clone();
            sunColor.setHex(0xffffff);
            sun = 1.6;
            amb = 0.8;
            hemi = 0.55;
        }

        // Effet orage
        if (storm) {
            sky = SKY_STORM.clone();
            sun = 0.55 + Math.sin(elapsed * 22) * 0.2;
            amb = 0.35;
            hemi = 0.28;
        }

        // Assombrissement par couverture nuageuse (sauf nuit)
        if (hour >= 8 && hour <= 18 && !storm) {
            const cloudDarkness = (clouds / 100) * 0.25;
            sky = sky.lerp(SKY_STORM, cloudDarkness);
            sun = sun * (1 - cloudDarkness * 0.5);
        }

        // Appliquer les modifications à la scène
        this.scene.background = sky;
        this.scene.fog.color.copy(sky);
        this.sunLight.color.copy(sunColor);
        this.sunLight.intensity = Math.max(0, sun);
        this.ambientLight.intensity = amb;
        this.hemiLight.intensity = hemi;
        
        // Position soleil/lune selon heure
        const sunAngle = (hour / 24) * Math.PI * 2;
        this.sunLight.position.x = Math.cos(sunAngle) * 30;
        this.sunLight.position.y = Math.sin(sunAngle) * 28;
    }
}
