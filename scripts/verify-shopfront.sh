#!/bin/bash
# Task 38 — glass shopfront verification pass.
# The sandbox reaps background servers between tool calls, so the dev server
# is started INSIDE this script and the full browser pass runs before exit.
# A fresh server per run also guarantees no stale CSS chunks.

set -u
cd /home/z/my-project
OUT=/home/z/my-project/download
LOG=/home/z/my-project/.next/dev-server.log

agent-browser close >/dev/null 2>&1 || true

echo "=== 1. start dev server ==="
setsid nohup node node_modules/.bin/next dev -p 3000 > "$LOG" 2>&1 < /dev/null &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT
code=000
for i in $(seq 1 40); do
  sleep 1
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/ 2>/dev/null)
  [ "$code" = "200" ] && break
done
echo "server: HTTP $code after ${i}s"

echo "=== 2. stale-chunk check: served CSS must contain the new rules ==="
CSSURL=$(curl -s http://localhost:3000/ | rg -o 'href="[^"]*\.css[^"]*"' | head -1 | sed 's/href="//;s/"$//')
HITS=$(curl -s "http://localhost:3000${CSSURL}" | rg -c "ms-shopfront|ms-glass" || echo 0)
echo "css=$CSSURL rule-hits=$HITS"

echo "=== 3. load + computed styles ==="
agent-browser set viewport 1440 900
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
agent-browser eval "(() => { const sf=document.querySelector('.ms-shopfront'); const gl=document.querySelector('.ms-glass'); if(!sf||!gl) return JSON.stringify({MISSING:true, tiles:document.querySelectorAll('.ms-tile').length}); const cs=getComputedStyle(sf); const gs=getComputedStyle(gl); return JSON.stringify({shopfrontBg:cs.backgroundImage.slice(0,60), pad:cs.padding, borderTop:cs.borderTopWidth+' '+cs.borderTopColor, glassShadow:gs.boxShadow.slice(0,80), glassAnim:gs.animationName, glassPE:gs.pointerEvents, sky:document.querySelector('#catalog').dataset.sky, tiles:document.querySelectorAll('.ms-tile').length}); })()"

echo "=== 4. night screenshot (natural sky right now) ==="
agent-browser eval "document.querySelector('#catalog').scrollIntoView({block:'start'}); window.scrollBy(0,-104); 'ok'"
agent-browser wait 2200
agent-browser screenshot $OUT/ms-shopfront-night.png

echo "=== 5. whole-tile click — real mouse on the tile's blank bottom padding ==="
agent-browser eval "(() => { const t=document.querySelectorAll('.ms-tile')[1]; const r=t.getBoundingClientRect(); if(r.bottom > window.innerHeight - 8) window.scrollBy({top: r.bottom - window.innerHeight + 24, behavior: 'instant'}); const r2=t.getBoundingClientRect(); window.__cx=Math.round(r2.left+r2.width*0.5); window.__cy=Math.round(r2.bottom-6); return JSON.stringify({cy:window.__cy, vh:window.innerHeight}); })()"
X=$(agent-browser eval "String(window.__cx)" | rg -o '[0-9]+' | head -1)
Y=$(agent-browser eval "String(window.__cy)" | rg -o '[0-9]+' | head -1)
echo "clicking tile-blank at $X,$Y"
agent-browser mouse move $X $Y
agent-browser mouse down left
agent-browser mouse up left
agent-browser wait 700
agent-browser eval "JSON.stringify({dialogOpen:!!document.querySelector('[role=dialog]')})"
agent-browser press Escape
agent-browser wait 500
agent-browser eval "JSON.stringify({dialogAfterEsc:!!document.querySelector('[role=dialog]')})"

echo "=== 6. sky overrides — golden / day / dawn (store state, synthetic click ok) ==="
agent-browser eval "(() => { const b=[...document.querySelectorAll('[role=group][aria-label*=\"sky\"] button')].find(x=>x.textContent.trim()==='GOLDEN'); b.click(); return 'golden set'; })()"
agent-browser wait 2200
agent-browser eval "JSON.stringify({sky:document.querySelector('#catalog').dataset.sky, wash:getComputedStyle(document.querySelector('.ms-glass')).backgroundImage.includes('233, 116, 74')})"
agent-browser screenshot $OUT/ms-shopfront-golden.png

agent-browser eval "(() => { const b=[...document.querySelectorAll('[role=group][aria-label*=\"sky\"] button')].find(x=>x.textContent.trim()==='DAY'); b.click(); return 'day set'; })()"
agent-browser wait 2200
agent-browser eval "document.querySelector('#catalog').scrollIntoView({block:'start'}); window.scrollBy(0,-104); 'ok'"
agent-browser wait 600
agent-browser screenshot $OUT/ms-shopfront-day.png

agent-browser eval "(() => { const b=[...document.querySelectorAll('[role=group][aria-label*=\"sky\"] button')].find(x=>x.textContent.trim()==='DAWN'); b.click(); return 'dawn set'; })()"
agent-browser wait 2200
agent-browser screenshot $OUT/ms-shopfront-dawn.png

echo "=== 7. tabs still work (synthetic click on role=tab) ==="
agent-browser eval "(() => { [...document.querySelectorAll('[role=tab]')].find(x=>x.textContent.trim()==='GRAINS').click(); return 'clicked'; })()"
agent-browser wait 900
agent-browser eval "JSON.stringify({sky:document.querySelector('#catalog').dataset.sky, tiles:document.querySelectorAll('.ms-tile').length, glass:document.querySelectorAll('.ms-glass').length})"
agent-browser eval "(() => { const tb=document.querySelector('#catalog > div'); const sf=document.querySelector('.ms-shopfront'); return JSON.stringify({fasciaBottom:Math.round(tb.getBoundingClientRect().bottom), frameTop:Math.round(sf.getBoundingClientRect().top), flush:Math.abs(tb.getBoundingClientRect().bottom - sf.getBoundingClientRect().top) < 2}); })()"

echo "=== 8. quick view still opens via BUY (stopPropagation intact) ==="
agent-browser eval "document.querySelector('#catalog').scrollIntoView({block:'start'}); window.scrollBy(0,-104); 'ok'"
agent-browser wait 400
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label') || '').startsWith('Buy ')); const r=b.getBoundingClientRect(); window.__bx=Math.round(r.left+r.width/2); window.__by=Math.round(r.top+r.height/2); return 'set'; })()"
BX=$(agent-browser eval "String(window.__bx)" | rg -o '[0-9]+' | head -1)
BY=$(agent-browser eval "String(window.__by)" | rg -o '[0-9]+' | head -1)
echo "clicking BUY at $BX,$BY"
agent-browser mouse move $BX $BY
agent-browser mouse down left
agent-browser mouse up left
agent-browser wait 700
agent-browser eval "JSON.stringify({dialogOpen:!!document.querySelector('[role=dialog]')})"
agent-browser press Escape

echo "=== 9. errors + cleanup ==="
agent-browser errors
agent-browser eval "(() => { const b=[...document.querySelectorAll('[role=group][aria-label*=\"sky\"] button')].find(x=>x.textContent.trim()==='AUTO'); b.click(); return 'auto restored'; })()"
agent-browser storage local clear
agent-browser close
echo "=== done ==="
