#!/usr/bin/env bash
# Smoke test for live FX conversion: /api/fx must refresh RegionConfig rates
# from open.er-api.com, TTL-gate repeat calls, and checkout must record the
# live rate on the order. Runs against /tmp/smoke.db — tracked db untouched.
set -e
cd /home/z/my-project

SMOKE_DB=/tmp/smoke.db
LOG=/tmp/next_fx_smoke.log
PORT=3000

cp db/custom.db "$SMOKE_DB"

PIDS=$(ps aux | grep -E "next (dev|start)|next-server" | grep -v grep | awk '{print $2}' || true)
[ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null && sleep 2 || true

echo "=== BASELINE (seeded rates in db) ==="
DATABASE_URL="file:$SMOKE_DB" node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rows = await p.regionConfig.findMany({ orderBy: { region: 'asc' }, select: { region: true, currency: true, rateToUsd: true, fxUpdatedAt: true } });
  console.log(JSON.stringify(rows));
  await p.\$disconnect();
})();
"

rm -f "$LOG"
DATABASE_URL="file:$SMOKE_DB" nohup npm run dev > "$LOG" 2>&1 &
SERVER_PID=$!
echo "dev server PID $SERVER_PID, waiting for ready..."
for i in $(seq 1 60); do
  sleep 2
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" || true)
  if [ "$CODE" = "200" ]; then echo "server ready after $((i*2))s"; break; fi
  if [ "$i" = "60" ]; then echo "SERVER FAILED TO START"; tail -30 "$LOG"; exit 1; fi
done

cleanup() {
  kill -9 $SERVER_PID 2>/dev/null || true
  PIDS2=$(ps aux | grep -E "next (dev|start)|next-server" | grep -v grep | awk '{print $2}' || true)
  [ -n "$PIDS2" ] && kill -9 $PIDS2 2>/dev/null || true
}
trap cleanup EXIT

echo "=== FIRST GET /api/fx (should trigger live refresh) ==="
T0=$(date +%s%N)
FX1=$(curl -s "http://localhost:$PORT/api/fx")
T1=$(date +%s%N)
echo "$FX1" | node -e "
let s=''; process.stdin.on('data', d => s += d).on('end', () => {
  const j = JSON.parse(s);
  if (!j.success) throw new Error('fx call failed');
  for (const r of j.regions) console.log(r.region, r.currency, r.rateToUsd, r.fxUpdatedAt ? 'refreshed' : 'NOT-REFRESHED');
});
"

echo "=== SECOND GET /api/fx (TTL gate — should be fast) ==="
T2=$(date +%s%N)
curl -s -o /dev/null "http://localhost:$PORT/api/fx"
T3=$(date +%s%N)
echo "first call: $(( (T1-T0)/1000000 ))ms, second call: $(( (T3-T2)/1000000 ))ms"

echo "=== LIVE RATES FROM PROVIDER (for comparison) ==="
curl -s --max-time 6 "https://open.er-api.com/v6/latest/USD" | node -e "
let s=''; process.stdin.on('data', d => s += d).on('end', () => {
  const j = JSON.parse(s);
  for (const c of ['UGX','KES','TZS','RWF']) console.log(c, j.rates[c]);
});
"

echo "=== CHECKOUT USES LIVE RATE ==="
PID=$(DATABASE_URL="file:$SMOKE_DB" node scripts/pick_product.js | node -e "let s=''; process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).productId))")
RESP=$(curl -s -X POST "http://localhost:$PORT/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"customerName\":\"FX SMOKE\",\"contact\":\"+256700000001\",\"paymentMethod\":\"M-PESA\",\"country\":\"UG\",\"cart\":[{\"productId\":\"$PID\",\"qty\":1}]}")
echo "$RESP" | node -e "
let s=''; process.stdin.on('data', d => s += d).on('end', () => {
  const j = JSON.parse(s);
  if (!j.success) throw new Error('order failed: ' + s);
  console.log('order', j.order.orderNumber, 'fxRate:', j.order.fxRate, 'total:', j.order.totalAmount, j.order.currency);
});
"

echo "=== STORED RATES + ORDER FX IN DB ==="
DATABASE_URL="file:$SMOKE_DB" node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const ug = await p.regionConfig.findUnique({ where: { region: 'UG' } });
  const order = await p.orderProcessing.findFirst({ select: { orderNumber: true, fxRate: true, currency: true, totalAmount: true } });
  console.log('UG stored rate:', ug.rateToUsd, 'updated at:', ug.fxUpdatedAt);
  console.log('order fxRate:', order.fxRate, '== stored:', ug.rateToUsd === order.fxRate);
  if (ug.rateToUsd !== order.fxRate) throw new Error('order did not use live rate');
  console.log('FX SMOKE PASSED');
  await p.\$disconnect();
})();
"
