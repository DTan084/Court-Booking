#!/bin/sh
set -eu

mkdir -p /app/logs /app/uploads /app/uploads/courts
chown -R nestjs:nodejs /app/logs /app/uploads

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec su -s /bin/sh nestjs -c "node apps/backend/dist/main"
