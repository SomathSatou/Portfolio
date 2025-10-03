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

## Backend (Django API)

- **Stack**: Django 5, Django REST Framework, django-cors-headers.
- **Code**: voir `backend/core/settings.py`, `backend/core/urls.py`, `backend/api/{urls.py,views.py,models.py,serializers.py}`.
- **Base URL API**: `http://localhost:8000/api/`

### Prérequis backend
- Python 3.11+
- pip

### Installation backend
```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate    # Windows PowerShell
# source .venv/bin/activate  # macOS/Linux

pip install django djangorestframework django-cors-headers
```

Option: utilisez un `backend/requirements.txt` et installez via:
```bash
pip install -r requirements.txt
```

### Configuration (env)
Paramètres principaux dans `backend/core/settings.py`:
- `DEBUG` (dev True, prod False)
- `ALLOWED_HOSTS` (ajoutez votre domaine en prod)
- `CORS_ALLOW_ALL_ORIGINS = True` en dev; restreindre en prod
- Email:
  - Dev: `EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'`
  - Prod: configurez SMTP (`EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_PORT`, `EMAIL_USE_TLS/SSL`)
- `CONTACT_RECIPIENT`: destinataire pour `/api/contact/`

### Lancer le backend
```bash
cd backend
./.venv/Scripts/activate
python manage.py migrate
python manage.py createsuperuser   # optionnel (accès /admin)
python manage.py runserver 8000
```
Backend: `http://localhost:8000/`

### Endpoints API
Définis dans `backend/api/urls.py` et `backend/api/views.py`.

- `GET /api/projects/` — liste des projets (ReadOnlyModelViewSet)
  - Schéma (voir `ProjectSerializer`):
    - `id`, `title`, `category`, `tags` (liste), `short_description`, `description`, `link_github`, `link_demo`, `created_at`
- `GET /api/projects/{id}/` — détail projet
- `POST /api/contact/` — envoyer un message de contact
  - Corps JSON (voir `ContactSerializer`): `{ name, email, message, honeypot? }`
  - Dev: email affiché en console; Prod: configurez SMTP et `CONTACT_RECIPIENT`

Exemples
```bash
curl http://localhost:8000/api/projects/
curl http://localhost:8000/api/projects/1/
curl -X POST http://localhost:8000/api/contact/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","message":"Bonjour"}'
```

### Admin Django
- URL: `http://localhost:8000/admin/`
- Créez un superuser: `python manage.py createsuperuser`

### Intégration Front/Back en dev (CORS/proxy)
- CORS est ouvert en dev (`CORS_ALLOW_ALL_ORIGINS=True`). Restreindre en prod.
- Le front appelle `/api/...` (ex: `frontend/src/App.tsx` envoie sur `/api/contact/`).
  - Option 1 (recommandé): configurez un proxy Vite (`frontend/vite.config.ts`) pour rediriger `/api` vers `http://localhost:8000`.
  - Option 2: utiliser l’URL absolue du backend dans les requêtes (`http://localhost:8000/api/...`).

Exemple de proxy Vite
```ts
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

### Notes de sécurité (prod)
- Mettre `DEBUG=False`, définir `ALLOWED_HOSTS`, restreindre CORS.
- Utiliser un `SECRET_KEY` sécurisé et un backend email réel.
- Préférer une DB gérée (PostgreSQL) plutôt que SQLite.
- Servir le front via CDN et placer Django derrière un reverse-proxy (Nginx).
