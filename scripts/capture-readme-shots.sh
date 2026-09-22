#!/bin/bash
# Capture README screenshots for MERIDIAN SUPPLY CO.
# The dev server is started INSIDE this script (sandbox reaps background
# servers between tool calls) and dies with the script — screenshots land
# in docs/screenshots/ first, so nothing is lost.
set -u
cd /home/z/my-project
SHOTS=/home/z/my-project/docs/screenshots
mkdir -p "$SHOTS"

# --- 1) dev server up -------------------------------------------------------
bun run dev >/tmp/readme-dev.log 2>&1 &
DEVPID=$!
trap 'kill $DEVPID 2>/dev/null' EXIT
up=0
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5 2>/dev/null)
  if [ "$code" = "200" ]; then up=1; break; fi
  sleep 2
done
if [ "$up" != "1" ]; then echo "SERVER FAILED"; tail -30 /tmp/readme-dev.log; exit 1; fi
echo "[shots] server up"

AB="agent-browser"
$AB close >/dev/null 2>&1 || true

# --- 2) hero / shop rest ----------------------------------------------------
$AB set viewport 1440 900
$AB open http://localhost:3000
$AB wait --load networkidle --timeout 45000 || true
sleep 2.5
$AB screenshot "$SHOTS/01-shop-hero.png" && echo "[shots] 01 ok"

# --- 3) position tile-2 (Long-Grain Rice, 3 packs) with drawer room ---------
$AB eval "document.querySelectorAll('.ms-tile')[1].scrollIntoView({block:'start'})" >/dev/null || true
sleep 0.8
$AB eval "window.scrollBy(0,-90)" >/dev/null || true
sleep 0.6
RECT=$($AB eval "JSON.stringify((r=>({x:r.x,y:r.y,w:r.width,h:r.height}))(document.querySelectorAll('.ms-tile')[1].getBoundingClientRect()))" | tail -1)
echo "[shots] rect=$RECT"
CX=$(printf '%s' "$RECT" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());print(int(d['x']+d['w']/2))")
CY=$(printf '%s' "$RECT" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());print(int(d['y']+d['h']/2))")

# --- 4) hover crack ----------------------------------------------------------
$AB mouse move "$CX" "$CY"
sleep 1.0
$AB screenshot "$SHOTS/02-drawer-crack.png" && echo "[shots] 02 ok"

# --- 5) click → drawer fully out --------------------------------------------
$AB mouse down left
$AB mouse up left
sleep 1.1
$AB screenshot "$SHOTS/03-drawer-open.png" && echo "[shots] 03 ok"

# --- 6) quick-view spec sheet ------------------------------------------------
$AB eval "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('OPEN FULL SPEC SHEET'))?.click()" >/dev/null || true
sleep 1.4
$AB screenshot "$SHOTS/04-spec-sheet.png" && echo "[shots] 04 ok"

# --- 7) add to cart → cart → checkout (best effort) --------------------------
$AB eval "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='ADD TO CART')?.click()" >/dev/null || true
sleep 0.8
$AB press Escape
sleep 0.7
$AB eval "document.querySelector('button[aria-label^=\"Open cart\"]')?.click()" >/dev/null || true
sleep 1.0
$AB eval "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('CHECKOUT'))?.click()" >/dev/null || true
sleep 1.6
$AB screenshot "$SHOTS/05-checkout.png" && echo "[shots] 05 ok"

$AB close >/dev/null 2>&1 || true
echo "[shots] done:"; ls -la "$SHOTS"
