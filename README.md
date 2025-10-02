# Portfolio

Projet vitrine pour illustrer mes compétences et mon parcours.

## Aperçu
- **Framework**: React + TypeScript via Vite
- **Styles**: Tailwind CSS
- **i18n**: i18next + react-i18next
- **Gestion des paquets**: npm

## Structure du projet
```
Portfolio/
├─ frontend/                 # Application React (Vite)
│  ├─ src/                   # Code source (components, pages, etc.)
│  ├─ index.html             # Point d'entrée Vite
│  ├─ package.json           # Scripts (dev, build, lint, preview)
│  └─ ...
├─ package.json              # Dépendances racine (ex: tailwind, i18n)
├─ .gitignore                # Règles d'exclusion Git
└─ README.md                 # Ce fichier
```

## Prérequis
- Node.js >= 18
- npm >= 9

Vérifier les versions:
```bash
node -v
npm -v
```

## Installation
Dans le dossier `frontend/` (application principale):
```bash
cd frontend
npm install
```

Si vous utilisez des outils configurés à la racine (ex: Tailwind 4/i18n partagés), installez aussi à la racine:
```bash
npm install
```

## Développement
Lancer le serveur de dev Vite:
```bash
cd frontend
npm run dev
```
Ouvrez l’URL affichée par Vite (par défaut http://localhost:5173).

## Build de production
Générer les fichiers statiques:
```bash
cd frontend
npm run build
```
Les artefacts seront dans `frontend/dist/`.

Prévisualiser le build localement:
```bash
cd frontend
npm run preview
```

## Linting
```bash
cd frontend
npm run lint
```

## Variables d’environnement
- Placez vos variables dans un fichier `.env` (ou `.env.local`, `.env.development`, etc.).
- Le repo ignore les `.env` par défaut (voir `.gitignore`).
- Fournissez un `.env.example` pour documenter les clés attendues.

## Internationalisation (i18n)
Le projet utilise `i18next` et `react-i18next`.
- Définissez vos ressources de traduction (ex: `src/i18n/`).
- Chargez i18n au démarrage de l’app (ex: dans `main.tsx` ou un module dédié).

## Styles (Tailwind CSS)
- Tailwind CSS est configuré pour le projet.
- Placez vos styles globaux (ex: `src/index.css`) et utilisez les classes utilitaires dans vos composants.

## Git & bonnes pratiques
- `node_modules/`, fichiers de build, caches, logs, `.env`, `.venv/` sont ignorés par `.gitignore`.
- Si des artefacts ont déjà été commit:
  ```bash
  git rm -r --cached .
  git add .
  git commit -m "chore: clean tracked artifacts"
  ```

## Déploiement
- Hébergement statique: déployez le contenu de `frontend/dist/` (ex: GitHub Pages, Netlify, Vercel).
- Adaptez la configuration selon votre plateforme (headers, SPA fallback, etc.).

## Scripts disponibles (dans `frontend/package.json`)
- `npm run dev` — démarre le serveur de développement.
- `npm run build` — build production (TypeScript + Vite).
- `npm run preview` — prévisualise le build local.
- `npm run lint` — exécute ESLint.
