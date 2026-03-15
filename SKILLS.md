# SKILLS.md

Compétences techniques et fonctionnelles illustrées par ce projet portfolio.

## Développement Frontend

### React & TypeScript

- **React 19** avec hooks (`useState`, `useEffect`), composants fonctionnels
- **TypeScript strict mode** (ES2022) — typage fort, `noUnusedLocals`, `noUnusedParameters`
- Routing custom basé sur le hash (`hashchange` listener, regex matching)
- Rendu conditionnel, gestion de formulaires contrôlés, gestion d'état local
- Architecture composants : Layout, Header, Footer, descriptions riches (`Desc*.tsx`)

### Build & Tooling

- **Vite 7** — dev server avec HMR, proxy `/api` vers le backend Django
- **ESLint** flat config avec `typescript-eslint`, `react-hooks`, `react-refresh`
- **PostCSS** + **Tailwind CSS 4** — utility-first, design tokens custom

### Styling & Design System

- **Tailwind CSS** — classes utilitaires, `@layer components`, `@layer base`
- Thème custom : palette 5 couleurs (`primary`, `primaryLight`, `accent1-3`)
- **Dark mode** (`class` strategy, persisté en `localStorage`, évitement du FOUC)
- Typographies : **Souvenir** (display), **Inter** (sans-serif)
- Responsive design (mobile-first, grilles `sm:`, `md:`, `lg:`)
- Composants réutilisables CSS : `.section`, `.card`, `.btn`, `.btn-primary`, `.btn-outline`, `.btn-accent`, `.badge`

### Données statiques & architecture

- Modèle projet typé (`Project`, `Category`) avec slug auto-généré (normalisation Unicode)
- Descriptions riches en JSX (composants React dédiés par projet)
- Index centralisé (`projectIndex.ts`) fusionnant projets et enseignement/recherche
- Lookup par slug via `Record<string, Project>`

## Développement Backend

### Django & Django REST Framework

- **Django 5** — projet `core`, app `api`
- **Django REST Framework** — `ReadOnlyModelViewSet`, `APIView`, serializers
- Modèle `Project` avec 7 catégories, tags comma-separated, propriété `tags_list`
- `ContactAPIView` — validation, honeypot anti-spam, envoi email avec `reply_to`
- Serializers : `ModelSerializer` (Project), `Serializer` (Contact)

### Configuration & Sécurité

- `SECRET_KEY` et credentials email via variables d'environnement
- `CORS` via `django-cors-headers` (ouvert en dev, à restreindre en prod)
- `ALLOWED_HOSTS` dynamique (env + valeurs par défaut)
- Email backend configurable (console en dev, SMTP en prod)
- Honeypot field pour la protection anti-spam du formulaire de contact

### Base de données

- **SQLite** en développement
- Migrations Django (`manage.py migrate`)
- **PostgreSQL** recommandé en production

## DevOps & Déploiement

### Scripts d'automatisation

- **`start.ps1`** (Windows PowerShell) — lancement parallèle backend + frontend avec activation automatique du venv
- **`deploy.sh`** (Linux) — déploiement complet : `git pull`, `pip install`, `migrate`, `collectstatic`, `npm ci`, `npm run build`, restart systemd + nginx

### Infrastructure de production

- **Gunicorn** comme serveur WSGI
- **Nginx** comme reverse-proxy
- **systemd** pour la gestion des services
- Domaine : `automia.org`
- Frontend servi comme fichiers statiques depuis `frontend/dist/`

## Intégration & Communication Front/Back

- Proxy Vite (`/api` → `http://127.0.0.1:8000`) pour le développement
- API REST JSON : `GET /api/projects/`, `GET /api/projects/{id}/`, `POST /api/contact/`
- Appels `fetch` natifs côté frontend avec gestion d'erreurs et états de chargement

## Internationalisation

- **i18next** + **react-i18next** — support multilingue (français, anglais)
- Django : `LANGUAGE_CODE = 'fr'`, `LANGUAGES = [('fr', ...), ('en', ...)]`

## Qualité & Bonnes Pratiques

- TypeScript strict avec vérification au build (`tsc -b`)
- ESLint avec règles React hooks et React Refresh
- Séparation frontend / backend claire
- Gestion des secrets via `.env` (ignorés par `.gitignore`)
- Architecture modulaire (composants, données, serializers séparés)
- Dark mode accessible avec persistance utilisateur

## Catégories de projets présentés

Le portfolio couvre les domaines suivants :

| Domaine                  | Exemples                                                       |
|--------------------------|----------------------------------------------------------------|
| Traitement documentaire  | Extraction d'information, Génération de documents, LLM & NLP  |
| Jeux                     | ALFI, MechaIDLE, FullMetalWar                                  |
| Web                      | Applications Java/Laravel, Infoscope (Django + React)          |
| Automatisation           | N8N                                                            |
| Sécurité                 | Audit                                                          |
| Recherche                | ICTAI 2024 (IEEE), Overview (IEEE Access)                      |
| Formation & Enseignement | Vercel, Supabase, OpenRouter, Computer Vision                  |
