# Baby Bet Marine

Mini-app React/Vite pour organiser des paris entre collègues autour d'une naissance.

## Stack

- React + Vite
- Supabase pour la base de données
- Vercel pour l'hébergement et la route admin `/api/admin`

## Projet Supabase

Projet créé : `baby-bet-marine`

URL Supabase :

```txt
https://btxmplbdeovyxytxdkzx.supabase.co
```

Tables créées :

- `public.bets`
- `public.game_result`

RLS activée : lecture publique et insertion publique sur `bets`, lecture publique sur `game_result`. Les actions admin passent par la fonction Vercel `/api/admin` avec la clé service role côté serveur.

## Variables Vercel nécessaires

Dans Vercel > Project > Settings > Environment Variables :

```env
VITE_SUPABASE_URL=https://btxmplbdeovyxytxdkzx.supabase.co
VITE_SUPABASE_ANON_KEY=à copier depuis Supabase > Project Settings > API > anon/public key
SUPABASE_SERVICE_ROLE_KEY=à copier depuis Supabase > Project Settings > API > service_role key
ADMIN_PIN=choisis_un_pin_simple
```

Important : ne mets jamais `SUPABASE_SERVICE_ROLE_KEY` dans une variable qui commence par `VITE_`.

## Déploiement Vercel

Importer le repo GitHub `awoutz/dashAP` dans Vercel.

Réglages attendus :

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Ensuite ajouter les variables ci-dessus, puis redeploy.

## Utilisation

- Les collègues peuvent ajouter un pari sans compte.
- Tout le monde voit les paris.
- Le classement ne s'affiche que quand l'admin coche "Afficher le classement".
- Le PIN admin permet de supprimer un pari, reset le jeu et enregistrer le résultat final.
