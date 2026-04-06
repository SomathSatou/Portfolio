#!/bin/bash
set -e

PROJECT_DIR="/var/www/Portfolio"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV="$BACKEND_DIR/.venv/bin"
LOG="/var/log/portfolio-deploy.log"
ENV_FILE="/etc/portfolio.env"

echo "=== Déploiement $(date) ===" >> $LOG

# Load environment variables (DB, email, etc.)
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

cd "$PROJECT_DIR"
git pull >> $LOG 2>&1

source "$VENV/activate"
pip install -q django djangorestframework django-cors-headers djangorestframework-simplejwt Pillow gunicorn daphne channels mysqlclient python-dotenv >> $LOG 2>&1

cd "$BACKEND_DIR"
python manage.py migrate --noinput >> $LOG 2>&1
python manage.py collectstatic --noinput >> $LOG 2>&1

cd "$FRONTEND_DIR"
npm ci --silent >> $LOG 2>&1
npm run build >> $LOG 2>&1

systemctl restart portfolio
systemctl reload nginx

echo "=== Déploiement terminé ===" >> $LOG