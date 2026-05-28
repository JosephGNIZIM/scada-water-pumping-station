---
name: scada-diagnostics
description: Diagnostiquer et valider l'environnement SCADA avant le lancement. Vérifie ports, dépendances, environnement. Utilise quand l'app ne démarre pas ou lors du premier setup.
---

# Diagnostic SCADA

Valide que votre environnement est prêt à exécuter l'application SCADA. Détecte les problèmes de configuration, ports occupés, et dépendances manquantes.

## Ce que je vérifie

### 1️⃣ **Environnement système**
- Version Node.js (minimum 18.x requis)
- Ressources Electron (icones, assets)
- Fichiers de configuration Mosquitto

### 2️⃣ **Ports réseau**
- Port 3000 (Backend Express)
- Port 3001 (Frontend dev server Vite)
- Port 3002-3003 (Services auxiliaires)
- Port 1883 (MQTT Mosquitto)

### 3️⃣ **Dépendances**
- `backend/node_modules/` existant et à jour
- `frontend/node_modules/` existant et à jour
- Packages npm critiques

### 4️⃣ **Artefacts de build**
- `backend/dist/app.js` compilé
- `frontend/dist/index.html` bundlé
- Configuration de sécurité chargée

## Comment l'utiliser

### Avant de démarrer l'app :
```bash
npm run check-env
npm run check-ports
```

### Si vous rencontrez des erreurs :

#### ❌ "Node.js version too old"
```bash
# Vérifier votre version
node --version

# Installer la bonne version (18.x ou plus récent)
# https://nodejs.org/
```

#### ❌ "Port 3000 already in use"
Quelque chose occupe déjà le port. Solutions :

```powershell
# Trouver le processus occupant le port 3000
netstat -ano | findstr :3000

# Tuer le processus (remplacer PID par le vrai ID)
taskkill /PID 1234 /F

# OU utiliser le script helper (Windows)
npm run kill-port 3000
```

#### ❌ "Backend build output missing"
Le backend n'a pas été compilé :

```bash
# Installer dépendances et compiler
npm run install:all
npm run build
```

#### ❌ "Frontend build output missing"
Le frontend n'a pas été bundlé :

```bash
# Installer dépendances et compiler
npm --prefix frontend run build
```

#### ❌ "node_modules missing or outdated"
```bash
# Réinstaller tout
npm run install:all

# OU spécifiquement
npm --prefix backend install
npm --prefix frontend install
```

## Workflow complet de diagnostic

1. **Vérifier l'environnement** :
   ```bash
   npm run check-env
   ```

2. **Vérifier les ports** :
   ```bash
   npm run check-ports
   ```

3. **Installer dépendances** (si manquantes) :
   ```bash
   npm run install:all
   ```

4. **Compiler le code** :
   ```bash
   npm run build
   ```

5. **Lancer en dev** :
   ```bash
   npm run dev
   ```

## Ports standard

| Service | Port | Description |
|---------|------|-------------|
| Backend API | 3000 | Express.js server |
| Frontend Dev | 3001 | Vite dev server (HMR) |
| Alternative Frontend | 3002 | Si 3001 occupé |
| Alternative | 3003 | Si 3002 occupé |
| MQTT Broker | 1883 | Mosquitto (optionnel) |

## Scripts disponibles

- `npm run check-env` - Vérifie l'environnement système
- `npm run check-ports` - Liste les ports occupés (3000-3003)
- `npm run test-ports` - Test la disponibilité des ports
- `npm run install:all` - Installe dépendances backend + frontend
- `npm run build` - Compile backend et frontend
- `npm run dev` - Lance le full stack en dev

## Aide pour Electron (Windows)

Si vous voulez lancer en mode Electron :

1. Vérifier que tout compile :
   ```bash
   npm run build
   ```

2. Vérifier les ressources Electron :
   - `electron/buildResources/icon.ico` ✓
   - `electron/bin/mosquitto/` ✓
   - `electron/config/mosquitto.conf` ✓

3. Lancer Electron dev :
   ```bash
   npm run electron:start
   ```

4. Packager en portable :
   ```bash
   npm run build:electron
   ```

## Besoin d'aide ?

Lancez ce diagnostic et partagez les messages d'erreur ! Je peux :
- 🔧 Corriger les chemins manquants
- 🚀 Nettoyer les ports occupés
- 📦 Réinstaller les dépendances
- 🏗️ Recompiler le code
