# Fonte — Guide de mise en ligne complet (débutant)

Ce guide suppose que tu n'as jamais fait cette procédure. Compte 30 à 45 minutes.
Tu vas utiliser 4 sites, tous gratuits : Supabase, Google (Cloud + AI Studio), GitHub, Vercel.

Le fichier zip `fonte-app.zip` que je t'ai donné doit être **dézippé** sur ton ordinateur avant de commencer
(double-clic dessus, ou clic droit > Extraire).

---

## Étape 1 — Créer le projet Supabase (la base de données)

1. Va sur **supabase.com** et clique sur **Start your project**.
2. Connecte-toi (avec GitHub ou Google, au choix).
3. Clique sur **New project**.
4. Choisis une organisation (si c'est ta première fois, Supabase en crée une automatiquement).
5. Remplis :
   - **Name** : `fonte`
   - **Database Password** : génère-en un et **note-le quelque part** (tu n'en auras pas besoin après, mais garde-le par sécurité)
   - **Region** : choisis une région proche de toi (ex. `West EU (Paris)` ou `West EU (London)`)
6. Clique sur **Create new project**. Patiente 1 à 2 minutes, le projet se prépare.

### 1bis — Exécuter le schéma de base de données

1. Une fois dans le projet, dans le menu de gauche, clique sur l'icône **SQL Editor**.
2. Clique sur **New query**.
3. Ouvre le fichier `supabase/schema.sql` (dans le dossier dézippé) avec un éditeur de texte, sélectionne tout (Ctrl+A / Cmd+A), copie.
4. Colle dans l'éditeur SQL de Supabase.
5. Clique sur **Run** (ou Ctrl+Enter). Tu dois voir "Success. No rows returned" en bas.

### 1bis — Récupérer les clés API (à garder de côté pour plus tard)

1. Dans le menu de gauche, clique sur l'icône engrenage **Project Settings**, puis **API**.
2. Note dans un fichier texte temporaire :
   - **Project URL** (commence par `https://....supabase.co`)
   - **anon public** key (une longue chaîne de caractères, dans la section "Project API keys")

---

## Étape 2 — Activer la connexion avec Google

C'est l'étape la plus longue mais elle ne se fait qu'une fois.

### 2a — Créer les identifiants côté Google Cloud

1. Va sur **console.cloud.google.com**.
2. En haut, clique sur le sélecteur de projet, puis **New Project**.
3. Nom du projet : `fonte` (ou ce que tu veux), clique **Create**. Attends qu'il soit sélectionné.
4. Dans la barre de recherche en haut, tape **OAuth consent screen** et clique dessus.
5. Choisis **External**, clique **Create**.
6. Remplis les champs obligatoires :
   - **App name** : `Fonte`
   - **User support email** : ton email
   - **Developer contact information** : ton email
7. Clique **Save and Continue** sur les écrans suivants (Scopes, Test users) sans rien changer, jusqu'à revenir au tableau de bord.
8. Dans la barre de recherche, tape **Credentials**, clique dessus.
9. Clique **+ Create Credentials** puis **OAuth client ID**.
10. **Application type** : `Web application`.
11. **Name** : `Fonte web`.
12. Pour l'instant, laisse les URLs vides (on reviendra les remplir à l'étape 4, une fois que Vercel t'aura donné ton adresse).
13. Clique **Create**. Une fenêtre affiche un **Client ID** et un **Client Secret** : note les deux quelque part.

### 2b — Brancher ces identifiants dans Supabase

1. Retourne sur Supabase, dans ton projet.
2. Menu de gauche > **Authentication** > **Providers**.
3. Trouve **Google** dans la liste, clique dessus pour l'ouvrir.
4. Active le toggle **Enable Sign in with Google**.
5. Colle le **Client ID** et le **Client Secret** obtenus à l'étape 2a.
6. Supabase affiche une **Callback URL** (ex. `https://xxxx.supabase.co/auth/v1/callback`) : copie-la.
7. Retourne sur Google Cloud Console > **Credentials** > clique sur le client OAuth que tu as créé.
8. Dans **Authorized redirect URIs**, clique **+ Add URI**, colle la Callback URL de Supabase.
9. Clique **Save** des deux côtés (Google et Supabase).

---

## Étape 3 — Créer la clé Gemini (gratuite, pour le parsing IA)

1. Va sur **aistudio.google.com/apikey**.
2. Connecte-toi avec ton compte Google.
3. Clique **Create API key**.
4. Choisis le projet Google Cloud créé à l'étape 2a (ou "Create new project" si proposé).
5. Copie la clé générée et garde-la de côté. Aucune carte bancaire n'est demandée.

---

## Étape 4 — Mettre le code sur GitHub

1. Va sur **github.com**, connecte-toi (ou crée un compte si tu n'en as pas).
2. Clique sur le **+** en haut à droite > **New repository**.
3. **Repository name** : `fonte`.
4. Laisse **Public** ou choisis **Private**, peu importe.
5. Ne coche aucune case (pas de README, pas de .gitignore) — le zip en contient déjà.
6. Clique **Create repository**.
7. Sur la page qui s'affiche, clique le lien **uploading an existing file** (ou plus tard, le bouton **Add file > Upload files**).
8. Ouvre le dossier dézippé `muscu-app` sur ton ordinateur, sélectionne **tout son contenu** (tous les fichiers et dossiers à l'intérieur, pas le dossier `muscu-app` lui-même), et glisse-dépose dans la zone GitHub.
9. En bas, clique **Commit changes**.

---

## Étape 5 — Déployer sur Vercel

1. Va sur **vercel.com**, clique **Sign Up**, choisis **Continue with GitHub** (ça relie directement ton compte).
2. Une fois connecté, clique **Add New...** > **Project**.
3. Trouve le repository `fonte` dans la liste et clique **Import**.
4. Vercel détecte automatiquement Next.js, ne change rien dans **Build settings**.
5. Ouvre la section **Environment Variables** et ajoute une par une :
   - `NEXT_PUBLIC_SUPABASE_URL` → colle le Project URL noté à l'étape 1
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → colle la clé anon public
   - `GEMINI_API_KEY` → colle la clé Gemini de l'étape 3
6. Clique **Deploy**. Patiente 1 à 2 minutes.
7. Une fois terminé, Vercel te donne une adresse du type `fonte-xxxx.vercel.app`. Ouvre-la pour vérifier que la page d'accueil s'affiche (tu verras le bouton "Se connecter avec Google" — normal, on finalise juste après).

---

## Étape 6 — Autoriser l'adresse Vercel (dernière étape technique)

Il faut dire à Supabase et à Google que cette nouvelle adresse a le droit de se connecter.

1. Sur **Supabase** > **Authentication** > **URL Configuration** :
   - **Site URL** : colle ton adresse Vercel (ex. `https://fonte-xxxx.vercel.app`)
   - **Redirect URLs** : ajoute `https://fonte-xxxx.vercel.app/auth/callback`
   - Sauvegarde.
2. Sur **Google Cloud Console** > **Credentials** > ton client OAuth :
   - Dans **Authorized JavaScript origins**, ajoute `https://fonte-xxxx.vercel.app`
   - Sauvegarde.

---

## Étape 7 — Vérification finale

1. Ouvre ton adresse Vercel dans un navigateur (idéalement ton téléphone, puisque c'est là que tu l'utiliseras à la salle).
2. Clique **Se connecter avec Google**, autorise l'accès.
3. Tu arrives sur la page d'accueil, vide pour l'instant : clique **Importer un programme**.
4. Colle un vrai programme ChatGPT, clique **Analyser**, vérifie que le résultat te semble correct, enregistre.
5. Retourne à l'accueil, choisis un jour, logge une série pour voir le chrono se déclencher.

Si une étape bloque (erreur, écran blanc, bouton qui ne fait rien), note le message d'erreur exact
(ou une capture d'écran) et je t'aide à débugger — c'est plus rapide à diagnostiquer avec le message précis
qu'avec une description générale.
