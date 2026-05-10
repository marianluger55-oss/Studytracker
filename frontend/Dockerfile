# frontend/Dockerfile
# ─────────────────────────────────────────────────────────────
# Multi-Stage Build für das React-Frontend.
#
# Stage 1 (builder): Installiert Pakete + baut die App (vite build)
# Stage 2 (nginx):   Liefert die statischen Dateien über NGINX aus
#
# NGINX in Produktion statt Vite weil:
#  - Vite Dev-Server ist für Entwicklung, nicht Produktion
#  - NGINX ist ultra-schnell für statische Dateien (C, nicht JavaScript)
#  - NGINX kann HTTP/2, Komprimierung und Caching konfigurieren
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Build ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Dependencies installieren (Layer-Cache-Optimierung)
COPY package*.json ./
RUN npm ci

# Source-Code kopieren
COPY . .

# React-App für Produktion bauen (TypeScript + Vite)
ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build  # Ausgabe landet in /app/dist

# ── Stage 2: NGINX Production Server ───────────────────────────
FROM nginx:1.25-alpine AS runner

# Optimierte NGINX-Konfiguration für React SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Gebaute App vom Builder kopieren
COPY --from=builder /app/dist /usr/share/nginx/html

# NGINX auf Port 80
EXPOSE 80

# NGINX im Vordergrund starten (nicht als Daemon — Docker braucht das)
CMD ["nginx", "-g", "daemon off;"]
