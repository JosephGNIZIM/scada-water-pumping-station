# Solutions rapides aux problèmes courants

## Port déjà occupé

### Windows PowerShell
```powershell
# Trouver le PID occupant le port 3000
netstat -ano | findstr :3000

# Tuer le processus (remplacer 1234 par le vrai PID)
taskkill /PID 1234 /F

# OU : utiliser le helper npm
npm run kill-port 3000
```

### macOS/Linux
```bash
# Trouver et tuer le processus
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# OU
fuser -k 3000/tcp
```

## Node.js version incompatible

```bash
# Vérifier version
node --version

# Installer Node.js 18.x ou plus récent
# https://nodejs.org/
```

## Dépendances manquantes

```bash
# Réinstaller toutes les dépendances
npm run install:all

# OU spécifiquement
npm --prefix backend install
npm --prefix frontend install

# Nettoyer les caches npm
npm cache clean --force
rm -rf backend/node_modules frontend/node_modules
npm run install:all
```

## Build manquant

```bash
# Compiler backend et frontend
npm run build

# OU séparément
npm --prefix backend run build
npm --prefix frontend run build
```

## Electron ne démarre pas

```bash
# Vérifier que tout est compilé
npm run build

# Vérifier les ressources
npm run check-env

# Lancer en dev mode
npm run electron:start

# OU packager en portable
npm run build:electron
```

## La base de données est corrompue

```bash
# Supprimer les fichiers de BD
rm -r backend/data/*

# OU sur Windows
del /S /Q backend\data\*

# Redémarrer l'app (elle recréera la BD)
npm run dev
```

## Port MQTT (1883) occupé

```powershell
# Trouver et tuer le processus MQTT
netstat -ano | findstr :1883
taskkill /PID <PID> /F
```

## Electron portable ne s'exécute pas

Cause probable : Ressources manquantes dans `electron/buildResources/`

```bash
# Vérifier les ressources
npm run check-env

# Si icone manquante, créer une placeholder
# (ou ajouter une vraie icone 256x256 en .ico)

# Repackager
npm run build:electron
```

## Script d'aide au diagnostic

```bash
# Lancer le diagnostic complet
node scripts/diagnose.js

# Avec mode verbose
node scripts/diagnose.js --verbose

# Vérifications spécifiques
node scripts/diagnose.js --check-env
node scripts/diagnose.js --check-ports
node scripts/diagnose.js --check-deps
```

## Réinitialisation complète

Si tout échoue, faire une réinitialisation complète :

```bash
# Supprimer tous les artefacts
rm -rf backend/dist frontend/dist backend/node_modules frontend/node_modules

# Windows
rmdir /s /q backend\dist frontend\dist backend\node_modules frontend\node_modules

# Réinstaller et recompiler
npm run install:all
npm run build

# Lancer
npm run dev
```

## Demander de l'aide

Si vous restez bloqué, exécutez :

```bash
node scripts/diagnose.js --verbose
```

Et partagez le résultat complet ! 🚀
