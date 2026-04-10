# Étape 02 — Activer Google OAuth (Supabase)

## Dans Google Cloud Console

1. Aller sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créer un projet (ou utiliser un existant)
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Type : **Web application**
5. Ajouter les origines autorisées :
   - `https://rzuxykzepgujswfladxw.supabase.co`
6. Ajouter les URIs de redirection autorisées :
   - `https://rzuxykzepgujswfladxw.supabase.co/auth/v1/callback`
7. Copier le **Client ID** et le **Client Secret**

## Dans Supabase

1. Dashboard → ton projet → **Authentication → Providers → Google**
2. Activer le toggle
3. Coller le **Client ID** et le **Client Secret**
4. Sauvegarder

---

> ⚠️ Sans cette étape, le bouton "Continuer avec Google" dans la modal de connexion retournera une erreur.
