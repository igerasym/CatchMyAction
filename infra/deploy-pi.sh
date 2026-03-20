#!/bin/bash
set -e

# ============================================
# CatchMyAction — Raspberry Pi Deploy Script
# ============================================
# 
# Prerequisites on your Pi:
#   1. Docker + Docker Compose installed
#   2. Git installed
#   3. SSH access
#
# Usage:
#   ssh pi@<your-pi-ip>
#   git clone git@github.com:igerasym/CatchMyAction.git
#   cd CatchMyAction/surf-shots
#   chmod +x infra/deploy-pi.sh
#   ./infra/deploy-pi.sh
#
# To expose to internet (optional):
#   Install cloudflared and run:
#   cloudflared tunnel --url http://localhost:3000
# ============================================

echo "🏄 CatchMyAction — Deploying to Raspberry Pi"
echo "============================================="

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Install it first:"
  echo "   curl -fsSL https://get.docker.com | sh"
  echo "   sudo usermod -aG docker \$USER"
  echo "   (log out and back in)"
  exit 1
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
  echo "❌ Docker Compose not found. Install it:"
  echo "   sudo apt install docker-compose-plugin"
  exit 1
fi

# Create .env.prod if it doesn't exist
if [ ! -f .env.prod ]; then
  echo "📝 Creating .env.prod — edit this with your keys"
  cat > .env.prod << 'EOF'
# Required
NEXTAUTH_SECRET=change-me-to-a-random-string-at-least-32-chars
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (optional for testing without payments)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
EOF
  echo "⚠️  Edit .env.prod with your Stripe keys, then re-run this script"
  echo "   nano .env.prod"
  exit 0
fi

# Load env
export $(grep -v '^#' .env.prod | xargs)

# Determine compose command
COMPOSE="docker compose"
if ! docker compose version &> /dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

echo "🔨 Building and starting containers..."
echo "   (first build may take 10-15 min on Pi)"

$COMPOSE -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo ""
echo "⏳ Waiting for database..."
sleep 10

echo "🗄️  Running database migrations..."
$COMPOSE -f docker-compose.prod.yml exec app npx prisma db push --accept-data-loss 2>/dev/null || \
  $COMPOSE -f docker-compose.prod.yml exec app npx prisma db push

echo "🌱 Seeding demo data..."
$COMPOSE -f docker-compose.prod.yml exec app npx tsx prisma/seed.ts 2>/dev/null || echo "   (seed skipped or already done)"

# Get Pi's local IP
PI_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "============================================="
echo "✅ CatchMyAction is running!"
echo "============================================="
echo ""
echo "🌐 Local:   http://localhost:3000"
echo "🌐 Network: http://${PI_IP}:3000"
echo ""
echo "📱 Demo accounts:"
echo "   Photographer: photographer@demo.com / password"
echo "   Surfer:       surfer@demo.com / password"
echo ""
echo "🔧 Commands:"
echo "   Logs:    $COMPOSE -f docker-compose.prod.yml logs -f"
echo "   Stop:    $COMPOSE -f docker-compose.prod.yml down"
echo "   Restart: $COMPOSE -f docker-compose.prod.yml restart"
echo ""
echo "🌍 To expose to internet:"
echo "   cloudflared tunnel --url http://localhost:3000"
echo ""
