# Pipeline de déploiement — Portfolio automia.org

## 1. Vue d'ensemble du projet

Portfolio personnel (vitrine + module JDR) composé de :

- **Frontend** : React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- **Backend** : Django 5 + Django REST Framework + Django Channels (WebSockets)
- **Domaine** : `automia.org`
- **Serveur** : VPS Linux (Debian/Ubuntu), hostname `automia.org`

### Arborescence

```
Portfolio/
├── frontend/          # React SPA
│   ├── src/           # Code source
│   ├── package.json   # Dépendances + scripts (dev, build, lint)
│   └── vite.config.ts # Config Vite + proxy /api → Django
├── backend/           # Django API
│   ├── core/          # Projet Django (settings, urls, wsgi, asgi)
│   ├── api/           # App portfolio (projets, contact)
│   ├── jdr/           # App JDR (campagnes, persos, marchand, WebSocket)
│   ├── db.sqlite3     # Base de données SQLite
│   └── media/         # Fichiers uploadés (avatars, etc.)
├── deploy.sh          # Script de déploiement actuel (à remplacer par la pipeline)
├── package.json       # Racine (tailwind, i18n)
└── .gitignore
```

---

## 2. Environnements

| Environnement | URL                        | Branche Git  | Déploiement         |
|---------------|----------------------------|-------------- |---------------------|
| **Dev local** | `localhost:5173` (front) + `localhost:8000` (back) | toutes | Manuel (`npm run dev` + `manage.py runserver`) |
| **Production**| `https://automia.org`      | `main`        | À automatiser       |

---

## 3. Stack technique serveur (prod actuel)

| Composant          | Détail                                          |
|--------------------|-------------------------------------------------|
| **OS**             | Linux (Debian/Ubuntu)                            |
| **Python**         | 3.13                                             |
| **Node.js**        | v20.18.1                                         |
| **Serveur WSGI**   | Gunicorn (`core.wsgi:application`)               |
| **Serveur ASGI**   | Daphne / Channels (WebSockets via `core.asgi`)   |
| **Reverse proxy**  | Nginx                                            |
| **Process manager**| systemd (service `portfolio`)                    |
| **Base de données** | SQLite (`backend/db.sqlite3`)                   |
| **Chemin projet**  | `/var/www/Portfolio`                             |
| **Venv Python**    | `/var/www/Portfolio/backend/.venv`               |
| **Logs déploiement** | `/var/log/portfolio-deploy.log`                |

---

## 4. Dépendances

### Frontend (`frontend/package.json`)

```json
{
  "dependencies": {
    "axios": "^1.13.6",
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.13",
    "@vitejs/plugin-react": "^5.0.3",
    "eslint": "^9.36.0",
    "tailwindcss": "^4.1.13",
    "typescript": "~5.8.3",
    "vite": "^7.1.7"
  }
}
```

**Scripts** :

- `npm run build` → `tsc -b && vite build` (output dans `frontend/dist/`)
- `npm run lint` → `eslint .`

### Backend (pas de requirements.txt — à créer idéalement)

Paquets pip nécessaires :

```
django>=5.2
djangorestframework
django-cors-headers
djangorestframework-simplejwt
Pillow
gunicorn
daphne
channels
```

---

## 5. Étapes de build & déploiement

Voici ce que fait le `deploy.sh` actuel, à reproduire dans la pipeline :

### 5.1 Backend

```bash
cd /var/www/Portfolio

# 1. Pull du code
git pull

# 2. Activer le venv & installer les dépendances
source backend/.venv/bin/activate
pip install -q django djangorestframework django-cors-headers \
    djangorestframework-simplejwt Pillow gunicorn daphne channels

# 3. Migrations Django
cd backend
python manage.py migrate --noinput

# 4. Collecte des fichiers statiques Django (admin CSS/JS)
python manage.py collectstatic --noinput
```

### 5.2 Frontend

```bash
cd /var/www/Portfolio/frontend

# 1. Install propre des dépendances
npm ci --silent

# 2. Build production (TypeScript check + Vite build)
npm run build
# Génère frontend/dist/ contenant index.html + assets/
```

### 5.3 Redémarrage des services

```bash
sudo systemctl restart portfolio   # Redémarre Gunicorn
sudo systemctl reload nginx        # Recharge la config Nginx
```

---

## 6. Configuration serveur

### 6.1 Service systemd (`portfolio.service`)

