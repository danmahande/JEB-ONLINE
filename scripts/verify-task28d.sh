#!/usr/bin/env bash
# Task 28d — max-height travel verification: lockstep crack, content-height
# census (validates the 460px open cap), crops, seal check.
cd /home/z/my-project

node node_modules/next/dist/bin/next dev -p 3000 > /tmp/next-dev-task28d.log 2>&1 &
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
agent-browser wait 2500

# content-height census across all drawers (validates open max-height 460)
echo -n "CONTENT_CENSUS: "
agent-browser eval "(() => { const hs=[...document.querySelectorAll('.ms-drawer-inner')].map(i=>{const p=i.style.maxHeight; i.style.maxHeight='2000px'; const h=i.scrollHeight; i.style.maxHeight=p; return h;}); return JSON.stringify({count:hs.length, min:Math.min(...hs), max:Math.max(...hs)}); })()"

# hover tile 2 with jiggle
COORDS=$(agent-browser eval "(() => { const t=[...document.querySelectorAll('.ms-tile')][1]; t.scrollIntoView({behavior:'instant', block:'center'}); const r=t.querySelector('button[aria-controls]').getBoundingClientRect(); return Math.round(r.left+r.width/2)+' '+Math.round(r.top+r.height/2); })()")
XY=$(echo "$COORDS" | grep -oE '[0-9]+ [0-9]+' | head -1)
X=$(echo $XY | cut -d' ' -f1)
Y=$(echo $XY | cut -d' ' -f2)
agent-browser mouse move "$X" "$Y"
agent-browser wait 350
agent-browser mouse move $((X+2)) "$Y"
agent-browser wait 200
agent-browser mouse move "$X" "$Y"
agent-browser wait 600

echo -n "CRACK_LOCKSTEP: "
agent-browser eval "(() => {
  const t=document.querySelector('.ms-tile:hover');
  if (!t) return 'NO_HOVER';
  const d=t.querySelector('.ms-drawer');
  const i=t.querySelector('.ms-drawer-inner');
  const dr=d.getBoundingClientRect(), ir=i.getBoundingClientRect();
  return JSON.stringify({
    cavityH: Math.round(dr.height),
    innerH: Math.round(ir.height),
    voidPx: Math.round((dr.height-1) - (ir.height + 14)),
    pad: getComputedStyle(d).padding
  });
})()"

agent-browser screenshot /home/z/my-project/download/meridian-task28d-crack.png

# click -> open
agent-browser mouse down left
agent-browser mouse up left
agent-browser wait 900
echo -n "OPEN_CHECK: "
agent-browser eval "(() => {
  const t=[...document.querySelectorAll('.ms-tile')][1];
  const d=t.querySelector('.ms-drawer');
  const i=t.querySelector('.ms-drawer-inner');
  const w=t.querySelector('.ms-drawer-well');
  const dr=d.getBoundingClientRect(), ir=i.getBoundingClientRect(), wr=w.getBoundingClientRect();
  return JSON.stringify({
    open: t.classList.contains('ms-open'),
    cavityH: Math.round(dr.height),
    innerH: Math.round(ir.height),
    voidPx: Math.round((dr.height-1) - (ir.height + 14)),
    rimBand: Math.round(wr.top-ir.top),
    z: getComputedStyle(t).zIndex
  });
})()"
agent-browser screenshot /home/z/my-project/download/meridian-task28d-open.png

# close -> seal
agent-browser mouse down left
agent-browser mouse up left
agent-browser wait 700
agent-browser mouse move 5 5
agent-browser wait 600
echo -n "SEAL_CHECK: "
agent-browser eval "(() => { const t=[...document.querySelectorAll('.ms-tile')][1]; const d=t.querySelector('.ms-drawer'); const i=t.querySelector('.ms-drawer-inner'); return JSON.stringify({closed:!t.classList.contains('ms-open'), cavityH:Math.round(d.getBoundingClientRect().height), innerMaxH:getComputedStyle(i).maxHeight, vis:getComputedStyle(d).visibility}); })()"
agent-browser screenshot /home/z/my-project/download/meridian-task28d-rest.png
agent-browser close

python3 - << 'PYEOF'
from PIL import Image
img = Image.open('/home/z/my-project/download/meridian-task28d-crack.png')
crop = img.crop((300, 635, 580, 725)).resize((280*3, 90*3), Image.LANCZOS)
crop.save('/home/z/my-project/download/meridian-task28d-crack-zoom.png')
img2 = Image.open('/home/z/my-project/download/meridian-task28d-open.png')
crop2 = img2.crop((300, 635, 580, 900)).resize((280*2, 265*2), Image.LANCZOS)
crop2.save('/home/z/my-project/download/meridian-task28d-open-zoom.png')
print('crops saved')
PYEOF
echo "DONE"
