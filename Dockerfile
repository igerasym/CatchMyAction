FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Build the application
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy DATABASE_URL for build (Prisma needs it for static page generation)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
# Public client-side config, inlined into the JS bundle at build time
ARG NEXT_PUBLIC_CARTO_KEY=""
ENV NEXT_PUBLIC_CARTO_KEY=$NEXT_PUBLIC_CARTO_KEY
RUN npm run build
# Compile maintenance scripts (spot seed/import) to plain JS — the runner has no TS toolchain
RUN npx esbuild scripts/seed-spots.ts scripts/import-spots.ts --bundle --platform=node --target=node20 --format=cjs --external:@prisma/client --outdir=scripts/dist

# Production image
FROM base AS runner
RUN apk add --no-cache openssl fontconfig ttf-dejavu
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create uploads directory
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# Spot catalogue seed/import (run with: node scripts/dist/<name>.js)
COPY --from=builder /app/scripts/dist ./scripts/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
