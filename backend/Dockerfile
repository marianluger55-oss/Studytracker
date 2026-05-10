# backend/Dockerfile
# ─────────────────────────────────────────────────────────────
# Multi-Stage Build für das Express-Backend.
#
# Stage 1 (builder): Kompiliert TypeScript → JavaScript
# Stage 2 (runner):  Führt nur das kompilierte JS aus — kein Dev-Tools
#
# Vorteile:
#  - Kleineres finales Image (kein TypeScript, keine devDependencies)
#  - Schnellerer Start in Produktion
#  - Bessere Sicherheit (weniger Software = weniger Angriffsfläche)
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Build ─────────────────────────────────────────────
FROM node:20-alpine AS builder

# Arbeitsverzeichnis im Container
WORKDIR /app

# package.json zuerst kopieren — Docker-Layer-Cache nutzen
# Nur wenn package.json sich ändert, wird npm install wiederholt
COPY package*.json ./
RUN npm ci --include=dev  # ci: saubere Installation (kein npm update)

# Quellcode kopieren
COPY . .

# TypeScript kompilieren → dist/
RUN npm run build

# ── Stage 2: Production Runtime ─────────────────────────────────
FROM node:20-alpine AS runner

# Sicherheit: Nicht als root laufen
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Nur Production-Dependencies installieren (keine devDependencies)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Kompilierten Code aus dem Builder kopieren
COPY --from=builder /app/dist ./dist

# Als nicht-privilegierter Benutzer ausführen
USER nodejs

# Port dokumentieren (informativ — muss in docker-compose freigegeben werden)
EXPOSE 3001

# Gesundheitscheck — Docker prüft ob der Server läuft
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Kompilierten Server starten
CMD ["node", "dist/index.js"]
