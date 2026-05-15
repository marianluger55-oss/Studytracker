#!/bin/sh
# docker-entrypoint.sh
# Läuft beim Container-Start: Migrationen zuerst, dann Server

set -e

echo "Starte Datenbank-Migrationen..."
node dist/db/migrate.js

echo "Migrationen abgeschlossen. Starte Server..."
exec node dist/index.js
