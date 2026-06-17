#!/bin/sh
set -e

# Apply pending Prisma migrations before booting when running against a
# real database. In-memory mode skips this entirely (no DB to migrate).
if [ "$PERSISTENCE_MODE" = "prisma" ]; then
  echo "[entrypoint] PERSISTENCE_MODE=prisma — applying database migrations..."
  npx prisma migrate deploy
fi

echo "[entrypoint] Starting WaaS Gateway..."
exec node dist/src/main.js
