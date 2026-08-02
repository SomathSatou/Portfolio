#!/bin/bash
# setup-services.sh — One-time server provisioning for Portfolio services.
# Run as root on the production server after first clone / first deploy.
# Usage: sudo bash /var/www/Portfolio/scripts/setup-services.sh
set -e

PROJECT_DIR="/var/www/Portfolio"
SYSTEMD_DIR="/etc/systemd/system"
ENV_FILE="/etc/portfolio.env"

echo "=== Portfolio Services Setup ==="

# 1. Install Redis if not present
if ! command -v redis-server &>/dev/null; then
    echo "[1/4] Installing Redis..."
    apt install -y redis-server
    systemctl enable --now redis-server
else
    echo "[1/4] Redis already installed"
    systemctl enable --now redis-server 2>/dev/null || true
fi

# Verify Redis is running
if ! systemctl is-active --quiet redis-server; then
    echo "ERROR: Redis is not running. Cannot proceed."
    exit 1
fi
echo "  ✓ Redis is running"

# 2. Add CHANNEL_LAYER_BACKEND=redis to /etc/portfolio.env if missing
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE does not exist. Create it first (see PIPELINE.md section 7)."
    exit 1
fi

if ! grep -q "CHANNEL_LAYER_BACKEND" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# Channel layers backend for WebSocket (Daphne)" >> "$ENV_FILE"
    echo "CHANNEL_LAYER_BACKEND=redis" >> "$ENV_FILE"
    echo "REDIS_URL=redis://127.0.0.1:6379/0" >> "$ENV_FILE"
    echo "[2/4] Added CHANNEL_LAYER_BACKEND=redis to $ENV_FILE"
else
    echo "[2/4] CHANNEL_LAYER_BACKEND already configured in $ENV_FILE"
fi

# 3. Install systemd services
echo "[3/4] Installing systemd services..."

if [ -f "$PROJECT_DIR/systemd/daphne.service" ]; then
    cp "$PROJECT_DIR/systemd/daphne.service" "$SYSTEMD_DIR/daphne.service"
    echo "  → Installed daphne.service"
else
    echo "ERROR: $PROJECT_DIR/systemd/daphne.service not found"
    exit 1
fi

if [ -f "$PROJECT_DIR/systemd/portfolio.service" ]; then
    cp "$PROJECT_DIR/systemd/portfolio.service" "$SYSTEMD_DIR/portfolio.service"
    echo "  → Installed portfolio.service"
else
    echo "WARNING: $PROJECT_DIR/systemd/portfolio.service not found (skipping)"
fi

systemctl daemon-reload
systemctl enable daphne
systemctl enable portfolio 2>/dev/null || true

# 4. Start/restart services
echo "[4/4] Starting services..."
systemctl restart portfolio 2>/dev/null || echo "  ⚠ portfolio restart failed (may not be configured yet)"
systemctl restart daphne

echo ""
echo "=== Setup complete ==="
systemctl is-active --quiet portfolio && echo "✓ portfolio (Gunicorn) is running" || echo "✗ portfolio is NOT running"
systemctl is-active --quiet daphne && echo "✓ daphne (WebSocket) is running" || echo "✗ daphne is NOT running"
systemctl is-active --quiet redis-server && echo "✓ redis-server is running" || echo "✗ redis-server is NOT running"
