#!/usr/bin/env bash
# Smoke test for POST /api/orders against a throwaway copy of the demo DB.
# Verifies: Counter-based order numbers (DS100001 on first order), stock
# decrement, and the 409 stock-conflict path. The tracked db/custom.db is
# never touched — everything runs against /tmp/smoke.db.
set -e
cd /home/z/my-project

SMOKE_DB=/tmp/smoke.db
LOG=/tmp/next_smoke.log
PORT=3000

# 1. isolate DB
cp db/custom.db "$SMOKE_DB"

# 2. kill anything already on the port
PIDS=$(ps aux | grep -E "next (dev|start)|next-server" | grep -v grep | awk '{print $2}' || true)
[ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null && sleep 2 || true

# 3. start dev server against the smoke DB
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

# 4. pick a product
node scripts/pick_product.js > /tmp/smoke_product.json
cat /tmp/smoke_product.json
PID=$(node -e "console.log(require('/tmp/smoke_product.json').productId)")
STOCK=$(node -e "console.log(require('/tmp/smoke_product.json').currentStock)")
QTY=$(( STOCK > 2 ? 2 : STOCK ))

# 5. happy path
echo "=== HAPPY PATH (qty=$QTY) ==="
RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:$PORT/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"customerName\":\"SMOKE TEST\",\"contact\":\"+256700000000\",\"paymentMethod\":\"M-PESA\",\"country\":\"UG\",\"cart\":[{\"productId\":\"$PID\",\"qty\":$QTY}]}")
echo "$RESP"
STATUS=$(echo "$RESP" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
ORDERNUM=$(echo "$RESP" | grep -o '"orderNumber":"[^"]*"' | cut -d'"' -f4)
if [ "$STATUS" != "201" ]; then echo "FAIL: expected 201, got $STATUS"; exit 1; fi
if [ "$ORDERNUM" != "DS100001" ]; then echo "FAIL: expected DS100001, got $ORDERNUM"; exit 1; fi
echo "PASS: 201 + $ORDERNUM"

# 6. stock conflict path
echo "=== CONFLICT PATH (qty=99999) ==="
RESP2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:$PORT/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"customerName\":\"SMOKE TEST\",\"contact\":\"+256700000000\",\"paymentMethod\":\"M-PESA\",\"country\":\"UG\",\"cart\":[{\"productId\":\"$PID\",\"qty\":99999}]}")
echo "$RESP2"
STATUS2=$(echo "$RESP2" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
if [ "$STATUS2" != "409" ]; then echo "FAIL: expected 409, got $STATUS2"; exit 1; fi
echo "PASS: 409 stock conflict"

# 7. DB assertions
DATABASE_URL="file:$SMOKE_DB" node scripts/verify_smoke_db.js "$QTY"
echo "ALL SMOKE TESTS PASSED"
