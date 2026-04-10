# Étape 01 — Exécuter les migrations SQL (Supabase)

## Méthode automatique (recommandée)

### 1. Créer un Personal Access Token (PAT)
- Aller sur [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
- Cliquer **Generate new token** → copier le token

### 2. Ajouter dans `.env.local`
```
SUPABASE_ACCESS_TOKEN=<ton_token>
```

### 3. Lancer le script
```bash
node scripts/setup-db.js
```

Le script exécutera tous les fichiers `sql/*.sql` dans l'ordre.

> ⚠️ Le PAT est différent de la `service_role` key.  
> La `service_role` sert aux opérations sur les données.  
> Le PAT sert à l'API de gestion (Management API).

---

## Méthode manuelle (alternative rapide)

Copier le contenu de `sql/001_create_exercices_cielab.sql` dans :

**Supabase Dashboard → SQL Editor → New query** → Exécuter

---

## Ce que crée cette migration

- Table `exercices_cielab` : stockage des exercices CIELAB par utilisateur
- Index sur `user_id` + `created_at` pour des requêtes rapides
- Row Level Security (RLS) : chaque élève ne voit que ses propres exercices
