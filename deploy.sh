#!/bin/bash
set -e

PROJECT_DIR="/var/www/Portfolio"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV="$BACKEND_DIR/.venv/bin"
LOG="/var/log/portfolio-deploy.log"
DEPLOY_LOG="$PROJECT_DIR/deploy.log"
ENV_FILE="/etc/portfolio.env"

exec > >(tee -a "$LOG" "$DEPLOY_LOG") 2>&1

echo "=== Déploiement $(date) ==="
echo "Working directory: $(pwd)"

# Load environment variables (DB, email, etc.)
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment from $ENV_FILE"
    set -a
    source "$ENV_FILE"
    set +a
else
    echo "Warning: $ENV_FILE not found"
fi

cd "$PROJECT_DIR"
echo "[1/7] Git pull..."
git pull

echo "[2/7] Activating virtualenv..."
source "$VENV/activate"

echo "[3/7] Installing Python dependencies..."
pip install -q django djangorestframework django-cors-headers djangorestframework-simplejwt Pillow gunicorn daphne channels mysqlclient python-dotenv

cd "$BACKEND_DIR"
echo "[4/7] Running migrations..."
python manage.py migrate --noinput

echo "[5/7] Collecting static files..."
python manage.py collectstatic --noinput

cd "$FRONTEND_DIR"
echo "[6/7] Building frontend..."
npm ci --silent
npm run build

echo "[7/7] Restarting services..."
systemctl restart portfolio
systemctl reload nginx

echo "=== Déploiement terminé avec succès ==="