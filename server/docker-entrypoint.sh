#!/bin/sh
set -e

# Ждём, пока PostgreSQL поднимется
echo "[ENTRYPOINT] Waiting for PostgreSQL..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null; do
  sleep 1
done
echo "[ENTRYPOINT] PostgreSQL is ready"

# Инициализируем БД (схема + seed)
echo "[ENTRYPOINT] Running DB init..."
node db/init.js

echo "[ENTRYPOINT] Starting application..."
exec "$@"
