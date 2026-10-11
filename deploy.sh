#!/bin/bash
set -e

PROJECT_DIR="/var/www/Portfolio"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV="$BACKEND_DIR/.venv/bin"
DEPLOY_LOG="$PROJECT_DIR/deploy.log"
ENV_FILE="/etc/portfolio.env"
# Groupe de lecture de la config portfolio (www-data = Gunicorn/Daphne, portfolio-deploy = CI)
ENV_GROUP="portfolio"
APP_USER="www-data"
DEPLOY_USER="portfolio-deploy"
HEALTH_URL="http://127.0.0.1:8000/api/projects/"

exec > >(tee -a "$DEPLOY_LOG") 2>&1

echo "=== Déploiement $(date) ==="
echo "Working directory: $(pwd)"

# Permissions de la config portfolio uniquement (jamais les fichiers mail / autres services).
# backend/.env est un symlink vers $ENV_FILE : rendre $ENV_FILE lisible suffit.
ensure_env_permissions() {
    [ -f "$ENV_FILE" ] || return 0
    getent group "$ENV_GROUP" >/dev/null || groupadd --system "$ENV_GROUP"
    for u in "$APP_USER" "$DEPLOY_USER"; do
        id "$u" >/dev/null 2>&1 && ! id -nG "$u" | tr ' ' '\n' | grep -qx "$ENV_GROUP" && usermod -aG "$ENV_GROUP" "$u"
    done
    chown "root:$ENV_GROUP" "$ENV_FILE"
    chmod 640 "$ENV_FILE"
    if ! sudo -u "$APP_USER" test -r "$ENV_FILE"; then
        echo "::error::$ENV_FILE n'est pas lisible par $APP_USER — Gunicorn ne pourra pas démarrer."
        exit 1
    fi
}

ensure_env_permissions

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
pip install -q -r "$BACKEND_DIR/requirements.txt"

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

# Health-check HTTP : "is-active" est un faux positif quand les workers Gunicorn plantent au boot.
health_check() {
    local attempt code
    for attempt in $(seq 1 15); do
        code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$HEALTH_URL" || echo 000)
        if [ "$code" = "200" ]; then
            echo "✓ API portfolio répond (HTTP 200) après ${attempt} tentative(s)"
            return 0
        fi
        sleep 2
    done
    echo "::error::L'API portfolio ne répond pas (dernier code HTTP : $code) — $HEALTH_URL"
    echo "  → Dernières erreurs Gunicorn :"
    journalctl -u portfolio --since "-2min" --no-pager | grep -E "Error|Traceback" | tail -10 || true
    return 1
}

health_check || exit 1

# Auto-install daphne.service from repo if missing
if [ -f "$PROJECT_DIR/systemd/daphne.service" ]; then
    if ! systemctl list-unit-files daphne.service | grep -q daphne; then
        echo "  → Installing daphne.service from repo..."
        cp "$PROJECT_DIR/systemd/daphne.service" /etc/systemd/system/daphne.service
        systemctl daemon-reload
        systemctl enable daphne
    fi
fi

if systemctl list-unit-files daphne.service | grep -q daphne; then
    # Verify Redis is available (required for channel layers)
    if systemctl is-active --quiet redis-server; then
        systemctl restart daphne || echo "::warning::systemctl restart daphne failed"
        systemctl is-active --quiet daphne && echo "✓ Service daphne (WebSocket) is running" || echo "::warning::Service daphne is not active"
    else
        echo "::warning::redis-server is not running — skipping daphne restart (WebSocket requires Redis)"
    fi
else
    echo "::warning::daphne.service n'existe pas — le chat/dés JDR (WebSocket) ne fonctionnera pas. Voir PIPELINE.md."
fi

echo "  → Reloading nginx..."
systemctl reload nginx || echo "::warning::systemctl reload nginx failed"

echo "  → Restoring file ownership..."
mkdir -p "$BACKEND_DIR/media"
chown -R portfolio-deploy:portfolio-deploy "$FRONTEND_DIR/node_modules" "$FRONTEND_DIR/dist" || echo "::warning::chown frontend failed"
if [ -f "$BACKEND_DIR/db.sqlite3" ]; then
    chown -R www-data:www-data "$BACKEND_DIR/db.sqlite3" || echo "::warning::chown db.sqlite3 failed"
fi
chown -R www-data:www-data "$BACKEND_DIR/media" || echo "::warning::chown media failed"

echo "=== Déploiement terminé avec succès ==="