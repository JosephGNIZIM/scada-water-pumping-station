# Simulation 3D SCADA - Station AEP Togolaise

## 📋 Vue d'ensemble

Cette simulation 3D ultra-réaliste reproduit une **station d'adduction d'eau potable (AEP) complète** au Togo en utilisant **Three.js r128**. Chaque modification de données MQTT se reflète immédiatement dans la scène 3D interactive.

### Caractéristiques principales

- ✅ **Synchronisation MQTT temps réel** : Chaque message met à jour la 3D en <16ms
- ✅ **Cycle jour/nuit automatique** (6h→18h soleil, 18h→6h nuit avec étoiles)
- ✅ **Système de particules complet** : Eau dans tuyaux, jet fontaine, fumée groupe électrogène
- ✅ **Éclairage physiquement réaliste** : Ombres, ambiance selon météo
- ✅ **Interactivité caméra** : 6 presets + drag libre + zoom molette
- ✅ **HUD temps réel** : Données MQTT affichées en direct
- ✅ **Scénarios de test** : Normal, Panne pompe, Nuit, Orage, Pic conso

---

## 🏗️ Architecture générale

```
┌─────────────────────────────────────────────────────┐
│                  SYNOPTIQUE3D.jsx                   │
│  (Composant React + Canvas + HUD)                   │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼───────┐      ┌────▼──────────────┐
   │ SceneAEP   │      │ useSceneData      │
   │ (Three.js) │      │ (MQTT → objet)    │
   └────┬───────┘      └────────────────────┘
        │
   ┌────┴──────────────────────┬──────────┬──────────┐
   │                           │          │          │
scene/                     systems/   controls/  hooks/
 ├─ Terrain.js             ├─ ParticleWater.js  ├─ useSceneData.js
 ├─ Forage.js              ├─ ParticleFontain   └─ OrbitControl.js
 ├─ Tuyauterie.js          ├─ ParticleSmoke.js
 ├─ ChateauEau.js          ├─ DayNight.js
 ├─ Fontaine.js            └─ WeatherFX.js
 ├─ Reseau.js
 ├─ PanneauxSolaires.js
 ├─ Armoire.js (LED clignotante)
 ├─ Groupe.js (fumée + vibration)
 ├─ BatimentTech.js
 ├─ Village.js
 └─ Primitives.js (mkPipe, addBox, etc)
```

---

## 🎮 Utilisation basique

### Intégration dans React

```jsx
import Synoptique3D from './components/Synoptique3D/Synoptique3D';

export function Dashboard() {
    const [simulationState, setSimulationState] = useState({});
    const [alarmActive, setAlarmActive] = useState(false);
    
    return (
        <Synoptique3D 
            simulationState={simulationState} 
            alarmActive={alarmActive} 
        />
    );
}
```

### Props attendues

**`simulationState`** (objet) :
```javascript
{
    pumps: [{ running, status, temperature }],
    tank2Level: 75,
    tank1Level: 70,
    measuredPressure: 2.4,
    measuredFlow: 4.5,
    estimatedEnergyKw: 0.9,
    mode: 'simulation' | 'real'
}
```

**`alarmActive`** (booléen) : Affiche l'overlay alarme rouge

---

## 📡 Synchronisation MQTT

### Structure des données MQTT

La scène écoute les topics MQTT suivants et s'adapte automatiquement :

```yaml
aep/pompe/etat          # "marche" | "arret" | "defaut"
aep/pompe/debit_m3h     # 0-10 m³/h (affect vitesse particules eau)
aep/pompe/temperature_c # Température pompe (LED armoire)
aep/pompe/courant_a     # Courant électrique

aep/reservoir/niveau_pct      # 0-100 (hauteur eau château)
aep/reservoir/volume_m3       # Volume réel

aep/solaire/puissance_w       # 0-2000W (luminance panneaux)
aep/solaire/tension_v         # Tension panneaux

aep/distribution/pression_bar # Pression réseau (jet fontaine)
aep/distribution/debit_m3h    # Débit village

aep/meteo/heure_journee       # 0-24 (cycle jour/nuit)
aep/meteo/couverture_nuages   # 0-100 (assombrissement)
```

### Exemple connexion broker MQTT

```javascript
// Dans un hook useEffect du composant parent
const mqtt = require('mqtt');

useEffect(() => {
    const client = mqtt.connect('mqtt://localhost:1883');
    
    client.on('connect', () => {
        client.subscribe('aep/#');
    });
    
    client.on('message', (topic, payload) => {
        const data = JSON.parse(payload.toString());
        // Envoyer à Synoptique3D via props
        setSimulationState(prev => ({
            ...prev,
            ...updateFromTopic(topic, data)
        }));
    });
    
    return () => client.end();
}, []);
```

---

