#!/bin/bash
set -e

# ============================================
# CatchMyAction — Cloudflare Tunnel Setup
# ============================================
#
# Creates a persistent tunnel with a fixed URL.
# Runs as a systemd service (auto-starts on boot).
#
# Prerequisites:
#   1. Free Cloudflare account (https://dash.cloudflare.com)
#   2. App running on port 3100
#
# Usage:
#   ./infra/setup-tunnel.sh
# ============================================

APP_PORT="${APP_PORT:-3100}"

echo "🌍 CatchMyAction — Cloudflare Tunnel Setup"
echo "============================================"

# 1. Install cloudflared
if ! command -v cloudflared &> /dev/null; then
  echo "📦 Installing cloudflared..."
  ARCH=$(dpkg --print-architecture 2>/dev/null || echo "arm64")
  curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}" -o /tmp/cloudflared
  sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
  sudo chmod +x /usr/local/bin/cloudflared
  echo "✅ cloudflared installed"
else
  echo "✅ cloudflared already installed"
fi

# 2. Login to Cloudflare
if [ ! -f ~/.cloudflared/cert.pem ]; then
  echo ""
  echo "🔐 Login to Cloudflare (opens browser or gives URL):"
  cloudflared tunnel login
  echo "✅ Logged in"
else
  echo "✅ Already logged in to Cloudflare"
fi

# 3. Create tunnel
TUNNEL_NAME="catchmyaction"

if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
  echo "✅ Tunnel '$TUNNEL_NAME' already exists"
  TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
else
  echo "🔧 Creating tunnel '$TUNNEL_NAME'..."
  cloudflared tunnel create "$TUNNEL_NAME"
  TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
  echo "✅ Tunnel created: $TUNNEL_ID"
fi

# 4. Create config
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /home/$(whoami)/.cloudflared/${TUNNEL_ID}.json

ingress:
  - service: http://localhost:${APP_PORT}
EOF

echo "✅ Config written to ~/.cloudflared/config.yml"

# 5. Show DNS instructions
echo ""
echo "============================================"
echo "📋 Next steps:"
echo "============================================"
echo ""
echo "Option A — Free subdomain (no custom domain needed):"
echo "  cloudflared tunnel run $TUNNEL_NAME"
echo "  Your app will be at: https://${TUNNEL_ID}.cfargotunnel.com"
echo ""
echo "Option B — Custom domain (if you have one on Cloudflare):"
echo "  cloudflared tunnel route dns $TUNNEL_NAME your-domain.com"
echo "  Then: cloudflared tunnel run $TUNNEL_NAME"
echo ""
echo "============================================"
echo "🔄 To run as a service (auto-start on boot):"
echo "============================================"
echo ""
echo "  sudo cloudflared service install"
echo "  sudo systemctl enable cloudflared"
echo "  sudo systemctl start cloudflared"
echo ""
echo "  Check status: sudo systemctl status cloudflared"
echo "  View logs:    sudo journalctl -u cloudflared -f"
echo ""

# 6. Ask to start now
read -p "🚀 Start tunnel now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Starting tunnel... (Ctrl+C to stop)"
  cloudflared tunnel run "$TUNNEL_NAME"
fi
