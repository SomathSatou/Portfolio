#!/bin/bash
set -e

PROJECT_DIR="/var/www/Portfolio"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV="$BACKEND_DIR/.venv/bin"
DEPLOY_LOG="$PROJECT_DIR/deploy.log"
ENV_FILE="/etc/portfolio.env"

exec > >(tee -a "$DEPLOY_LOG") 2>&1

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

if [ -z "${DJANGO_SECRET_KEY:-}" ] && [ -z "${SECRET_KEY:-}" ]; then
    echo "::error::DJANGO_SECRET_KEY or SECRET_KEY is missing. Define one in $ENV_FILE before deploying."
    exit 1
fi

cd "$PROJECT_DIR"
echo "[1/6] Git status..."
git status

echo "[2/6] Activating virtualenv..."
source "$VENV/activate"

echo "[3/6] Installing Python dependencies..."
pip install -q django djangorestframework django-cors-headers djangorestframework-simplejwt Pillow gunicorn daphne channels channels-redis mysqlclient python-dotenv

cd "$BACKEND_DIR"
echo "[4/6] Running migrations..."

echo "  → Checking migration status..."
python manage.py showmigrations --verbosity=2 || {
    echo "::warning::showmigrations failed but continuing..."
}

echo "  → Checking migration consistency..."
if ! python manage.py migrate --check --noinput 2>&1; then
    echo "⚠ Migration check indicates potential issues."
    echo "  Check output above for details."
fi

echo "  → Applying migrations..."
if ! python manage.py migrate --noinput --verbosity=2; then
    echo "::error::Migration failed!"
    echo "  → Attempting to show migration state..."
    python manage.py showmigrations || true
    exit 1
fi
echo "  → Migrations completed successfully"
echo "  → Ensuring bootstrap administrator..."
python manage.py ensure_admin

echo "[4/6] Collecting static files..."
python manage.py collectstatic --noinput

cd "$FRONTEND_DIR"
echo "[5/6] Building frontend..."
npm ci
npm run build

echo "[6/6] Restarting services..."
systemctl restart portfolio || {
    echo "::warning::systemctl restart portfolio failed - trying reload..."
    systemctl reload portfolio || echo "::warning::reload also failed"
}
systemctl is-active --quiet portfolio && echo "✓ Service portfolio is running" || echo "::warning::Service portfolio is not active"

if systemctl list-unit-files daphne.service >/dev/null 2>&1; then
    systemctl restart daphne || echo "::warning::systemctl restart daphne failed"
    systemctl is-active --quiet daphne && echo "✓ Service daphne (WebSocket) is running" || echo "::warning::Service daphne is not active"
else
    echo "::warning::daphne.service n'existe pas — le chat/dés JDR (WebSocket) ne fonctionnera pas. Voir PIPELINE.md."
fi

echo "  → Reloading nginx..."
systemctl reload nginx || echo "::warning::systemctl reload nginx failed"

echo "  → Restoring file ownership..."
mkdir -p "$BACKEND_DIR/media"
chown -R portfolio-deploy:portfolio-deploy "$FRONTEND_DIR/node_modules" "$FRONTEND_DIR/dist" 2>/dev/null || echo "::warning::chown frontend failed"
chown -R www-data:www-data "$BACKEND_DIR/db.sqlite3" "$BACKEND_DIR/media" 2>/dev/null || echo "::warning::chown db/media failed"

echo "=== Déploiement terminé avec succès ==="