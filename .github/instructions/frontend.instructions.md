---
applyTo: "frontend/**/*.{tsx,ts}"
description: "Conventions et patterns du frontend SCADA (React, Redux, pages, composants)"
---

# Conventions Frontend SCADA

## Architecture générale

Le frontend est une **application React + TypeScript** organisée par :
1. **Pages** (`frontend/src/pages/`) - vues principales (Home, Dashboard, Settings, etc.)
2. **Composants** (`frontend/src/components/`) - composants réutilisables (PumpStatus, SensorReadings, etc.)
3. **Store Redux** (`frontend/src/store/`) - gestion d'état centralisée
4. **Routing** (`App.tsx`) - navigation avec React Router
5. **Services API** (`frontend/src/services/api.ts`) - requêtes vers le backend
6. **Authentification** (`frontend/src/auth/`) - gestion des roles et login

## Patterns essentiels

### Routing et Navigation
- Pages organisées par rôle : `ingenieur`, `technicien`, `operateur`
- Routes protégées via `ProtectedRoute` basée sur les rôles
- Exemple de navigation :
  - `/` - Accueil
  - `/dashboard` - Tableau de bord
  - `/synoptic` - Synoptique (vue graphique)
  - `/pump-status` - État des pompes
  - `/simulation` - Simulation (ingénieur/technicien)
  - `/settings` - Paramètres

```typescript
const navigation = [
  { to: '/', label: 'Accueil', roles: ['ingenieur', 'technicien', 'operateur'] },
  { to: '/simulation', label: 'Simulation', roles: ['ingenieur', 'technicien'] },
];
```

### Redux Store
- **Slices** : `pumpSlice.ts`, `sensorSlice.ts`, `alarmSlice.ts`, `simulationSlice.ts`
- Chaque slice gère un domaine métier
- **Async Thunks** : `fetchPumpStatusAsync`, `fetchSensorReadingsAsync`, `fetchAlarmsAsync`
- État initial, reducers, et sélecteurs dans chaque slice

```typescript
// Dans App.tsx
const dispatch = useAppDispatch();
useEffect(() => {
  dispatch(fetchPumpStatusAsync());
  dispatch(fetchSensorReadingsAsync());
  dispatch(fetchAlarmsAsync());
}, [dispatch]);
```

### Composants
- Composants fonctionnels avec hooks
- `useAppDispatch()` et `useAppSelector()` pour Redux
- Composants reçoivent les données du store
- Composants envoient les actions via `dispatch()`

```typescript
const PumpStatus: React.FC = () => {
  const dispatch = useAppDispatch();
  const pumps = useAppSelector(state => state.pump.pumps);
  
  const handleStart = () => {
    dispatch(startPumpAsync(pumpId));
  };
};
```

### Pages
- Composants principales qui combinent plusieurs composants
- Peuvent dispatcher des actions au mount
- Pages restreintes aux rôles appropriés via `ProtectedRoute`

### Authentification
- Type `UserRole` : `'ingenieur' | 'technicien' | 'operateur'`
- `useAuth()` hook pour accéder au contexte d'authentification
- `AuthProvider` enveloppe l'application
- Role badges : classe CSS `badge-role--[role]` avec icône

```typescript
const roleBadgeMeta = {
  ingenieur: { label: 'Ingenieur', className: 'badge-role badge-role--ingenieur' },
  technicien: { label: 'Technicien', className: 'badge-role badge-role--technicien' },
  operateur: { label: 'Operateur', className: 'badge-role badge-role--operateur' },
};
```

### Internationalisation (i18n)
- Hook `useI18n()` pour traductions
- Support multilingue via `frontend/src/i18n.tsx`

## Bonnes pratiques

1. **État global** : Utiliser Redux pour données partagées (pompes, capteurs, alarmes)
2. **État local** : Utiliser `useState()` pour UI locale (formulaires, modals)
3. **Appels API** : Via `frontend/src/services/api.ts` centralisé
4. **Types** : Utiliser TypeScript strictement, définir les interfaces
5. **Composants** : Petits, réutilisables, concentrés sur une responsabilité
6. **Routing** : Protéger les routes avec `ProtectedRoute` et les rôles appropriés
7. **Three.js** : Utilisé pour visualisations 3D (synoptique, contrôle)

## Fichiers clés

- `frontend/src/App.tsx` - composant racine, routing, navigation
- `frontend/src/index.tsx` - point d'entrée React
- `frontend/src/store/` - slices Redux et configuration
- `frontend/src/auth/AuthContext.tsx` - gestion authentification
- `frontend/src/auth/ProtectedRoute.tsx` - protection des routes
- `frontend/src/services/api.ts` - client API Axios
- `frontend/src/i18n.tsx` - configuration i18n

## Stack technique

- **React 18** + TypeScript
- **Vite** - build tool (remplacement Webpack)
- **Redux Toolkit** - gestion d'état
- **Axios** - requêtes HTTP
- **React Router v6** - routing
- **Three.js** - visualisations 3D
