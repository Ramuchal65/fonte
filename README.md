# Fonte — suivi de musculation piloté par IA

Colle ton programme (ChatGPT ou autre) en texte libre. L'appli le structure automatiquement
et tu n'as plus qu'à logger poids/reps pendant la séance, avec ta perf précédente affichée
et un chrono de repos automatique.

## Mise en ligne (aucune ligne de commande nécessaire)

### 1. Supabase — base de données + connexion Google
1. Va sur [supabase.com](https://supabase.com), crée un projet (gratuit).
2. Dans **SQL Editor**, colle le contenu de `supabase/schema.sql` et exécute-le.
3. Dans **Authentication > Providers**, active **Google**, et suis les instructions
   pour créer les identifiants côté Google Cloud Console (même procédure que pour VODprice).
4. Dans **Project Settings > API**, note l'**URL** et la clé **anon public** : elles iront dans Vercel.

### 2. Google AI Studio — clé Gemini gratuite
1. Va sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Génère une clé API (aucune carte bancaire requise sur le free tier).
3. Garde-la de côté pour Vercel.

### 3. GitHub — héberger le code
1. Crée un nouveau repository (public ou privé).
2. Utilise le bouton **Add file > Upload files** sur GitHub pour glisser-déposer tous les
   fichiers de ce dossier (en conservant la structure des sous-dossiers).

### 4. Vercel — déploiement
1. Sur [vercel.com](https://vercel.com), **Add New > Project**, importe le repo GitHub.
2. Dans **Environment Variables**, ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
3. Déploie. C'est en ligne.

### 5. Dans Supabase, autoriser l'URL Vercel
Dans **Authentication > URL Configuration**, ajoute l'URL Vercel (ex. `https://fonte.vercel.app`)
comme Site URL et dans les Redirect URLs (`.../auth/callback`).

## Utilisation
1. Connecte-toi avec Google.
2. **Importer un programme** → colle le texte de ChatGPT → vérifie/corrige → enregistre.
3. Sur l'accueil, choisis un jour → log tes séries, le repos se lance tout seul entre chaque série.
4. Dans 6 mois, importe un nouveau programme : l'ancien est archivé automatiquement, ton historique reste.

## Notes
- Coût réel : 0€ (Supabase free tier + Vercel free tier + Gemini API free tier).
- Le free tier Gemini peut réutiliser les prompts pour l'entraînement de leurs modèles côté Google —
  sans enjeu ici vu qu'on y colle un programme de sport, pas de donnée sensible.
- Pas d'API publique côté Hercule : cette appli le remplace plutôt qu'elle ne s'y connecte.
