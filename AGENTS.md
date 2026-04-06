# AGENTS.md

## Project overview

Portfolio personnel (vitrine) composé d'un **frontend React** et d'un **backend Django REST**.
Le frontend affiche CV, projets, enseignement/recherche et un formulaire de contact.
Le backend expose une API REST (projets + contact email).

### Architecture

```
Portfolio/
├── frontend/          # React 19 + TypeScript + Vite 7 + Tailwind CSS 4
│   ├── src/
│   │   ├── App.tsx              # Hash-based router + sections (CV, Projects, Teaching, Contact)
│   │   ├── main.tsx             # Entry point (dark mode init, React root)
│   │   ├── index.css            # Tailwind layers, theme tokens, component classes
│   │   ├── components/          # Layout, Header, Footer, Project descriptions
│   │   └── data/                # Static project data (projects.ts, teachingResearch.ts, projectIndex.ts)
│   ├── public/                  # Static assets (avatar, CV PDF)
│   ├── vite.config.ts           # Vite config with /api proxy to Django
│   ├── tailwind.config.js       # Custom colors (primary, accent1-3), fonts (Souvenir, Inter)
│   ├── eslint.config.js         # ESLint flat config (TS + React hooks + React Refresh)
│   └── tsconfig.app.json        # TypeScript strict mode, ES2022
├── backend/           # Django 5 + DRF + django-cors-headers
│   ├── core/                    # Django project (settings, urls, wsgi/asgi)
│   ├── api/                     # App: models, views, serializers, urls
│   │   ├── models.py            # Project model (7 categories, tags, links)
│   │   ├── views.py             # ProjectViewSet (read-only), ContactAPIView (email + honeypot)
│   │   ├── serializers.py       # ProjectSerializer, ContactSerializer
│   │   └── urls.py              # /api/projects/, /api/contact/
│   └── db.sqlite3               # SQLite dev database
├── start.ps1          # PowerShell: lance backend + frontend en parallèle
├── deploy.sh          # Déploiement Linux (git pull, migrate, build, systemctl)
└── package.json       # Root: Tailwind, i18next, script start
```

## Setup commands

### Frontend

```bash
cd frontend
npm install
npm run dev          # Dev server → http://localhost:5173
npm run build        # Production build (tsc + vite build) → frontend/dist/
npm run preview      # Preview production build
npm run lint         # ESLint
```

### Backend

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate          # Windows PowerShell
# source .venv/bin/activate       # macOS/Linux
pip install django djangorestframework django-cors-headers
python manage.py migrate
python manage.py runserver 8000   # → http://localhost:8000
```

### Full stack (Windows)

```powershell
npm start
# Exécute start.ps1 : ouvre deux fenêtres PowerShell (backend + frontend)
```

## API endpoints

- `GET  /api/projects/`      — Liste des projets (ReadOnlyModelViewSet)
- `GET  /api/projects/{id}/`  — Détail projet
- `POST /api/contact/`        — Envoi de message (`{ name, email, message, honeypot? }`)

Le frontend proxy `/api` vers `http://127.0.0.1:8000` via Vite (`vite.config.ts`).

## Code style

### TypeScript / React (frontend)