Le service s'appelle `portfolio` et exécute Gunicorn, config file :

```ini
[Unit]
Description=Site Web Perso (gunicorn)
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/Portfolio/backend
EnvironmentFile=/etc/portfolio.env
ExecStart=/var/www/Portfolio/backend/.venv/bin/gunicorn core.wsgi:application \
  --bind 127.0.0.1:8000 \
  --workers 3

[Install]
WantedBy=multi-user.target
```

### 6.2 Nginx

Nginx fait reverse proxy vers Gunicorn (port 8000). Config probable dans `/etc/nginx/sites-available/` ou `/etc/nginx/conf.d/`.

Points importants :
- Proxy `location /` → `http://127.0.0.1:8000`
- Probablement un `location /ws/` pour le proxy WebSocket vers Daphne
- SSL via Let's Encrypt (certbot)
- Le frontend est servi **par Django** (pas directement par Nginx) via les URL patterns `core/urls.py`

server {
    server_name mail.automia.org;

    root /var/www/html/roundcubemail;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
    }

    location ~ /\. {
        deny all;
    }

    location ~ ^/(config|temp|logs)/ {
        deny all;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/mail.automia.org/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/mail.automia.org/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = mail.automia.org) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name mail.automia.org;
    return 404; # managed by Certbot


}server {
    listen 80 default_server;
    server_name automia.org www.automia.org;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name automia.org www.automia.org;

    ssl_certificate /etc/letsencrypt/live/automia.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/automia.org/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Portfolio frontend
    root /var/www/Portfolio/frontend/dist;
    index index.html;

    # Mods.zip protégé
    location = /mods.zip {
        auth_basic "Restricted";
        auth_basic_user_file /etc/nginx/.htpasswd;
        root /home/minecraft/www;
        types { }
        default_type application/zip;
        add_header Content-Disposition "attachment; filename=mods.zip";
        try_files /mods.zip =404;
    }

    # API Django
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin Django
    location /admin/ {
        proxy_pass http://127.0.0.1:8000/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Django
    location /static/ {
        alias /var/www/Portfolio/backend/static/;
    }

    # Frontend SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /webhook {
        proxy_pass http://127.0.0.1:9000/hooks/deploy-portfolio;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
server {
  listen 80;
  server_name postfixadmin.automia.org;

  root /usr/share/postfixadmin/public;
  index index.php index.html;

  location / {
    try_files $uri $uri/ /index.php?$query_string;
  }

  location ~ \.php$ {
    include snippets/fastcgi-php.conf;
    fastcgi_pass unix:/run/php/php8.4-fpm.sock;
  }

  location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 7d;
    add_header Cache-Control "public";
  }
}

### 6.3 Base de données

- **SQLite** en production (fichier `backend/db.sqlite3`)
- Le fichier DB doit être **writable** par le user qui exécute Gunicorn (www-data)
- Permissions requises : `chown www-data:www-data backend/db.sqlite3 backend/`
- ⚠️ SQLite n'est pas idéal pour la prod (pas de concurrence, risque de lock). Migration vers PostgreSQL recommandée à terme.

---

## 7. Variables d'environnement (prod)

Configurées soit dans le fichier `.env` du serveur, soit dans le service systemd :

| Variable               | Description                              | Exemple                            |
|------------------------|------------------------------------------|------------------------------------|
| `SECRET_KEY`           | Clé secrète Django (à changer en prod !) | Générer avec `django.core.management.utils.get_random_secret_key()` |
| `DEBUG`                | Mode debug                               | `False`                            |
| `ALLOWED_HOSTS`        | Hosts autorisés (optionnel, déjà en dur) | `automia.org,www.automia.org`      |
| `EMAIL_HOST`           | Serveur SMTP                             | `127.0.0.1`                        |
| `EMAIL_HOST_USER`      | User SMTP                                | `contact@automia.org`              |
| `EMAIL_HOST_PASSWORD`  | Mot de passe SMTP                        | `***`                              |
| `EMAIL_PORT`           | Port SMTP                                | `587`                              |
| `EMAIL_USE_TLS`        | TLS activé                               | `true`                             |
| `CONTACT_RECIPIENT`    | Destinataire formulaire contact          | `contact@automia.org`              |
| `NEXTCLOUD_URL`        | URL Nextcloud                            | `https://cloud.automia.org`        |
| `NEXTCLOUD_ADMIN_USER` | Admin Nextcloud                          | `***`                              |
| `NEXTCLOUD_ADMIN_PASSWORD` | Mot de passe Nextcloud               | `***`                              |

> ⚠️ Actuellement `DEBUG=True` et `SECRET_KEY` est hardcodée en clair dans `settings.py`. À corriger en prod.

---

## 8. Points d'attention pour la pipeline

### Checks à exécuter avant déploiement

1. **Lint frontend** : `cd frontend && npm run lint`
2. **TypeScript check** : `cd frontend && npx tsc -b` (inclus dans `npm run build`)
3. **Build frontend** : `cd frontend && npm run build` (doit réussir sans erreur)
4. **Migrations Django** : `python manage.py migrate --check` (vérifie qu'il n'y a pas de migrations manquantes)

### Artefacts produits

- `frontend/dist/` — build React statique (servi par Django)
- `backend/static/` — fichiers statiques Django (admin)

### Fichiers à ne PAS déployer / sensibles

- `.env`, `.env.*` — variables d'environnement
- `.venv/` — virtualenv Python (créé sur le serveur)
- `node_modules/` — dépendances npm (installées sur le serveur)
- `backend/db.sqlite3` — base de données (vit uniquement sur le serveur)
- `backend/media/` — fichiers uploadés (vivent sur le serveur)
- `PROMPT_JDR.md`, `NEXTCLOUD_SETUP.md`, `Calculs - Feuille 4.csv` — fichiers de travail privés

### Permissions fichiers (post-déploiement)

```bash
chown -R www-data:www-data /var/www/Portfolio/backend/db.sqlite3
chown -R www-data:www-data /var/www/Portfolio/backend/media/
```

### Problèmes connus rencontrés

- **`ModuleNotFoundError: No module named 'daphne'`** — il faut installer `daphne` et `channels` dans le venv
- **`attempt to write a readonly database`** — permissions SQLite (www-data doit avoir les droits en écriture sur `db.sqlite3` ET son dossier parent)
- **`npn` vs `npm`** — typo fréquente en SSH, la pipeline élimine ce risque
- **`DEBUG=True` en prod** — expose les stacktraces et données sensibles

---

## 9. Flux de déploiement souhaité

```
[Push sur main] → [CI: lint + build + tests] → [CD: deploy sur serveur] → [Restart services]
```

### Pipeline idéale (étapes)

1. **Trigger** : push sur `main` (ou merge d'une PR)
2. **CI — Vérification** :
   - `npm ci` + `npm run lint` (frontend)
   - `npm run build` (frontend — inclut tsc)
   - Optionnel : tests Python (`python manage.py test`)
3. **CD — Déploiement** :
   - SSH sur le serveur (ou agent de déploiement)
   - `git pull` dans `/var/www/Portfolio`
   - `pip install` dans le venv backend
   - `python manage.py migrate --noinput`
   - `python manage.py collectstatic --noinput`
   - `npm ci && npm run build` dans frontend/
   - `systemctl restart portfolio`
   - `systemctl reload nginx`
4. **Post-déploiement** :
   - Vérifier que `https://automia.org` répond (health check)
   - Vérifier que `https://automia.org/api/projects/` répond
   - Optionnel : notification (Discord, email, etc.)

---

## 10. Accès nécessaires

Pour configurer la pipeline, ton ami aura besoin de :

- [ ] Accès au **repo Git** (GitHub/GitLab — lecture)
- [ ] Accès **SSH** au serveur (clé SSH, user + IP, port)
- [ ] Connaître le **user système** qui exécute Gunicorn (`www-data` ?)
- [ ] Accès à la **config systemd** (`/etc/systemd/system/portfolio.service`)
- [ ] Accès à la **config Nginx** (`/etc/nginx/sites-enabled/...`)
- [ ] Plateforme CI/CD choisie (GitHub Actions, GitLab CI, Jenkins, etc.)

---

## 11. Commandes utiles de référence

```bash
# Vérifier le service
sudo systemctl status portfolio
sudo journalctl -u portfolio -n 50 --no-pager

# Logs Nginx
sudo tail -50 /var/log/nginx/error.log

# Test Gunicorn manuellement
cd /var/www/Portfolio/backend
source .venv/bin/activate
gunicorn core.wsgi:application --bind 0.0.0.0:8000

# Admin Django
python manage.py createsuperuser
python manage.py changepassword <username>

# Vérifier les migrations
python manage.py showmigrations
python manage.py migrate --check
```
