#!/bin/sh
set -e

echo "[entrypoint] waiting for database ${DATABASE_URL} ..."
node --input-type=module -e "
const url = new URL(process.env.DATABASE_URL);
const net = await import('net');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 60; i++) {
  const ok = await new Promise((resolve) => {
    const sock = net.createConnection({ host: url.hostname, port: Number(url.port || 5432) });
    sock.once('connect', () => { sock.end(); resolve(true); });
    sock.once('error', () => resolve(false));
  });
  if (ok) { console.log('[entrypoint] database is reachable'); process.exit(0); }
  process.stdout.write('.');
  await sleep(1000);
}
console.error('[entrypoint] database not reachable after 60s');
process.exit(1);
"

echo "[entrypoint] pushing schema ..."
npx prisma db push --skip-generate

echo "[entrypoint] seeding ..."
node --import tsx/esm prisma/seed.ts || true

echo "[entrypoint] starting backend ..."
exec "$@"
