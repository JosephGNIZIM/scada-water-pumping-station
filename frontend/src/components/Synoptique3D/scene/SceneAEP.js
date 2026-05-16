import * as THREE from 'three';
import Terrain from './Terrain';
import Forage from './Forage';
import Tuyauterie from './Tuyauterie';
import ChateauEau from './ChateauEau';
import Fontaine from './Fontaine';
import Reseau from './Reseau';
import PanneauxSolaires from './PanneauxSolaires';
import Armoire from './Armoire';
import Groupe from './Groupe';
import BatimentTech from './BatimentTech';
import Village from './Village';
import ParticleWater from '../systems/ParticleWater';
import ParticleFontain from '../systems/ParticleFontain';
import ParticleSmoke from '../systems/ParticleSmoke';
import DayNight from '../systems/DayNight';
import WeatherFX from '../systems/WeatherFX';
import OrbitControl from '../controls/OrbitControl';

export default class SceneAEP {
    constructor(canvas, initialData = {}) {
        this.canvas = canvas;
        this.data = initialData;
        this.clock = new THREE.Clock();
        
        // Scène et lumières
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x7ec8e3);
        this.scene.fog = new THREE.Fog(0x7ec8e3, 100, 160);

        // Caméra
        this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lumière solaire directionnelle
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
        this.sunLight.position.set(18, 28, 12);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.left = -40;
        this.sunLight.shadow.camera.right = 40;
        this.sunLight.shadow.camera.top = 40;
        this.sunLight.shadow.camera.bottom = -40;
        this.sunLight.shadow.camera.far = 100;
        this.scene.add(this.sunLight);
        
        // Lumière ambiante et hémisphérique
        this.ambientLight = new THREE.AmbientLight(0x8ab4d8, 0.8);
        this.hemiLight = new THREE.HemisphereLight(0xb7e9ff, 0x7a663f, 0.55);
        this.scene.add(this.ambientLight, this.hemiLight);

        // Modules 3D (équipements et bâtiments)
        this.modules = {
            terrain: new Terrain(),
            forage: new Forage(),
            tuyauterie: new Tuyauterie(),
            chateau: new ChateauEau(),
            fontaine: new Fontaine(),
            reseau: new Reseau(),
            solaire: new PanneauxSolaires(),
            armoire: new Armoire(),
            groupe: new Groupe(),
            batiment: new BatimentTech(),
            village: new Village(),
        };
        
        // Ajouter tous les modules à la scène
        Object.values(this.modules).forEach((module) => {
            if (module.group) this.scene.add(module.group);
        });

        // Systèmes de particules
        this.pipeParticles = new ParticleWater();
        this.fountainParticles = new ParticleFontain();
        this.smokeParticles = new ParticleSmoke();
        this.scene.add(this.pipeParticles.points, this.fountainParticles.points, this.smokeParticles.points);

        // Systèmes jour/nuit et météo
        this.dayNight = new DayNight(this.scene, this.sunLight, this.ambientLight, this.hemiLight);
        this.weather = new WeatherFX(this.scene);
        
        // Contrôles caméra
        this.controls = new OrbitControl(this.camera, canvas);
        
        // Redimensionner et démarrer animation
        this.resize();
        this.animate = this.animate.bind(this);
        this.frame = requestAnimationFrame(this.animate);
    }

    setData(data) {
        this.data = data || this.data;
    }

    setCameraPreset(name) {
        this.controls.setPreset(name);
    }

    resize() {
        const width = this.canvas.clientWidth || 900;
        const height = this.canvas.clientHeight || 560;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    animate() {
        const elapsed = this.clock.getElapsedTime();
        
        // Mettre à jour contrôles
        this.controls.update();
        
        // Mettre à jour tous les modules
        this.modules.chateau?.update?.(this.data);
        this.modules.solaire?.update?.(this.data, elapsed);
        this.modules.armoire?.update?.(this.data, elapsed);
        this.modules.groupe?.update?.(this.data, elapsed);
        this.modules.batiment?.update?.(this.data, elapsed);
        
        // Mettre à jour systèmes de particules
        this.pipeParticles.update(this.data, elapsed);
        this.fountainParticles.update(this.data, elapsed);
        this.smokeParticles.update(this.data, elapsed);
        
        // Mettre à jour cycles jour/nuit et météo
        this.dayNight.update(this.data, elapsed);
        this.weather.update(this.data, elapsed);
        
        // Rendu
        this.renderer.render(this.scene, this.camera);
        
        // Boucle animation
        this.frame = requestAnimationFrame(this.animate);
    }

    dispose() {
        cancelAnimationFrame(this.frame);
        this.controls.dispose();
        this.renderer.dispose();
    }
}

    dispose() {
        cancelAnimationFrame(this.frame);
        this.controls.dispose();
        this.renderer.dispose();
        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) object.material.forEach((mat) => mat.dispose());
                else object.material.dispose();
            }
        });
    }
}
