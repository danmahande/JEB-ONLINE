#!/usr/bin/env bash
# Task 28 verification — drawer box geometry (cavity + walls + well + rim)
# The sandbox reaps background servers between commands, so the dev server
# is started HERE and lives for the duration of this script only.
cd /home/z/my-project

node node_modules/next/dist/bin/next dev -p 3000 > /tmp/next-dev-task28.log 2>&1 &
SERVER_PID=$!
cleanup() { kill $SERVER_PID 2>/dev/null; wait $SERVER_PID 2>/dev/null; return 0; }
trap cleanup EXIT

for i in $(seq 1 45); do
  curl -s -o /dev/null http://localhost:3000 && break
  sleep 1
done
echo "SERVER: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000)"

agent-browser set viewport 1440 900
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
agent-browser wait 2000

# 1) fresh CSS live? (rim band = well margin-top 9px)
echo -n "WELL_MARGIN_TOP: "
agent-browser eval "(() => { const t=[...document.querySelectorAll('.ms-tile')][1]; if(!t) return 'NO_TILES'; return getComputedStyle(t.querySelector('.ms-drawer-well')).marginTop; })()"

# 2) hover crack on tile 2 (image button toggles)
COORDS=$(agent-browser eval "(() => { const t=[...document.querySelectorAll('.ms-tile')][1]; t.scrollIntoView({behavior:'instant', block:'center'}); const r=t.querySelector('button[aria-controls]').getBoundingClientRect(); return Math.round(r.left+r.width/2)+' '+Math.round(r.top+r.height/2); })()")
XY=$(echo "$COORDS" | grep -oE '[0-9]+ [0-9]+' | head -1)
X=$(echo $XY | cut -d' ' -f1)
Y=$(echo $XY | cut -d' ' -f2)
echo "HOVER_AT: $X $Y"
agent-browser mouse move "$X" "$Y"
agent-browser wait 600
agent-browser screenshot /home/z/my-project/download/meridian-task28-crack.png

# 3) click -> full pull; measure cavity/box/rim band
agent-browser mouse down left
agent-browser mouse up left
agent-browser wait 900
agent-browser screenshot /home/z/my-project/download/meridian-task28-open.png
echo -n "OPEN_GEOMETRY: "
agent-browser eval "(() => { const t=[...document.querySelectorAll('.ms-tile')][1]; const d=t.querySelector('.ms-drawer'); const i=t.querySelector('.ms-drawer-inner'); const w=t.querySelector('.ms-drawer-well'); const dr=d.getBoundingClientRect(); const ir=i.getBoundingClientRect(); const wr=w.getBoundingClientRect(); return JSON.stringify({open:t.classList.contains('ms-open'), cavityH:Math.round(dr.height), boxH:Math.round(ir.height), rimBandPx:Math.round(wr.top-ir.top), sideWallPx:Math.round(wr.left-ir.left), z:getComputedStyle(t).zIndex}); })()"

# 4) close -> seal; mouse off; nothing may hang under the tile
agent-browser mouse move "$X" "$Y"
agent-browser mouse down left
agent-browser mouse up left
agent-browser wait 700
agent-browser mouse move 5 5
agent-browser wait 600
echo -n "SEAL_CHECK: "
agent-browser eval "(() => { const t=[...document.querySelectorAll('.ms-tile')][1]; const d=t.querySelector('.ms-drawer'); const r=d.getBoundingClientRect(); return JSON.stringify({closed:!t.classList.contains('ms-open'), boxH:Math.round(r.height), vis:getComputedStyle(d).visibility, pad:getComputedStyle(d).padding}); })()"
agent-browser screenshot /home/z/my-project/download/meridian-task28-rest.png

echo -n "PAGE_ERRORS: "
agent-browser errors || true
agent-browser close
echo "DONE"