## 🎬 Cycle jour/nuit automatique

| Heure | Phénomène | Description |
|-------|-----------|-------------|
| 5h-8h | Lever | Sky passe de nuit à jour, intensité lumière augmente |
| 8h-18h | **JOUR** | Ciel bleu 0x7ec8e3, Sun intensity 1.6, ambilight 0.8 |
| 17h-19h | Coucher | Sky passe au coucher de soleil orange 0xff7733 |
| 19h-6h | **NUIT** | Ciel foncé 0x05080f, étoiles visibles (200 Points), moon light 0.02 |

**Mode orage** : Si `couverture_nuages > 80%`, la scène scintille avec effet éclair (sin pulse)

---

## 🌊 Système de particules

### 1. Particules eau tuyau (22 particules)

- **Trajectoire** : 3 segments (montée forage → coude → descente cuve)
- **Vitesse** : `0.006 + debit_m3h*0.001`
- **Opacité** : 0.95 si pompe en marche, 0 sinon
- **Couleur** : Bleu ciel 0x44ccff

```javascript
// Montée verticale (0 < t < 0.55)
x = -5, y = 1.4 + t/0.55*9.8, z = 0

// Coude horizontal (0.55 < t < 0.72)
x = -5 + (t-0.55)/0.17*2.8, y = 11.2, z = 0

// Descente cuve (0.72 < t < 1.0)
x = -2.2, y = 11.2 - (t-0.72)/0.28*2.4, z = 0
```

### 2. Particules jet fontaine (18 particules)

- **Actif si** : `pression_bar > 0.4 AND niveau > 10% AND NOT nuit`
- **Trajectoire** : Jet parabolique : `y = 1.08 + t*0.55 - t²*0.85`
- **6 jets radiaux** autour de la fontaine
- **Vitesse** : Proportionnelle à `conso_village`

### 3. Particules fumée (12 particules)

- **Actif si** : `pompe.etat === 'defaut' OR couverture_nuages > 85%`
- **Source** : Pot d'échappement groupe électrogène (-6.5, 1.1, 3)
- **Montée** : Dispersée aléatoirement
- **Opacité** : 0.35 en maximum, disparition progressive

---

## 💡 LED Armoire électrique

La LED change de couleur selon l'état du système :

| État | Couleur | Clignotement |
|------|---------|-------------|
| **Marche normal** | Vert 0x00ff44 | Non |
| **Arrêt normal** | Orange 0xffaa00 | Non |
| **Défaut/Alarme** | Rouge 0xff2200 | **OUI** (sin(t*4)) |
| **Temp > 75°C** | Rouge 0xff2200 | Oui |
| **Temp 60-75°C** | Orange 0xffaa00 | Non |
| **Maintenance** | Bleu 0x0088ff | Non |

---

## 🎥 Contrôles caméra

### Presets (6 vues prédéfinies)

1. **Vue globale** : (24, 15, 24) → (0, 3, 0)
2. **Château d'eau** : (6, 13, 5) → (0, 7.5, 0)
3. **Panneaux solaires** : (10, 5, -1) → (5.5, 1.5, -2.5)
4. **Forage & pompe** : (-1, 5, 6) → (-5, 1.5, 0)
5. **Fontaine village** : (15, 5, -1) → (9.5, 1, -2.5)
6. **Armoire électrique** : (6, 3, -5) → (3, 0.6, -3)

### Contrôles libres

- **Drag gauche** : Rotation sphérique (theta/phi)
- **Molette souris** : Zoom (min: 7m, max: 60m)
- **Double-clic** : Reset vue globale

---

## 🏞️ Équipements 3D

### Environnement
- ✅ Sol herbe africaine (100×100m)
- ✅ Patches terre sèche dispersés
- ✅ Clôture périmètre 16×17m + portail
- ✅ 10 arbres + 6 buissons
- ✅ 5 maisons village banco/toits terra cotta

### Eau
- ✅ **Forage** : dalle béton, tubage PVC, chapeau, câble électrique
- ✅ **Tuyauterie** : montée verticale, coude, descente cuve
- ✅ **Château d'eau** : structure métallique 4 pieds, cuve transparente, eau animée
- ✅ **Fontaine** : socle béton, colonne, robinets, mare
- ✅ **Réseau** : tuyaux distribution, vannes, compteur

### Énergie
- ✅ **Panneaux solaires** : 4 panneaux individuels avec grille cellules, luminance variable
- ✅ **Armoire électrique** : LED clignotante, câbles
- ✅ **Groupe électrogène** : vibration active, fumée, pot d'échappement

### Infrastructure
- ✅ **Bâtiment technique** : murs banco, toit, climatiseur, antenne

---

## 📊 HUD Temps réel

