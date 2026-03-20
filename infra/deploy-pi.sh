#!/bin/bash
set -e

# ============================================
# CatchMyAction — Raspberry Pi Deploy Script
# ============================================
#
# Uses your EXISTING PostgreSQL on the Pi.
# Runs the app on port 3100 (configurable).
# Does NOT touch your other services.
#
# Usage:
#   cd CatchMyAction/surf-shots
#   ./infra/deploy-pi.sh
# ============================================

echo "🏄 CatchMyAction — Deploying to Raspberry Pi"
echo "============================================="

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Install: curl -fsSL https://get.docker.com | sh"
  exit 1
fi

# Create .env.prod if missing
if [ ! -f .env.prod ]; then
  echo "📝 Creating .env.prod"
  cat > .env.prod << 'EOF'
# App port (change if 3100 is taken)
APP_PORT=3100

# PostgreSQL — point to your existing instance
# Use host.docker.internal to reach Pi's localhost from inside Docker
DATABASE_URL=postgresql://catchmyaction:password@host.docker.internal:5432/catchmyaction?schema=public

# Auth
NEXTAUTH_SECRET=change-me-to-a-random-string-at-least-32-chars
NEXTAUTH_URL=http://localhost:3100
NEXT_PUBLIC_APP_URL=http://localhost:3100

# Stripe (optional)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
EOF
  echo ""
  echo "⚠️  Before re-running, do these steps:"
  echo ""
  echo "1. Create the database and user in your existing PostgreSQL:"
  echo "   sudo -u postgres psql"
  echo "   CREATE USER catchmyaction WITH PASSWORD 'password';"
  echo "   CREATE DATABASE catchmyaction OWNER catchmyaction;"
  echo "   \\q"
  echo ""
  echo "2. Edit .env.prod if your PostgreSQL uses different credentials/port"
  echo "   nano .env.prod"
  echo ""
  echo "3. Re-run: ./infra/deploy-pi.sh"
  exit 0
fi

# Load env
set -a
source .env.prod
set +a

# Determine compose command
COMPOSE="docker compose"
if ! docker compose version &> /dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

echo "🔨 Building app container..."
echo "   (first build ~10-15 min on Pi)"

$COMPOSE -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo ""
echo "⏳ Waiting for app to start..."
sleep 5

echo "🗄️  Running database migrations..."
$COMPOSE -f docker-compose.prod.yml exec app npx prisma db push 2>&1 || true

echo "🌱 Seeding demo data..."
$COMPOSE -f docker-compose.prod.yml exec app npx tsx prisma/seed.ts 2>&1 || echo "   (already seeded)"

PI_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "============================================="
echo "✅ CatchMyAction is running!"
echo "============================================="
echo ""
echo "🌐 Local:   http://localhost:${APP_PORT:-3100}"
echo "🌐 Network: http://${PI_IP}:${APP_PORT:-3100}"
echo ""
echo "📱 Demo: photographer@demo.com / password"
echo ""
echo "🔧 Logs:    $COMPOSE -f docker-compose.prod.yml logs -f app"
echo "🔧 Stop:    $COMPOSE -f docker-compose.prod.yml down"
echo "🔧 Restart: $COMPOSE -f docker-compose.prod.yml restart app"
echo ""
