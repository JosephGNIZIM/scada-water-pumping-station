---
applyTo: "backend/**/*.ts"
description: "Conventions et patterns du backend SCADA (API Express, controllers, services, modèles)"
---

# Conventions Backend SCADA

## Architecture générale

Le backend suit une architecture en **couches** :
1. **Routes** (`backend/src/routes/`) - définissent les endpoints API REST
2. **Controllers** (`backend/src/controllers/`) - gèrent les requêtes HTTP et les logs d'audit
3. **Services** (`backend/src/services/`) - contiennent la logique métier
4. **Models** (`backend/src/models/`) - définissent les interfaces TypeScript
5. **Utils** (`backend/src/utils/`) - fonctions utilitaires (BD, sécurité)

## Patterns essentiels

### Routes
- Chaque route commence par `/api` et utilise les middlewares d'authentification
- Les middlewares `authenticate`, `requireCsrf`, `requireRole` sont appliqués selon les droits
- Exemple : `router.post('/pumps/start', requireCsrf, requireRole(['ingenieur', 'technicien']), pumpController.startPump);`

### Controllers
- Classe TypeScript avec méthodes async
- Récupère les données du `req` (body/query)
- Appelle le service métier correspondant
- **Toujours** enregistrer un log d'audit via `createAuditLog()` après chaque action
- Retourne la réponse JSON au client

```typescript
export class PumpController {
    async startPump(req: AuthRequest, res: Response) {
        const pumpId = Number(req.body.id ?? 1);
        const pump = await pumpService.startPump(pumpId);
        await createAuditLog({
            userId: req.auth?.id,
            username: req.auth?.username,
            role: req.auth?.role,
            action: 'pump.start',
            entityType: 'pump',
            entityId: String(pumpId),
            ip: getClientIp(req),
        });
        res.status(200).json(pump ?? { message: 'Pump not found' });
    }
}
```

### Services
- Fonctions export async/await
- Manipulent les données via les utilitaires BD
- **Pas de logique HTTP** dans les services
- Retournent les données métier

```typescript
export const startPump = async (pumpId: number): Promise<Pump> => {
    return savePumpStatus(pumpId, 'running');
};
```

### Models
- Interfaces TypeScript décrivant la structure des données
- Champs typés (id, status, lastUpdated, etc.)

```typescript
export interface Pump {
    id: number;
    status: 'running' | 'stopped' | 'faulted';
    lastUpdated: Date;
}
```

### Authentification et autorisation
- Type `AuthRequest` étend Express `Request` avec une propriété `auth?`
- Roles : `'ingenieur'`, `'technicien'`, `'operateur'`
- JWT géré dans `backend/src/auth/`
- Middleware `authenticate` valide le token
- Middleware `requireRole(['role1', 'role2'])` restreint par rôle

## Bonnes pratiques

1. **Audit** : Chaque modification doit être loggée avec action, entity, userId, IP
2. **Types** : Utiliser les interfaces définies dans `models/`
3. **Erreurs** : Retourner les erreurs comme JSON avec messages clairs
4. **Sécurité** : Toujours utiliser `requireCsrf` et `requireRole` sur les routes sensibles
5. **Ports** : Port par défaut 3000, configurable via `.env`
6. **Base de données** : SQLite avec Sequelize, initialiser via `initializeDatabase()`

## Fichiers clés

- `backend/src/app.ts` - setup Express et démarrage du serveur
- `backend/src/routes/index.ts` - orchestration de toutes les routes
- `backend/src/middleware/auth.ts` - middlewares JWT, CSRF, roles
- `backend/src/utils/db.ts` - utilitaires base de données
- `backend/src/utils/securityDb.ts` - logs d'audit
