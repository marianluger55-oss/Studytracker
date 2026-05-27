# StudyTracker

Eine moderne Web-App zum Erfassen und Analysieren von Lernzeiten.  
Kostenlos, ohne Abo — mit eigenem Backend, Statistiken und Gamification.

---

## Features

- **Timer** — Ein Klick starten, automatisch stoppen. Kategorien zuweisbar.
- **Statistiken** — Tages-/Wochen-/Monatsübersicht mit Balkendiagrammen
- **Ziele** — Wochenziele setzen und verfolgen
- **Kategorien** — Eigene Fächer mit Farbe und Icon
- **Streaks & Achievements** — Lern-Streak, Errungenschaften freischalten
- **Dark Mode** — Augenschonend für Late-Night-Sessions
- **Admin-Panel** — Benutzerverwaltung, Audit-Log, Plattform-Statistiken
- **Landing Page** — Öffentliche Startseite mit Animationen (Framer Motion)

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Framer Motion, TanStack Query |
| **Backend** | Node.js, Express, TypeScript |
| **Datenbank** | PostgreSQL 16 |
| **Cache** | Redis |
| **Auth** | JWT (Access Token 15min + Refresh Token 7 Tage, HTTP-only Cookie) |
| **Deployment** | Docker / Docker Compose / Railway |

---

## Schnellstart mit Docker

### 1. Repository klonen

```bash
git clone https://github.com/marianluger55-oss/Studytracker.git
cd Studytracker
```

### 2. Umgebungsvariablen setzen

```bash
cp .env.example .env
```

Die `.env` öffnen und ausfüllen:

```env
DB_PASSWORD=dein-sicheres-datenbankpasswort
JWT_SECRET=dein-zufaelliger-schluessel-mindestens-32-zeichen
```

JWT_SECRET generieren:
```bash
openssl rand -hex 64
```

### 3. Starten

```bash
docker compose up -d
```

| Dienst | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Datenbank | localhost:5432 |

### Logs anzeigen

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Stoppen

```bash
docker compose down
```

---

## Manuelles Setup (ohne Docker)

### Voraussetzungen

- Node.js 20+
- PostgreSQL 16
- Redis

### Backend

```bash
cd backend
cp .env.example .env    # .env befüllen (DATABASE_URL, JWT_SECRET, etc.)
npm install
npm run db:migrate      # Datenbankschema anlegen
npm run dev             # Startet auf Port 3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev             # Startet auf Port 5173
```

---

## Umgebungsvariablen

### Root `.env` (für Docker Compose)

| Variable | Beschreibung | Beispiel |
|---|---|---|
| `DB_PASSWORD` | PostgreSQL-Passwort | `sicheres-passwort-123` |
| `JWT_SECRET` | JWT-Signaturschlüssel (min. 32 Zeichen) | `openssl rand -hex 64` |

### `backend/.env` (für manuelles Setup)

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | PostgreSQL Connection String |
| `REDIS_URL` | Redis Connection String |
| `JWT_SECRET` | JWT-Signaturschlüssel |
| `JWT_EXPIRES_IN` | Access-Token Laufzeit (z.B. `15m`) |
| `PORT` | Backend-Port (Standard: `3001`) |
| `CORS_ORIGIN` | Erlaubte Frontend-URL |

---

## Projektstruktur

```
StudyTracker/
├── frontend/                  # React + TypeScript App
│   └── src/
│       ├── pages/             # Seitenkomponenten
│       │   ├── Landing/       # Öffentliche Startseite
│       │   ├── Dashboard/     # Lern-Übersicht
│       │   ├── Timer/         # Lern-Timer
│       │   ├── Statistics/    # Statistiken
│       │   ├── Goals/         # Ziele
│       │   ├── Categories/    # Fach-Kategorien
│       │   ├── Settings/      # Einstellungen
│       │   ├── Admin/         # Admin-Panel
│       │   ├── Auth/          # Login / Register
│       │   └── Legal/         # AGB, Datenschutz, Impressum, Kontakt
│       ├── components/        # Wiederverwendbare UI-Komponenten
│       ├── store/             # Zustand (Zustand + TanStack Query)
│       ├── services/          # API-Aufrufe
│       └── hooks/             # Custom React Hooks
│
├── backend/                   # Express + TypeScript API
│   └── src/
│       ├── routes/            # API-Endpunkte
│       ├── controllers/       # Request-Handler
│       ├── services/          # Business-Logik + DB-Queries
│       ├── middleware/        # Auth, Rate-Limit, Audit
│       ├── db/                # DB-Pool + Redis-Client
│       └── validation/        # Zod-Schemata
│
├── docker-compose.yml         # Lokale Infrastruktur
├── Dockerfile                 # Multi-Stage Build (Backend + Frontend)
└── .env.example               # Vorlage für Umgebungsvariablen
```

---

## API-Übersicht

| Methode | Pfad | Beschreibung |
|---|---|---|
| `POST` | `/api/auth/register` | Registrierung |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/refresh` | Token erneuern |
| `GET` | `/api/sessions` | Alle Sessions |
| `POST` | `/api/sessions` | Session erstellen |
| `DELETE` | `/api/sessions/:id` | Session löschen |
| `GET` | `/api/stats/summary` | Dashboard-Zusammenfassung |
| `GET` | `/api/stats/week` | Tages-Statistik (7 Tage) |
| `GET` | `/api/stats/month` | Wochen-Statistik (28 Tage) |
| `GET` | `/api/categories` | Kategorien |
| `GET` | `/api/goals` | Ziele |
| `GET` | `/api/achievements` | Errungenschaften |
| `GET` | `/api/admin/users` | Alle Nutzer (Admin) |

---

## Autor

**Marian Luger** — [marian.luger@icloud.com](mailto:marian.luger@icloud.com)