**Panneau gauche** (RGBA(0,0,0,0.72)) :
- Mode (TERRAIN/SIMULATEUR)
- Heure simulée + % nuages
- Pompe : état coloré (vert/orange/rouge)
- Courant : A
- Température : °C (alerte à 75°C)
- Niveau château : %
- Production solaire : W
- Débit : m³/h
- Pression : bar

**Panneau droite** : Boutons présets caméra

**Barre basse** : Boutons scénarios

**Overlay alarme** (en haut, rouge clignotante) : Apparaît si alarme active

---

## 🧪 Scénarios de test

### 1. **Normal**
- Pompe : marche, 4.5 m³/h
- Niveau : 68%
- Solaire : 900W
- Météo : jour (14h), 20% nuages

### 2. **Panne pompe**
- Pompe : **DEFAUT** (clignotement LED rouge)
- Température : 82°C
- Débit : 0 m³/h
- Particules eau : stoppées immédiatement

### 3. **Forage à sec**
- Pompe : DEFAUT
- Niveau : **5% (CRITIQUE)**
- Couleur eau : rouge
- Débit : 0 m³/h

### 4. **Mode nuit**
- Heure : 22h
- Ciel : noir 0x05080f, étoiles visibles
- Panneaux solaires : 0W
- Fontaine : arrêtée

### 5. **Orage**
- Couverture nuages : 95%
- Panneaux solaires : scintillement 35% + sin pulse
- Lumière : assombrissement progressive
- Groupe électrogène : vibration + fumée active

### 6. **Pic consommation**
- Pression réseau : 1.2 bar
- Débit : 9.8 m³/h
- Niveau : 24% (BAS)
- Fontaine : jet très actif

---

## 🔧 Développement

### Installation dépendances

```bash
npm install three@0.128.0
```

### Structure fichiers

```
src/components/Synoptique3D/
├── Synoptique3D.jsx           # Composant React principal
├── scene/
│   ├── SceneAEP.js           # Classe Three.js (boucle animate)
│   ├── Terrain.js
│   ├── Forage.js
│   ├── Tuyauterie.js
│   ├── ChateauEau.js
│   ├── Fontaine.js
│   ├── Reseau.js
│   ├── PanneauxSolaires.js
│   ├── Armoire.js
│   ├── Groupe.js
│   ├── BatimentTech.js
│   ├── Village.js
│   └── Primitives.js
├── systems/
│   ├── ParticleWater.js
│   ├── ParticleFontain.js
│   ├── ParticleSmoke.js
│   ├── DayNight.js
│   └── WeatherFX.js
├── controls/
│   ├── OrbitControl.js
│   └── HUD.jsx
└── hooks/
    └── useSceneData.js
```

### Cycle de mise à jour

```javascript
animate() {
    elapsed = clock.getElapsedTime()
    
    // Mise à jour contrôles
    controls.update()
    
    // Mise à jour modules
    modules.chateau.update(data)
    modules.solaire.update(data, elapsed)
    modules.armoire.update(data, elapsed)
    modules.groupe.update(data, elapsed)
    
    // Système de particules
    pipeParticles.update(data, elapsed)
    fountainParticles.update(data, elapsed)
    smokeParticles.update(data, elapsed)
    
    // Cycles jour/nuit
    dayNight.update(data, elapsed)
    weather.update(data, elapsed)
    
    // Rendu
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
}
```

---

## ✨ Optimisations performances

- ✅ **Shadow maps** : 2048×2048 (PCFSoft)
- ✅ **Fog** : Far 160m (culling automatique)
- ✅ **PixelRatio** : Capped à 2 (Retina)
- ✅ **Particules** : BufferGeometry (GPU efficient)
- ✅ **Textures** : Procédurales (no file I/O)
- ✅ **Callbacks** : Debounced resize listener

Cible : **60 FPS** sur desktop moderne

---

## 🐛 Dépannage

### La 3D ne s'affiche pas

1. Vérifier console pour erreurs Three.js
2. Vérifier que le canvas a une taille > 0
3. Tester sur navigateur Chrome/Firefox recent

### Particules ne sont pas visibles

1. Vérifier que `pompe.etat === 'marche'`
2. Vérifier que la caméra n'est pas trop proche/loin
3. Vérifier que `renderer.render()` est appelé

### HUD ne s'actualise pas

1. Vérifier que `sceneRef.current.setData(sceneData)` reçoit des données
2. Vérifier les propriétés attendues dans `sceneData`
3. Console.log(sceneData) pour débugger

---

## 📚 Références

- **Three.js r128** : [https://threejs.org/docs/r128/](https://threejs.org/docs/r128/)
- **Electron** : Documentation du projet
- **MQTT** : Topics `aep/#`

---

**Version** : 1.0.0 | **Date** : Mai 2026 | **Auteur** : SCADA Team Togo
