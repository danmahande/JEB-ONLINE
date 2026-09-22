#!/bin/bash
# Re-capture the drawer crack + open shots (v1's rect JSON was double-quoted
# so the mouse never moved). Viewport raised to 1440x1040 so the fully
# extended drawer fits below the tile.
set -u
cd /home/z/my-project
SHOTS=/home/z/my-project/docs/screenshots

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
$AB set viewport 1440 1040
$AB open http://localhost:3000
$AB wait --load networkidle --timeout 45000 || true
sleep 2.5

$AB eval "document.querySelectorAll('.ms-tile')[1].scrollIntoView({block:'start'})" >/dev/null || true
sleep 0.8
$AB eval "window.scrollBy(0,-90)" >/dev/null || true
sleep 0.6
RAW=$($AB eval "JSON.stringify((r=>({x:r.x,y:r.y,w:r.width,h:r.height}))(document.querySelectorAll('.ms-tile')[1].getBoundingClientRect()))" | tail -1)
echo "[shots] raw=$RAW"
CX=$(printf '%s' "$RAW" | python3 -c "
import sys,json
d=json.loads(sys.stdin.read().strip())
if isinstance(d,str): d=json.loads(d)
print(int(d['x']+d['w']/2))")
CY=$(printf '%s' "$RAW" | python3 -c "
import sys,json
d=json.loads(sys.stdin.read().strip())
if isinstance(d,str): d=json.loads(d)
print(int(d['y']+d['h']/2))")
echo "[shots] center=($CX,$CY)"

# hover crack
$AB mouse move "$CX" "$CY"
sleep 1.0
$AB screenshot "$SHOTS/02-drawer-crack.png" && echo "[shots] 02 ok"

# click → drawer fully out
$AB mouse down left
$AB mouse up left
sleep 1.1
$AB screenshot "$SHOTS/03-drawer-open.png" && echo "[shots] 03 ok"

$AB close >/dev/null 2>&1 || true
echo "[shots] done"; ls -la "$SHOTS"
