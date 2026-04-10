# Étape 01 — Exécuter les migrations SQL (Supabase)

## Méthode automatique (recommandée)

1. Récupérer la clé `service_role` :
   - Supabase Dashboard → ton projet → **Settings → API**
   - Copier la valeur **service_role** (secret)

2. Lancer le script de migration :

```bash
VITE_SUPABASE_URL="https://rzuxykzepgujswfladxw.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<ta_clé_service_role>" \
node scripts/setup-db.js
```

Le script exécutera tous les fichiers `sql/*.sql` dans l'ordre.

---

## Méthode manuelle (alternative)

Copier le contenu de `sql/001_create_exercices_cielab.sql` dans :

**Supabase Dashboard → SQL Editor → New query** → Exécuter

---

## Ce que crée cette migration

- Table `exercices_cielab` : stockage des exercices CIELAB par utilisateur
- Index sur `user_id` + `created_at` pour des requêtes rapides
- Row Level Security (RLS) : chaque élève ne voit que ses propres exercices
