# Étape 03 — Variables d'environnement Vercel

## Variables à configurer

Dans **Vercel Dashboard → ton projet → Settings → Environment Variables** :

| Nom | Valeur | Environnements |
|-----|--------|----------------|
| `VITE_SUPABASE_URL` | `https://rzuxykzepgujswfladxw.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_wEKRe6SjtqyBF4YdK0AVvw_Av01qjiW` | Production, Preview, Development |

## Vérification

Après avoir ajouté les variables, **redéployer** le projet pour qu'elles soient prises en compte :

```bash
# Ou via l'interface Vercel : Deployments → Redeploy
vercel --prod
```

---

> ⚠️ Ne jamais committer la clé `service_role` dans le dépôt.  
> Le fichier `.env.local` est bien dans `.gitignore`.