- **TypeScript strict mode** activé (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- **ES modules** (`"type": "module"`)
- Target **ES2022**, JSX **react-jsx**
- ESLint flat config avec `typescript-eslint`, `react-hooks`, `react-refresh`
- Fichiers composants en `.tsx`, données en `.ts`
- Utiliser les **classes utilitaires Tailwind** (pas de CSS-in-JS)
- Classes custom définies dans `index.css` via `@layer components` : `.section`, `.card`, `.btn`, `.btn-primary`, `.btn-outline`, `.btn-accent`, `.badge`
- Dark mode via la classe `dark` sur `<html>` (stocké dans `localStorage`)
- Routing par hash (`#/`, `#/project/:slug`, `#/cv`, `#/projects`, `#/contact`)

### Python / Django (backend)

- Django 5 avec DRF
- Langue par défaut : `fr`, timezone `Europe/Paris`
- Config email via variables d'environnement (fallback console en dev)
- CORS ouvert en dev (`CORS_ALLOW_ALL_ORIGINS = True`), à restreindre en prod
- DB SQLite en dev, **MariaDB en prod** (config via env vars `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`)
- `python-dotenv` charge `backend/.env` en dev ; en prod les vars viennent de `/etc/portfolio.env` (systemd `EnvironmentFile`)

## Theme & design tokens

Couleurs (définies dans `index.css` et `tailwind.config.js`) :

| Token          | Valeur    | Usage                     |
|----------------|-----------|---------------------------|
| `primary`      | `#5f2a62` | Titres, boutons, liens    |
| `primaryLight` | `#a976c3` | Hover, dark mode accents  |
| `accent1`      | `#a0de59` | Vert vif                  |
| `accent2`      | `#466b5a` | Vert foncé                |
| `accent3`      | `#f5c024` | Jaune, CTA boutons        |

Polices : **Souvenir** (display), **Inter** (sans, base).

## Data model (frontend)

Les projets sont définis statiquement dans `frontend/src/data/` :

- `projects.ts` — Projets principaux (Traitement documentaire, Jeux, Web, Automatisation, Sécurité)
- `teachingResearch.ts` — Recherche, Formation, Enseignement
- `projectIndex.ts` — Index fusionné (`allProjects`, `projectBySlug`)

Chaque projet : `{ slug, title, description (ReactNode), category, tags?, github?, image? }`

Les descriptions riches sont des composants React dans `components/Project/Desc*.tsx`.

## Internationalization

- `i18next` + `react-i18next` installés à la racine
- Langues : français (défaut), anglais
- Backend Django : `LANGUAGE_CODE = 'fr'`, `LANGUAGES = [('fr', ...), ('en', ...)]`

## Security considerations

- **Ne jamais commiter** `SECRET_KEY` Django en prod — utiliser une variable d'environnement
- En prod : `DEBUG=False`, `ALLOWED_HOSTS` restreint, CORS restreint
- Honeypot anti-spam sur le formulaire de contact
- Fichiers `.env` ignorés par `.gitignore`
- MariaDB en prod derrière Nginx reverse-proxy

## Deployment

- **Script** : `cd ?? ` (Linux) — git pull, pip install, migrate, collectstatic, npm ci + build, restart systemd + nginx
- **Domaine** : `automia.org`
- Frontend servi comme fichiers statiques depuis `frontend/dist/`
- Backend servi via Gunicorn derrière Nginx

## Conventions pour les agents

- **Activation du venv backend** : Le `.venv` est dans le `.gitignore` et n'est pas visible via les outils de recherche de fichiers. Pour exécuter des commandes Django (migrations, runserver, etc.), activer d'abord le venv depuis la **racine du projet** :
  ```powershell
  # Windows PowerShell — depuis la racine du projet
  .venv\Scripts\Activate.ps1
  # Puis exécuter les commandes Django depuis backend/
  cd backend
  python manage.py makemigrations
  python manage.py migrate
  ```
  Alternativement, utiliser le chemin complet vers le Python du venv :
  ```powershell
  .venv\Scripts\python.exe backend\manage.py makemigrations
  ```
- Toujours lancer `npm run lint` dans `frontend/` avant de proposer un commit
- Vérifier `tsc -b` (via `npm run build`) pour les erreurs TypeScript
- Ne pas modifier `db.sqlite3` directement — utiliser les migrations Django
- Ajouter un nouveau projet : créer l'entrée dans `data/projects.ts` ou `data/teachingResearch.ts`, et si besoin un composant `Desc*.tsx`
- Respecter le thème de couleurs existant (tokens ci-dessus)
- Garder le README.md à jour si la structure change
