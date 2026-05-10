# ─────────────────────────────────────────────────────────────────
# Monolith-Dockerfile für Railway Deployment
#
# Strategie: Express Backend + React Frontend in einem Container.
#  - Frontend wird als statische Dateien von Express ausgeliefert
#  - Keine CORS-Probleme (alles auf derselben Domain)
#  - SameSite=Strict Cookies funktionieren korrekt
#  - Ein Service auf Railway → einfacher, günstiger
#
# Stages:
#  1. frontend-deps   → node_modules für Frontend cachen
#  2. frontend-build  → Vite Build (VITE_API_URL=/api)
#  3. backend-deps    → node_modules für Backend cachen
#  4. backend-build   → TypeScript kompilieren
#  5. production      → Minimales Runtime-Image
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: Frontend Dependencies ─────────────────────────────
FROM node:20-alpine AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --prefer-offline

# ── Stage 2: Frontend Build ─────────────────────────────────────
FROM frontend-deps AS frontend-build
COPY frontend/ ./
# VITE_API_URL=/api → relative URL, funktioniert wenn Backend alles served
ARG  VITE_API_URL=/api
ENV  VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Stage 3: Backend Dependencies ───────────────────────────────
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev --prefer-offline && npm cache clean --force

# ── Stage 4: Backend Build ───────────────────────────────────────
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --prefer-offline
COPY backend/ ./
RUN npm run build

# ── Stage 5: Production Runtime ─────────────────────────────────
FROM node:20-alpine AS production

# Sicherheit: Nicht als root laufen
RUN addgroup -g 1001 -S nodejs \
 && adduser  -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Production node_modules aus Stage 3
COPY --from=backend-deps  /app/backend/node_modules ./node_modules

# Kompilierter Backend-Code aus Stage 4
COPY --from=backend-build /app/backend/dist ./dist

# Frontend Static Files → Express bedient sie aus /app/public
COPY --from=frontend-build /app/frontend/dist ./public

# package.json für npm start
COPY backend/package.json ./

# Nicht-privilegierter Benutzer
USER nodejs

# Port (Railway setzt PORT automatisch per ENV)
EXPOSE 3001

# Health Check — Railway erkennt wenn Service nicht antwortet
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT||3001) + '/health', r => r.statusCode===200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
